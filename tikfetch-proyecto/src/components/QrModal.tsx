import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, Copy, Check, ExternalLink } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  title: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  downloadUrl,
  title
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && downloadUrl) {
      // Build absolute URL if relative
      const fullUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : `${window.location.origin}${downloadUrl}`;

      QRCode.toDataURL(fullUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen, downloadUrl]);

  if (!isOpen) return null;

  const fullUrl = downloadUrl.startsWith('http')
    ? downloadUrl
    : `${window.location.origin}${downloadUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto mb-3 text-cyan-400">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Descargar en tu Móvil
        </h3>
        <p className="text-xs text-neutral-400 mb-5">
          Escanea el código con la cámara de tu celular (iPhone o Android) para guardar el video directamente en tu galería.
        </p>

        {/* QR Code Canvas Frame */}
        <div className="bg-white p-3 rounded-xl inline-block mx-auto shadow-md">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR para descargar video"
              className="w-56 h-56 object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-neutral-400">
              Generando código QR...
            </div>
          )}
        </div>

        {/* Action button to copy link */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Enlace copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-400" />
                <span>Copiar Enlace Móvil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
