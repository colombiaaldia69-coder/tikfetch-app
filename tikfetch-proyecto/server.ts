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

// Función para extraer video directo mediante la API publica de Tikwm (Gratuita y sin API key)
async function fetchTikTokVideo(tiktokUrl: string) {
  const formData = new URLSearchParams();
  formData.append('url', tiktokUrl);
  formData.append('hd', '1');

  const response = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: formData.toString()
  });

  if (!response.ok) {
    throw new Error(`Error en el servidor parser: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg || 'No se pudo procesar este video de TikTok.');
  }

  return json.data;
}

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

    // Procesa el enlace con la API directa sin llaves
    const data = await fetchTikTokVideo(cleanUrl);

    // Construir URLs absolutas si vienen relativas de TikWM
    const playUrl = data.play.startsWith('http') ? data.play : `https://www.tikwm.com${data.play}`;
    const hdPlayUrl = data.hdplay && data.hdplay.startsWith('http') ? data.hdplay : (data.hdplay ? `https://www.tikwm.com${data.hdplay}` : playUrl);
    const coverUrl = data.cover.startsWith('http') ? data.cover : `https://www.tikwm.com${data.cover}`;

    const result = {
      id: String(data.id || Date.now()),
      url: cleanUrl,
      title: String(data.title || 'Video de TikTok sin título'),
      cover: coverUrl,
      origin_cover: coverUrl,
      duration: data.duration || 0,
      author: {
        id: String(data.author?.id || ''),
        unique_id: String(data.author?.unique_id || 'usuario'),
        nickname: String(data.author?.nickname || 'Creador de TikTok'),
        avatar: String(data.author?.avatar || '')
      },
      play: playUrl,
      hdplay: hdPlayUrl,
      wmplay: playUrl,
      size: data.size || 0,
      hd_size: data.hd_size || 0,
      music: data.music || '',
      music_info: {
        id: String(data.music_info?.id || ''),
        title: String(data.music_info?.title || 'Sonido original'),
        author: String(data.music_info?.author || 'Artista'),
        play: String(data.music_info?.play || ''),
        cover: String(data.music_info?.cover || '')
      },
      images: data.images || [],
      stats: {
        play_count: data.play_count || 0,
        digg_count: data.digg_count || 0,
        comment_count: data.comment_count || 0,
        share_count: data.share_count || 0,
        download_count: data.download_count || 0
      },
      create_time: data.create_time || 0,
      region: data.region || ''
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

// 3. API: Proxy de descarga para descargar directamente el MP4 en el dispositivo
app.get('/api/download', async (req: Request, res: Response) => {
  const mediaUrl = req.query.url as string;

  if (!mediaUrl || !mediaUrl.startsWith('http')) {
    res.status(400).send('URL de medio inválida o ausente.');
    return;
  }

  try {
    const videoResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
