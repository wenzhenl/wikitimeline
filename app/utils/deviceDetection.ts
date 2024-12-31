export const deviceDetection = {
  ua: typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '',

  // Mobile detection
  isMobile: () => {
    if (typeof window === 'undefined') return false;
    
    return Boolean(
      // Primary checks
      typeof window.orientation !== 'undefined' ||
      navigator.userAgent.match(/iPhone|iPad|iPod|Android/i) ||
      // Additional checks
      (window.matchMedia && window.matchMedia('(max-width: 767px)').matches) ||
      // Touch capability check
      ('ontouchstart' in window || 
       (window.DocumentTouch && document instanceof window.DocumentTouch))
    );
  },

  // Browser detection
  isChrome: () => typeof navigator !== 'undefined' && navigator.userAgent.indexOf('chrome') !== -1,
  isSafari: () => typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isFirefox: () => typeof navigator !== 'undefined' && navigator.userAgent.indexOf('firefox') !== -1,
  isEdge: () => typeof navigator !== 'undefined' && navigator.userAgent.indexOf('edge/') !== -1,

  // Feature detection
  hasShareApi: () => typeof navigator !== 'undefined' && !!navigator.share,
  
  // Device type
  isTablet: () => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isIpad = /ipad/.test(userAgent);
    const isTablet = /tablet/.test(userAgent);
    const isLargeScreen = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
    
    return isIpad || isTablet || isLargeScreen;
  },

  // Orientation
  getOrientation: () => {
    if (typeof window === 'undefined') return 'portrait';
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    return w > h ? 'landscape' : 'portrait';
  }
}; 