
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Resolve paths from this file instead of Render's working directory.
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PATH = path.join(PROJECT_ROOT, 'public');
const DIST_PATH = path.join(PROJECT_ROOT, 'dist');
const INDEX_PATH = path.join(DIST_PATH, 'index.html');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve public assets when the directory exists.
if (existsSync(PUBLIC_PATH)) {
  app.use(express.static(PUBLIC_PATH));
}

// PWA manifest routes
app.get(
  ['/manifest.json', '/manifest.webmanifest'],
  (_req: Request, res: Response) => {
    const manifestPath = path.join(PUBLIC_PATH, 'manifest.json');

    if (!existsSync(manifestPath)) {
      res.status(404).json({
        success: false,
        error: 'No se encontró public/manifest.json.'
      });
      return;
    }

    res.setHeader(
      'Content-Type',
      'application/manifest+json; charset=utf-8'
    );
    res.sendFile(manifestPath);
  }
);

// Service worker route
app.get('/sw.js', (_req: Request, res: Response) => {
  const swPath = path.join(PUBLIC_PATH, 'sw.js');

  if (!existsSync(swPath)) {
    res.status(404).json({
      success: false,
      error: 'No se encontró public/sw.js.'
    });
    return;
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(swPath);
});

// Extract a TikTok or Douyin URL from user input.
function extractTikTokUrl(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const match = input.match(
    /https?:\/\/(?:[a-zA-Z0-9_-]+\.)?(?:tiktok\.com|douyin\.com)[^\s"'<>]*/i
  );

  if (!match) {
    return null;
  }

  // Remove common trailing punctuation from copied text.
  return match[0].replace(/[),.!?]+$/, '');
}

// Preset examples for quick testing.
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

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'TikFetch',
    environment: isProduction ? 'production' : 'development'
  });
});

// API: Get sample videos.
app.get('/api/examples', (_req: Request, res: Response) => {
  res.json({
    success: true,
    samples: SAMPLE_VIDEOS
  });
});

// API: Parse a TikTok URL using SocialKit.
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
        error: 'El enlace proporcionado no parece ser una URL válida de TikTok o Douyin.'
      });
      return;
    }

    const apiKey =
      process.env.SOCIALKIT_API_KEY ||
      process.env.RAPIDAPI_KEY ||
      '';

    if (!apiKey) {
      console.error('Falta configurar la clave de SocialKit.');

      res.status(503).json({
        success: false,
        error: 'El servicio de descarga no está configurado. Contacta al administrador.'
      });
      return;
    }

    const socialKitEndpoint =
      'https://api.socialkit.dev/tiktok/download';

    const response = await fetch(socialKitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': apiKey,
        'x-access-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: cleanUrl,
        video_url: cleanUrl
      }),
      signal: AbortSignal.timeout(25000)
    });

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    // Do not mistake an HTML page for a valid API response.
    if (contentType.includes('text/html')) {
      console.error(
        'SocialKit devolvió HTML en lugar de JSON.',
        'HTTP:',
        response.status
      );

      res.status(502).json({
        success: false,
        error: 'El proveedor de descargas devolvió una página HTML en lugar de los datos del video. Inténtalo más tarde o verifica el servicio de SocialKit.'
      });
      return;
    }

    if (!response.ok) {
      console.error(
        `SocialKit respondió HTTP ${response.status}:`,
        responseText.slice(0, 1000)
      );

      res.status(502).json({
        success: false,
        error: `El proveedor de descargas respondió con el error HTTP ${response.status}. Inténtalo de nuevo más tarde.`
      });
      return;
    }

    let json: any;

    try {
      json = JSON.parse(responseText);
    } catch {
      console.error(
        'SocialKit no devolvió JSON válido:',
        responseText.slice(0, 500)
      );

      res.status(502).json({
        success: false,
        error: 'El proveedor de descargas no devolvió una respuesta JSON válida.'
      });
      return;
    }

    const dataObj = json?.data ?? json;

    if (!dataObj || typeof dataObj !== 'object') {
      res.status(502).json({
        success: false,
        error: 'La respuesta del proveedor no contiene datos válidos.'
      });
      return;
    }

    if (dataObj.success === false) {
      res.status(422).json({
        success: false,
        error: dataObj.message || dataObj.error ||
          'El proveedor no pudo procesar este video.'
      });
      return;
    }

    const possibleDownloadUrl =
      dataObj.download_url ||
      dataObj.downloadUrl ||
      dataObj.url ||
      dataObj.play ||
      dataObj.hdplay ||
      '';

    const downloadUrl =
      typeof possibleDownloadUrl === 'string'
        ? possibleDownloadUrl
        : '';

    // Ensure that the provider returned an HTTP(S) URL.
    let validDownloadUrl = '';

    try {
      const parsedUrl = new URL(downloadUrl);

      if (
        parsedUrl.protocol === 'https:' ||
        parsedUrl.protocol === 'http:'
      ) {
        validDownloadUrl = parsedUrl.toString();
      }
    } catch {
      // An absent or invalid media URL is handled below.
    }

    if (!validDownloadUrl) {
      console.error(
        'SocialKit no proporcionó una URL multimedia válida.'
      );

      res.status(422).json({
        success: false,
        error: 'No se obtuvo una URL de descarga válida. El video podría no estar disponible o el proveedor podría haber cambiado su respuesta.'
      });
      return;
    }

    const authorData =
      dataObj.author && typeof dataObj.author === 'object'
        ? dataObj.author
        : {};

    const statsData =
      dataObj.stats && typeof dataObj.stats === 'object'
        ? dataObj.stats
        : {};

    const cover =
      dataObj.cover || dataObj.thumbnail || '';

    const result = {
      id: String(dataObj.id || Date.now()),
      url: cleanUrl,
      title: String(
        dataObj.title ||
        dataObj.description ||
        'Video de TikTok sin título'
      ),
      cover: String(cover),
      origin_cover: String(cover),
      duration: dataObj.duration || 0,
      author: {
        id: String(authorData.id || ''),
        unique_id: String(
          authorData.username ||
          authorData.unique_id ||
          (typeof dataObj.author === 'string'
            ? dataObj.author
            : 'usuario')
        ),
        nickname: String(
          authorData.name ||
          authorData.nickname ||
          'Creador de TikTok'
        ),
        avatar: String(authorData.avatar || '')
      },
      play: validDownloadUrl,
      hdplay: validDownloadUrl,
      wmplay: validDownloadUrl,
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
      images: Array.isArray(dataObj.images)
        ? dataObj.images
        : [],
      stats: {
        play_count:
          statsData.plays || dataObj.play_count || 0,
        digg_count:
          statsData.likes || dataObj.digg_count || 0,
        comment_count:
          statsData.comments || dataObj.comment_count || 0,
        share_count:
          statsData.shares || dataObj.share_count || 0,
        download_count: 0
      },
      create_time: dataObj.create_time || 0,
      region: dataObj.region || ''
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    console.error('Error en /api/parse:', error);

    if (
      error instanceof Error &&
      error.name === 'TimeoutError'
    ) {
      res.status(504).json({
        success: false,
        error: 'El proveedor tardó demasiado en responder. Inténtalo de nuevo.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Ocurrió un error interno al procesar el enlace. Inténtalo de nuevo.'
    });
  }
});

// Start Vite in development or serve the production build.
async function startServer(): Promise<void> {
  if (!isProduction) {
    const vite = await createViteServer({
      configFile: path.join(PROJECT_ROOT, 'vite.config.ts'),
      server: {
        middlewareMode: true
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    // Fail clearly if the frontend has not been built.
    if (!existsSync(INDEX_PATH)) {
      throw new Error(
        `No se encontró el frontend compilado: ${INDEX_PATH}. ` +
        'Verifica que Render ejecute "npm run build" ' +
        'y que Vite genere dist/index.html en la raíz del proyecto.'
      );
    }

    app.use(express.static(DIST_PATH));

    // API requests that do not match an API route should return JSON,
    // not the frontend HTML page.
    app.use('/api', (_req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Ruta de API no encontrada.'
      });
    });

    // SPA fallback for frontend routes.
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(INDEX_PATH);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TikFetch escuchando en el puerto ${PORT}`);
    console.log(`Entorno: ${isProduction ? 'production' : 'development'}`);
    console.log(`Raíz del proyecto: ${PROJECT_ROOT}`);

    if (isProduction) {
      console.log(`Frontend compilado: ${INDEX_PATH}`);
    }
  });
}

startServer().catch((error: unknown) => {
  console.error('No se pudo iniciar TikFetch:', error);
  process.exit(1);
});
