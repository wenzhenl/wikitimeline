// Helper for user agent access
const getUserAgent = () => typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
    
  return Boolean(
    navigator.userAgent.match(/iPhone|iPad|iPod|Android/i) ||
    (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) ||
    ('ontouchstart' in window || 
     (window.DocumentTouch && document instanceof window.DocumentTouch))
  );
}

export function isChrome(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.indexOf('chrome') !== -1;
}

export function isSafari(): boolean {
  return typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function isFirefox(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.indexOf('firefox') !== -1;
}

export function isEdge(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.indexOf('edge/') !== -1;
}

export function hasShareApi(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
    
  const userAgent = getUserAgent();
  const isIpad = /ipad/.test(userAgent);
  const isTablet = /tablet/.test(userAgent);
  const isLargeScreen = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
    
  return isIpad || isTablet || isLargeScreen;
}

export function getOrientation(): 'landscape' | 'portrait' {
  if (typeof window === 'undefined') return 'portrait';
    
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w > h ? 'landscape' : 'portrait';
} 