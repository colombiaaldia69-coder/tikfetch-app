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
        error: 'El enlace proporcionado no parece ser una URL válida de TikTok (ejemplo: https://www.tiktok.com/@usuario/video/... o https://vm.tiktok.com/...)'
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

    // Call TikWM API
    const tikwmEndpoint = `https://www.tikwm.com/api/?url=${encodeURIComponent(finalUrl)}&hd=1`;
    const response = await fetch(tikwmEndpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`TikWM server responded with status: ${response.status}`);
    }

    const json = await response.json();

    if (json.code !== 0 || !json.data) {
      // Sometimes it's a private video or expired link
      const errorMsg = json.msg || 'No se pudo obtener la información del video.';
      res.status(422).json({
        success: false,
        error: `No se pudo procesar el video: ${errorMsg}. Asegúrate de que el video sea público.`
      });
      return;
    }

    const d = json.data;

    // Helper to normalize relative or protocol-relative URLs
    const fixUrl = (u?: string) => {
      if (!u || typeof u !== 'string') return '';
      if (u.startsWith('//')) return 'https:' + u;
      if (u.startsWith('/')) return 'https://www.tikwm.com' + u;
      return u;
    };

    const playUrl = fixUrl(d.play);
    const hdPlayUrl = fixUrl(d.hdplay) || playUrl;

    // Build normalized clean result
    const result = {
      id: d.id || String(Date.now()),
      url: finalUrl,
      title: d.title || 'Video de TikTok sin título',
      cover: fixUrl(d.cover || d.origin_cover),
      origin_cover: fixUrl(d.origin_cover || d.cover),
      duration: d.duration || 0,
      author: {
        id: d.author?.id || '',
        unique_id: d.author?.unique_id || 'usuario',
        nickname: d.author?.nickname || 'Creador de TikTok',
        avatar: fixUrl(d.author?.avatar)
      },
      // Video streams
      play: playUrl,
      hdplay: hdPlayUrl,
      wmplay: fixUrl(d.wmplay),
      size: d.size || 0,
      hd_size: d.hd_size || d.size || 0,
      // Audio stream
      music: fixUrl(d.music),
      music_info: {
        id: d.music_info?.id || '',
        title: d.music_info?.title || 'Sonido original',
        author: d.music_info?.author || d.author?.nickname || 'Artista',
        play: fixUrl(d.music_info?.play || d.music),
        cover: fixUrl(d.music_info?.cover)
      },
      // Slide photo carousels (if photo mode)
      images: Array.isArray(d.images) ? d.images.map((img: string) => fixUrl(img)) : [],
      // Engagement statistics
      stats: {
        play_count: d.play_count || 0,
        digg_count: d.digg_count || 0,
        comment_count: d.comment_count || 0,
        share_count: d.share_count || 0,
        download_count: d.download_count || 0
      },
      create_time: d.create_time || 0,
      region: d.region || ''
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

  // Attempt 1: with TikTok Referer
  let res = await fetch(targetUrl, {
    headers: {
      'User-Agent': userAgents[0],
      'Referer': 'https://www.tiktok.com/'
    }
  });

  // Attempt 2: if failed, try without referer
  if (!res.ok) {
    res = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgents[1]
      }
    });
  }

  return res;
}

// 3. API: Proxy Download to force file attachment download in browser with automatic fallback
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

    // Fetch primary stream
    let upstreamRes = await fetchMediaStream(mediaUrl);

    // If primary stream failed (e.g. 403 or 404 on hdplay CDN), automatically use fallbackUrl if provided
    if ((!upstreamRes.ok || !upstreamRes.body) && fallbackUrl && fallbackUrl.startsWith('http') && fallbackUrl !== mediaUrl) {
      console.warn(`Primary mediaUrl failed with status ${upstreamRes.status}. Retrying with fallbackUrl...`);
      upstreamRes = await fetchMediaStream(fallbackUrl);
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      // Don't set attachment header if failed so user doesn't get a corrupt file
      res.status(upstreamRes.status).send('No se pudo descargar el archivo desde el servidor de TikTok. Intenta con la Opción 2.');
      return;
    }

    // Set download attachment headers
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || mediaType);

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Pipe web stream to express response
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
