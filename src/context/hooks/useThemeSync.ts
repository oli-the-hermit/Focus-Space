import { useEffect } from 'react';
import { ThemeMode } from '../../types';
import type { AccentId } from '../../constants/accents';
import { applyTheme, cacheAccent, cacheTheme, cachedAccent, cachedTheme } from '../../lib/theme';

/** Applies the theme and accent: the cached ones on startup, then the saved ones, and follows the OS in 'system'. */
export function useThemeSync(theme: ThemeMode, accent: AccentId) {
  useEffect(() => {
    const cached = cachedTheme();
    if (cached) applyTheme(cached, cachedAccent());
  }, []);

  useEffect(() => {
    applyTheme(theme, accent);
    cacheTheme(theme);
    cacheAccent(accent);
  }, [theme, accent]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system', accent);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, accent]);
}
