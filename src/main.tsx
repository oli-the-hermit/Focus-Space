import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { AppContent } from './App';
import { MiniPlayerApp } from './mini/MiniPlayerApp';
import './index.css';

// The Tauri mini-player window loads the same bundle with ?view=mini. It needs
// no auth or app data: it mirrors timer snapshots sent by the main window.
const isMiniWindow = new URLSearchParams(window.location.search).get('view') === 'mini';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMiniWindow ? (
      <MiniPlayerApp />
    ) : (
      <AppProvider>
        <AppContent />
      </AppProvider>
    )}
  </React.StrictMode>
);
