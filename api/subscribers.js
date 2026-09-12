const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  try {
    const keys = await redis.keys('sub_*');
    return res.status(200).json({ success: true, count: keys.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
