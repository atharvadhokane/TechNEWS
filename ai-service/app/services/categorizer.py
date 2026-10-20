from app.utils.ai_client import chat_completion
from app.prompts.templates import CATEGORY_PROMPT

ALLOWED_CATEGORIES = [
    "AI",
    "Software Engineering",
    "Startups",
    "Cybersecurity",
    "Hardware",
    "Cloud/Infra",
    "Product",
    "Other",
]


def categorize(title: str, summary: str) -> str:
    """Classifies the article into one of ALLOWED_CATEGORIES."""
    category = chat_completion(
        system_prompt=CATEGORY_PROMPT.format(categories=", ".join(ALLOWED_CATEGORIES)),
        user_prompt=f"Title: {title}\nSummary: {summary}",
        temperature=0,
        max_tokens=10,
    )
    return category if category in ALLOWED_CATEGORIES else "Other"
