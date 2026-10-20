const prisma = require('../config/prisma');

// GET /api/bookmarks
async function listBookmarks(req, res, next) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.userId },
      include: { article: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
}

// POST /api/bookmarks  { articleId }
async function addBookmark(req, res, next) {
  try {
    const { articleId } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required' });

    const bookmark = await prisma.bookmark.upsert({
      where: { userId_articleId: { userId: req.user.userId, articleId } },
      update: {},
      create: { userId: req.user.userId, articleId },
    });

    res.status(201).json({ bookmark });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/bookmarks/:articleId
async function removeBookmark(req, res, next) {
  try {
    await prisma.bookmark.delete({
      where: {
        userId_articleId: { userId: req.user.userId, articleId: req.params.articleId },
      },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listBookmarks, addBookmark, removeBookmark };
