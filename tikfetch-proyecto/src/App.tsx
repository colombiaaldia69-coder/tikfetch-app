import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroInput } from './components/HeroInput';
import { VideoResult } from './components/VideoResult';
import { HowItWorks } from './components/HowItWorks';
import { FeaturesGrid } from './components/FeaturesGrid';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { QrModal } from './components/QrModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TikTokVideoData, DownloadHistoryItem, SampleVideo } from './types';

const STORAGE_KEY = 'tikfetch_download_history_v1';

export default function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<TikTokVideoData | null>(null);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [samples, setSamples] = useState<SampleVideo[]>([]);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read download history:', e);
    }
  }, []);

  // Save history to localStorage
  const saveHistoryItem = (video: TikTokVideoData) => {
    try {
      const isSlideshow = Array.isArray(video.images) && video.images.length > 0;
      const newItem: DownloadHistoryItem = {
        id: video.id,
        title: video.title,
        cover: video.cover,
        authorNickname: video.author.nickname,
        authorHandle: video.author.unique_id,
        url: video.url,
        playUrl: video.hdplay || video.play,
        musicUrl: video.music,
        duration: video.duration,
        timestamp: Date.now(),
        isSlideshow,
        imageCount: video.images?.length
      };

      setHistory((prev) => {
        // Remove existing item with same id
        const filtered = prev.filter((item) => item.id !== video.id);
        const updated = [newItem, ...filtered].slice(0, 25);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.warn('Could not save to history:', e);
    }
  };

  // Load example samples
  useEffect(() => {
    fetch('/api/examples')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.samples)) {
          setSamples(data.samples);
        }
      })
      .catch((err) => console.warn('Could not load samples:', err));
  }, []);

  const handleSearch = async (targetUrl?: string) => {
    const linkToParse = (targetUrl || url).trim();
    if (!linkToParse) {
      setErrorMessage('Por favor ingresa o pega un enlace de TikTok.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: linkToParse })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo procesar el enlace de TikTok.');
      }

      const videoData: TikTokVideoData = data.data;
      setCurrentVideo(videoData);
      saveHistoryItem(videoData);

      // Smooth scroll to result
      setTimeout(() => {
        const el = document.getElementById('video-result-container');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message ||
          'Ocurrió un error al intentar descargar el video. Por favor verifica que el enlace sea público e inténtalo de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCurrentVideo(null);
    setUrl('');
    setErrorMessage(null);
    handleScrollToTop();
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-rose-500/30 selection:text-rose-200">
      {/* Navigation */}
      <Navbar
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onScrollToTop={handleScrollToTop}
      />

      <main className="flex-1">
        {/* Hero & Search Form */}
        <HeroInput
          url={url}
          setUrl={setUrl}
          onSearch={handleSearch}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          samples={samples}
        />

        {/* Video Result View */}
        {currentVideo && (
          <div id="video-result-container" className="scroll-mt-20">
            <VideoResult
              video={currentVideo}
              onOpenQrModal={(mediaUrl, title) =>
                setQrModal({ isOpen: true, url: mediaUrl, title })
              }
              onReset={handleReset}
            />
          </div>
        )}

        {/* How It Works Guide */}
        <HowItWorks />

        {/* Key Features Bento Grid */}
        <FeaturesGrid />

        {/* PWA Mobile App Download Callout */}
        <section className="py-12 border-t border-neutral-900 bg-gradient-to-b from-neutral-950 to-neutral-900/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-850 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="text-center sm:text-left">
                <span className="text-xs font-semibold tracking-wider uppercase text-rose-400">
                  Aplicación Móvil Web
                </span>
                <h3 className="text-xl font-bold text-white mt-1 mb-2">
                  Instala TikFetch en tu Teléfono
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
                  Guarda la aplicación en la pantalla de inicio de tu iPhone o Android. Acceso instantáneo sin descargas pesadas ni anuncios molestos.
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <PWAInstallButton variant="full" />
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <FaqSection />
      </main>

      {/* Connectivity Indicator */}
      <OfflineIndicator />

      {/* Footer */}
      <Footer onScrollToTop={handleScrollToTop} />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectVideoUrl={(historyUrl) => {
          setUrl(historyUrl);
          handleSearch(historyUrl);
        }}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />

      {/* QR Code Modal for Mobile Downloads */}
      <QrModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, url: '', title: '' })}
        downloadUrl={qrModal.url}
        title={qrModal.title}
      />
    </div>
  );
}
