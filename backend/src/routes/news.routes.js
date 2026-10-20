const express = require('express');
const {
  listArticles,
  getArticle,
  searchArticles,
  getDailyDigest,
  getRecommendations,
} = require('../controllers/news.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', listArticles);
router.get('/search', searchArticles);
router.get('/digest/today', getDailyDigest);
router.get('/recommendations', requireAuth, getRecommendations);
router.get('/:id', getArticle);

module.exports = router;
