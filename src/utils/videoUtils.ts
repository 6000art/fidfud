export const STABLE_CULINARY_FALLBACK_VIDEOS: string[] = [
  '/videos/culinary-1.mp4',
  '/videos/culinary-2.mp4',
  '/videos/culinary-3.mp4',
  '/videos/culinary-4.mp4',
  '/videos/culinary-5.mp4',
  '/videos/culinary-fallback.mp4'
];

export interface VideoSourceMetadata {
  type: 'direct' | 'youtube' | 'youtube_shorts' | 'youtube_live' | 'instagram' | 'tiktok' | 'vimeo' | 'pinterest';
  isEmbed: boolean;
  embedUrl: string | null;
  videoId?: string;
  thumbnailUrl?: string;
}

export interface ParseVideoOptions {
  isPlaying?: boolean;
  isMuted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

/**
 * Extracts video IDs, determines embed vs direct playback, and generates responsive embed URLs
 * Supports YouTube (standard, shorts, live), Instagram (posts, reels, stories, profiles), TikTok, Vimeo, and direct media.
 */
export const parseVideoSource = (
  url?: string | null,
  options: ParseVideoOptions = {}
): VideoSourceMetadata => {
  const {
    isPlaying = true,
    isMuted = true,
    loop = true,
    controls = false
  } = options;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      type: 'direct',
      isEmbed: false,
      embedUrl: null,
      thumbnailUrl: undefined
    };
  }

  const cleanUrl = url.trim();

  // 1. YouTube Shorts (e.g., https://www.youtube.com/shorts/3jZpP2vXQ-8)
  const ytShortsMatch = cleanUrl.match(/(?:(?:www\.|m\.)?youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    const id = ytShortsMatch[1];
    const autoplayParam = isPlaying ? 1 : 0;
    const muteParam = isMuted ? 1 : 0;
    const controlsParam = controls ? 1 : 0;
    const loopParam = loop ? `&loop=1&playlist=${id}` : '';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplayParam}&mute=${muteParam}&controls=${controlsParam}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1${loopParam}`;
    return {
      type: 'youtube_shorts',
      isEmbed: true,
      embedUrl,
      videoId: id,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    };
  }

  // 2. YouTube Standard Video or Live (watch?v=, youtu.be/, embed/, live/)
  const ytMatch = cleanUrl.match(/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?.*v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    const autoplayParam = isPlaying ? 1 : 0;
    const muteParam = isMuted ? 1 : 0;
    const controlsParam = controls ? 1 : 0;
    const loopParam = loop ? `&loop=1&playlist=${id}` : '';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplayParam}&mute=${muteParam}&controls=${controlsParam}&modestbranding=1&rel=0&playsinline=1&enablejsapi=1${loopParam}`;
    return {
      type: 'youtube',
      isEmbed: true,
      embedUrl,
      videoId: id,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  // 3. YouTube Channel Live Streams (e.g. youtube.com/@channel/live or channel/UC...)
  const ytChannelMatch = cleanUrl.match(/(?:(?:www\.|m\.)?youtube\.com)\/(?:@|c\/|channel\/)([\w.-]+)(?:\/live|\/streams)?/i);
  if (ytChannelMatch && ytChannelMatch[1]) {
    const handle = ytChannelMatch[1];
    if (handle.startsWith('UC')) {
      const embedUrl = `https://www.youtube-nocookie.com/embed/live_stream?channel=${handle}&autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=${controls ? 1 : 0}&enablejsapi=1&playsinline=1`;
      return {
        type: 'youtube_live',
        isEmbed: true,
        embedUrl,
        videoId: handle
      };
    }
    return {
      type: 'youtube_live',
      isEmbed: true,
      embedUrl: `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${handle}&autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=${controls ? 1 : 0}&enablejsapi=1&playsinline=1`,
      videoId: handle
    };
  }

  // 4. Instagram (Reels, Posts, TV, Profile, Live)
  const igPostMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (igPostMatch && igPostMatch[1]) {
    const id = igPostMatch[1];
    return {
      type: 'instagram',
      isEmbed: true,
      embedUrl: `https://www.instagram.com/p/${id}/embed`,
      videoId: id
    };
  }

  // Instagram Profile or Username (e.g. instagram.com/lekoro.91/?hl=fr or instagram.com/lekoro.91/)
  const igProfileMatch = cleanUrl.match(/(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_.]+)/i);
  if (igProfileMatch && igProfileMatch[1]) {
    const segment = igProfileMatch[1];
    if (!['explore', 'direct', 'accounts', 'stories', 'developer', 'about', 'legal'].includes(segment.toLowerCase())) {
      return {
        type: 'instagram',
        isEmbed: true,
        embedUrl: `https://www.instagram.com/${segment}/embed`,
        videoId: segment
      };
    }
  }

  // 5. TikTok Video (e.g. tiktok.com/@user/video/1234567890 or tiktok.com/embed/v2/1234567890)
  const ttMatch = cleanUrl.match(/(?:tiktok\.com)\/(?:@[\w.-]+\/video\/|embed\/v2\/|embed\/)?(\d+)/i);
  if (ttMatch && ttMatch[1]) {
    const id = ttMatch[1];
    return {
      type: 'tiktok',
      isEmbed: true,
      embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      videoId: id
    };
  }

  // TikTok Short links (vm.tiktok.com, vt.tiktok.com)
  const ttShortMatch = cleanUrl.match(/(?:vm\.tiktok\.com|vt\.tiktok\.com)\/([A-Za-z0-9_-]+)/i);
  if (ttShortMatch && ttShortMatch[1]) {
    const id = ttShortMatch[1];
    return {
      type: 'tiktok',
      isEmbed: true,
      embedUrl: `https://www.tiktok.com/embed/${id}`,
      videoId: id
    };
  }

  // TikTok User Profile / Live (e.g. tiktok.com/@username)
  const ttUserMatch = cleanUrl.match(/(?:tiktok\.com)\/@([\w.-]+)/i);
  if (ttUserMatch && ttUserMatch[1]) {
    const username = ttUserMatch[1];
    return {
      type: 'tiktok',
      isEmbed: true,
      embedUrl: `https://www.tiktok.com/embed/@${username}`,
      videoId: username
    };
  }

  // 6. Vimeo (e.g., vimeo.com/123456789)
  const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      type: 'vimeo',
      isEmbed: true,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=${isPlaying ? 1 : 0}&muted=${isMuted ? 1 : 0}&loop=${loop ? 1 : 0}`,
      videoId: id
    };
  }

  // 7. Pinterest Video / Pin (e.g. pinterest.com/pin/123456789/ or pin.it/xyz)
  if (cleanUrl.includes('pinterest.') || cleanUrl.includes('pinimg.com') || cleanUrl.includes('pin.it')) {
    if (cleanUrl.includes('pinimg.com/videos') || cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.m3u8')) {
      return {
        type: 'direct',
        isEmbed: false,
        embedUrl: null,
        thumbnailUrl: undefined
      };
    }
    const pinMatch = cleanUrl.match(/(?:pinterest\.[a-z.]+\/pin\/)(\d+)/i);
    if (pinMatch && pinMatch[1]) {
      const pinId = pinMatch[1];
      return {
        type: 'pinterest',
        isEmbed: true,
        embedUrl: `https://assets.pinterest.com/ext/embed.html?id=${pinId}`,
        videoId: pinId
      };
    }
    const pinitMatch = cleanUrl.match(/pin\.it\/([A-Za-z0-9_-]+)/i);
    if (pinitMatch && pinitMatch[1]) {
      const shortId = pinitMatch[1];
      return {
        type: 'pinterest',
        isEmbed: true,
        embedUrl: `https://assets.pinterest.com/ext/embed.html?id=${shortId}`,
        videoId: shortId
      };
    }
  }

  // 8. Direct media file (MP4, WebM, blob, data URL, HLS stream)
  return {
    type: 'direct',
    isEmbed: false,
    embedUrl: null
  };
};

/**
 * Returns a thumbnail if remote service supports it
 */
export const getVideoThumbnail = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  const parsed = parseVideoSource(url);
  return parsed.thumbnailUrl;
};

/**
 * Returns whether a given video URL can be directly mounted in an HTML5 <video> tag
 * (i.e. direct media file, blob, or local video path, NOT an iframe embed or social media web page)
 */
export const isDirectPlayableVideo = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean === '' || clean === 'undefined' || clean === 'null') return false;
  if (clean.startsWith('blob:') || clean.startsWith('data:video/')) return true;
  if (clean.startsWith('/uploads/') || clean.startsWith('/videos/')) return true;
  
  // Exclude social network webpages and embed URLs
  if (
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('instagram.com') ||
    clean.includes('tiktok.com') ||
    clean.includes('vimeo.com') ||
    clean.includes('pinterest.') ||
    clean.includes('pin.it')
  ) {
    return false;
  }
  
  // Must match standard video extensions or format
  if (clean.includes('.mp4') || clean.includes('.webm') || clean.includes('.mov') || clean.includes('.m3u8') || clean.includes('.ogg')) {
    return true;
  }

  return false;
};

/**
 * Returns a sanitized video URL. Automatically redirects unstable/blocked 3rd-party CDNs to local stable loops.
 */
export const getSafeVideoUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '' || url === 'undefined' || url === 'null') {
    return '';
  }

  const clean = url.trim();
  const lower = clean.toLowerCase();

  // Redirect unstable external video CDNs that fail with CORS / 403 / no supported sources
  if (
    lower.includes('mixkit.co') ||
    lower.includes('assets.grok.com') ||
    lower.includes('commondatastorage.googleapis.com') ||
    lower.includes('gtv-videos-bucket') ||
    lower.includes('pixabay.com/video') ||
    lower.includes('w3schools.com')
  ) {
    if (lower.includes('pizza') || lower.includes('dough')) return STABLE_CULINARY_FALLBACK_VIDEOS[0];
    if (lower.includes('burger') || lower.includes('meat')) return STABLE_CULINARY_FALLBACK_VIDEOS[1];
    if (lower.includes('veg') || lower.includes('salad') || lower.includes('wok')) return STABLE_CULINARY_FALLBACK_VIDEOS[2];
    if (lower.includes('dessert') || lower.includes('pancake')) return STABLE_CULINARY_FALLBACK_VIDEOS[3];
    return STABLE_CULINARY_FALLBACK_VIDEOS[5] || STABLE_CULINARY_FALLBACK_VIDEOS[0];
  }

  return clean;
};

/**
 * Ensures an HTML5 <video> tag receives a guaranteed playable direct stream, never an empty string or embed URL
 */
export const getDirectOrFallbackVideoUrl = (url?: string | null, fallbackIndex = 0): string => {
  const safe = getSafeVideoUrl(url);
  if (safe && isDirectPlayableVideo(safe)) {
    return safe;
  }
  return STABLE_CULINARY_FALLBACK_VIDEOS[fallbackIndex % STABLE_CULINARY_FALLBACK_VIDEOS.length] || '/videos/culinary-fallback.mp4';
};

export const parseVideoUrl = parseVideoSource;

