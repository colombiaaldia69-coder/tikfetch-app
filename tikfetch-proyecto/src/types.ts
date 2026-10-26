export interface TikTokAuthor {
  id: string;
  unique_id: string;
  nickname: string;
  avatar: string;
}

export interface TikTokMusicInfo {
  id: string;
  title: string;
  author: string;
  play: string;
  cover?: string;
}

export interface TikTokStats {
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  download_count?: number;
}

export interface TikTokVideoData {
  id: string;
  url: string;
  title: string;
  cover: string;
  origin_cover?: string;
  duration: number;
  author: TikTokAuthor;
  play: string;
  hdplay: string;
  wmplay?: string;
  size: number;
  hd_size: number;
  music: string;
  music_info: TikTokMusicInfo;
  images?: string[];
  stats: TikTokStats;
  create_time: number;
  region?: string;
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  cover: string;
  authorNickname: string;
  authorHandle: string;
  url: string;
  playUrl: string;
  musicUrl: string;
  duration: number;
  timestamp: number;
  isSlideshow: boolean;
  imageCount?: number;
}

export interface SampleVideo {
  id: string;
  title: string;
  url: string;
  author: string;
  handle: string;
  category: string;
  duration: string;
}
