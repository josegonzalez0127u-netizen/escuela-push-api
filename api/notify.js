const webpush = require('web-push');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, body } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    webpush.setVapidDetails(
      'mailto:admin@escuela.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const keys = await redis.keys('sub_*');
    const subscriptions = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        subscriptions.push(typeof data === 'string' ? JSON.parse(data) : data);
      }
    }

    if (subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0 });
    }

    const payload = JSON.stringify({
      title: title,
      body: body || '',
      icon: 'icon-192.png'
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          const key = 'sub_' + Buffer.from(subscription.endpoint).toString('base64url');
          await redis.del(key);
        }
      }
    }

    return res.status(200).json({
      success: true,
      sent: sent,
      failed: failed
    });

  } catch (error) {
    console.error('Notify error:', error);
    return res.status(500).json({ error: error.message });
  }
};
