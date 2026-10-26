import React from 'react';
import { Copy, ArrowRight, Download, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Copia el enlace en TikTok',
      desc: 'Abre la app de TikTok o la web en tu navegador. Presiona "Compartir" en el video y luego pulsa "Copiar enlace".'
    },
    {
      step: '02',
      title: 'Pega la URL en TikFetch',
      desc: 'Regresa aquí y pega el enlace en el cuadro de búsqueda superior usando el botón "Pegar" o presionando Ctrl+V.'
    },
    {
      step: '03',
      title: 'Descarga en Alta Calidad',
      desc: 'Haz clic en "Descargar". Elige si deseas guardar el video en MP4 HD sin marca de agua, extraer el audio MP3 o las fotos del carrusel.'
    }
  ];

  return (
    <section id="como-funciona" className="py-16 md:py-24 border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold tracking-wider uppercase text-rose-400">
            Guía Paso a Paso
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4 [text-wrap:balance]">
            ¿Cómo descargar videos de TikTok en 3 sencillos pasos?
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 [text-wrap:balance]">
            Un proceso directo y sin complicaciones, compatible con computadoras, teléfonos iPhone, iPad y dispositivos Android.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item, idx) => (
            <div
              key={idx}
              className="relative p-6 sm:p-8 rounded-2xl bg-neutral-900/60 border border-neutral-850 hover:border-neutral-750 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-neutral-700 mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-850 flex items-center gap-2 text-xs text-neutral-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rápido y 100% seguro</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
