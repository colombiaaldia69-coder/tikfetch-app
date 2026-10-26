import React from 'react';
import { Download } from 'lucide-react';

interface FooterProps {
  onScrollToTop: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToTop }) => {
  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-neutral-900">
          {/* Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={onScrollToTop}>
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-500">
              <Download className="w-3.5 h-3.5" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Tik<span className="text-rose-500">Fetch</span>
            </span>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
            <a href="#descargador" className="hover:text-white transition-colors">
              Descargador
            </a>
            <a href="#como-funciona" className="hover:text-white transition-colors">
              Cómo Funciona
            </a>
            <a href="#caracteristicas" className="hover:text-white transition-colors">
              Características
            </a>
            <a href="#preguntas" className="hover:text-white transition-colors">
              Preguntas Frecuentes
            </a>
          </nav>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p className="text-center sm:text-left text-neutral-400">
            TikFetch no está afiliado, respaldado ni patrocinado por TikTok, ByteDance Ltd. ni ninguna de sus filiales. Todos los derechos pertenecen a sus respectivos autores.
          </p>
          <p className="whitespace-nowrap shrink-0 text-neutral-400 font-mono">
            &copy; {new Date().getFullYear()} TikFetch. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
