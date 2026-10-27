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

// Extrae la URL de TikTok del input
function extractTikTokUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const match = input.match(/https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:tiktok\.com|douyin\.com)[^\s"'>]+/i);
  return match ? match[0] : null;
}

// Ejemplos para la app
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

app.get('/api/examples', (_req: Request, res: Response) => {
  res.json({ success: true, samples: SAMPLE_VIDEOS });
});

// 2. API: Parse TikTok URL usando conectores alternativos estables
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

    // Resolver redirección si es un enlace corto (vm.tiktok.com o vt.tiktok.com)
    let finalUrl = cleanUrl;
    try {
      const headRes = await fetch(cleanUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });
      if (headRes.url && headRes.url.includes('tiktok.com')) {
        finalUrl = headRes.url;
      }
    } catch (redirectErr) {
      console.warn('Could not follow redirect:', redirectErr);
    }

    // Usar la API pública alternativa de Cobold / TTP / SnapTik de respaldo sin restricciones de IP
    const backupRes = await fetch(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(finalUrl)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://tikmate.app/'
      }
    });

    let downloadUrl = '';
    let coverImage = '';
    let authorName = 'Creador de TikTok';
    let videoTitle = 'Video de TikTok sin marca de agua';

    if (backupRes.ok) {
      const data = await backupRes.json();
      if (data && data.token) {
        // Tikmate devuelve un token para armar el enlace de descarga HD
        downloadUrl = `https://tikmate.app/download/${data.token}/${data.id}.mp4?hd=1`;
        coverImage = data.cover ? `https://tikmate.app/storage/${data.id}.jpg` : '';
        if (data.author_name) authorName = data.author_name;
        if (data.comment) videoTitle = data.comment;
      }
    }

    // Si el respaldo anterior falla, utilizamos un fallback con oEmbed y redirección limpia
    if (!downloadUrl) {
      try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) videoTitle = oembedData.title;
          if (oembedData.author_name) authorName = oembedData.author_name;
          if (oembedData.thumbnail_url) coverImage = oembedData.thumbnail_url;
        }
      } catch (e) {
        console.warn('Fallback oEmbed error:', e);
      }
      // Enlace directo de respaldo
      downloadUrl = finalUrl;
    }

    const result = {
      id: String(Date.now()),
      url: finalUrl,
      title: String(videoTitle),
      cover: String(coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60'),
      origin_cover: String(coverImage),
      duration: 15,
      author: {
        id: '',
        unique_id: String(authorName),
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
        author: authorName,
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

// 3. API: Proxy de descarga directo
app.get('/api/download', async (req: Request, res: Response) => {
  const mediaUrl = req.query.url as string;

  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    res.status(400).send('URL de medio inválida o ausente.');
    return;
  }

  try {
    const videoResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://tikmate.app/'
      }
    });

    if (!videoResponse.ok) {
      res.redirect(mediaUrl);
      return;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="tiktok-video.mp4"');

    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('Error proxying download:', err);
    res.redirect(mediaUrl);
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
