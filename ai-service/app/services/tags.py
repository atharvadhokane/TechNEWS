import json
from app.utils.ai_client import chat_completion
from app.prompts.templates import TAGS_PROMPT


def generate_tags(title: str, summary: str) -> list[str]:
    """Generates 3-6 lowercase, hyphenated topical tags as a JSON array."""
    raw = chat_completion(
        system_prompt=TAGS_PROMPT,
        user_prompt=f"Title: {title}\nSummary: {summary}",
        temperature=0.3,
        max_tokens=80,
    )
    # Models sometimes wrap JSON in markdown fences despite instructions
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        tags = json.loads(raw)
        if isinstance(tags, list):
            return [str(t).lower().strip() for t in tags][:6]
    except json.JSONDecodeError:
        pass
    return [t.strip().lower() for t in raw.split(",") if t.strip()][:6]
