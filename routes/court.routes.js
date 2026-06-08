const router = require('express').Router();
const {
  getCourts,
  getCourtById,
  getBookedSlots,
  createCourt,
  updateCourt,
  deleteCourt,
} = require('../controllers/court.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Public — ai cũng xem được
router.get('/', getCourts);
router.get('/:id', getCourtById);
router.get('/:id/booked-slots', getBookedSlots);

// Admin only
router.post('/', protect, adminOnly, createCourt);
router.put('/:id', protect, adminOnly, updateCourt);
router.delete('/:id', protect, adminOnly, deleteCourt);

module.exports = router;