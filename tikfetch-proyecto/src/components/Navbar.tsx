import React from 'react';
import { History, Download } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  historyCount: number;
  onOpenHistory: () => void;
  onScrollToTop: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ historyCount, onOpenHistory, onScrollToTop }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={onScrollToTop}
          className="flex items-center gap-2 group text-left cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500 group-hover:border-rose-500/50 transition-colors">
            <Download className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center">
            Tik<span className="text-rose-500">Fetch</span>
          </span>
        </button>

        {/* Zone 2: 4 Single-Line Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <a
            href="#descargador"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Descargador
          </a>
          <a
            href="#como-funciona"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Cómo Funciona
          </a>
          <a
            href="#caracteristicas"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Características
          </a>
          <a
            href="#preguntas"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Preguntas Frecuentes
          </a>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Historial</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 rounded text-[11px] font-mono tabular-nums">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
