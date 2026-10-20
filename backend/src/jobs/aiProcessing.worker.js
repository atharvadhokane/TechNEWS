require('dotenv').config();
const { Worker } = require('bullmq');
const axios = require('axios');
const connection = require('../config/redis');
const prisma = require('../config/prisma');
const { QUEUE_NAME } = require('../services/queue.service');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Runs the LLMProcessing sub-flow from the activity diagram for a
 * single article: summary -> headline -> categorize -> tags ->
 * embeddings -> trending score, then persists everything and marks
 * the article as enriched.
 *
 * This worker is meant to run as its own process/container
 * (the "BullMQ Worker Container" in the deployment diagram):
 *   node src/jobs/aiProcessing.worker.js
 */
async function processArticle(articleId) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`Article ${articleId} not found`);

  const { data } = await axios.post(`${AI_SERVICE_URL}/process-article`, {
    id: article.id,
    title: article.title,
    content: article.rawContent,
    url: article.url,
  });

  await prisma.$transaction(async (tx) => {
    await tx.article.update({
      where: { id: article.id },
      data: {
        summary: data.summary,
        headline: data.headline,
        category: data.category,
        tags: data.tags || [],
        trendingScore: data.trendingScore ?? 0,
        status: 'ENRICHED',
      },
    });

    // Prisma does not expose pgvector columns in its generated model, so
    // persist the embedding with parameterized raw SQL instead.
    if (Array.isArray(data.embedding) && data.embedding.length > 0) {
      const dimensions = Number.parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);
      if (data.embedding.length !== dimensions) {
        throw new Error(
          `Embedding has ${data.embedding.length} dimensions, but the database is configured for ${dimensions}`
        );
      }

      const vector = JSON.stringify(data.embedding);
      if (dimensions === 768) {
        await tx.$executeRaw`
          UPDATE "Article"
          SET embedding_legacy_768 = ${vector}::vector
          WHERE id = ${article.id}
        `;
      } else if (dimensions === 1536) {
        await tx.$executeRaw`
          UPDATE "Article"
          SET embedding = ${vector}::vector
          WHERE id = ${article.id}
        `;
      } else {
        throw new Error(`Unsupported embedding dimension: ${dimensions}`);
      }
    }
  });

  return data;
}

// AI_JOB_CONCURRENCY: how many articles get processed at once. Each
// article makes several sequential AI calls (summary, headline,
// category, tags, embedding), so concurrency=1 means those calls never
// overlap with another article's -- articles are enriched strictly one
// at a time instead of firing requests in parallel bursts.
//
// AI_JOBS_PER_MINUTE: a coarse extra cap on job starts, so a pile of
// newly-fetched articles doesn't start one job immediately after
// another. This is a backstop, not the real throttle -- the actual
// per-call Gemini rate limiting (RPM + daily cap) lives in
// ai-service/app/utils/ai_client.py, since each job fires up to 5
// separate Gemini calls and needs to be paced at that level, not just
// at the job level. Keep this at/below GEMINI_RPM/5 as a rough guide so
// this cap doesn't accidentally become the binding one.
const AI_JOB_CONCURRENCY = parseInt(process.env.AI_JOB_CONCURRENCY || '1', 10);
const AI_JOBS_PER_MINUTE = parseInt(process.env.AI_JOBS_PER_MINUTE || '3', 10);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { articleId } = job.data;
    console.log(`[worker] Processing article ${articleId}`);
    return processArticle(articleId);
  },
  {
    connection,
    concurrency: AI_JOB_CONCURRENCY,
    // AI enrichment can wait on rate limits and external provider calls.
    // Give BullMQ more than its 30s default before treating a slow worker as
    // stalled; the lock is still renewed automatically while the job runs.
    lockDuration: 120_000,
    stalledInterval: 30_000,
    limiter: {
      max: AI_JOBS_PER_MINUTE,
      duration: 60_000,
    },
  }
);

worker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err.message));
worker.on('stalled', (jobId) => console.error(`[worker] Job ${jobId} stalled; it will be retried`));
worker.on('error', (err) => console.error('[worker] BullMQ error:', err.message));

module.exports = worker;
