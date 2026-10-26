import React, { useState, useRef } from 'react';
import {
  Download,
  Music,
  Image as ImageIcon,
  QrCode,
  Share2,
  Check,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  Volume2,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { TikTokVideoData } from '../types';
import {
  formatNumber,
  formatDuration,
  formatBytes,
  getDownloadUrl,
  triggerDownloadSuccess
} from '../utils/formatters';

interface VideoResultProps {
  video: TikTokVideoData;
  onOpenQrModal: (url: string, title: string) => void;
  onReset: () => void;
}

export const VideoResult: React.FC<VideoResultProps> = ({
  video,
  onOpenQrModal,
  onReset
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isSlideshow = Array.isArray(video.images) && video.images.length > 0;
  const bestVideoUrl = video.hdplay || video.play;

  const handleCopyDirectLink = async () => {
    try {
      const linkToCopy = isSlideshow ? (video.images?.[activeSlideIndex] || video.url) : bestVideoUrl;
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Safe filename generator
  const baseFilename = `${video.author.unique_id}_${video.id}`;

  // Safe in-app file downloader: saves file without leaving the page or blanking the screen
  const handleDownload = async (
    targetUrl: string,
    filename: string,
    type: string,
    key: string,
    fallbackUrl?: string
  ) => {
    if (downloadingKey) return;
    setDownloadingKey(key);
    setDownloadError(null);

    const proxyUrl = getDownloadUrl(targetUrl, filename, type, fallbackUrl);

    try {
      // Fetch binary blob so the current browser window NEVER navigates away
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Servidor respondió con código ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Create download trigger anchor
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      triggerDownloadSuccess();
    } catch (err: any) {
      console.warn('Blob download fetch error, using target="_blank" fallback:', err);
      try {
        // Fallback: opens in background without navigating the current window
        const fallbackA = document.createElement('a');
        fallbackA.href = proxyUrl;
        fallbackA.download = filename;
        fallbackA.target = '_blank';
        fallbackA.rel = 'noopener noreferrer';
        fallbackA.style.display = 'none';
        document.body.appendChild(fallbackA);
        fallbackA.click();
        document.body.removeChild(fallbackA);
        triggerDownloadSuccess();
      } catch (fallbackErr) {
        setDownloadError('No se pudo descargar automáticamente. Por favor intenta con el Servidor 2.');
      }
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top bar of result card with creator info and reset button */}
        <div className="p-4 sm:p-6 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
              {video.author.avatar ? (
                <img
                  src={video.author.avatar}
                  alt={video.author.nickname}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center font-bold text-neutral-400 text-sm -z-10">
                {video.author.nickname.slice(0, 1).toUpperCase()}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base">
                  {video.author.nickname}
                </span>
                <a
                  href={`https://www.tiktok.com/@${video.author.unique_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-0.5"
                  title="Ver perfil en TikTok"
                >
                  @{video.author.unique_id}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Clean unboxed metadata with separators */}
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>{isSlideshow ? `${video.images?.length} fotos` : 'Video TikTok'}</span>
                {!isSlideshow && video.duration > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duration)}
                    </span>
                  </>
                )}
                {video.region && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{video.region}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nuevo Enlace</span>
            </button>
          </div>
        </div>

        {/* Main Content: Split Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Media Preview (Video Player or Slideshow) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-lg">
              {isSlideshow && video.images && video.images.length > 0 ? (
                // Slideshow Carousel Preview
                <div className="relative w-full h-full flex flex-col justify-between">
                  <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                    <img
                      src={video.images[activeSlideIndex]}
                      alt={`Foto ${activeSlideIndex + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md text-xs font-mono text-white">
                      {activeSlideIndex + 1} / {video.images.length}
                    </div>
                  </div>

                  {/* Slideshow Selector Navigation */}
                  <div className="p-2 bg-neutral-950/90 border-t border-neutral-800 flex items-center justify-between gap-1 overflow-x-auto">
                    {video.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`w-9 h-12 rounded overflow-hidden shrink-0 border transition-all cursor-pointer ${
                          activeSlideIndex === idx
                            ? 'border-rose-500 scale-105'
                            : 'border-neutral-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Miniatura ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // HTML5 Video Player
                <video
                  ref={videoRef}
                  src={bestVideoUrl}
                  poster={video.cover}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              )}
            </div>

            {/* Quick action bar under preview */}
            <div className="mt-3 flex items-center gap-2 w-full max-w-[360px]">
              <button
                onClick={handleCopyDirectLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copiar Enlace Directo</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenQrModal(bestVideoUrl, video.title)}
                title="Escanear con teléfono"
                className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-neutral-400" />
                <span>QR Móvil</span>
              </button>
            </div>
          </div>

          {/* Right Column: Actions, Downloads & Details */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Title / Caption */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug break-words">
                {video.title || 'Video de TikTok'}
              </h2>

              {/* Engagement statistics in tabular-nums */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-400">
                <div className="flex items-center gap-1.5" title="Reproducciones">
                  <Eye className="w-4 h-4 text-neutral-500" />
                  <span className="font-mono tabular-nums text-neutral-200">
                    {formatNumber(video.stats.play_count)}
                  </span>
                  <span>vistas</span>
                </div>
                <div className="flex items-center gap-1.5" title="Me gusta">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="font-mono tabular-nums text-neutral-200">
                    {formatNumber(video.stats.digg_count)}
                  </span>
                  <span>me gusta</span>
                </div>
                <div className="flex items-center gap-1.5" title="Comentarios">
                  <MessageCircle className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono tabular-nums text-neutral-200">
                    {formatNumber(video.stats.comment_count)}
                  </span>
                  <span>comentarios</span>
                </div>
                <div className="flex items-center gap-1.5" title="Compartidos">
                  <Share2 className="w-4 h-4 text-neutral-500" />
                  <span className="font-mono tabular-nums text-neutral-200">
                    {formatNumber(video.stats.share_count)}
                  </span>
                  <span>compartidos</span>
                </div>
              </div>
            </div>

            {/* Download Error Alert if any */}
            {downloadError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            {/* Primary Action Buttons Container */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Opciones de Descarga Directa
              </span>

              {isSlideshow && video.images ? (
                // Slideshow Downloads
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={downloadingKey !== null}
                    onClick={() =>
                      handleDownload(
                        video.images![activeSlideIndex],
                        `${baseFilename}_foto_${activeSlideIndex + 1}.jpg`,
                        'image/jpeg',
                        `slide-${activeSlideIndex}`
                      )
                    }
                    className="w-full flex items-center justify-between px-5 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-60 shadow-lg shadow-rose-600/20 hover:shadow-rose-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {downloadingKey === `slide-${activeSlideIndex}` ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      )}
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-bold">
                          {downloadingKey === `slide-${activeSlideIndex}`
                            ? 'Descargando Foto...'
                            : `Descargar Foto ${activeSlideIndex + 1} (Alta Calidad)`}
                        </div>
                        <div className="text-xs text-rose-200/80">
                          Imagen individual en resolución original
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono bg-black/20 px-2 py-1 rounded">
                      JPG
                    </span>
                  </button>

                  {/* Grid of all images for direct 1-click downloads */}
                  <div className="mt-4 p-4 bg-neutral-950/60 rounded-xl border border-neutral-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        Todas las fotos ({video.images.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {video.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={downloadingKey !== null}
                          onClick={() =>
                            handleDownload(
                              img,
                              `${baseFilename}_foto_${i + 1}.jpg`,
                              'image/jpeg',
                              `grid-slide-${i}`
                            )
                          }
                          className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <span>Foto {i + 1}</span>
                          {downloadingKey === `grid-slide-${i}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-rose-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Video Downloads
                <div className="space-y-2.5">
                  {/* 1. Main HD Video Button without Watermark (with automatic fallback to play URL) */}
                  <button
                    type="button"
                    disabled={downloadingKey !== null}
                    onClick={() =>
                      handleDownload(
                        video.hdplay || video.play,
                        `${baseFilename}_HD_sin_marca.mp4`,
                        'video/mp4',
                        'hd',
                        video.play
                      )
                    }
                    className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-60 shadow-lg shadow-rose-600/20 hover:shadow-rose-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      {downloadingKey === 'hd' ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      ) : (
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      )}
                      <div className="text-left">
                        <div className="text-sm sm:text-base font-bold flex items-center gap-2">
                          <span>
                            {downloadingKey === 'hd'
                              ? 'Descargando Video HD...'
                              : 'Descargar Video HD'}
                          </span>
                          <span className="text-xs font-normal bg-black/30 px-2 py-0.5 rounded text-rose-200">
                            Servidor 1
                          </span>
                        </div>
                        <div className="text-xs text-rose-100/80">
                          {downloadingKey === 'hd'
                            ? 'Guardando archivo en tu dispositivo...'
                            : 'Sin marca de agua en máxima resolución'}
                        </div>
                      </div>
                    </div>
                    {video.hd_size > 0 && (
                      <span className="text-xs font-mono bg-black/20 px-2.5 py-1 rounded text-rose-100">
                        {formatBytes(video.hd_size)}
                      </span>
                    )}
                  </button>

                  {/* 2. Secondary Server / Standard MP4 (Always available as guaranteed fallback) */}
                  {video.play && (
                    <button
                      type="button"
                      disabled={downloadingKey !== null}
                      onClick={() =>
                        handleDownload(
                          video.play,
                          `${baseFilename}_servidor2.mp4`,
                          'video/mp4',
                          'server2'
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-neutral-200 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/80 hover:border-neutral-600 disabled:opacity-60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {downloadingKey === 'server2' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : (
                          <Download className="w-4 h-4 text-cyan-400" />
                        )}
                        <div className="text-left">
                          <span className="text-sm font-semibold">
                            {downloadingKey === 'server2'
                              ? 'Descargando desde Servidor 2...'
                              : 'Descargar Servidor 2 (Rápido CDN)'}
                          </span>
                          <p className="text-xs text-neutral-400">Stream directo sin marca de agua</p>
                        </div>
                      </div>
                      {video.size > 0 && (
                        <span className="text-xs font-mono text-neutral-400">
                          {formatBytes(video.size)}
                        </span>
                      )}
                    </button>
                  )}

                  {/* 3. Watermarked MP4 if available */}
                  {video.wmplay && (
                    <button
                      type="button"
                      disabled={downloadingKey !== null}
                      onClick={() =>
                        handleDownload(
                          video.wmplay!,
                          `${baseFilename}_con_marca.mp4`,
                          'video/mp4',
                          'wm'
                        )
                      }
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <span>
                        {downloadingKey === 'wm'
                          ? 'Descargando versión con marca...'
                          : 'Descargar con marca de agua (Original de TikTok)'}
                      </span>
                      {downloadingKey === 'wm' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* 4. Audio MP3 Extraction Box */}
              {video.music && (
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {video.music_info.title || 'Sonido de TikTok'}
                        </div>
                        <div className="text-xs text-neutral-400 truncate">
                          {video.music_info.author || 'Artista original'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={downloadingKey !== null}
                      onClick={() =>
                        handleDownload(
                          video.music,
                          `${baseFilename}_audio.mp3`,
                          'audio/mpeg',
                          'audio'
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-lg transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'audio' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {downloadingKey === 'audio' ? 'Descargando...' : 'Descargar MP3'}
                      </span>
                    </button>
                  </div>

                  {/* Toggle audio preview */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                      className="text-xs text-neutral-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{showAudioPlayer ? 'Ocultar reproductor' : 'Escuchar audio antes de descargar'}</span>
                    </button>
                  </div>

                  {showAudioPlayer && (
                    <audio
                      ref={audioRef}
                      src={video.music}
                      controls
                      className="w-full h-8 mt-2"
                    />
                  )}
                </div>
              )}

              {/* 5. Thumbnail / Cover Image Download */}
              {video.cover && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/50 border border-neutral-850">
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <ImageIcon className="w-4 h-4 text-neutral-500" />
                    <span>Carátula / Miniatura del video (HD)</span>
                  </div>
                  <button
                    type="button"
                    disabled={downloadingKey !== null}
                    onClick={() =>
                      handleDownload(
                        video.cover,
                        `${baseFilename}_portada.jpg`,
                        'image/jpeg',
                        'cover'
                      )
                    }
                    className="flex items-center gap-1 text-xs font-medium text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {downloadingKey === 'cover' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-neutral-300" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>
                      {downloadingKey === 'cover' ? 'Descargando...' : 'Descargar JPG'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
