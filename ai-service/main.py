from fastapi import FastAPI
from dotenv import load_dotenv

from app.routers import processing, recommendation, digest

load_dotenv()

app = FastAPI(
    title="AI Tech News - AI Service",
    description="Runs the LLM enrichment pipeline: summary, headline, "
    "categorization, tags, embeddings, trending score, and recommendations.",
    version="1.0.0",
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


app.include_router(processing.router, tags=["processing"])
app.include_router(recommendation.router, tags=["recommendation"])
app.include_router(digest.router, tags=["digest"])


if __name__ == "__main__":
    import uvicorn
    import os

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
