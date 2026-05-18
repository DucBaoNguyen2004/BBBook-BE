const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  'https://bb-book-fe.vercel.app',
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001'
];

// Khởi tạo Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Gắn io vào app để dùng ở nơi khác nếu cần
app.set('io', io);

// Khởi động socket handler
const { initSocket } = require('./socket/socket.handler');
initSocket(io);

// Webhook Stripe cần raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

// Routes
const authRoutes = require('./routes/auth.routes');
const courtRoutes = require('./routes/court.routes');
const bookingRoutes = require('./routes/booking.routes');
const paymentRoutes = require('./routes/payment.routes');
const chatRoutes = require('./routes/chat.routes');
const aiRoutes = require('./routes/ai.routes');
const statsRoutes = require('./routes/stats.routes');
const { startCronJobs } = require('./jobs/reminder.job');

app.use('/api/auth', authRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server đang chạy!' });
});

// Kết nối MongoDB và khởi động server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(' Kết nối MongoDB thành công');
    // Dùng httpServer thay vì app.listen
    httpServer.listen(PORT, () => {
      console.log(` Server chạy tại http://localhost:${PORT}`);
      console.log(`Socket.io sẵn sàng`);
      // Khởi động cron jobs sau khi server đã chạy
      startCronJobs();
    });
  })
  .catch((err) => {
    console.error(' Lỗi kết nối MongoDB:', err.message);
    process.exit(1);
  });