const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');
const { sendBookingConfirmEmail } = require('../services/email.service');
// Tạo Stripe Checkout Session
exports.createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Tìm booking
    const booking = await Booking.findById(bookingId).populate('court');
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking không tồn tại.' 
      });
    }

    // Chỉ user sở hữu mới thanh toán được
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Không có quyền.' 
      });
    }

    // Chỉ thanh toán khi status là pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking này không thể thanh toán.' 
      });
    }

    // Tạo Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'vnd',
            product_data: {
              name: `Đặt sân ${booking.court.name}`,
              description: `Ngày ${booking.date} | ${booking.startTime} - ${booking.endTime}`,
            },
            unit_amount: booking.totalPrice,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/my-bookings?payment_success=true&session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`,
      cancel_url: `${process.env.CLIENT_URL}/court/${booking.court._id}`,
      metadata: {
        bookingId: bookingId.toString(),
        userId: req.user._id.toString(),
      },
    });

    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đồng bộ trạng thái thanh toán thủ công (rất hữu ích khi test ở localhost không có Webhook)
exports.syncPayment = async (req, res) => {
  try {
    const { sessionId, bookingId } = req.body;
    
    if (!sessionId || !bookingId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin.' });
    }

    // Lấy thông tin session từ Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const booking = await Booking.findById(bookingId).populate(['user', 'court']);
      
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking không tồn tại.' });
      }

      if (booking.status === 'pending') {
        // Tạo bản ghi Payment nếu chưa có
        let payment = await Payment.findOne({ stripePaymentIntentId: session.payment_intent });
        
        if (!payment) {
          payment = await Payment.create({
            booking: bookingId,
            user: booking.user._id,
            stripePaymentIntentId: session.payment_intent,
            amount: session.amount_total,
            status: 'succeeded',
            paidAt: new Date(),
          });
        }

        // Cập nhật trạng thái booking thành confirmed
        booking.status = 'confirmed';
        booking.payment = payment._id;
        await booking.save();
        
        await sendBookingConfirmEmail(booking);
        console.log(' Đã đồng bộ thanh toán thành công cho booking:', bookingId);
      }
      
      return res.json({ success: true, message: 'Đồng bộ thành công.' });
    }

    res.json({ success: false, message: 'Chưa thanh toán.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Stripe Webhook — tự động gọi khi thanh toán xong
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(' Webhook lỗi:', err.message);
    return res.status(400).json({ message: 'Webhook không hợp lệ.' });
  }

  // Xử lý khi thanh toán thành công
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { bookingId, userId } = session.metadata;

    try {
      const booking = await Booking.findById(bookingId).populate(['user', 'court']);
      if (booking && booking.status === 'pending') {
        // Tạo bản ghi Payment
        const payment = await Payment.create({
          booking: bookingId,
          user: userId,
          stripePaymentIntentId: session.payment_intent,
          amount: session.amount_total,
          status: 'succeeded',
          paidAt: new Date(),
        });

        // Cập nhật trạng thái booking thành confirmed
        booking.status = 'confirmed';
        booking.payment = payment._id;
        await booking.save();
        
        await sendBookingConfirmEmail(booking);
        console.log(' Thanh toán thành công từ Webhook, booking:', bookingId);
      }
    } catch (err) {
      console.error(' Lỗi xử lý webhook:', err);
    }
  }

  res.json({ received: true });
};

// Kiểm tra trạng thái booking sau khi thanh toán
exports.verifyPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate('court', 'name pricePerHour')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy booking.' 
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};