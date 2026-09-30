import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// Set by the Tauri CLI when it runs beforeDevCommand / beforeBuildCommand.
const underTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  // Keep Tauri's Rust compiler output visible in the same terminal.
  clearScreen: false,
  test: {
    // Vitest empties stylesheets by default; the accent palette test reads tokens.css (?raw).
    css: { include: [/tokens\.css/] }
  },
  server: {
    port: 3000,
    strictPort: true,
    // The desktop shell opens its own window; don't also open a browser tab.
    open: !underTauri,
    proxy: {
      // FOCUSSPACE_API_URL lets a second dev instance talk to its own API server.
      '/api': process.env.FOCUSSPACE_API_URL || 'http://127.0.0.1:4000'
    }
  }
});
