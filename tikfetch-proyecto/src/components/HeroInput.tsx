import React, { useState } from 'react';
import { Link2, Clipboard, X, ArrowRight, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { SampleVideo } from '../types';

interface HeroInputProps {
  url: string;
  setUrl: (url: string) => void;
  onSearch: (customUrl?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  samples: SampleVideo[];
}

export const HeroInput: React.FC<HeroInputProps> = ({
  url,
  setUrl,
  onSearch,
  isLoading,
  errorMessage,
  onClearError,
  samples
}) => {
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text.trim());
          setPasteNotice('¡Enlace pegado!');
          setTimeout(() => setPasteNotice(null), 2000);
          return;
        }
      }
      setPasteNotice('Usa Ctrl+V o presiona prolongado para pegar');
      setTimeout(() => setPasteNotice(null), 3000);
    } catch (e) {
      setPasteNotice('Permiso de portapapeles denegado. Pega con Ctrl+V');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      onSearch();
    }
  };

  const handleClear = () => {
    setUrl('');
    onClearError();
  };

  return (
    <section id="descargador" className="relative pt-12 pb-16 md:pt-18 md:pb-20 overflow-hidden">
      {/* Background glow accents (subtle, 10% budget) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-rose-500/10 via-cyan-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Subtle kicker text - clean unboxed */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wide uppercase text-neutral-400 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span>Herramienta Rápida y Gratuita</span>
          <span aria-hidden="true">·</span>
          <span>Sin Registro</span>
          <span aria-hidden="true">·</span>
          <span>Calidad HD</span>
        </div>

        {/* Hero headline with text-wrap: balance */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-white mb-5 leading-tight [text-wrap:balance]">
          Descarga Videos de TikTok <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-neutral-200 to-rose-400 bg-clip-text text-transparent">
            Sin Marca de Agua
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-neutral-400 mb-10 leading-relaxed [text-wrap:balance]">
          Guarda videos en calidad HD original, extrae canciones en MP3 o descarga fotos de carruseles de TikTok al instante sin marcas ni logos.
        </p>

        {/* Input Card Container */}
        <div className="relative max-w-2xl mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2 sm:p-2.5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
                <Link2 className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMessage) onClearError();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Pega el enlace de TikTok aquí (ej. https://vt.tiktok.com/...)"
                className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl pl-11 pr-20 py-3.5 text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/80 transition-all"
                disabled={isLoading}
              />

              <div className="absolute right-2 flex items-center gap-1">
                {url ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Borrar texto"
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                    title="Pegar del portapapeles"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pegar</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSearch()}
              disabled={isLoading || !url.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20 hover:shadow-rose-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Descargar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {pasteNotice && (
            <div className="mt-2 text-xs text-rose-400 font-medium transition-opacity">
              {pasteNotice}
            </div>
          )}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mt-4 max-w-2xl mx-auto p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-start justify-between gap-3 text-left animate-in fade-in duration-200">
            <p className="flex-1">{errorMessage}</p>
            <button
              onClick={onClearError}
              className="text-red-400 hover:text-red-200 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1-Click Example Links for Instant Testing */}
        {samples.length > 0 && (
          <div className="mt-8 pt-4">
            <p className="text-xs font-medium text-neutral-400 mb-3">
              ¿No tienes un enlace a la mano? Prueba con un video de ejemplo:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setUrl(sample.url);
                    onSearch(sample.url);
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer group"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{sample.category}:</span>
                  <span className="text-neutral-400 group-hover:text-neutral-300 truncate max-w-[150px] sm:max-w-[200px]">
                    {sample.author}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
