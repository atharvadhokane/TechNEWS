-- Align the primary embedding column with OpenAI text-embedding-3-small
-- (1536 dimensions). If the existing column is vector(768), retain it
-- under a legacy name instead of discarding its values.
--
-- Safe to rerun: the old column is renamed only when it still exists as
-- vector(768); the new column and index are created only when missing.

BEGIN;

DROP INDEX IF EXISTS article_embedding_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = '"Article"'::regclass
      AND a.attname = 'embedding'
      AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) = 'vector(768)'
  ) THEN
    ALTER TABLE "Article" RENAME COLUMN embedding TO embedding_legacy_768;
  END IF;
END
$$;

ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS article_embedding_idx
  ON "Article"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMIT;
