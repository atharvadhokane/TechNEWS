"""
Provider-agnostic AI client. Set AI_PROVIDER=gemini, AI_PROVIDER=openai, or
AI_PROVIDER=grok in ai-service/.env to choose which backend powers the
enrichment pipeline. Every service (summarizer, headlines, categorizer,
tags, embeddings) calls chat_completion()/embed() here instead of talking
to a provider's SDK directly, so switching providers is a one-line env
change.

Gemini (Google AI Studio) has a genuine free tier -- no billing required
at all -- which is why it's the default here. The free tier is capped on
three dimensions: requests per minute (RPM), tokens per minute (TPM), and
requests per day (RPD); exceeding any of them gets you a 429. The numbers
below (GEMINI_RPM/GEMINI_RPD defaults) are conservative estimates for the
Flash-Lite tier as of when this was written -- Google adjusts free-tier
quotas periodically, so check https://ai.google.dev/gemini-api/docs/rate-limits
and tune the env vars below if you're seeing 429s or want more headroom.

IMPORTANT: each article makes up to 5 separate Gemini calls (summary,
headline, category, tags, embedding), so pacing *jobs* per minute in
backend/src/jobs/aiProcessing.worker.js is NOT the same as pacing *API
calls* per minute -- 10 jobs/min could mean 50 Gemini calls/min, well
past the free tier's RPM cap. The real throttle therefore lives here, at
the actual call site: _GeminiRateLimiter blocks (sleeps) before every
Gemini chat/embedding call so the call rate never exceeds GEMINI_RPM, and
raises a clear error if the (approximate) daily cap GEMINI_RPD is hit.
The worker's job-level pacing is just a coarse backstop on top of this.

xAI's Grok API is OpenAI-compatible, so it reuses the `openai` package
pointed at a different base_url instead of needing its own SDK. Unlike
Gemini, Grok has no free tier (billed per token from the first request)
and no embeddings endpoint -- see chat_completion()/embed() below for
details if you switch AI_PROVIDER=grok.
"""
import logging
import os
import threading
import time
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger("ai-service")

_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()

# Grok has no embeddings API of its own, so embeddings fall back to
# OpenAI unless explicitly overridden.
_EMBEDDING_PROVIDER = os.getenv(
    "EMBEDDING_PROVIDER", "openai" if _PROVIDER == "grok" else _PROVIDER
).lower()

_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "5"))
_RETRY_BASE_DELAY_SECONDS = float(os.getenv("AI_RETRY_BASE_DELAY_SECONDS", "2"))

_openai_client = None
_grok_client = None
_gemini_embedding_client = None
_gemini_configured = False


class GeminiDailyQuotaExceeded(RuntimeError):
    """Raised when the (approximate) Gemini free-tier daily request cap
    has been reached. Callers already treat unexpected exceptions from
    chat_completion()/embed() as a signal to fall back to a non-AI
    result (see ai-service/app/routers/processing.py), so this doesn't
    crash the pipeline -- it just stops spending quota until reset.
    """


class _GeminiRateLimiter:
    """Sliding-window limiter (RPM) + approximate daily cap (RPD) for
    Gemini calls, shared by every chat_completion()/embed() call in this
    process. Blocks the calling thread until it's safe to send the next
    request rather than firing ahead and hoping.

    This is in-process state, which is correct for a single ai-service
    instance (the default here: one `uvicorn` process). If you scale
    ai-service to multiple instances/replicas, move this to Redis so all
    instances share one counter -- otherwise each instance thinks it has
    the full quota to itself.

    The free tier's daily quota resets at midnight Pacific time; this
    approximates it with a UTC calendar day for simplicity, which is
    close enough to avoid real overuse (worst case it resets a few hours
    early/late relative to Google's actual reset).
    """

    def __init__(self, max_per_minute: int, max_per_day: int | None):
        self._max_per_minute = max_per_minute
        self._max_per_day = max_per_day
        self._lock = threading.Lock()
        self._call_times: deque[float] = deque()  # monotonic timestamps, last 60s
        self._day = None
        self._day_count = 0

    def acquire(self):
        while True:
            with self._lock:
                now = time.monotonic()
                while self._call_times and now - self._call_times[0] >= 60:
                    self._call_times.popleft()

                today = datetime.now(timezone.utc).date()
                if self._day != today:
                    self._day = today
                    self._day_count = 0

                if self._max_per_day and self._day_count >= self._max_per_day:
                    raise GeminiDailyQuotaExceeded(
                        f"Gemini free-tier daily request cap (~{self._max_per_day}) reached "
                        f"for {today}. Raise GEMINI_RPD if your actual quota is higher, or "
                        "wait for the daily reset."
                    )

                if len(self._call_times) < self._max_per_minute:
                    self._call_times.append(now)
                    self._day_count += 1
                    return

                sleep_for = 60 - (now - self._call_times[0]) + 0.05

            logger.info("Gemini rate limiter: pacing request, waiting %.1fs", sleep_for)
            time.sleep(sleep_for)


_gemini_limiter = _GeminiRateLimiter(
    max_per_minute=int(os.getenv("GEMINI_RPM", "15")),
    max_per_day=int(os.getenv("GEMINI_RPD", "1000")),
)


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


def _get_grok():
    """Grok speaks the OpenAI Chat Completions format, so we reuse the
    `openai` package and just point it at xAI's base URL instead of
    pulling in a separate SDK.
    """
    global _grok_client
    if _grok_client is None:
        from openai import OpenAI
        _grok_client = OpenAI(
            api_key=os.getenv("GROK_API_KEY"),
            base_url=os.getenv("GROK_BASE_URL", "https://api.x.ai/v1"),
        )
    return _grok_client


def _ensure_gemini_configured():
    global _gemini_configured
    if not _gemini_configured:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        _gemini_configured = True


def _with_rate_limit_retry(fn, *, what: str):
    """Runs fn() and, if the provider comes back with a 429, backs off
    exponentially and tries again instead of hammering the API or
    failing the article outright. This is a safety net for the rare 429
    that slips through the proactive pacing above (e.g. Gemini's TPM
    limit, which _GeminiRateLimiter doesn't track, or a burst from
    another process sharing the same key).
    """
    from openai import RateLimitError
    delay = _RETRY_BASE_DELAY_SECONDS
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            return fn()
        except RateLimitError:
            if attempt == _MAX_RETRIES:
                raise
            logger.warning(
                "%s hit a rate limit (attempt %d/%d) -- waiting %.0fs before retrying",
                what, attempt, _MAX_RETRIES, delay,
            )
            time.sleep(delay)
            delay *= 2


def _gemini_call_with_retry(fn, *, what: str):
    """Gemini-specific wrapper: paces via _gemini_limiter first, then
    retries on Google's rate-limit error (a different exception type
    than OpenAI's, since this goes through google-generativeai, not the
    openai package).
    """
    from google.api_core.exceptions import ResourceExhausted

    delay = _RETRY_BASE_DELAY_SECONDS
    for attempt in range(1, _MAX_RETRIES + 1):
        _gemini_limiter.acquire()
        try:
            return fn()
        except Exception as exc:
            is_rate_limit = isinstance(exc, ResourceExhausted) or (
                getattr(exc, "code", None) == 429
                or getattr(exc, "status_code", None) == 429
            )
            if not is_rate_limit:
                raise
            if attempt == _MAX_RETRIES:
                raise
            logger.warning(
                "%s hit Gemini's rate limit (attempt %d/%d) -- waiting %.0fs before retrying",
                what, attempt, _MAX_RETRIES, delay,
            )
            time.sleep(delay)
            delay *= 2


def chat_completion(system_prompt: str, user_prompt: str, temperature: float = 0.3,
                     max_tokens: int = 200) -> str:
    """Runs a single-turn chat completion and returns the text response."""
    if _PROVIDER == "gemini":
        import google.generativeai as genai
        _ensure_gemini_configured()
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
        model = genai.GenerativeModel(model_name, system_instruction=system_prompt)

        def _call():
            response = model.generate_content(
                user_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
            return (response.text or "").strip()

        return _gemini_call_with_retry(_call, what=f"Gemini chat_completion ({model_name})")

    if _PROVIDER == "grok":
        client = _get_grok()
        # Model names in the Grok lineup change often -- check
        # https://docs.x.ai/docs/models for the current lineup and set
        # GROK_MODEL in ai-service/.env.
        model_name = os.getenv("GROK_MODEL", "grok-4.3")

        def _call():
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()

        return _with_rate_limit_retry(_call, what=f"Grok chat_completion ({model_name})")

    # Default: OpenAI
    client = _get_openai()
    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def _call():
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()

    return _with_rate_limit_retry(_call, what=f"OpenAI chat_completion ({model_name})")


def embed(text: str) -> list[float]:
    """Returns a vector embedding for the given text.

    NOTE: OpenAI's text-embedding-3-small returns 1536 dimensions, while
    Gemini's text-embedding-004 returns 768. Grok has no embeddings
    endpoint, so AI_PROVIDER=grok reuses OpenAI's 1536-dim model here by
    default. If you change EMBEDDING_PROVIDER, update the `vector(N)`
    dimension in database/migrations/001_enable_pgvector.sql to match,
    or you'll get a dimension-mismatch error writing to Postgres.
    """
    if _EMBEDDING_PROVIDER == "gemini":
        global _gemini_embedding_client
        from google import genai as genai_client
        from google.genai import types

        if _gemini_embedding_client is None:
            _gemini_embedding_client = genai_client.Client(api_key=os.getenv("GEMINI_API_KEY"))

        model_name = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

        def _call():
            result = _gemini_embedding_client.models.embed_content(
                model=model_name,
                contents=text[:8000],
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=768,
                ),
            )
            return result.embeddings[0].values

        # Embeddings count against the same Gemini RPM/RPD quota as chat
        # calls, so they go through the same limiter.
        return _gemini_call_with_retry(_call, what=f"Gemini embed ({model_name})")

    # Default: OpenAI (also used as the Grok embeddings fallback, see docstring)
    client = _get_openai()
    model_name = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    def _call():
        response = client.embeddings.create(model=model_name, input=text[:8000])
        return response.data[0].embedding

    return _with_rate_limit_retry(_call, what=f"OpenAI embed ({model_name})")


def get_provider() -> str:
    return _PROVIDER


def get_embedding_provider() -> str:
    return _EMBEDDING_PROVIDER
