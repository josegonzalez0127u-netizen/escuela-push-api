const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription invalid' });
    }

    // Usar el endpoint como clave (es único por dispositivo)
    const key = 'sub_' + Buffer.from(subscription.endpoint).toString('base64url');

    // Guardar en Vercel KV
    await kv.set(key, JSON.stringify(subscription));

    // Contar suscriptores
    const keys = await kv.keys('sub_*');

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
