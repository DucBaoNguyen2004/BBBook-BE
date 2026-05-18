const jwt = require('jsonwebtoken');
const Message = require('../models/Message.model');
const User = require('../models/User.model');

const onlineUsers = new Map();

exports.initSocket = (io) => {

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Chua dang nhap'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User khong ton tai'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Token khong hop le'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Gui danh sach user online cho tat ca
    io.emit('online:list', Array.from(onlineUsers.keys()));
    console.log(`${socket.user.name} ket noi | Online: ${onlineUsers.size}`);

    // Gui tin nhan den bat ky user nao
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, content } = data;

        // Kiem tra nguoi nhan co ton tai khong
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit('error', { message: 'Nguoi nhan khong ton tai.' });
        }

        // Luu vao database
        const message = await Message.create({
          sender: socket.user._id,
          receiver: receiverId,
          content,
          type: 'user_admin',
        });

        await message.populate('sender', 'name role');

        // Gui den nguoi nhan neu dang online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', message);
        }

        // Gui lai cho nguoi gui de hien thi
        socket.emit('message:sent', message);

      } catch (err) {
        socket.emit('error', { message: 'Gui tin nhan that bai.' });
      }
    });

    // Dang go
    socket.on('typing:start', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:start', { 
          userId, 
          name: socket.user.name 
        });
      }
    });

    socket.on('typing:stop', ({ receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing:stop', { userId });
      }
    });

    // Ngat ket noi
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('online:list', Array.from(onlineUsers.keys()));
      console.log(`${socket.user.name} offline | Online: ${onlineUsers.size}`);
    });
  });
};

exports.onlineUsers = onlineUsers;