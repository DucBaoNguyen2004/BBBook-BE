const Booking = require('../models/Booking.model');
const Court = require('../models/Court.model');
const User = require('../models/User.model');

exports.getAdminStats = async (req, res) => {
  try {
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const totalBookings = await Booking.countDocuments();
    const activeCourts = await Court.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Lấy doanh thu 7 ngày gần nhất
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = await Booking.aggregate([
        { $match: { date: dateStr, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);

      last7Days.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        value: dayRevenue[0]?.total || 0
      });
    }

    const recentActivities = await Booking.find()
      .populate('user', 'name')
      .populate('court', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: [
          { label: "Total Revenue", value: `${(totalRevenue[0]?.total || 0).toLocaleString()}đ`, change: "+10%", icon: "TrendingUp" },
          { label: "Total Bookings", value: totalBookings.toString(), change: "Last 30 days", icon: "BookOpen" },
          { label: "Active Courts", value: `${activeCourts}/12`, progress: (activeCourts/12)*100, icon: "CalendarOff" },
          { label: "Total Users", value: totalUsers.toString(), pulse: true, icon: "Mail" },
        ],
        chartData: last7Days,
        recentActivities: recentActivities.map(b => ({
          id: b._id,
          type: b.status === 'confirmed' ? 'confirmed' : (b.status === 'cancelled' ? 'cancelled' : 'payment'),
          title: `Booking ${b.status.charAt(0).toUpperCase() + b.status.slice(1)}`,
          detail: `${b.court.name} • ${b.user.name}`,
          time: "Recently",
          status: b.status.charAt(0).toUpperCase() + b.status.slice(1)
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
