const router = require('express').Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  googleLogin,
  enable2FA,
  disable2FA,
  verify2FALogin
} = require('../controllers/auth.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Giới hạn 5 lần thử xác thực 2FA trong 15 phút
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Quá nhiều lần thử sai. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

router.post('/register', [
  body('email').isEmail().withMessage('Email không hợp lệ.'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu phải từ 6 ký tự trở lên.'),
  body('name').notEmpty().withMessage('Tên là bắt buộc.'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Email không hợp lệ.'),
  body('password').notEmpty().withMessage('Mật khẩu là bắt buộc.'),
  validate
], login);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

router.post('/google-login', googleLogin);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/verify-login', [
  body('userId').isMongoId().withMessage('ID không hợp lệ.'),
  body('token').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Mã 2FA phải là 6 chữ số.'),
  twoFactorLimiter,
  validate
], verify2FALogin);

// Admin routes
router.get('/', protect, adminOnly, require('../controllers/auth.controller').getAllUsers);
router.patch('/:id/status', protect, adminOnly, require('../controllers/auth.controller').updateUserStatus);

module.exports = router;