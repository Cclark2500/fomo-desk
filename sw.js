// Minimal service worker: cache the shell, always go to network for /api and data.
const C='copydesk-v2', SHELL=['./','index.html','app.css','app.js','chart.js','manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
  if(u.pathname.includes('/api/')||u.pathname.includes('/d/'))return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
self.addEventListener('push',e=>{const d=e.data?e.data.json():{title:'Copy Desk'};e.waitUntil(self.registration.showNotification(d.title||'Copy Desk',{body:d.body||''}));});
