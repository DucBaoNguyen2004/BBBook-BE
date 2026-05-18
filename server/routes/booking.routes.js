const router = require('express').Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
  updateBookingStatus,
} = require('../controllers/booking.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Tất cả routes đều cần đăng nhập
router.use(protect);

router.post('/', createBooking);
router.get('/my', getMyBookings);

// Admin routes
router.get('/all', adminOnly, getAllBookings);
router.patch('/:id/status', adminOnly, updateBookingStatus);

router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;