import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/geist';
import { AppProvider } from './context/AppContext';
import { AppContent } from './App';
import { MiniPlayerApp } from './mini/MiniPlayerApp';
import { IslandApp } from './island/IslandApp';
import { ISLAND_WINDOW_HASH, MINI_WINDOW_HASH } from './lib/desktop';
import './index.css';

// The Tauri mini-player window loads the same bundle at index.html#mini. It needs
// no auth or app data: it mirrors timer snapshots sent by the main window.
const isMiniWindow =
  window.location.hash === MINI_WINDOW_HASH ||
  new URLSearchParams(window.location.search).get('view') === 'mini';

// Page changes use the View Transitions API where it exists (motion.css).
if ('startViewTransition' in document) document.documentElement.classList.add('has-vt');

// The desktop alert popup (opened by Rust, see src-tauri/src/alerts.rs).
const isIslandWindow = window.location.hash === ISLAND_WINDOW_HASH;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isIslandWindow ? (
      <IslandApp />
    ) : isMiniWindow ? (
      <MiniPlayerApp />
    ) : (
      <AppProvider>
        <AppContent />
      </AppProvider>
    )}
  </React.StrictMode>
);
