import confetti from 'canvas-confetti';

export function formatNumber(num?: number): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function getDownloadUrl(
  targetUrl: string,
  filename: string,
  type: string = 'video/mp4',
  fallbackUrl?: string
): string {
  if (!targetUrl) return '#';
  let path = `/api/download?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}`;
  if (fallbackUrl && fallbackUrl !== targetUrl) {
    path += `&fallbackUrl=${encodeURIComponent(fallbackUrl)}`;
  }
  return path;
}

export function triggerDownloadSuccess() {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#25F4EE', '#FE2C55', '#FFFFFF']
    });
  } catch (e) {
    // Ignore in case canvas is not supported
  }
}
