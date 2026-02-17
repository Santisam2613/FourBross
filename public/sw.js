self.addEventListener('install', (event) => {
  console.log('FourBross Service Worker Installed');
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through
});
