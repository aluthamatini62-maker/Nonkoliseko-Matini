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
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations && registrations.length > 0) {
        for (const registration of registrations) {
          try {
            registration.unregister().then((success) => {
              if (success) {
                console.log('Successfully unregistered old service worker.');
              }
            }).catch((err) => console.warn('SW unregister promise failed:', err));
          } catch (e) {
            console.warn('SW unregister throw:', e);
          }
        }
      }
    }).catch((err) => {
      console.warn('getRegistrations promise failed:', err);
    });
  } catch (err) {
    console.warn('Service worker API access blocked or disallowed:', err);
  }
}

// Clear all cache storage to make sure the user's phone downloads the latest updated app directly from the server
if ('caches' in window) {
  try {
    caches.keys().then((names) => {
      if (names && names.length > 0) {
        for (const name of names) {
          try {
            caches.delete(name).then(() => {
              console.log(`Cleared cache storage: ${name}`);
            }).catch((e) => console.warn('Cache delete promise failed:', e));
          } catch (e) {
            console.warn('Cache delete exception:', e);
          }
        }
      }
    }).catch((err) => {
      console.warn('Failed to resolve cache keys:', err);
    });
  } catch (err) {
    console.warn('Cache API access disallowed by sandbox policy:', err);
  }
}


