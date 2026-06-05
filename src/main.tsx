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

// Forcefully unregister service workers and clear old caches to solve stale cache / broken app issues on mobile devices
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Successfully unregistered old service worker.');
        }
      });
    }
  });
}

// Clear all cache storage to make sure the user's phone downloads the latest updated app directly from the server
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name).then(() => {
        console.log(`Cleared cache storage: ${name}`);
      });
    }
  }).catch((err) => {
    console.warn('Failed to clear caches:', err);
  });
}


