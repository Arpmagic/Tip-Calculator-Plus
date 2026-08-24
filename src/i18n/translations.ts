import { AppLanguage } from '../types';
import { en, TranslationSchema } from './locales/en';
import { uk } from './locales/uk';
import { ru } from './locales/ru';

export type Translations = TranslationSchema;

/**
 * Deep merge fallback utility to guarantee that if any key in a target language
 * is undefined or null, it seamlessly falls back to English without crash or leakage.
 */
function createFallbackProxy<T extends Record<string, any>>(target: T, fallback: T): T {
  const handler: ProxyHandler<T> = {
    get(obj, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return (obj as any)[prop];
      }
      const val = (obj as any)[prop];
      const fallbackVal = (fallback as any)[prop];

      if (val === undefined || val === null || val === '') {
        return fallbackVal;
      }

      if (typeof val === 'object' && val !== null && !Array.isArray(val) && typeof fallbackVal === 'object') {
        return createFallbackProxy(val, fallbackVal);
      }

      return val;
    }
  };
  return new Proxy(target, handler);
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  en,
  uk: createFallbackProxy(uk, en),
  ru: createFallbackProxy(ru, en),
};
