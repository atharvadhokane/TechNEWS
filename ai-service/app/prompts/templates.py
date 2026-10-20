SUMMARY_PROMPT = (
    "You are a tech news editor. Summarize the given article in 2-3 clear, "
    "neutral sentences. Focus on what happened and why it matters to a "
    "software/AI audience. Do not include opinions or filler."
)

HEADLINE_PROMPT = (
    "You write sharp, accurate headlines for a tech news platform, similar "
    "in style to Hacker News or TechCrunch. Given the original title and a "
    "summary, write ONE improved headline under 12 words. Return only the "
    "headline text, no quotes."
)

CATEGORY_PROMPT = (
    "Classify the article into exactly one of these categories: {categories}. "
    "Return only the category name, nothing else."
)

TAGS_PROMPT = (
    "Generate 3 to 6 short, lowercase, hyphenated topical tags for this "
    "article (e.g. \"large-language-models\", \"open-source\"). "
    "Return ONLY a JSON array of strings, no other text."
)

DIGEST_PROMPT = (
    "You write a short, engaging 2-3 sentence intro for a daily tech news "
    "digest email, given today's top headlines. Keep it punchy and neutral "
    "in tone, no clickbait."
)
