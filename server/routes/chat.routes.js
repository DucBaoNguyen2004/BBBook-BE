const router = require('express').Router();
const Message = require('../models/Message.model');
const User = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');

// Lay danh sach tat ca user de chat (tru chinh minh)
router.get('/users', protect, async (req, res) => {
  try {
    const users = await User.find({ 
      _id: { $ne: req.user._id } 
    }).select('name email role');

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Lay lich su chat giua 2 user
router.get('/history/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      type: 'user_admin',
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    })
    .populate('sender', 'name role')
    .sort({ createdAt: 1 })
    .limit(100);

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Lay danh sach cac cuoc tro chuyen cua minh
router.get('/conversations', protect, async (req, res) => {
  try {
    // Tim tat ca tin nhan lien quan den user nay
    const messages = await Message.find({
      type: 'user_admin',
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id },
      ],
    }).sort({ createdAt: -1 });

    // Lay user id cua tung cuoc tro chuyen
    const conversationMap = new Map();

    for (const msg of messages) {
      const otherUserId = msg.sender.toString() === req.user._id.toString()
        ? msg.receiver.toString()
        : msg.sender.toString();

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          isRead: msg.isRead,
        });
      }
    }

    // Lay thong tin user tu cac id
    const userIds = Array.from(conversationMap.keys());
    const users = await User.find({ 
      _id: { $in: userIds } 
    }).select('name email role');

    const result = users.map(user => ({
      user,
      lastMessage: conversationMap.get(user._id.toString())?.lastMessage,
      lastTime: conversationMap.get(user._id.toString())?.lastTime,
      isRead: conversationMap.get(user._id.toString())?.isRead,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Danh dau da doc tin nhan
router.patch('/read/:senderId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { 
        sender: req.params.senderId, 
        receiver: req.user._id, 
        isRead: false 
      },
      { isRead: true }
    );
    res.json({ success: true, message: 'Da doc.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;