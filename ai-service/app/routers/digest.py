from fastapi import APIRouter

from app.models.article import DigestRequest
from app.services.digest import generate_digest_intro

router = APIRouter()


@router.post("/digest/intro")
def digest_intro(req: DigestRequest, headlines: list[str] | None = None):
    """Generates the editorial intro for the daily digest. The backend
    passes the headlines of the articles selected for today's digest
    (see backend/src/jobs/dailyDigest.job.js) and stores the returned
    text alongside the Digest record.
    """
    intro = generate_digest_intro(headlines or [])
    return {"articleIds": req.articleIds, "intro": intro}
