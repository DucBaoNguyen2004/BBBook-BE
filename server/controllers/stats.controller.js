const Booking = require('../models/Booking.model');
const Court = require('../models/Court.model');
const User = require('../models/User.model');

exports.getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];

    // Sử dụng Promise.all để chạy các query song song
    const [bookingStats, activeCourts, totalUsers, recentActivities] = await Promise.all([
      // Aggregation 1: Tất cả thống kê từ Booking
      Booking.aggregate([
        {
          $facet: {
            totalRevenue: [
              { $match: { status: 'paid' } },
              { $group: { _id: null, total: { $sum: '$totalPrice' } } }
            ],
            totalBookingsCount: [
              { $count: 'count' }
            ],
            last7DaysRevenue: [
              {
                $match: {
                  date: { $gte: startDateStr, $lte: endDateStr },
                  status: 'paid'
                }
              },
              { $group: { _id: '$date', total: { $sum: '$totalPrice' } } }
            ]
          }
        }
      ]),
      // Các query khác
      Court.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'user' }),
      Booking.find()
        .populate('user', 'name')
        .populate('court', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const result = bookingStats[0];
    const totalRevValue = result.totalRevenue[0]?.total || 0;
    const totalBookings = result.totalBookingsCount[0]?.count || 0;

    // Mapping chart data 7 ngày
    const revenueMap = new Map(result.last7DaysRevenue.map(item => [item._id, item.total]));
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      chartData.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        value: revenueMap.get(dateStr) || 0
      });
    }

    res.json({
      success: true,
      data: {
        stats: [
          { label: "Total Revenue", value: `${totalRevValue.toLocaleString()}đ`, change: "+10%", icon: "TrendingUp" },
          { label: "Total Bookings", value: totalBookings.toString(), change: "Last 30 days", icon: "BookOpen" },
          { label: "Active Courts", value: `${activeCourts}/12`, progress: (activeCourts / 12) * 100, icon: "CalendarOff" },
          { label: "Total Users", value: totalUsers.toString(), pulse: true, icon: "Mail" },
        ],
        chartData,
        recentActivities: recentActivities.map(b => ({
          id: b._id,
          type: b.status === 'confirmed' ? 'confirmed' : (b.status === 'cancelled' ? 'cancelled' : 'payment'),
          title: `Booking ${b.status.charAt(0).toUpperCase() + b.status.slice(1)}`,
          detail: `${b.court?.name || 'Unknown Court'} • ${b.user?.name || 'Unknown User'}`,
          time: "Recently",
          status: b.status.charAt(0).toUpperCase() + b.status.slice(1)
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
