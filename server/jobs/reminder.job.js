const cron = require('node-cron');
const Booking = require('../models/Booking.model');
const { sendReminderEmail } = require('../services/email.service');

exports.startCronJobs = () => {

  // Chay moi 30 phut, kiem tra booking sap dien ra trong 2 gio toi
  cron.schedule('*/30 * * * *', async () => {
    try {
      const now = new Date();

      // Tinh thoi gian 2 gio sau
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const todayStr = now.toISOString().split('T')[0];

      // Lay gio hien tai va gio 2 gio sau dang HH:MM
      const pad = (n) => String(n).padStart(2, '0');
      const currentHHMM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const targetHHMM = `${pad(twoHoursLater.getHours())}:${pad(twoHoursLater.getMinutes())}`;

      console.log(`Kiem tra nhac lich: ${currentHHMM} - ${targetHHMM}`);

      // Tim booking hom nay, da xac nhan, chua gui nhac, sap bat dau trong 2 gio
      const bookings = await Booking.find({
        date: todayStr,
        status: 'confirmed',
        reminderSent: false,
        startTime: { 
          $gte: currentHHMM, 
          $lte: targetHHMM 
        },
      }).populate(['user', 'court']);

      for (const booking of bookings) {
        await sendReminderEmail(booking);
        booking.reminderSent = true;
        await booking.save();
        console.log(`Da gui nhac lich cho: ${booking.user.email}`);
      }

      if (bookings.length === 0) {
        console.log('Khong co lich nao can nhac.');
      }

    } catch (err) {
      console.error('Cron job loi:', err.message);
    }
  });

  console.log('Cron job nhac lich dang chay (moi 30 phut)');
};