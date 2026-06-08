const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  images: [{ 
    type: String 
  }],
  pricePerHour: { 
    type: Number, 
    required: true 
  },
  openTime: { 
    type: String, 
    default: '06:00' 
  },
  closeTime: { 
    type: String, 
    default: '22:00' 
  },
  amenities: [{ 
    type: String 
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

module.exports = mongoose.model('Court', courtSchema);