const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  content: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['user_admin', 'ai_bot'],
    default: 'user_admin',
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);