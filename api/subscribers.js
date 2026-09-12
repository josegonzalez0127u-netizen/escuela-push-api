const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  try {
    const keys = await kv.keys('sub_*');
    return res.status(200).json({ success: true, count: keys.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
