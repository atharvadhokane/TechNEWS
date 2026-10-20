const express = require('express');
const { getPreferences, updatePreferences } = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

module.exports = router;
