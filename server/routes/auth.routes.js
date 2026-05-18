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

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

router.post('/google-login', googleLogin);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/verify-login', verify2FALogin);

// Admin routes
router.get('/', protect, adminOnly, require('../controllers/auth.controller').getAllUsers);
router.patch('/:id/status', protect, adminOnly, require('../controllers/auth.controller').updateUserStatus);

module.exports = router;