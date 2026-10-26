import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: '¿Es completamente gratis usar TikFetch?',
      answer: 'Sí, TikFetch es 100% gratuito e ilimitado. Puedes descargar tantos videos, audios MP3 y fotografías como desees sin pagar suscripciones ni crear una cuenta.'
    },
    {
      question: '¿Cómo descargar videos de TikTok en iPhone o iPad (iOS)?',
      answer: 'En dispositivos iOS (iOS 13 en adelante), abre Safari y navega a TikFetch. Pega el enlace y presiona "Descargar". Al hacer clic en "Descargar Video HD", Safari te preguntará si deseas descargar el archivo. Una vez descargado, tócalo en la flecha de descargas de Safari y selecciona "Guardar video" para añadirlo a tu carrete de fotos.'
    },
    {
      question: '¿Dónde se guardan los videos descargados en mi computadora o teléfono?',
      answer: 'Por defecto, todos los archivos descargados se guardan en la carpeta predeterminada de "Descargas" (Downloads) de tu dispositivo, ya sea Windows, Mac, Android o iOS.'
    },
    {
      question: '¿Puedo descargar videos de cuentas privadas o videos eliminados?',
      answer: 'No. Por razones de privacidad y seguridad, TikFetch únicamente puede acceder y procesar videos de cuentas públicas. Los videos eliminados o configurados como privados no pueden ser extraídos.'
    },
    {
      question: '¿TikFetch almacena copias de los videos descargados o rastrea mi historial?',
      answer: 'No almacenamos copias de los videos en nuestros servidores. Todo el contenido se transmite en vivo directamente desde la fuente original. Tu historial de descargas se guarda únicamente de forma local en tu navegador (localStorage) y nadie más tiene acceso a él.'
    },
    {
      question: '¿Cómo convierto un video de TikTok a archivo de sonido MP3?',
      answer: 'Simplemente pega el enlace del video en el buscador. En la sección de resultados verás automáticamente la opción "Descargar MP3" con la pista de audio limpia lista para guardar.'
    }
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="preguntas" className="py-16 md:py-24 border-t border-neutral-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold tracking-wider uppercase text-rose-400">
            Dudas Comunes
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 mb-4 [text-wrap:balance]">
            Preguntas Frecuentes
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 [text-wrap:balance]">
            Respuestas a las dudas más habituales sobre la descarga de videos y audios de TikTok.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-neutral-900/60 border border-neutral-850 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-neutral-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-xl"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-rose-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-sm text-neutral-400 leading-relaxed border-t border-neutral-850/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
