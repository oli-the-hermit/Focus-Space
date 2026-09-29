// Security headers for the web server. The desktop app's policy lives in
// src-tauri/tauri.conf.json (app.security.csp); `npm run check:csp` loads the
// production build under both and fails on any violation.

/**
 * Same as the desktop policy, except: no Tauri IPC, and inline styles are
 * allowed because the web mini player (Document Picture-in-Picture) copies the
 * app's stylesheets into <style> tags.
 */
export const WEB_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

/** Express middleware: sends the policy and a few standard hardening headers. */
export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', WEB_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}
