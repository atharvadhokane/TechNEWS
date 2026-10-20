from app.utils.ai_client import chat_completion
from app.prompts.templates import HEADLINE_PROMPT


def generate_headline(title: str, summary: str) -> str:
    """Generates a punchy, accurate headline distinct from the raw source title."""
    result = chat_completion(
        system_prompt=HEADLINE_PROMPT,
        user_prompt=f"Original title: {title}\nSummary: {summary}",
        temperature=0.5,
        max_tokens=60,
    )
    return result.strip('"')
