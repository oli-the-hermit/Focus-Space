import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set by the Tauri CLI when it runs beforeDevCommand / beforeBuildCommand.
const underTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  // Keep Tauri's Rust compiler output visible in the same terminal.
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    // The desktop shell opens its own window; don't also open a browser tab.
    open: !underTauri,
    proxy: {
      '/api': 'http://127.0.0.1:4000'
    }
  }
});
