const express = require('express');
const {
  listBookmarks,
  addBookmark,
  removeBookmark,
} = require('../controllers/bookmark.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listBookmarks);
router.post('/', addBookmark);
router.delete('/:articleId', removeBookmark);

module.exports = router;
