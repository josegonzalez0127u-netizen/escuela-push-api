const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const pageId = req.query?.pageId;
      const publicOnly = req.query?.publicOnly === 'true';

      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];

      if (pageId) posts = posts.filter(p => p.paginaId === pageId);
      if (publicOnly) posts = posts.filter(p => p.publicado === true);

      posts.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

      return res.status(200).json({ success: true, posts, total: posts.length });
    }

    if (req.method === 'POST') {
      const postData = req.body;
      if (!postData.titulo) return res.status(400).json({ error: 'Titulo requerido' });

      const id = 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const now = new Date().toISOString();

      const newPost = {
        id,
        titulo: postData.titulo,
        descripcion: postData.descripcion || '',
        paginaId: postData.paginaId || 'inicio',
        publicado: postData.publicado !== false,
        fotos: postData.fotos || [],
        url: postData.url || '',
        videos: postData.videos || [],
        pdfs: postData.pdfs || [],
        fechaCreacion: now,
        fechaActualizacion: now
      };

      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];
      posts.unshift(newPost);
      await redis.set('all_posts', JSON.stringify(posts));

      return res.status(200).json({ success: true, id });
    }

    if (req.method === 'PUT') {
      const postData = req.body;
      if (!postData.id) return res.status(400).json({ error: 'ID requerido' });

      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];
      const index = posts.findIndex(p => p.id === postData.id);
      if (index === -1) return res.status(404).json({ error: 'No encontrada' });

      if (postData.titulo !== undefined) posts[index].titulo = postData.titulo;
      if (postData.descripcion !== undefined) posts[index].descripcion = postData.descripcion;
      if (postData.paginaId !== undefined) posts[index].paginaId = postData.paginaId;
      if (postData.publicado !== undefined) posts[index].publicado = postData.publicado;
      if (postData.fotos !== undefined) posts[index].fotos = postData.fotos;
      if (postData.videos !== undefined) posts[index].videos = postData.videos;
      if (postData.pdfs !== undefined) posts[index].pdfs = postData.pdfs;
      if (postData.url !== undefined) posts[index].url = postData.url;
      posts[index].fechaActualizacion = new Date().toISOString();

      await redis.set('all_posts', JSON.stringify(posts));
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];
      posts = posts.filter(p => p.id !== id);
      await redis.set('all_posts', JSON.stringify(posts));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Posts error:', error);
    return res.status(500).json({ error: error.message });
  }
};
