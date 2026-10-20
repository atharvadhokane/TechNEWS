const prisma = require('../config/prisma');
const recommendationService = require('../services/recommendation.service');

// GET /api/news?page=1&limit=20&category=AI
async function listArticles(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { category, tag } = req.query;

    const where = {
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: [{ trendingScore: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({ articles, page, limit, total });
  } catch (err) {
    next(err);
  }
}

// GET /api/news/:id
async function getArticle(req, res, next) {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  } catch (err) {
    next(err);
  }
}

// GET /api/news/search?q=...
// Simple text search; can be swapped for pgvector similarity search later.
async function searchArticles(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q query param is required' });

    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { headline: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 30,
      orderBy: { publishedAt: 'desc' },
    });

    res.json({ articles, query: q });
  } catch (err) {
    next(err);
  }
}

// GET /api/news/digest/today
async function getDailyDigest(req, res, next) {
  try {
    const digest = await prisma.digest.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { articles: true },
    });
    if (!digest) return res.status(404).json({ error: 'No digest available yet' });
    res.json({ digest });
  } catch (err) {
    next(err);
  }
}

// GET /api/news/recommendations (auth required)
async function getRecommendations(req, res, next) {
  try {
    const articles = await recommendationService.getRecommendationsForUser(req.user.userId);
    res.json({ articles });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listArticles,
  getArticle,
  searchArticles,
  getDailyDigest,
  getRecommendations,
};
