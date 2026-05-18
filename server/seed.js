const mongoose = require('mongoose');
const User = require('./models/User.model');
const Court = require('./models/Court.model');
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(' Kết nối MongoDB');

  // Tạo admin
  const existing = await User.findOne({ email: 'admin@gmail.com' });
  if (!existing) {
    await User.create({
      name: 'Admin',
      email: 'admin@gmail.com',
      password: '123456',
      role: 'admin',
    });
    console.log(' Tạo admin thành công');
  }

  // Tạo 3 sân mẫu
  const courts = await Court.countDocuments();
  if (courts === 0) {
    await Court.insertMany([
      {
        name: 'Sân A1',
        description: 'Sân tiêu chuẩn, đèn chiếu sáng tốt',
        pricePerHour: 80000,
        openTime: '06:00',
        closeTime: '22:00',
        amenities: ['Đèn chiếu sáng', 'Quạt trần'],
      },
      {
        name: 'Sân A2',
        description: 'Sân có điều hòa, phù hợp thi đấu',
        pricePerHour: 120000,
        openTime: '06:00',
        closeTime: '22:00',
        amenities: ['Điều hòa', 'Đèn chiếu sáng', 'Ghế nghỉ'],
      },
      {
        name: 'Sân B1',
        description: 'Sân ngoài trời, thoáng mát',
        pricePerHour: 60000,
        openTime: '06:00',
        closeTime: '20:00',
        amenities: ['Thoáng mát', 'Bãi giữ xe'],
      },
    ]);
    console.log(' Tạo 3 sân mẫu thành công');
  }

  mongoose.disconnect();
  console.log(' Seed xong!');
};

seed().catch(console.error);