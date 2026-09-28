import { useEffect } from 'react';
import { ThemeMode } from '../../types';
import { applyTheme, cacheTheme, cachedTheme } from '../../lib/theme';

/** Applies the theme: the cached one on startup, then the saved one, and follows the OS in 'system'. */
export function useThemeSync(theme: ThemeMode) {
  useEffect(() => {
    const cached = cachedTheme();
    if (cached) applyTheme(cached);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    cacheTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}
