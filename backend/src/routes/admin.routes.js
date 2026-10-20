const express = require('express');
const { triggerFetch, reprocessArticle, getStats } = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);
router.post('/fetch-now', triggerFetch);
router.post('/reprocess/:articleId', reprocessArticle);
router.get('/stats', getStats);

module.exports = router;
