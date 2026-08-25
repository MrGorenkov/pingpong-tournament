import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initTelegram } from './telegram';

// Wire up Telegram (theme vars, viewport, haptics). No-op outside Telegram.
initTelegram();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
