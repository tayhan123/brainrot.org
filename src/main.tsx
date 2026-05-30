import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign WebSocket/HMR connection disconnect error overlays in standard development sandboxes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason?.message || String(event.reason || '');
    if (reasonStr && (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('websocket') ||
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('failed to connect to websocket') ||
      reasonStr.includes('getContext') ||
      reasonStr.includes('Script error')
    )) {
      event.preventDefault();
      console.warn('Suppressed benign sandbox WebSocket/CORS rejection:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    if (errorMsg && (
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('websocket') ||
      errorMsg.includes('closed without opened') ||
      errorMsg.includes('failed to connect to websocket') ||
      errorMsg.includes('getContext') ||
      errorMsg.includes('Script error') ||
      errorMsg === 'Script error.'
    )) {
      event.preventDefault();
      console.warn('Suppressed benign sandbox WebSocket/CORS error event:', errorMsg);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
