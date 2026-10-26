import React from 'react';
import { X, Trash2, Download, ExternalLink, Clock, Play } from 'lucide-react';
import { DownloadHistoryItem } from '../types';
import { formatDuration, getDownloadUrl, triggerDownloadSuccess } from '../utils/formatters';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DownloadHistoryItem[];
  onSelectVideoUrl: (url: string) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectVideoUrl,
  onClearHistory,
  onDeleteItem
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Historial de Descargas</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {history.length} {history.length === 1 ? 'video guardado' : 'videos guardados'} en este navegador
              </p>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  title="Vaciar todo el historial"
                  className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List or Empty State */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <Clock className="w-12 h-12 stroke-[1.5] mb-3 text-neutral-600" />
                <p className="text-sm font-medium text-neutral-300 mb-1">
                  Tu historial está vacío
                </p>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Los videos que descargues o analices aparecerán aquí para que puedas acceder a ellos rápidamente.
                </p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl hover:border-neutral-700/80 transition-all flex gap-3 group"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => {
                      onSelectVideoUrl(item.url);
                      onClose();
                    }}
                    className="relative w-16 h-22 rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer border border-neutral-800"
                  >
                    <img
                      src={item.cover}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-rose-400 truncate">
                          @{item.authorHandle}
                        </span>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="text-neutral-500 hover:text-rose-400 p-0.5 rounded cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity"
                          title="Eliminar del historial"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4
                        onClick={() => {
                          onSelectVideoUrl(item.url);
                          onClose();
                        }}
                        className="text-xs font-medium text-neutral-200 hover:text-white line-clamp-2 mt-0.5 cursor-pointer"
                      >
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const downloadUrl = getDownloadUrl(item.playUrl, `${item.authorHandle}_${item.id}.mp4`);
                              const res = await fetch(downloadUrl);
                              if (res.ok) {
                                const blob = await res.blob();
                                const bUrl = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = bUrl;
                                a.download = `${item.authorHandle}_${item.id}.mp4`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(() => window.URL.revokeObjectURL(bUrl), 5000);
                              } else {
                                window.open(downloadUrl, '_blank');
                              }
                              triggerDownloadSuccess();
                            } catch (e) {
                              window.open(getDownloadUrl(item.playUrl, `${item.authorHandle}_${item.id}.mp4`), '_blank');
                            }
                          }}
                          className="p-1.5 text-neutral-300 hover:text-white bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                          title="Descargar MP4"
                        >
                          <Download className="w-3 h-3 text-rose-400" />
                          <span className="text-[11px]">MP4</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
