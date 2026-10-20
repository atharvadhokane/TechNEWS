const prisma = require('../config/prisma');
const { fetchNewsNow } = require('../services/newsFetch.service');
const { enqueueArticleProcessing } = require('../services/queue.service');

// POST /api/admin/fetch-now — manually trigger the news fetch pipeline
async function triggerFetch(req, res, next) {
  try {
    const result = await fetchNewsNow();
    res.json({ message: 'Fetch triggered', ...result });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/reprocess/:articleId — re-run AI enrichment on one article
async function reprocessArticle(req, res, next) {
  try {
    const article = await prisma.article.findUnique({ where: { id: req.params.articleId } });
    if (!article) return res.status(404).json({ error: 'Article not found' });

    await enqueueArticleProcessing(article.id);
    res.json({ message: 'Article queued for reprocessing', articleId: article.id });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/stats
async function getStats(req, res, next) {
  try {
    const [userCount, articleCount, digestCount] = await Promise.all([
      prisma.user.count(),
      prisma.article.count(),
      prisma.digest.count(),
    ]);
    res.json({ userCount, articleCount, digestCount });
  } catch (err) {
    next(err);
  }
}

module.exports = { triggerFetch, reprocessArticle, getStats };
