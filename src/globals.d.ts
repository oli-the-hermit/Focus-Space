/** App version from package.json, injected by Vite (vite.config.ts `define`). */
declare const __APP_VERSION__: string;

/** A stylesheet's source text (Vite's ?raw import; the accent palette test reads tokens.css). */
declare module '*.css?raw' {
  const source: string;
  export default source;
}
