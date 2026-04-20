/**
 * Production Logger - No-op in release builds
 * Use: import { log, error } from '../utils/logger';
 */

const isDev = __DEV__ && process.env.NODE_ENV !== 'production';

export const log = (...args: any[]) => {
  if (isDev) console.log('[VitalHealth]', ...args);
};

export const error = (...args: any[]) => {
  if (isDev) console.error('[VitalHealth ERROR]', ...args);
};

export const warn = (...args: any[]) => {
  if (isDev) console.warn('[VitalHealth WARN]', ...args);
};

// Default exports for backward compat
export default { log, error, warn };

