const prisma = require('../config/prisma');

/**
 * Selects the top trending/enriched articles from the last 24 hours
 * and bundles them into a Digest record, matching the
 * "GenerateDailyDigest" step in the activity diagram.
 */
async function generateDailyDigest() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const topArticles = await prisma.article.findMany({
    where: { status: 'ENRICHED', publishedAt: { gte: since } },
    orderBy: { trendingScore: 'desc' },
    take: 10,
  });

  if (topArticles.length === 0) {
    console.log('[digest] No enriched articles in the last 24h — skipping digest');
    return null;
  }

  const digest = await prisma.digest.create({
    data: {
      title: `Daily Digest - ${new Date().toISOString().slice(0, 10)}`,
      articles: { connect: topArticles.map((a) => ({ id: a.id })) },
    },
    include: { articles: true },
  });

  console.log(`[digest] Created digest ${digest.id} with ${topArticles.length} articles`);
  return digest;
}

module.exports = { generateDailyDigest };
