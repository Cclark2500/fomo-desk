// Copy Desk (plan B): static app on GitHub Pages, data published by the desk every 5 min under d/<DATA_PATH>/.
// DATA_PATH comes from the URL fragment #d=... (never sent to the server), is kept in localStorage, then removed from the address bar.
// Polls every 60 s. No SSE. Read-only: pause/settings go through Telegram.
const KEY='copydesk.d', POLL_MS=60000;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dataPath(){
  const m=location.hash.match(/(?:^#|&)d=([A-Za-z0-9_-]{32,})/);
  if(m){localStorage.setItem(KEY,m[1]);history.replaceState(null,'',location.pathname+location.search);}
  return localStorage.getItem(KEY);
}
const D=dataPath();
async function get(name){
  const r=await fetch(`d/${D}/${name}?t=${Date.now()}`,{cache:'no-store'});
  if(!r.ok) throw new Error(r.status); return r.json();
}
const usd=v=>v==null?'—':'$'+Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const pct=v=>v==null?'—':(v*100).toFixed(1)+'%';
function ago(iso){if(!iso)return'';const s=(Date.now()-Date.parse(iso))/1000;return s<90?`${Math.round(s)}s ago`:s<5400?`${Math.round(s/60)} min ago`:`${(s/3600).toFixed(1)} h ago`;}
// Links come ONLY from the published data (built by links.py on the desk); the UI never builds a FOMO URL.
const safeUrl=u=>(typeof u==="string"&&/^https:\/\/[^\s"<>]+$/.test(u))?u:null;
const a_=(u,t)=>{const s=safeUrl(u);return s?`<a href="${esc(s)}" target="_blank" rel="noopener">${t}</a>`:t;};
function waiting(msg){
  $('status').innerHTML=`<div class="empty">${esc(msg)}</div>`; $('updated').textContent='';
  drawLine($('chart'),[]);
}
async function tick(){
  if(!D){waiting('No data link yet. Open this app from the link the desk sent you (it ends in #d=…).');$('mode').textContent='—';return;}
  let st;
  try{st=await get('state.json');}catch(e){waiting('Waiting for first data… the desk publishes every 5 minutes.');return;}
  const stale=st.updated_utc&&(Date.now()-Date.parse(st.updated_utc))>15*60*1000;
  $('status').innerHTML=stale?'<span class="bad">● stale</span> desk has not published for over 15 min':'<span class="ok">● online</span>';
  $('updated').textContent=`last update ${new Date(st.updated_utc).toLocaleString()} (${ago(st.updated_utc)})`;
  $('mode').textContent=(st.mode||'PAPER').toUpperCase();
  $('balance').textContent=usd(st.balance_usd);
  drawLine($('chart'),(st.equity||[]).map(p=>[Date.parse(p.t),p.v]));
  $('signup').innerHTML=safeUrl(st.signup_url)?`New to FOMO? ${a_(st.signup_url,'Join with the Quickscout referral')}`:'';
  $('beats').innerHTML=Object.entries(st.heartbeats||{}).map(([k,v])=>`<li>${esc(k)}: ${esc(v)}s ago</li>`).join('')||'<li class="mut">none</li>';
  try{
    const w=await get('whales.json'), L=w.whales||[];
    $('whales').innerHTML=L.length?`<table><tr><th>Whale</th><th>7d PnL</th><th>Win</th></tr>${L.map(x=>`<tr><td>${a_(x.profile_url,esc(x.handle))}</td><td>${usd(x.pnl_7d)}</td><td>${pct(x.win_rate)}</td></tr>`).join('')}</table>`:'<div class="empty">No whales qualify right now.</div>';
  }catch(e){$('whales').innerHTML='<div class="empty">Waiting for first data…</div>';}
  try{
    const a=await get('activity.json'), E=a.rows||[];
    $('activity').innerHTML=E.length?E.slice(0,30).map(x=>`<li>${esc(new Date(x.ts).toLocaleTimeString())} · ${a_(x.link,esc(x.title+(x.subtitle?' — '+x.subtitle:'')))}</li>`).join(''):'<li class="mut">Nothing yet tonight</li>';
  }catch(e){$('activity').innerHTML='<li class="mut">Waiting for first data…</li>';}
}
tick(); setInterval(tick,POLL_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
