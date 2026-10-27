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

    if (!apiKey) {
      res.status(500).json({
        success: false,
        error: 'Falta configurar SOCIALKIT_API_KEY en las variables de entorno.'
      });
      return;
    }

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
      }),
      signal: AbortSignal.timeout(30000)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('SocialKit error response:', response.status, responseText);
      res.status(502).json({
        success: false,
        error: `SocialKit error (${response.status}): ${responseText || 'Respuesta vacía del servidor'}`
      });
      return;
    }

    let json: any;

    try {
      json = JSON.parse(responseText);
    } catch {
      console.error('SocialKit returned non-JSON response:', responseText.slice(0, 300));
      res.status(502).json({
        success: false,
        error: 'La API de SocialKit no devolvió un JSON válido.'
      });
      return;
    }

    const dataObj = json?.data || json;

    // Use only fields that may represent a media URL.
    // Confirm the exact field against SocialKit's actual response if this is empty/wrong.
    const candidateUrl =
      dataObj?.download_url ||
      dataObj?.play ||
      dataObj?.hdplay ||
      dataObj?.wmplay ||
      dataObj?.url ||
      '';

    let downloadUrl = '';

    if (typeof candidateUrl === 'string' && candidateUrl.trim()) {
      try {
        const parsedCandidate = new URL(candidateUrl);
        if (parsedCandidate.protocol === 'https:' || parsedCandidate.protocol === 'http:') {
          downloadUrl = parsedCandidate.toString();
        }
      } catch {
        // Candidate was not a valid absolute URL; return a useful error below.
      }
    }

    if (!downloadUrl) {
      console.error('SocialKit response did not contain a usable media URL. Top-level keys:', Object.keys(dataObj || {}));
      res.status(422).json({
        success: false,
        error: 'SocialKit no devolvió una URL de descarga válida. Revisa los campos de su respuesta.'
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
  } catch (error: unknown) {
    console.error('Error in /api/parse:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    res.status(500).json({
      success: false,
      error: message || 'Error interno al procesar el enlace con SocialKit.'
    });
  }
});

// 3. API: Media download proxy
app.get('/api/download', async (req: Request, res: Response) => {
  const mediaUrl = req.query.url;

  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
    res.status(400).json({
      success: false,
      error: 'Falta la URL del video.'
    });
    return;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    res.status(400).json({
      success: false,
      error: 'La URL de descarga no es válida.'
    });
    return;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    res.status(400).json({
      success: false,
      error: 'Solo se permiten URLs HTTP o HTTPS.'
    });
    return;
  }

  // Restrict the proxy to known public media hosts in production.
  // Add the exact legitimate CDN hostname(s) used by SocialKit/TikTok here if needed.
  const hostname = parsedUrl.hostname.toLowerCase();
  const isPrivateOrLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  if (isPrivateOrLocalHost) {
    res.status(400).json({
      success: false,
      error: 'No se permiten direcciones privadas o locales.'
    });
    return;
  }

  try {
    const videoRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/*, application/octet-stream;q=0.9, */*;q=0.5',
        'Referer': 'https://www.tiktok.com/'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!videoRes.ok) {
      console.error(
        'Download upstream error:',
        videoRes.status,
        videoRes.statusText
      );

      res.status(502).json({
        success: false,
        error: `El proveedor no pudo entregar el archivo (HTTP ${videoRes.status}). El enlace puede haber vencido o requerir autorización.`
      });
      return;
    }

    const contentType = (videoRes.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      res.status(502).json({
        success: false,
        error: 'El proveedor devolvió un archivo vacío.'
      });
      return;
    }

    // Common file signatures: MP4/QuickTime uses "ftyp" at bytes 4-7;
    // WebM/Matroska starts with the EBML signature 1A 45 DF A3.
    const isMp4 =
      buffer.length >= 12 &&
      buffer.toString('ascii', 4, 8) === 'ftyp';

    const isWebM =
      buffer.length >= 4 &&
      buffer[0] === 0x1A &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xDF &&
      buffer[3] === 0xA3;

    const isVideoContentType = contentType.startsWith('video/');
    const isOctetStream =
      contentType.includes('application/octet-stream') ||
      contentType.includes('binary/octet-stream');

    if (
      contentType.includes('text/html') ||
      contentType.includes('application/json') ||
      contentType.startsWith('text/plain')
    ) {
      console.error(
        'Upstream returned text instead of media:',
        contentType,
        buffer.toString('utf8', 0, Math.min(buffer.length, 300))
      );

      res.status(502).json({
        success: false,
        error: 'La URL devolvió texto o un mensaje de error, no el video. Revisa la URL que entrega SocialKit.'
      });
      return;
    }

    if (!isMp4 && !isWebM && !isVideoContentType && !isOctetStream) {
      console.error(
        'Unrecognized upstream format:',
        contentType,
        'size:',
        buffer.length
      );

      res.status(502).json({
        success: false,
        error: 'La respuesta no parece ser un archivo de video válido.'
      });
      return;
    }

    const extension = isMp4
      ? 'mp4'
      : isWebM
        ? 'webm'
        : contentType.includes('video/mp4')
          ? 'mp4'
          : contentType.includes('video/webm')
            ? 'webm'
            : 'bin';

    const outputType = isMp4
      ? 'video/mp4'
      : isWebM
        ? 'video/webm'
        : isVideoContentType
          ? contentType.split(';')[0]
          : 'application/octet-stream';

    res.status(200);
    res.setHeader('Content-Type', outputType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tikfetch-video.${extension}"`
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.end(buffer);

    console.log(
      `Download delivered: ${buffer.length} bytes; ` +
      `content-type=${outputType}; extension=${extension}`
    );
  } catch (err) {
    console.error('Error in download proxy:', err);

    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      res.status(502).json({
        success: false,
        error: `No se pudo obtener el video del proveedor: ${message}`
      });
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
