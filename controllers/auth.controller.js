const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('../services/email.service');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Hàm tạo JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc.' });
    }

    // Kiểm tra email đã tồn tại chưa
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký.'
      });
    }

    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      token,
      user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mật khẩu.' });
    }

    // Tìm user theo email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.'
      });
    }

    if (user.isTwoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await require('bcryptjs').hash(code, 10);
      user.twoFactorCode = hashedCode;
      user.twoFactorCodeExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      await user.save();
      await emailService.send2FAEmail(user.email, user.name, code);

      return res.json({
        success: true,
        message: 'Vui lòng kiểm tra email để nhận mã xác thực 2FA.',
        require2FA: true,
        userId: user._id
      });
    }

    const userToReturn = await User.findById(user._id);
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: userToReturn
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Lấy thông tin user đang đăng nhập
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

// Cập nhật thông tin
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body || {};
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true }
    );
    res.json({
      success: true,
      message: 'Cập nhật thành công!',
      user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin.' });
    }
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Thiếu credential từ Google.' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        // mật khẩu không bắt buộc đối với google auth
      });
    } else if (user.authProvider !== 'google') {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký bằng mật khẩu hoặc phương thức khác. Vui lòng đăng nhập theo cách thông thường.'
      });
    }

    if (user.isTwoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = await require('bcryptjs').hash(code, 10);
      user.twoFactorCode = hashedCode;
      user.twoFactorCodeExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      await user.save();
      await emailService.send2FAEmail(user.email, user.name, code);

      return res.json({
        success: true,
        message: 'Vui lòng kiểm tra email để nhận mã xác thực 2FA.',
        require2FA: true,
        userId: user._id
      });
    }

    const userToReturn = await User.findById(user._id);
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Đăng nhập Google thành công!',
      token,
      user: userToReturn
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- 2FA Functions ---

// Bật 2FA
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isTwoFactorEnabled = true;
    await user.save();
    return res.json({ success: true, message: 'Bật 2FA thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tắt 2FA
exports.disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isTwoFactorEnabled = false;
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpire = undefined;
    await user.save();
    return res.json({ success: true, message: 'Tắt 2FA thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xác thực 2FA khi đăng nhập
exports.verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body || {};

    if (!userId || !token) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    }

    const isMatch = await user.compare2FACode(token);
    if (!user.twoFactorCode || !isMatch) {
      return res.status(400).json({ success: false, message: 'Mã 2FA không chính xác.' });
    }

    if (user.twoFactorCodeExpire < new Date()) {
      return res.status(400).json({ success: false, message: 'Mã 2FA đã hết hạn.' });
    }

    // Xóa mã sau khi sử dụng thành công
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpire = undefined;
    await user.save();

    const userToReturn = await User.findById(user._id);
    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Xác thực 2FA thành công!',
      token: jwtToken,
      user: userToReturn
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
    res.json({
      success: true,
      message: `Đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản thành công.`,
      user
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
