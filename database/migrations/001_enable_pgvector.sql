-- Enable the pgvector extension and add an embedding column to Article.
-- Run this AFTER `prisma migrate dev` has created the base tables,
-- since Prisma's schema doesn't have a native `vector` type yet.
--
-- Usage:
--   psql "$DATABASE_URL" -f database/migrations/001_enable_pgvector.sql
--
-- IMPORTANT: the vector dimension below must match your AI_PROVIDER
-- (see ai-service/.env):
--   - Gemini text-embedding-004  -> vector(768)   [default, free tier]
--   - OpenAI text-embedding-3-small -> vector(1536)
-- If you switch providers after this migration has already run, drop
-- and recreate the column with the new dimension (existing embeddings
-- aren't compatible across providers/dimensions anyway).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- IVFFlat index for fast approximate nearest-neighbor search.
-- Requires some rows to exist before it's useful; rebuild with a
-- larger `lists` value as the dataset grows.
CREATE INDEX IF NOT EXISTS article_embedding_idx
  ON "Article"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
