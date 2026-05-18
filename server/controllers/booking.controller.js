const Booking = require('../models/Booking.model');
const Court = require('../models/Court.model');

// Kiểm tra slot có bị trùng không
const isSlotAvailable = async (courtId, date, startTime, endTime, excludeId = null) => {
  const query = {
    court: courtId,
    date,
    status: { $in: ['pending', 'paid', 'confirmed'] },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ],
  };
  if (excludeId) query._id = { $ne: excludeId };
  const conflict = await Booking.findOne(query);
  return !conflict;
};

// Tạo booking mới
exports.createBooking = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, notes } = req.body;

    // Kiểm tra sân tồn tại không
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sân.' 
      });
    }

    // Kiểm tra slot có trùng không
    const available = await isSlotAvailable(courtId, date, startTime, endTime);
    if (!available) {
      return res.status(409).json({ 
        success: false, 
        message: 'Slot này đã được đặt. Vui lòng chọn giờ khác.' 
      });
    }

    // Tính số giờ và tổng tiền
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    const totalPrice = totalHours * court.pricePerHour;

    const booking = await Booking.create({
      user: req.user._id,
      court: courtId,
      date,
      startTime,
      endTime,
      totalHours,
      totalPrice,
      notes,
    });

    await booking.populate(['user', 'court']);

    res.status(201).json({ 
      success: true, 
      message: 'Đặt sân thành công!', 
      data: booking 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy danh sách booking của user đang đăng nhập
exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('court', 'name pricePerHour images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);

    res.json({ 
      success: true, 
      data: bookings,
      pagination: { 
        total, 
        page: Number(page), 
        pages: Math.ceil(total / limit) 
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 booking
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('court', 'name pricePerHour')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy booking.' 
      });
    }

    // Chỉ user sở hữu hoặc admin mới xem được
    if (
      booking.user._id.toString() !== req.user._id.toString() && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền truy cập.' 
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Huỷ booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy booking.' 
      });
    }

    // Chỉ user sở hữu mới huỷ được
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền.' 
      });
    }

    // Chỉ huỷ được khi đang pending hoặc paid
    if (!['pending', 'paid'].includes(booking.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể huỷ booking này.' 
      });
    }

    booking.status = 'cancelled';
    booking.cancelReason = req.body.reason || 'User huỷ';
    await booking.save();

    res.json({ 
      success: true, 
      message: 'Huỷ booking thành công!', 
      data: booking 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [ADMIN] Lấy tất cả các đơn đặt lịch
exports.getAllBookings = async (req, res) => {
  try {
    const { status, courtId, date, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (courtId) query.court = courtId;
    if (date) query.date = date;

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('court', 'name pricePerHour')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Booking.countDocuments(query);
    res.json({ success: true, data: bookings, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [ADMIN] Cập nhật trạng thái booking
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking.' });
    if (!['pending', 'paid', 'confirmed', 'cancelled', 'completed'].includes(status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
    booking.status = status;
    await booking.save();
    res.json({ success: true, message: `Cập nhật trạng thái sang ${status} thành công!`, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};