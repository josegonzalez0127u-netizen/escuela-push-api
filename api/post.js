const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    let posts = await redis.get('all_posts');
    posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];

    const post = posts.find(p => p.id === id);
    if (!post) return res.status(404).json({ error: 'No encontrada' });

    return res.status(200).json({ success: true, post });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
