/**
 * Where the app is running, for bug reports (Help > Report a problem, the crash
 * screen's Copy details). The desktop app reads its OS from the web view's user
 * agent: WebView2 on Windows, WebKit on macOS and Linux.
 */
import { strings } from '../constants/strings';
import { format } from './i18n';
import { isTauri } from './desktop';

export type OsName = 'Windows' | 'macOS' | 'Linux';

/** The desktop OS named in a user-agent string, or null (phones, tablets, unknown). */
export function detectOs(userAgent: string): OsName | null {
  // Phones and tablets also say "Linux" (Android) or "like Mac OS X" (iOS).
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return null;
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Linux|X11|CrOS/i.test(userAgent)) return 'Linux';
  return null;
}

/** Windows has no flag emoji (Segoe UI Emoji shows two letters instead), in the app and in browsers. */
export function hasFlagEmoji(userAgent: string = navigator.userAgent): boolean {
  return detectOs(userAgent) !== 'Windows';
}

/** "Desktop (Windows)", or "Web (<user agent>)" in a browser. */
export function platformLabel(userAgent: string = navigator.userAgent, desktop: boolean = isTauri()): string {
  const h = strings.help;
  return desktop
    ? format(h.platformDesktop, { os: detectOs(userAgent) ?? h.platformUnknownOs })
    : format(h.platformWeb, { details: userAgent });
}
