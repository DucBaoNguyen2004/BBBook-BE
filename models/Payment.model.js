const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  stripePaymentIntentId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: { 
    type: Date 
  },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);