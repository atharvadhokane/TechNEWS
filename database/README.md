# Database

This app uses PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector)
extension (for article embedding similarity search) via Prisma.

## Setup order

1. Start Postgres (see `docker-compose.yml` — uses the `pgvector/pgvector` image).
2. From `backend/`:
   ```bash
   npm install
   npm run prisma:migrate      # creates base tables from schema.prisma
   psql "$DATABASE_URL" -f ../database/migrations/001_enable_pgvector.sql
   npm run seed                # optional sample data
   ```

## Files

- `schema.prisma` — lives in `backend/src/prisma/schema.prisma` (Prisma requires
  the schema to sit inside the package that uses it); this folder holds
  everything Prisma migrate can't express natively.
- `migrations/001_enable_pgvector.sql` — enables the `vector` extension, adds
  the `embedding` column to `Article`, and creates an IVFFlat index for
  approximate nearest-neighbor search.
- `seed.js` — actual seed script lives in `backend/src/prisma/seed.js`
  (run via `npm run seed` from `backend/`).
