import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Explicit PWA manifest & Service Worker routes
app.get(['/manifest.json', '/manifest.webmanifest'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.sendFile(path.resolve(process.cwd(), 'public/manifest.json'));
});

app.get('/sw.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.resolve(process.cwd(), 'public/sw.js'));
});

// Helper to extract TikTok URL from user string
function extractTikTokUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const match = input.match(/https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:tiktok\.com|douyin\.com)[^\s"'>]+/i);
  return match ? match[0] : null;
}

// Preset examples for quick testing
const SAMPLE_VIDEOS = [
  {
    id: 'sample-1',
    title: 'Adorables perritos jugando en el parque 🐶',
    url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
    author: 'Scout, Suki & Stella',
    handle: '@scout2015',
    category: 'Mascotas',
    duration: '15s',
  },
  {
    id: 'sample-2',
    title: 'Receta rápida y deliciosa de pasta cremosa 🍝',
    url: 'https://www.tiktok.com/@gordonramsayofficial/video/7036233285437885701',
    author: 'Gordon Ramsay',
    handle: '@gordonramsayofficial',
    category: 'Cocina',
    duration: '30s',
  }
];

// 1. API: Get sample videos
app.get('/api/examples', (_req: Request, res: Response) => {
  res.json({ success: true, samples: SAMPLE_VIDEOS });
});

// 2. API: Parse TikTok URL using SocialKit API
app.post('/api/parse', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.body?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Por favor ingresa un enlace válido de TikTok.'
      });
      return;
    }

    const cleanUrl = extractTikTokUrl(rawUrl.trim());
    if (!cleanUrl) {
      res.status(400).json({
        success: false,
        error: 'El enlace proporcionado no parece ser una URL válida de TikTok.'
      });
      return;
    }

    const socialKitEndpoint = 'https://api.socialkit.dev/tiktok/download';
    const apiKey = process.env.SOCIALKIT_API_KEY || process.env.RAPIDAPI_KEY || '';

    const response = await fetch(socialKitEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'x-access-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        url: cleanUrl,
        video_url: cleanUrl 
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('SocialKit error response:', responseText);
      throw new Error(`SocialKit error (${response.status}): ${responseText || 'Respuesta vacía del servidor'}`);
    }

    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse JSON. Raw response was:', responseText);
      throw new Error('La API de SocialKit no devolvió un JSON válido.');
    }
    
    const dataObj = json.data || json;
    const downloadUrl = dataObj.download_url || dataObj.url || dataObj.play || dataObj.hdplay || '';

    if (!downloadUrl) {
      res.status(422).json({
        success: false,
        error: 'No se pudo obtener la URL de descarga desde SocialKit.'
      });
      return;
    }

    const result = {
      id: String(dataObj.id || Date.now()),
      url: cleanUrl,
      title: String(dataObj.title || dataObj.description || 'Video de TikTok sin título'),
      cover: String(dataObj.cover || dataObj.thumbnail || ''),
      origin_cover: String(dataObj.cover || dataObj.thumbnail || ''),
      duration: dataObj.duration || 0,
      author: {
        id: '',
        unique_id: String(dataObj.author?.username || dataObj.author || 'usuario'),
        nickname: String(dataObj.author?.name || 'Creador de TikTok'),
        avatar: String(dataObj.author?.avatar || '')
      },
      play: downloadUrl,
      hdplay: downloadUrl,
      wmplay: downloadUrl,
      size: dataObj.size || 0,
      hd_size: dataObj.hd_size || 0,
      music: dataObj.music || '',
      music_info: {
        id: '',
        title: 'Sonido original',
        author: 'Artista',
        play: '',
        cover: ''
      },
      images: dataObj.images || [],
      stats: {
        play_count: dataObj.stats?.plays || dataObj.play_count || 0,
        digg_count: dataObj.stats?.likes || dataObj.digg_count || 0,
        comment_count: dataObj.stats?.comments || dataObj.comment_count || 0,
        share_count: dataObj.stats?.shares || dataObj.share_count || 0,
        download_count: 0
      },
      create_time: dataObj.create_time || 0,
      region: dataObj.region || ''
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in /api/parse:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno al procesar el enlace con SocialKit.'
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TikFetch server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
