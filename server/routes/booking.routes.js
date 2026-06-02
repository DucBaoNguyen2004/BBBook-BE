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

const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

// Tất cả routes đều cần đăng nhập
router.use(protect);

router.post('/', [
  body('courtId').isMongoId().withMessage('ID sân không hợp lệ.'),
  body('date').isISO8601().withMessage('Ngày không hợp lệ (định dạng YYYY-MM-DD).'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Giờ bắt đầu không hợp lệ (HH:mm).'),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Giờ kết thúc không hợp lệ (HH:mm).'),
  validate
], createBooking);
router.get('/my', getMyBookings);

// Admin routes
router.get('/all', adminOnly, getAllBookings);
router.patch('/:id/status', adminOnly, updateBookingStatus);

router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;