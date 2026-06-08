const router = require('express').Router();
const { chat, getAiHistory } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/chat', chat);
router.get('/history', getAiHistory);

module.exports = router;