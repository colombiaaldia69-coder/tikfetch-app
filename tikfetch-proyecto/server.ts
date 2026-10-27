
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

// PWA manifest
app.get(
  ['/manifest.json', '/manifest.webmanifest'],
  (_req: Request, res: Response) => {
    res.setHeader(
      'Content-Type',
      'application/manifest+json; charset=utf-8'
    );
    res.sendFile(path.resolve(process.cwd(), 'public/manifest.json'));
  }
);

// Service worker
app.get('/sw.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.resolve(process.cwd(), 'public/sw.js'));
});

// Validación básica de enlaces de TikTok
function extractTikTokUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const match = input.trim().match(
    /https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:tiktok\.com|douyin\.com)\/[^\s"'<>]+/i
  );

  return match ? match[0].replace(/[),.!?]+$/, '') : null;
}

// Videos de ejemplo para la interfaz
const SAMPLE_VIDEOS = [
  {
    id: 'sample-1',
    title: 'Adorables perritos jugando en el parque 🐶',
    url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
    author: 'Scout, Suki & Stella',
    handle: '@scout2015',
    category: 'Mascotas',
    duration: '15s'
  },
  {
    id: 'sample-2',
    title: 'Receta rápida y deliciosa de pasta cremosa 🍝',
    url: 'https://www.tiktok.com/@gordonramsayofficial/video/7036233285437885701',
    author: 'Gordon Ramsay',
    handle: '@gordonramsayofficial',
    category: 'Cocina',
    duration: '30s'
  }
];

// GET /api/examples
app.get('/api/examples', (_req: Request, res: Response) => {
  res.json({
    success: true,
    samples: SAMPLE_VIDEOS
  });
});

// POST /api/parse
app.post('/api/parse', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.body?.url;

    if (!rawUrl || typeof rawUrl !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Por favor, ingresa un enlace de TikTok.'
      });
      return;
    }

    const cleanUrl = extractTikTokUrl(rawUrl);

    if (!cleanUrl) {
      res.status(400).json({
        success: false,
        error: 'El enlace no parece ser una URL válida de TikTok.'
      });
      return;
    }

    const apiKey = process.env.SOCIALKIT_API_KEY;

    if (!apiKey) {
      console.error('Falta configurar SOCIALKIT_API_KEY.');

      res.status(500).json({
        success: false,
        error: 'El servidor no tiene configurada la clave de SocialKit.'
      });
      return;
    }

    const endpoint = 'https://api.socialkit.dev/tiktok/download';

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        access_key: apiKey,
        url: cleanUrl,
        format: 'mp4',
        quality: '480p'
      }),
      signal: AbortSignal.timeout(25000)
    });

    const responseText = await upstream.text();

    let json: any;

    try {
      json = JSON.parse(responseText);
    } catch {
      json = { message: responseText };
    }

    if (!upstream.ok) {
      console.error('Error de SocialKit:', {
        status: upstream.status,
        response: json
      });

      res.status(502).json({
        success: false,
        error: 'SocialKit rechazó la solicitud.',
        upstreamStatus: upstream.status,
        details: json
      });
      return;
    }

    const data = json?.data ?? json;

    // No confundir la URL original de TikTok con el archivo.
    const downloadUrl =
      data?.downloadUrl ??
      data?.download_url ??
      '';

    if (
      typeof downloadUrl !== 'string' ||
      !/^https:\/\//i.test(downloadUrl)
    ) {
      console.error('Respuesta de SocialKit sin downloadUrl:', json);

      res.status(502).json({
        success: false,
        error: 'SocialKit no devolvió una URL de descarga reconocida.'
      });
      return;
    }

    // Solo aceptamos una URL HTTPS para evitar esquemas peligrosos.
    let parsedDownloadUrl: URL;

    try {
      parsedDownloadUrl = new URL(downloadUrl);
    } catch {
      res.status(502).json({
        success: false,
        error: 'SocialKit devolvió una URL de descarga inválida.'
      });
      return;
    }

    if (parsedDownloadUrl.protocol !== 'https:') {
      res.status(502).json({
        success: false,
        error: 'El enlace de descarga debe utilizar HTTPS.'
      });
      return;
    }

    const author = data?.author ?? {};
    const stats = data?.stats ?? {};

    const result = {
      id: String(data?.id ?? Date.now()),
      url: cleanUrl,
      title: String(
        data?.title ??
        data?.description ??
        'Video de TikTok sin título'
      ),
      cover: String(data?.thumbnail ?? data?.thumbnailUrl ?? ''),
      origin_cover: String(
        data?.thumbnail ?? data?.thumbnailUrl ?? ''
      ),
      duration: data?.durationSeconds ?? data?.duration ?? 0,
      author: {
        id: String(author?.id ?? ''),
        unique_id: String(
          author?.username ?? author?.unique_id ?? 'usuario'
        ),
        nickname: String(
          author?.name ?? author?.nickname ?? 'Creador de TikTok'
        ),
        avatar: String(author?.avatar ?? '')
      },
      play: downloadUrl,
      hdplay: downloadUrl,
      wmplay: downloadUrl,
      size: Number(data?.fileSize ?? 0),
      hd_size: Number(data?.fileSize ?? 0),
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
        play_count: Number(stats?.plays ?? stats?.play_count ?? 0),
        digg_count: Number(stats?.likes ?? stats?.digg_count ?? 0),
        comment_count: Number(
          stats?.comments ?? stats?.comment_count ?? 0
        ),
        share_count: Number(stats?.shares ?? stats?.share_count ?? 0),
        download_count: 0
      },
      create_time: Number(data?.createTime ?? 0),
      region: String(data?.region ?? '')
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    console.error('Error en /api/parse:', error);

    const isTimeout =
      error instanceof Error && error.name === 'TimeoutError';

    res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout
        ? 'SocialKit tardó demasiado en responder.'
        : 'No se pudo procesar el enlace. Revisa los registros del servidor.'
    });
  }
});

// GET /api/download
app.get('/api/download', (req: Request, res: Response) => {
  const mediaUrl = req.query.url;

  if (typeof mediaUrl !== 'string') {
    res.status(400).send('Falta la URL del video.');
    return;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    res.status(400).send('La URL del video no es válida.');
    return;
  }

  if (parsedUrl.protocol !== 'https:') {
    res.status(400).send('Solo se permiten enlaces HTTPS.');
    return;
  }

  res.redirect(mediaUrl);
});

// Vite en desarrollo y archivos compilados en producción
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
    console.log(`TikFetch server escuchando en el puerto ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
