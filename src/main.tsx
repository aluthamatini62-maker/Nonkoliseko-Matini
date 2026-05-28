import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppProvider } from './context/AppContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

// Register Progressive Web App (PWA) Service Worker for seamless installation setup on Android and iOS devices
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Kwano PWA Service Worker matched and registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('Kwano PWA Service Worker registration failed:', err);
      });
  });
}

