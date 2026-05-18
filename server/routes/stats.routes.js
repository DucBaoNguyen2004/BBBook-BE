const router = require('express').Router();
const { getAdminStats } = require('../controllers/stats.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.get('/', protect, adminOnly, getAdminStats);

module.exports = router;
