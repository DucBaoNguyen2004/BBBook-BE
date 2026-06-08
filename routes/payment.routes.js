
const router = require('express').Router();
const { 
  createCheckoutSession, 
  handleWebhook, 
  verifyPayment 
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// Webhook không cần auth — Stripe tự gọi
// Phải đặt TRƯỚC middleware json vì cần raw body
router.post('/webhook', handleWebhook);

// Các route cần đăng nhập
router.use(protect);
router.post('/checkout', createCheckoutSession);
router.post('/sync', require('../controllers/payment.controller').syncPayment);
router.get('/verify/:bookingId', verifyPayment);

module.exports = router;