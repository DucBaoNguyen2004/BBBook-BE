const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email xac nhan dat san thanh cong
exports.sendBookingConfirmEmail = async (booking) => {
  const mailOptions = {
    from: `"San Cau Long" <${process.env.EMAIL_USER}>`,
    to: booking.user.email,
    subject: `Xac nhan dat san ${booking.court.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Dat san thanh cong!</h2>
        <p>Xin chao <strong>${booking.user.name}</strong>,</p>
        <p>Thanh toan cua ban da duoc xac nhan. Day la thong tin lich dat:</p>
        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>San:</strong> ${booking.court.name}</p>
          <p><strong>Ngay:</strong> ${booking.date}</p>
          <p><strong>Gio:</strong> ${booking.startTime} - ${booking.endTime}</p>
          <p><strong>Tong tien:</strong> ${booking.totalPrice.toLocaleString('vi-VN')} VND</p>
        </div>
        <p>Vui long den dung gio. Neu can ho tro, chat voi chung toi tren website.</p>
        <p style="color: #6b7280; font-size: 14px;">Cam on ban da su dung dich vu!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Email nhac lich truoc 2 gio
exports.sendReminderEmail = async (booking) => {
  const mailOptions = {
    from: `"San Cau Long" <${process.env.EMAIL_USER}>`,
    to: booking.user.email,
    subject: `Nhac lich: San ${booking.court.name} luc ${booking.startTime} hom nay`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">Nhac nho lich dat san</h2>
        <p>Xin chao <strong>${booking.user.name}</strong>,</p>
        <p>Ban co lich dat san sap toi trong 2 gio nua:</p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>San:</strong> ${booking.court.name}</p>
          <p><strong>Ngay:</strong> ${booking.date}</p>
          <p><strong>Gio:</strong> ${booking.startTime} - ${booking.endTime}</p>
          <p><strong>Tong tien:</strong> ${booking.totalPrice.toLocaleString('vi-VN')} VND</p>
        </div>
        <p>Vui long chuan bi va den dung gio.</p>
        <p style="color: #6b7280; font-size: 14px;">Neu can huy lich, vao trang Lich cua toi tren website.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Email thong bao huy lich
exports.sendCancelEmail = async (booking) => {
  const mailOptions = {
    from: `"San Cau Long" <${process.env.EMAIL_USER}>`,
    to: booking.user.email,
    subject: `Huy lich dat san ${booking.court.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Lich dat san da bi huy</h2>
        <p>Xin chao <strong>${booking.user.name}</strong>,</p>
        <p>Lich dat san sau da duoc huy thanh cong:</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <p><strong>San:</strong> ${booking.court.name}</p>
          <p><strong>Ngay:</strong> ${booking.date}</p>
          <p><strong>Gio:</strong> ${booking.startTime} - ${booking.endTime}</p>
        </div>
        <p>Neu ban can dat lai lich, vui long vao website cua chung toi.</p>
        <p style="color: #6b7280; font-size: 14px;">Cam on ban da su dung dich vu!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Email gui ma 2FA
exports.send2FAEmail = async (email, name, code) => {
  const mailOptions = {
    from: `"San Cau Long" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Ma xac thuc 2 buoc (2FA)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3b82f6;">Xac thuc dang nhap</h2>
        <p>Xin chao <strong>${name}</strong>,</p>
        <p>Ban dang yeu cau dang nhap vao he thong. Day la ma xac thuc cua ban:</p>
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center;">
          ${code}
        </div>
        <p>Ma nay co hieu luc trong 5 phut. Vui long khong chia se ma nay voi bat ky ai.</p>
        <p style="color: #6b7280; font-size: 14px;">Neu ban khong yeu cau dang nhap, vui long doi mat khau ngay lap tuc.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};