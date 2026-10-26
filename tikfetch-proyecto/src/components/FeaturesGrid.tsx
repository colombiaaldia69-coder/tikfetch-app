import React from 'react';
import { EyeOff, Sparkles, Music2, Layers, ShieldCheck, Laptop } from 'lucide-react';

export const FeaturesGrid: React.FC = () => {
  return (
    <section id="caracteristicas" className="py-16 md:py-24 border-t border-neutral-900 bg-neutral-950/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400">
            Ventajas Principales
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4 [text-wrap:balance]">
            Todo lo que necesitas para descargar contenido de TikTok
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 [text-wrap:balance]">
            Diseñado pensando en creadores, editores de contenido y usuarios que buscan rapidez y máxima fidelidad visual.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Col-span 2 marquee feature */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-900/40 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Descargas 100% Limpias Sin Marca de Agua
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed max-w-xl">
                TikFetch extrae directamente el stream de video de los servidores de origen, eliminando el logotipo flotante de TikTok y el usuario superpuesto al final. Perfecto para repostear en Instagram Reels, YouTube Shorts o almacenar en tu biblioteca personal.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3 text-xs text-rose-300 font-medium">
              <span>Resolución nativa</span>
              <span aria-hidden="true">·</span>
              <span>Sin pérdida de fotogramas</span>
              <span aria-hidden="true">·</span>
              <span>Formato estándar MP4</span>
            </div>
          </div>

          {/* Card 2: HD Quality */}
          <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Calidad Full HD Original
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Obtén la mayor tasa de bits posible que el autor subió originalmente a la plataforma (1080p y 720p).
              </p>
            </div>
            <div className="mt-6 text-xs text-neutral-500">
              Soporte para videos de hasta 10 minutos
            </div>
          </div>

          {/* Card 3: Audio MP3 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                <Music2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Extracción de Audio MP3
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                ¿Te gusta una canción viral o un audio cómico? Descárgalo directamente en formato MP3 con metadatos del artista.
              </p>
            </div>
            <div className="mt-6 text-xs text-neutral-500">
              Reproducción previa integrada
            </div>
          </div>

          {/* Card 4: Photo Slideshow */}
          <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Carruseles de Diapositivas
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Soporte completo para publicaciones con múltiples imágenes. Descarga cada foto individualmente o explora la galería.
              </p>
            </div>
            <div className="mt-6 text-xs text-neutral-500">
              Resolución completa JPG/PNG
            </div>
          </div>

          {/* Card 5: Mobile & Desktop Cross-platform */}
          <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Universal y Móvil con QR
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Funciona en cualquier navegador sin instalar apps. Genera códigos QR al instante para enviar videos a tu teléfono.
              </p>
            </div>
            <div className="mt-6 text-xs text-neutral-500">
              Compatible con iOS y Android
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
