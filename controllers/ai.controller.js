const OpenAI = require('openai');
const Court = require('../models/Court.model');
const Message = require('../models/Message.model');

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Danh sach model theo thu tu uu tien, tu dong fallback khi het quota
const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
'meta-llama/llama-3.2-3b-instruct:free',
'qwen/qwen3-coder:free',
'google/gemma-4-31b-it:free',
];

// Ham goi AI voi tu dong fallback
const callAI = async (messages) => {
  for (const model of MODELS) {
    try {
      console.log(`Dang thu model: ${model}`);
      const response = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 500,
      });
      console.log(`Thanh cong voi model: ${model}`);
      return response.choices[0].message.content;
    } catch (err) {
      // Them dong nay de xem loi cu the
      console.log(`Model ${model} that bai:`, err.status, err.message);
      continue;
    }
  }
  throw new Error('Tat ca model deu that bai, thu lai sau.');
};

exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui long nhap tin nhan.' 
      });
    }

    // Lay thong tin san lam context
    const courts = await Court.find({ isActive: true })
      .select('name pricePerHour openTime closeTime amenities description');

    const courtsInfo = courts.map(c =>
      `- ${c.name}: ${c.pricePerHour.toLocaleString('vi-VN')} VND/gio, mo cua ${c.openTime} - ${c.closeTime}, tien ich: ${c.amenities.join(', ')}`
    ).join('\n');

    const systemPrompt = `Ban la tro ly AI cua san cau long. Nhiem vu cua ban la ho tro khach hang dat san, tra cuu lich, tu van gia ca.

Thong tin cac san hien co:
${courtsInfo}

Quy tac tra loi:
- Luon tra loi bang tieng Viet, than thien va ngan gon
- Neu khach hoi san trong, huong dan chon ngay va gio tren trang dat lich
- Neu khach muon huy lich, huong dan vao trang Lich cua toi
- Neu khach hoi gia, tra loi chinh xac theo thong tin san
- Khong bịa dat thong tin khong co trong du lieu`;

    // Ghep system prompt + history + tin nhan moi
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    // Goi AI voi tu dong fallback
    const aiReply = await callAI(messages);

    // Luu tin nhan vao database
    await Message.create({ 
      sender: req.user._id, 
      content: message, 
      type: 'ai_bot' 
    });

    res.json({ success: true, reply: aiReply });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAiHistory = async (req, res) => {
  try {
    const messages = await Message.find({
      sender: req.user._id,
      type: 'ai_bot',
    })
    .sort({ createdAt: 1 })
    .limit(50);

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}; 
