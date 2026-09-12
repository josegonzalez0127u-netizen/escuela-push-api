const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription invalid' });
    }

    const key = 'sub_' + Buffer.from(subscription.endpoint).toString('base64url');

    await redis.set(key, JSON.stringify(subscription));

    const keys = await redis.keys('sub_*');

    return res.status(200).json({
      success: true,
      status: 'registered',
      totalSubscribers: keys.length
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: error.message });
  }
};
