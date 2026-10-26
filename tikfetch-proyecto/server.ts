import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Readable } from 'stream';
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
  },
  {
    id: 'sample-3',
    title: 'Efectos visuales y trucos increíbles de cámara 🎬',
    url: 'https://www.tiktok.com/@zachking/video/6768504823336815877',
    author: 'Zach King',
    handle: '@zachking',
    category: 'Creatividad',
    duration: '18s',
  },
  {
    id: 'sample-4',
    title: 'Tutorial de baile y coreografía viral ✨',
    url: 'https://www.tiktok.com/@charlidamelio/video/7017646193799843078',
    author: 'charli d\'amelio',
    handle: '@charlidamelio',
    category: 'Baile & Tendencias',
    duration: '22s',
  }
];

// 1. API: Get sample videos
app.get('/api/examples', (_req: Request, res: Response) => {
  res.json({ success: true, samples: SAMPLE_VIDEOS });
});

// 2. API: Parse TikTok URL
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

    // Call RapidAPI TikTok Downloader (según especificación oficial)
    const rapidApiHost = 'tiktok-video-downloader-api.p.rapidapi.com';
    const rapidApiEndpoint = `https://${rapidApiHost}/media?videoUrl=${encodeURIComponent(finalUrl)}`;

    const response = await fetch(rapidApiEndpoint, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
        'x-rapidapi-host': rapidApiHost
      }
    });

    if (!response.ok) {
      throw new Error(`RapidAPI server responded with status: ${response.status}`);
    }

    const json = await response.json();
    
    // Extraemos la URL de descarga oficial
    const downloadUrl = json.downloadUrl || json.data?.downloadUrl || (typeof json === 'string' ? json : json.url);

    if (!downloadUrl) {
      res.status(422).json({
        success: false,
        error: 'No se pudo obtener la URL de descarga del video. Asegúrate de que sea público.'
      });
      return;
    }

    // Normalizamos el resultado para que la interfaz web lo lea perfectamente
    const result = {
      id: json.id || String(Date.now()),
      url: finalUrl,
      title: json.title || 'Video de TikTok sin título',
      cover: json.cover || '',
      origin_cover: json.cover || '',
      duration: json.duration || 0,
      author: {
        id: '',
        unique_id: json.author || 'usuario',
        nickname: json.author || 'Creador de TikTok',
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

// Helper to fetch media stream with automatic headers & fallbacks
async function fetchMediaStream(targetUrl: string) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];

  let res = await fetch(targetUrl, {
    headers: {
      'User-Agent': userAgents[0],
      'Referer': 'https://www.tiktok.com/'
    }
  });

  if (!res.ok) {
    res = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgents[1]
      }
    });
  }

  return res;
}

// 3. API: Proxy Download to force file attachment download in browser
app.get('/api/download', async (req: Request, res: Response) => {
  try {
    const mediaUrl = req.query.url as string;
    const fallbackUrl = req.query.fallbackUrl as string;
    const requestedName = (req.query.filename as string) || 'tiktok_video.mp4';
    const mediaType = (req.query.type as string) || 'video/mp4';

    if (!mediaUrl || !mediaUrl.startsWith('http')) {
      res.status(400).send('URL de medio inválida o ausente.');
      return;
    }

    const safeFilename = requestedName.replace(/[^a-zA-Z0-9_.-]/g, '_');

    let upstreamRes = await fetchMediaStream(mediaUrl);

    if ((!upstreamRes.ok || !upstreamRes.body) && fallbackUrl && fallbackUrl.startsWith('http') && fallbackUrl !== mediaUrl) {
      upstreamRes = await fetchMediaStream(fallbackUrl);
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      res.status(upstreamRes.status).send('No se pudo descargar el archivo desde el servidor de TikTok.');
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || mediaType);

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');

    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.pipe(res);
  } catch (err: any) {
    console.error('Error in /api/download:', err);
    if (!res.headersSent) {
      res.status(500).send('Error al transferir el archivo.');
    }
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
