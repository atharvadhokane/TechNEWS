const prisma = require('../config/prisma');

/**
 * Returns a ranked list of articles for a user, combining their
 * stated category/tag preferences with (eventually) pgvector
 * similarity search over article embeddings.
 *
 * The pgvector nearest-neighbor query isn't expressible through the
 * Prisma client directly, so it's run as raw SQL against the
 * `embedding` column (see database/schema for the vector type).
 */
async function getRecommendationsForUser(userId, limit = 20) {
  const prefs = await prisma.userPreference.findUnique({ where: { userId } });

  if (!prefs || (prefs.categories.length === 0 && prefs.tags.length === 0)) {
    // No preferences yet — fall back to trending articles.
    return prisma.article.findMany({
      orderBy: { trendingScore: 'desc' },
      take: limit,
    });
  }

  const articles = await prisma.article.findMany({
    where: {
      OR: [
        prefs.categories.length ? { category: { in: prefs.categories } } : undefined,
        prefs.tags.length ? { tags: { hasSome: prefs.tags } } : undefined,
      ].filter(Boolean),
    },
    orderBy: [{ trendingScore: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });

  return articles;
}

/**
 * Example of a pgvector similarity query for "more like this" —
 * uncomment and adapt once the `embedding` column exists.
 *
 * async function getSimilarArticles(articleId, limit = 10) {
 *   return prisma.$queryRaw`
 *     SELECT a.* FROM "Article" a, "Article" src
 *     WHERE src.id = ${articleId} AND a.id != ${articleId}
 *     ORDER BY a.embedding <-> src.embedding
 *     LIMIT ${limit}
 *   `;
 * }
 */

module.exports = { getRecommendationsForUser };
