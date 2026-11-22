// Service worker (spec STEP 10 OFFLINE): caches ONLY the shell (html, css, js, icons) so the app opens with no network.
// It never caches /api or the published data under d/ (those always go to the network; the app keeps its own last
// numbers and shows "Offline · last update {time}").
const C='grokbot-shell-v12', SHELL=['./','index.html','app.css','app.js','chart.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/api/')||u.pathname.includes('/d/')) return;   // network only
  const shell=SHELL.some(s=>u.pathname.endsWith('/'+s.replace('./',''))||(s==='./'&&u.pathname.endsWith('/')));
  if(!shell) return;
  // network first so a new shell shows at once; the cache only when offline
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
