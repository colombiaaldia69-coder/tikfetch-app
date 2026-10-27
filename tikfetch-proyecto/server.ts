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

// Explicit PWA manifest & Service Worker routes for PWABuilder and browser crawlers
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

// 2. API: Parse TikTok URL using official RapidAPI endpoint
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

    // Resolve redirection if it's a short URL (vm.tiktok.com or vt.tiktok.com)
    let finalUrl = cleanUrl;
    try {
      if (cleanUrl.includes('vm.tiktok.com') || cleanUrl.includes('vt.tiktok.com') || cleanUrl.includes('/t/')) {
        const headRes = await fetch(cleanUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (headRes.url && headRes.url.includes('tiktok.com')) {
          finalUrl = headRes.url;
        }
      }
    } catch (redirectErr) {
      console.warn('Could not follow redirect, will proceed with original URL:', redirectErr);
    }

    // Call RapidAPI TikTok Downloader using POST with JSON body
    const rapidApiHost = 'tiktok-video-downloader-api.p.rapidapi.com';
    const rapidApiEndpoint = `https://${rapidApiHost}/`;

    const response = await fetch(rapidApiEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': rapidApiHost
      },
      body: JSON.stringify({ url: finalUrl })
    });

    if (!response.ok) {
      throw new Error(`RapidAPI server responded with status: ${response.status}`);
    }

    const json = await response.json();
    
    const downloadUrl = json.downloadUrl || json.data?.downloadUrl || (typeof json === 'string' ? json : json.url);

    if (!downloadUrl) {
      res.status(422).json({
        success: false,
        error: 'No se pudo obtener la URL de descarga del video. Asegúrate de que sea público.'
      });
      return;
    }

    const authorName = typeof json.author === 'string' 
      ? json.author 
      : (json.author?.nickname || json.author?.unique_id || 'Creador de TikTok');

    const result = {
      id: String(json.id || Date.now()),
      url: finalUrl,
      title: String(json.title || 'Video de TikTok sin título'),
      cover: String(json.cover || ''),
      origin_cover: String(json.cover || ''),
      duration: json.duration || 0,
      author: {
        id: '',
        unique_id: String(json.author || 'usuario'),
        nickname: String(authorName),
        avatar: ''
      },
      play: downloadUrl,
      hdplay: downloadUrl,
      wmplay: downloadUrl,
      size: 0,
      hd_size: 0,
      music: '',
      music_info: {
        id: '',
        title: 'Sonido original',
        author: 'Artista',
        play: '',
        cover: ''
      },
      images: [],
      stats: {
        play_count: 0,
        digg_count: 0,
        comment_count: 0,
        share_count: 0,
        download_count: 0
      },
      create_time: 0,
      region: ''
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in /api/parse:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error interno al procesar el enlace de TikTok.'
    });
  }
});

// 3. API: Redirige directamente al CDN para la descarga
app.get('/api/download', (req: Request, res: Response) => {
  const mediaUrl = req.query.url as string;

  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    res.status(400).send('URL de medio inválida o ausente.');
    return;
  }

  res.redirect(mediaUrl);
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
