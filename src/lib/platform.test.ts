import { describe, expect, it } from 'vitest';
import { detectOs, platformLabel } from './platform';
import { strings } from '../constants/strings';

// Real user agents from each desktop web view, plus the look-alikes that must not match.
const UA = {
  webview2: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  wkwebview: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
  webkitgtk: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
};

describe('detectOs', () => {
  it('names each desktop web view', () => {
    expect(detectOs(UA.webview2)).toBe('Windows');
    expect(detectOs(UA.wkwebview)).toBe('macOS');
    expect(detectOs(UA.webkitgtk)).toBe('Linux');
  });

  it("doesn't mistake phones for desktops", () => {
    expect(detectOs(UA.iphone)).toBeNull();
    expect(detectOs(UA.android)).toBeNull();
    expect(detectOs('')).toBeNull();
  });
});

describe('platformLabel', () => {
  it('says which desktop OS, or that it is unknown', () => {
    expect(platformLabel(UA.webkitgtk, true)).toBe('Desktop (Linux)');
    expect(platformLabel(UA.wkwebview, true)).toBe('Desktop (macOS)');
    expect(platformLabel('', true)).toBe(`Desktop (${strings.help.platformUnknownOs})`);
  });

  it('gives the full user agent on the web', () => {
    expect(platformLabel(UA.android, false)).toBe(`Web (${UA.android})`);
  });
});
