const prisma = require('../config/prisma');

// GET /api/users/preferences
async function getPreferences(req, res, next) {
  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId: req.user.userId },
    });
    res.json({ preferences: prefs || { categories: [], tags: [] } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/preferences
async function updatePreferences(req, res, next) {
  try {
    const { categories = [], tags = [] } = req.body;

    const prefs = await prisma.userPreference.upsert({
      where: { userId: req.user.userId },
      update: { categories, tags },
      create: { userId: req.user.userId, categories, tags },
    });

    res.json({ preferences: prefs });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPreferences, updatePreferences };
