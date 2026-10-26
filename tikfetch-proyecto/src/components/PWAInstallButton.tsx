import React, { useState } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Suppress if already installed and running standalone
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${className}`}
          title="Instalar TikFetch como aplicación"
        >
          <Smartphone className="w-3.5 h-3.5 text-rose-400" />
          <span>Instalar App</span>
        </button>
      ) : (
        <button
          onClick={handleClick}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 hover:border-neutral-600 transition-all cursor-pointer shadow-lg ${className}`}
        >
          <Download className="w-4 h-4 text-rose-400" />
          <span>Instalar TikFetch en tu Pantalla</span>
        </button>
      )}

      {/* Guide Modal for iOS Safari / General Browsers */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-left">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              {isIOS ? 'Instalar en iPhone / iPad' : 'Instalar en tu Dispositivo'}
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Accede a TikFetch directamente desde la pantalla de tu teléfono como una aplicación nativa, sin necesidad de abrir el navegador.
            </p>

            {isIOS ? (
              <div className="space-y-3.5 text-xs text-neutral-300">
                <div className="flex items-start gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-cyan-400">
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">Paso 1:</span>
                    Toca el botón <strong>Compartir</strong> en la barra inferior de Safari (icono con flecha hacia arriba).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-rose-400">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">Paso 2:</span>
                    Desplázate hacia abajo y selecciona <strong>"Agregar al inicio"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">Paso 3:</span>
                    Toca <strong>"Agregar"</strong> en la esquina superior derecha y ¡listo!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-neutral-300">
                <div className="flex items-start gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-cyan-400">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">En Android / Chrome:</span>
                    Toca el menú de 3 puntos en la esquina superior derecha de tu navegador y pulsa <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla principal"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-neutral-950/60 rounded-xl border border-neutral-850">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 text-rose-400">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block mb-0.5">En Computadora (Chrome / Edge):</span>
                    Haz clic en el icono de instalación que aparece a la derecha dentro de la barra de direcciones de tu navegador.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl font-medium text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
