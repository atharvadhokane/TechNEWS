const { Queue } = require('bullmq');
const connection = require('../config/redis');

const QUEUE_NAME = 'ai-processing';

const aiProcessingQueue = new Queue(QUEUE_NAME, { connection });

/**
 * Enqueues an article for the full AI enrichment pipeline
 * (summary -> headline -> categorize -> tags -> embeddings -> trending score),
 * which the BullMQ worker (jobs/aiProcessing.worker.js) picks up and
 * forwards to the Python FastAPI ai-service.
 */
async function enqueueArticleProcessing(articleId) {
  return aiProcessingQueue.add(
    'process-article',
    { articleId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    }
  );
}

module.exports = { aiProcessingQueue, enqueueArticleProcessing, QUEUE_NAME };
