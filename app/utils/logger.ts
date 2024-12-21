type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};

export default logger; 