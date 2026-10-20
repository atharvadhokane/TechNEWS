from app.utils.ai_client import chat_completion
from app.prompts.templates import SUMMARY_PROMPT


def generate_summary(title: str, content: str) -> str:
    """Generates a concise 2-3 sentence summary of the article."""
    return chat_completion(
        system_prompt=SUMMARY_PROMPT,
        user_prompt=f"Title: {title}\n\nContent:\n{content[:6000]}",
        temperature=0.3,
        max_tokens=200,
    )
