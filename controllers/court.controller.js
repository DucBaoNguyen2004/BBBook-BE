const Court = require('../models/Court.model');
const Booking = require('../models/Booking.model');

// Lấy tất cả sân đang hoạt động
exports.getCourts = async (req, res) => {
  try {
    const courts = await Court.find({ isActive: true });
    res.json({ success: true, data: courts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy chi tiết 1 sân
exports.getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sân.' 
      });
    }
    res.json({ success: true, data: court });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy các slot đã bị đặt của sân theo ngày
exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng truyền ngày.' 
      });
    }

    const bookings = await Booking.find({
      court: req.params.id,
      date,
      status: { $in: ['pending', 'paid', 'confirmed'] },
    }).select('startTime endTime');

    res.json({ success: true, data: bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — Tạo sân mới
exports.createCourt = async (req, res) => {
  try {
    const { name, description, pricePerHour, openTime, closeTime, amenities } = req.body;

    const court = await Court.create({ 
      name, 
      description, 
      pricePerHour, 
      openTime, 
      closeTime, 
      amenities 
    });

    res.status(201).json({ 
      success: true, 
      message: 'Tạo sân thành công!', 
      data: court 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — Cập nhật sân
exports.updateCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );

    if (!court) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy sân.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Cập nhật thành công!', 
      data: court 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — Ẩn sân (không xóa hẳn)
exports.deleteCourt = async (req, res) => {
  try {
    await Court.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Đã ẩn sân.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};