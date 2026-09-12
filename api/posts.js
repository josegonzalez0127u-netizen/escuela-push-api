const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET - Listar publicaciones
    if (req.method === 'GET') {
      const pageId = req.query?.pageId;
      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];

      if (pageId) {
        posts = posts.filter(p => p.paginaId === pageId);
      }

      // Solo las publicadas para la página esqueleto
      const publicOnly = req.query?.publicOnly === 'true';
      if (publicOnly) {
        posts = posts.filter(p => p.publicado === true);
      }

      posts.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

      // Sin fotos para listado rápido
      const light = posts.map(p => ({
        ...p,
        fotos: (p.fotos || []).map(f => f.substring(0, 50) + '...[base64]'),
        fotosCount: (p.fotos || []).length
      }));

      return res.status(200).json({ success: true, posts: light, total: posts.length });
    }

    // POST - Crear publicación
    if (req.method === 'POST') {
      const postData = req.body;
      if (!postData.titulo) return res.status(400).json({ error: 'Titulo requerido' });

      const id = 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const now = new Date().toISOString();

      const newPost = {
        id,
        titulo: postData.titulo,
        descripcion: postData: postData.descripcion || '',
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

    // PUT - Actualizar publicación
    if (req.method === 'PUT') {
      const postData = req.body;
      if (!postData.id) return res.status(400).json({ error: 'ID requerido' });

      let posts = await redis.get('all_posts');
      posts = posts ? (typeof posts === 'string' ? JSON.parse(posts) : posts) : [];

      const index = posts.findIndex(p => p.id === postData.id);
      if (index === -1) return res.status(404).json({ error: 'No encontrada' });

      posts[index].titulo = postData.titulo || posts[index].titulo;
      posts[index].descripcion = postData.descripcion !== undefined ? postData.descripcion : posts[index].descripcion;
      posts[index].paginaId = postData.paginaId || posts[index].paginaId;
      posts[index].publicado = postData.publicado !== undefined ? postData.publicado : posts[index].publicado;
      if (postData.fotos) posts[index].fotos = postData.fotos;
      if (postData.videos) posts[index].videos = postData.videos;
      if (postData.pdfs) posts[index].pdfs = postData.pdfs;
      posts[index].url = postData.url !== undefined ? postData.url : posts[index].url;
      posts[index].fechaActualizacion = new Date().toISOString();

      await redis.set('all_posts', JSON.stringify(posts));

      return res.status(200).json({ success: true });
    }

    // DELETE - Eliminar publicación
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
