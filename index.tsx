
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Service Worker Registration (NexusProxy Kernel)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register proxy-sw.js for V86-like networking interception
    // Use ./ relative path to attempt compatibility, but catch errors for restricted environments
    navigator.serviceWorker.register('./proxy-sw.js')
      .then(registration => {
        console.log('[AlphaFlow Kernel] NexusProxy ServiceWorker registered with scope: ', registration.scope);
      })
      .catch(err => {
        console.warn('[AlphaFlow Kernel] ServiceWorker registration failed (Environment Restricted). Running in Virtual Network Mode.');
        // Do not throw error, allow app to run without SW interception
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
