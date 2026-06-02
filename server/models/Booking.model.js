const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true
  },
  date: {
    type: String,
    required: true   // VD: "2024-03-15"
  },
  startTime: {
    type: String,
    required: true   // VD: "08:00"
  },
  endTime: {
    type: String,
    required: true   // VD: "10:00"
  },
  totalHours: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  notes: {
    type: String,
    default: ''
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  slots: {
    type: [String], // VD: ["2024-03-15-courtId-08:00", "2024-03-15-courtId-08:30"]
    required: true
  }
}, { timestamps: true });

// Index giúp query nhanh hơn và ngăn chặn race condition
bookingSchema.index({ court: 1, date: 1, slots: 1 }, { unique: true });
bookingSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);