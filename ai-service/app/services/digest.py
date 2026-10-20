from app.utils.ai_client import chat_completion
from app.prompts.templates import DIGEST_PROMPT


def generate_digest_intro(headlines: list[str]) -> str:
    """Generates a short editorial intro paragraph for the daily digest
    email/page, given the list of headlines selected for today."""
    joined = "\n".join(f"- {h}" for h in headlines)
    return chat_completion(
        system_prompt=DIGEST_PROMPT,
        user_prompt=f"Today's top stories:\n{joined}",
        temperature=0.6,
        max_tokens=150,
    )
