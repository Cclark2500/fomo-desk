// Grok Bot Copy Desk · THE APP (spec STEP 10). Plain JS, no framework, no build step.
// Plan B (GitHub Pages): data is published by the desk every 6 min under d/<DATA_PATH>/ (the path comes from the URL
// fragment #d=..., never sent to a server, kept in localStorage). The app polls; no SSE. Controls that need a POST to
// the box cannot work from Pages: they are shown disabled with "via Telegram" + a t.me/<bot> deep link (STEP 11). Never a made-up number.
'use strict';
const KEY='copydesk.d', TKEY='copydesk.t', READ='copydesk.read', RECENT='copydesk.recent';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VIA='via Telegram';
const tg=()=>(typeof LAST!=='undefined'&&LAST.state&&LAST.state.push&&LAST.state.push.telegram)||null;
const viaH=()=>{const t=tg();return t&&t.deep_link?`<a class="blue tlink" href="${esc(t.deep_link)}" target="_blank" rel="noopener">via Telegram</a>`:'via Telegram (not connected yet)';};
const COLORS={watcher:'#64d2ff',vetter:'#ffd60a',sizer:'#bf5af2',executor:'#00d35a',guard:'#ff6b9a'};
const NAMES={watcher:'Watcher',vetter:'Vetter',sizer:'Sizer',executor:'Executor',guard:'Guard'};
function dataPath(){
  const m=location.hash.match(/(?:^#|&)d=([A-Za-z0-9_-]{32,})/);
  if(m){localStorage.setItem(KEY,m[1]);history.replaceState(null,'',location.pathname+location.search+'#/home');}
  return localStorage.getItem(KEY);
}
const D=dataPath();
const PLAN=D?'B':(/^(127\.0\.0\.1|localhost)$/.test(location.hostname)?'A':null);
const POLL_MS=PLAN==='A'?5000:15000, SCREEN_MS=PLAN==='A'?1000:15000, STALE_S=PLAN==='A'?60:15*60;
function url(n){
  if(PLAN==='B') return n==='screen.jpg'||n.startsWith('shots/')?`d/${D}/${n}`:`d/${D}/${n}.json`;
  let m;
  if((m=n.match(/^chart\/(\w+)$/))) return `/api/chart?range=${m[1]}`;
  if((m=n.match(/^(activity|orders)\/(\d+)$/))) return `/api/${m[1]}?before=${m[2]}`;
  return `/api/${n}`;
}
const PERSIST=new Set(['state','whales','activity','chart/LIVE','orders','pushes']);
const LAST={};
for(const k of PERSIST){try{const v=localStorage.getItem('copydesk.last.'+k);if(v)LAST[k]=JSON.parse(v);}catch(e){}}
const net={fail:0,next:0,lastOk:LAST.state?.updated_utc||null};
async function get(n){
  const h={}; const t=localStorage.getItem(TKEY); if(PLAN==='A'&&t) h.Authorization='Bearer '+t;
  const r=await fetch(url(n)+(url(n).includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store',headers:h});
  if(!r.ok){const e=new Error(r.status);e.status=r.status;throw e;}
  const j=await r.json(); LAST[n]=j;
  if(PERSIST.has(n)) try{localStorage.setItem('copydesk.last.'+n,JSON.stringify(j));}catch(e){}
  return j;
}
async function tryGet(n){try{return await get(n);}catch(e){return LAST[n]??null;}}
// ---------- format ----------
const usd=(v,d=2)=>v==null||isNaN(v)?'—':(v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const cmp=v=>v==null?'—':(v>=0?'+':'-')+'$'+new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(Math.abs(v));
const sgn=v=>v==null?'—':(v>=0?'+':'-')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const pctS=v=>v==null?'—':(v>=0?'+':'')+Number(v).toFixed(2)+'%';
const hm=iso=>{if(!iso)return'—';const d=new Date(iso);return isNaN(d)?esc(iso):d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});};
function ago(iso){if(!iso)return'';const s=Math.max(0,(Date.now()-Date.parse(iso))/1000);if(isNaN(s))return'';return s<60?`${Math.round(s)}s ago`:s<3600?`${Math.round(s/60)}m ago`:s<86400?`${Math.round(s/3600)}h ago`:`${Math.round(s/86400)}d ago`;}
function age(iso){if(!iso)return null;const s=(Date.now()-Date.parse(iso))/1000;if(isNaN(s))return null;return s<3600?`${Math.round(s/60)}m`:s<86400?`${Math.round(s/3600)}h`:`${Math.round(s/86400)}d`;}
function price(v){if(v==null)return'—';if(v>=1)return'$'+v.toLocaleString('en-US',{maximumFractionDigits:4});const s=v.toPrecision(4);return'$'+(+s).toString().replace(/e-(\d+)/,(a,b)=>'e-'+b);}
const safeUrl=u=>(typeof u==='string'&&/^https:\/\/[^\s"<>]+$/.test(u))?u:null;
const fomoBtn=(u,label='Open on FOMO')=>safeUrl(u)?`<a class="fomo" href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(label)}">FOMO ↗</a>`:'';
const mono=h=>`<span class="avatar" aria-hidden="true">${esc((h||'?').replace('@','')[0]?.toUpperCase()||'?')}</span>`;
const ckTxt=v=>v===true||v===1?'ok':v===false||v===0?'no':'–';
const ckCls=v=>v===true||v===1?'ok':v===false||v===0?'no':'';
const checks=c=>`<span class="checks">${['screen','api','chain'].map(k=>`<span class="ck ${ckCls(c?.[k])}">${k} ${ckTxt(c?.[k])}</span>`).join('')}</span>`;
// RM() comes from chart.js (prefers-reduced-motion)
function toast(t){const e=document.createElement('div');e.className='ptr show';e.setAttribute('role','status');e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),1800);}
const sk=(h,mt=10)=>`<div class="sk" style="height:${h}px;margin-top:${mt}px"></div>`;
const dis=(label,cls='btn sec2')=>`<button class="${cls}" disabled aria-disabled="true" aria-label="${esc(label)} (${VIA})">${esc(label)}</button>`;
const sw=(on,label,locked)=>`<button class="swbtn" role="switch" aria-checked="${on?'true':'false'}" disabled aria-label="${esc(label)} (${esc(locked||VIA)})"><span class="switch" aria-hidden="true"></span></button>`;
// ---------- odometer: changed digits roll 600ms ease-out, 30ms stagger; reduced motion: values swap ----------
function setOdo(el,text){
  if(el.dataset.v===text) return; const old=el.dataset.v||''; el.dataset.v=text; el.setAttribute('aria-label',text);
  if(old.length!==text.length||RM()){
    el.innerHTML=[...text].map(ch=>/\d/.test(ch)?`<span class="d" aria-hidden="true"><span style="transform:translateY(-${(RM()?+ch:0)*1.05}em)">${[...'0123456789'].map(x=>`<i>${x}</i>`).join('')}</span></span>`:`<span aria-hidden="true">${esc(ch)}</span>`).join('');
    if(RM()) return;
  }
  const cols=[...el.children]; let k=0;
  [...text].forEach((ch,i)=>{const c=cols[i]; if(!c||!/\d/.test(ch)) return; const inner=c.firstElementChild; if(!inner) return;
    const want=`translateY(-${+ch*1.05}em)`; if(inner.style.transform!==want){inner.style.transitionDelay=`${(k++)*30}ms`; requestAnimationFrame(()=>requestAnimationFrame(()=>inner.style.transform=want));}});
}
// ---------- router ----------
function route(){const h=location.hash.replace(/^#\/?/,'');const [p,a,b]=h.split('/');return {p:p||'home',a:a?decodeURIComponent(a):null,b};}
const TABS={home:'home',whales:'whales',whale:'whales',bots:'bots',activity:'activity',account:'account',coin:null,audit:null};
function nav(left){$('#navL').innerHTML=left;}
function navHome(){nav(`<a class="avbtn" href="#/account" aria-label="Account">${mono(LAST.account?.fomo_handle||'G')}</a><a class="brand" href="#/account" aria-label="Grok Bot, account">Grok Bot <span class="chev" aria-hidden="true">›</span></a>`);}
function navTitle(t,back){nav(back?`<button class="back" onclick="history.length>1?history.back():location.hash='#/home'" aria-label="Back"><span aria-hidden="true">‹</span> Back</button><span class="title">${esc(t)}</span>`:`<span class="title" style="font-size:17px">${esc(t)}</span>`);}
let cur=null; const VIEWS={};
async function render(soft){
  const r=route(); const key=location.hash;
  $$('.tabs a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.tab===TABS[r.p])); $$('.tabs a').forEach(a=>{if(a.dataset.tab===TABS[r.p])a.setAttribute('aria-current','page');});
  if(!soft&&cur!==key){cur=key;window.scrollTo(0,0);}
  if(!PLAN){navTitle('Grok Bot');$('#view').innerHTML=`<div class="empty" style="margin-top:24px">No data link yet. Open this app from the link the desk sent you (it ends in #d=…).</div>`;return;}
  try{await (VIEWS[r.p]||VIEWS.home)(r,soft);}catch(e){console.error(e);}
}
window.addEventListener('hashchange',()=>{closeSheet();render(false);});
// ---------- error / offline row ----------
let stateOk=false;
function errRow(){
  const e=$('#err'), st=LAST.state, last=st?.updated_utc||net.lastOk;
  const stale=st&&(Date.now()-Date.parse(st.updated_utc))/1000>STALE_S;
  const n=Math.max(0,Math.round((net.next-Date.now())/1000));
  if(!navigator.onLine||net.offline){e.hidden=false;e.className='err off';e.textContent=`Offline · last update ${last?hm(last):'never'}`;return;}
  if(PLAN&&(net.fail>0||stale)){e.hidden=false;e.className='err';e.textContent=`Desk offline · retrying in ${n}s · last update ${last?hm(last):'never'}`;return;}
  e.hidden=true;
}
setInterval(errRow,1000); addEventListener('online',()=>{errRow();refresh();}); addEventListener('offline',errRow);
async function poll(){
  if(!PLAN) return render(true);
  try{const st=await get('state');net.fail=0;net.offline=false;net.lastOk=st.updated_utc;stateOk=true;}catch(e){net.fail++;net.offline=(e instanceof TypeError)&&PLAN==='B';}   // plan B: Pages is always up, so a network error = this phone is offline
  net.next=Date.now()+(net.fail?Math.min(60000,POLL_MS*2**(net.fail-1)):POLL_MS);
  tryGet('pushes').then(bell); if(!LAST.account) tryGet('account').then(()=>{if(route().p==='home')navHome();});
  errRow(); await render(true);
}
let timer=null;
async function refresh(){clearTimeout(timer);await poll();timer=setTimeout(loop,Math.max(1000,net.next-Date.now()));}
function loop(){refresh();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});   // back from the background: refetch at once
// pull to refresh on every list
(()=>{let y0=null,pull=0;const p=$('#ptr');
  addEventListener('touchstart',e=>{y0=(scrollY<=0&&$('#sheet').hidden&&$('#full').hidden)?e.touches[0].clientY:null;pull=0;},{passive:true});
  addEventListener('touchmove',e=>{if(y0==null)return;pull=e.touches[0].clientY-y0;p.classList.toggle('show',pull>70);},{passive:true});
  addEventListener('touchend',()=>{if(pull>70){p.textContent='Refreshing…';refresh().then(()=>{p.classList.remove('show');p.textContent='Release to refresh';});}else p.classList.remove('show');y0=null;});})();
// ---------- HOME ----------
let range='LIVE', chartN=null, screenT=null;
function homeShell(){
  clearInterval(screenT); screenT=null;
  $('#view').innerHTML=`
  <div class="bal"><span class="odo" id="odo" role="text" aria-label="Balance"></span><span id="modePill"></span></div>
  <div class="today"><span id="today"></span><span class="pill mult" id="mult" hidden></span></div>
  <div class="chartbox"><canvas id="bc" role="img" aria-label="Balance chart"></canvas><p class="sr" id="bcSum"></p><p class="note" id="bcNote" style="position:absolute;left:16px;right:16px;bottom:8px;text-align:center" hidden>The line starts with the first copy</p></div>
  <div class="ranges" role="group" aria-label="Chart range">${['LIVE','1H','4H','1D','1W','ALL'].map(r=>`<button data-r="${r}" aria-pressed="${r===range}">${r}</button>`).join('')}</div>
  <button class="live" id="live" aria-label="Live screen of the bot's computer. Tap for full screen">
    <img id="fa" alt="" hidden><img id="fb" alt="" hidden><div class="nofr" id="nofr">Waiting for the first frame</div>
    <span class="tl" id="ltl"><span class="ldot"></span>…</span><span class="tr" id="ltr">Idle</span></button>
  <button class="lastorder" id="lastOrder" aria-label="Last order"></button>
  <h2 id="botsH">Bots</h2><div class="carousel" id="car" aria-label="Bot cards"></div>
  <h2>Activity <a href="#/activity">See all</a></h2><div id="act5"></div>`;
  $$('.ranges button').forEach(b=>b.onclick=()=>{range=b.dataset.r;chartN=null;$$('.ranges button').forEach(x=>x.setAttribute('aria-pressed',x===b));drawChart();});
  $('#live').onclick=openFull;
}
function homeSkeleton(){$('#view').innerHTML=`${sk(72,8)}${sk(20)}${sk(220,12)}${sk(44)}<div class="sk" style="aspect-ratio:16/9;border-radius:22px;margin-top:14px"></div>${sk(44)}<div style="display:flex;gap:12px;margin-top:24px">${sk(178,0).replace('margin-top:0px','flex:0 0 78%')}${sk(178,0).replace('margin-top:0px','flex:1')}</div>`;}
async function drawChart(){
  const c=await tryGet('chart/'+range); const st=LAST.state; if(!c||!$('#bc')) return;
  const marks=(c.marks||[]).filter(m=>m.text).map(m=>({t:m.t,text:m.text,kind:m.kind}));
  drawBalance($('#bc'),c.points||[],c.start_cash,marks,chartN); chartN=(c.points||[]).length; $('#bcNote').hidden=chartN>1;
  const s=st&&st.balance_usd!=null?`Balance ${usd(st.balance_usd)}, ${st.today_pct>=0?'up':'down'} ${Math.abs(st.today_pct||0).toFixed(1)}% tonight`:'Balance unknown';
  $('#bc').setAttribute('aria-label',s); $('#bcSum').textContent=s;
}
VIEWS.home=async(r,soft)=>{
  navHome(); const st=LAST.state;
  if(!st){ if(!soft) homeSkeleton(); return; }
  if(!$('#odo')) homeShell();
  setOdo($('#odo'),st.balance_usd==null?'—':usd(st.balance_usd));
  $('#modePill').innerHTML=st.mode==='PAPER'?'<span class="pill paper">PAPER</span>':st.mode==='LIVE'?'':`<span class="pill dry" title="desk mode">${esc(st.mode)}</span>`;
  $('#today').innerHTML=st.today_pct==null?'<span class="sec">—</span>':`<span class="${st.today_pct>=0?'green':'red'}">${st.today_pct>=0?'▲':'▼'} ${pctS(st.today_pct)}</span> <span class="sec">today</span>`;
  const m=$('#mult'); m.hidden=st.multiplier==null; m.textContent=st.multiplier==null?'':`${(+st.multiplier).toFixed(2)}×`; m.setAttribute('aria-label',`${(+st.multiplier||0).toFixed(2)} times the night start`);
  drawChart(); liveCard(st);
  const lo=st.last_order; const lb=$('#lastOrder');
  if(lo){const verb=lo.side==='buy'?'Bought':'Sold', s2=lo.status==='done'?(lo.checks&&lo.checks.screen&&lo.checks.api&&lo.checks.chain?'verified':`${lo.mode} fill · no click`):lo.status==='failed'?`failed · ${(lo.error||'').split(':')[0]}`:lo.status;
    lb.innerHTML=`<span><span class="${lo.status==='failed'?'red':''}">${lo.status==='failed'?'Order':verb} ${esc(lo.symbol||(lo.mint||'').slice(0,6))} · ${usd(lo.usd)} · ${esc(s2)}</span></span>${checks(lo.checks)}`; lb.onclick=()=>openOrder(lo.id); lb.hidden=false;}
  else {lb.innerHTML='<span class="sec">No order yet</span>'; lb.onclick=null;}
  const running=(st.bots||[]).filter(b=>b.status==='ok').length; $('#botsH').textContent=`Bots · ${running} running`;
  const [wd,vd,sd,od,setg]=await Promise.all([tryGet('bots/watcher/decisions'),tryGet('bots/vetter/decisions'),tryGet('bots/sizer/decisions'),tryGet('orders'),tryGet('settings')]);
  const vm=vd?.decisions?.[0]?.mint; const au=vm?await tryGet('audit/'+vm):null;
  $('#car').innerHTML=botCards(st,{wd,vd,sd,od,setg,au});
  const a=await tryGet('activity'); $('#act5').innerHTML=a?actList((a.rows||[]).slice(0,5),'Waiting for the first copy'):sk(56*5,0);
};
function setv(setg,k){for(const g of Object.values(setg?.groups||{}))for(const s of g)if(s.key===k)return s.value;return null;}
function botCards(st,{wd,vd,sd,od,setg,au}){
  const B=Object.fromEntries((st.bots||[]).map(b=>[b.name,b])); const lane=st.lane||{};
  const card=(n,big,body)=>`<article class="bot" aria-label="${NAMES[n]}"><div class="hd"><span class="sw" style="background:${COLORS[n]}"></span><span style="color:${COLORS[n]}">${NAMES[n]}</span><span class="sec" style="margin-left:auto;font-size:12px">${B[n]?.status==='ok'?'running':esc(B[n]?.status||'—')}</span></div><div class="big">${big}</div>${body}</article>`;
  const w0=wd?.decisions?.[0];
  const watcher=card('watcher',`${st.whales_online??'—'} whales`,`<div class="feed">${w0?[esc((w0.detail||'').replace(/ lag.*/,'').replace(/ buy /,' bought '+(w0.symbol?esc(w0.symbol)+' · ':'')).replace(/ sell /,' sold '+(w0.symbol?esc(w0.symbol)+' · ':''))),ago(w0.ts)].filter(Boolean).join(' · '):'No fill seen yet'}</div>`);
  const L=au?.layers||[]; const sc=vd?.decisions?.[0]; const score=au?.score?.score??null;
  const ring=v=>{const c=2*Math.PI*22,col=v==null?'#48484a':v>=70?'#00d35a':'#ff453a';return `<svg class="ring" viewBox="0 0 54 54" role="img" aria-label="score ${v??'none'}${v!=null?(v>=70?' pass':' below 70'):''}"><circle cx="27" cy="27" r="22" fill="none" stroke="#2c2c2e" stroke-width="5"/><circle cx="27" cy="27" r="22" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${c*(v||0)/100} ${c}" transform="rotate(-90 27 27)" stroke-linecap="round"/><text x="27" y="32" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">${v??'–'}</text></svg>`;};
  const social=au?.score?.social_pts!=null?`Social +${au.score.social_pts}`:'Social: off';
  const vetter=card('vetter',`${B.vetter?.today_count??0} taken apart`,`<div class="row"><div style="flex:1"><div class="strips" aria-label="last audit layers">${Array.from({length:8},(_,i)=>{const l=L[i];return `<span class="${l?.pass===true?'p':l?.pass===false?'f':''}" title="${esc(l?.name||'')}"></span>`;}).join('')}</div><div class="feed" style="margin-top:8px">${sc?`${esc(sc.symbol||'')} · ${esc(sc.decision)}`:'No coin yet'} · ${social}</div></div>${ring(score)}</div>`);
  const s0=sd?.decisions?.[0]; const cash=st.cash_free_usd;
  const sizer=card('sizer','Sizing',`<div class="feed">${s0?esc(s0.detail):(cash!=null?`${usd(cash)} free cash`:'—')}</div><div class="feed">${setv(setg,'sizer.full_whales')??3} whales = full size · 1 whale = third size</div>`);
  const o0=od?.rows?.[0]; const ex=lane.holder&&lane.holder.bot==='Executor'?`Clicking ${lane.holder.action==='buying'?'Buy':'Sell'}…`:null;
  const dips=(/dip_waits=(\d+)/.exec(B.executor?.info||'')||[])[1];
  const exe=card('executor',`${B.executor?.today_count??0} trades`,`${dips&&+dips?`<div class="feed">Waiting for a dip -${setv(setg,'executor.dip_pct')??12}%</div><div class="bar"><i style="width:50%"></i></div>`:''}<div class="feed">${ex||(o0?(o0.status==='done'&&o0.checks?.screen&&o0.checks?.api&&o0.checks?.chain?`✓ ${o0.side==='buy'?'Bought':'Sold'} · verified`:o0.status==='failed'?`✕ ${esc(o0.symbol||'')} · ${esc((o0.error||'').split(':')[0])}`:`${o0.side==='buy'?'Bought':'Sold'} ${esc(o0.symbol||'')} · ${esc(o0.mode||'')} · no click`):'No order yet')}</div>`);
  const guard=card('guard','Guarding',`<div class="feed">${(st.open_positions||[]).length} open position${(st.open_positions||[]).length===1?'':'s'}</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tpill red">stop -${setv(setg,'guard.stop_pct')??25}%</span><span class="tpill green">trail ${setv(setg,'executor.trail_pct')??40}%</span><span class="tpill orange">whale out</span></div>`);
  return watcher+vetter+sizer+exe+guard;
}
function liveCard(st){
  const lane=st.lane||{}; const fr=lane.frame_utc; const fresh=fr&&(Date.now()-Date.parse(fr))<5000;
  $('#ltl').innerHTML=PLAN!=='A'?`<span class="ldot"></span>${esc(lane.status==='live'?'Desk screen':lane.status||'Desk screen')}`:fresh?'<span class="ldot on"></span>Live · Bot\'s computer':`<span class="ldot"></span>${fr?'Last frame '+hm(fr):(esc(lane.status||'No frame'))}`;
  const h=lane.holder; const col=h?COLORS[(h.bot||'').toLowerCase()]:null;
  $('#ltr').innerHTML=h?`<span style="color:${col}">${esc(h.bot)} · ${esc(h.action)}</span>`:'Idle';
  if(PLAN!=='A'){   // user decision 2026-11-22: no picture of the screen is ever published; it stays on the desk
    $('#nofr').hidden=false; $('#nofr').innerHTML='<span><b style="color:#fff">Paused · private</b><br>Live picture: private, on the desk only</span>';
    $('#live').setAttribute('aria-label',"Live screen: private, on the desk only. "+($('#ltr').textContent||'')); $('#live').dataset.src=''; return;}
  if(!screenT){loadFrame();screenT=setInterval(loadFrame,SCREEN_MS);}
}
let front='fa';
function loadFrame(){   // double buffered: load into the hidden <img>, swap only after it decoded -> never flashes
  const back=front==='fa'?'fb':'fa'; const b=$('#'+back); if(!b) {clearInterval(screenT);screenT=null;return;}
  const im=new Image(); im.onload=()=>{b.src=im.src; b.hidden=false; const f=$('#'+front); if(f) f.hidden=true; front=back; $('#nofr').hidden=true; $('#live').dataset.src=im.src;};
  im.onerror=()=>{ if($('#fa').hidden&&$('#fb').hidden){$('#nofr').hidden=false;$('#nofr').textContent=(!navigator.onLine||net.offline)?'Offline · the frame needs the network':LAST.state?.lane?.status?.includes('private')?'Paused · private':'No frame published yet';}};
  im.src=url('screen.jpg')+'?t='+Date.now();
}
function openFull(){
  const src=$('#live').dataset.src; if(!src) return; const lane=LAST.state?.lane||{};
  const f=$('#full'); f.innerHTML=`<div class="bar2"><button class="back" id="fullX" aria-label="Close full screen">‹ Close</button>${lane.coin?`<a class="btn pri" style="min-height:44px" href="${esc(safeUrl(lane.coin.link)||'#')}" target="_blank" rel="noopener">Open on FOMO</a>`:''}</div><img src="${esc(src)}" alt="Bot's computer: the copy tab on FOMO, frame ${esc(hm(lane.frame_utc))}">`;
  f.hidden=false; $('#fullX').onclick=()=>{f.hidden=true;f.innerHTML='';}; $('#fullX').focus();
}
// ---------- Activity rows ----------
const KIND={copied:['C','#0a84ff','copied'],bought:['B','#00d35a','bought'],sold:['S','#00d35a','sold'],stopped:['!','#ff453a','stop'],rejected:['R','#8e8e93','rejected'],exited:['E','#ff9f0a','exit']};
function actRight(r){
  if(r.kind==='rejected') return '<span class="sec">Skipped</span>';
  if(r.kind==='stopped') return `<span class="red">${usd(r.value)}</span><small>stop</small>`;
  if(r.kind==='sold') return `${usd(r.value)}<small>sold</small>`;
  if(r.kind==='bought') return `${usd(r.value)}<small>bought</small>`;
  return r.value!=null?usd(r.value):'';
}
function actList(rows,emptyText){
  if(!rows.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div class="list">${rows.map(r=>{const k=KIND[r.kind]||['·','#8e8e93',r.kind];const to=r.mint?(r.kind==='rejected'?`#/audit/${r.mint}`:`#/coin/${r.mint}`):null;
    return `<div class="li"><span class="kind" style="--k:${k[1]}" aria-hidden="true">${k[0]}</span><a class="m" ${to?`href="${to}"`:''} aria-label="${esc(r.title)}, ${esc(k[2])}"><div class="t">${esc(r.title)}</div><div class="s">${esc(r.subtitle||'')} · ${hm(r.ts)}</div></a><span class="v">${actRight(r)}</span>${fomoBtn(r.link,`Open ${r.title} on FOMO`)}</div>`;}).join('')}</div>`;
}
let actSeg='activity', actRows=null, actNext=null, ordRows=null, ordNext=null;
VIEWS.activity=async(r,soft)=>{
  navTitle('Activity'); const v=$('#view');
  if(!soft||!$('#actSeg')) v.innerHTML=`<h1 class="big">Activity</h1><div class="seg" id="actSeg" role="group" aria-label="Show"><button data-s="activity" aria-pressed="${actSeg==='activity'}">Activity</button><button data-s="orders" aria-pressed="${actSeg==='orders'}">Orders</button></div><div id="actBody" style="margin-top:12px">${sk(56)}${sk(56,2)}${sk(56,2)}</div>`;
  $$('#actSeg button').forEach(b=>b.onclick=()=>{actSeg=b.dataset.s;$$('#actSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));VIEWS.activity(r,true);});
  if(actSeg==='activity'){
    const a=await tryGet('activity'); if(!a) return;
    if(!actRows||soft){actRows=a.rows||[];actNext=a.next_before;}
    $('#actBody').innerHTML=actList(actRows,'Nothing yet tonight')+(actNext?`<button class="btn sec2" style="width:100%;margin-top:12px" id="more">Load more</button>`:'');
    if($('#more')) $('#more').onclick=async()=>{const p=await tryGet('activity/'+actNext); if(p){actRows=actRows.concat(p.rows||[]);actNext=p.next_before;VIEWS.activity(r,'more');}};
  } else {
    const o=await tryGet('orders'); if(!o) return; ordRows=o.rows||[];
    $('#actBody').innerHTML=ordRows.length?`<div class="list">${ordRows.map(x=>`<button class="li" onclick="openOrder(${x.id})"><span class="kind" style="--k:${x.status==='failed'?'#ff453a':'#00d35a'}" aria-hidden="true">${x.side==='buy'?'B':'S'}</span><span class="m"><div class="t">${x.side==='buy'?'Buy':'Sell'} ${esc(x.symbol||(x.mint||'').slice(0,6))} · ${esc(x.status)}</div><div class="s">${esc(x.mode||'')} · ${hm(x.ts)}${x.error?' · '+esc(x.error):''}</div></span><span class="v">${usd(x.usd)}</span></button>`).join('')}</div><p class="note">${esc(o.note||'')}</p>`:`<div class="empty">No orders yet tonight</div>`;
  }
};
// ---------- ORDER SHEET ----------
function sheet(html,title){$('#sheetBody').innerHTML=`<button class="icon close" data-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true" style="stroke:#fff;fill:none;stroke-width:2"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${title?`<h3 id="sheetTitle">${esc(title)}</h3>`:''}${html}`;$('#sheet').hidden=false;$('#sheet').querySelector('[data-close].icon').focus();}
function closeSheet(){$('#sheet').hidden=true;}
$('#sheet').addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet();});
addEventListener('keydown',e=>{if(e.key==='Escape'){closeSheet();$('#full').hidden=true;}});
async function openOrder(id){
  const o=(LAST.orders?.rows||[]).concat(ordRows||[]).find(x=>x.id===id)||(await tryGet('orders'))?.rows?.find(x=>x.id===id);
  if(!o){sheet('<div class="empty">This order is not in the published pages yet.</div>','Order');return;}
  const cr=o.checks_read||{}; const kv=(k,v)=>`<div class="kv"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`;
  const steps=(o.steps_ms||[]).map(s=>`${esc(s.step)} ${s.ms} ms${s.ok?'':' ✕'}`).join(' · ')||'—';
  const read=k=>cr[k]!=null?esc(typeof cr[k]==='string'?cr[k]:JSON.stringify(cr[k])):(o.checks?.[k]==null?'not run (no click in '+esc(o.mode||'PAPER')+')':'—');
  sheet(kv('Side',o.side==='buy'?'Buy':'Sell')+kv('Coin',`${esc(o.symbol||'')} <span class="sec">${esc((o.mint||'').slice(0,6))}…${esc((o.mint||'').slice(-6))}</span>`)+kv('$ asked',usd(o.usd))+kv('Status',`${esc(o.status)}${o.error?' · '+esc(o.error):''}`)+kv('Quote',esc(o.quote_text||'—'))+kv('Fee',esc(o.fee_text||'—'))+kv('Price impact',esc(o.impact_text||'—'))
    +kv(`Screen ${ckTxt(o.checks?.screen)}`,read('screen'))+kv(`API ${ckTxt(o.checks?.api)}`,read('api'))+kv(`Chain ${ckTxt(o.checks?.chain)}`,read('chain'))+kv('ms per step',steps)
    +(o.status==='failed'?kv('Abort',`<span class="red">${esc(o.abort||'—')}</span> · ${esc((o.error||'').split(':').slice(1).join(':').trim()||o.error||'')}`)+kv('Failure screenshot',o.has_shot?'kept on the desk only (private)':'none'):'')
    +`<div class="btns" style="grid-template-columns:1fr">${safeUrl(o.link)?`<a class="btn pri" href="${esc(o.link)}" target="_blank" rel="noopener">Open on FOMO</a>`:''}</div>`,`Order ${o.id} · ${o.side==='buy'?'Buy':'Sell'} ${o.symbol||''}`);
}
window.openOrder=openOrder;
// ---------- WHALES ----------
VIEWS.whales=async(r,soft)=>{
  navTitle('Whales'); const w=await tryGet('whales');
  if(!w){if(!soft)$('#view').innerHTML=`<h1 class="big">Whales</h1>${sk(64)}${sk(64,2)}${sk(64,2)}`;return;}
  const L=w.whales||[];
  $('#view').innerHTML=`<h1 class="big">Whales</h1>${L.length?`<div class="list">${L.map(x=>`<div class="li"><span class="sec" style="width:20px">${x.rank??''}</span>${mono(x.handle)}<a class="m" href="#/whale/${encodeURIComponent(x.id)}" aria-label="@${esc(x.handle)}, rank ${x.rank}, details"><div class="t">@${esc(x.handle)}</div><div class="s">${x.last_fill?`${esc(x.last_fill.side==='buy'?'bought':'sold')} ${esc(x.last_fill.symbol||(x.last_fill.mint||'').slice(0,6))} · ${ago(x.last_fill.ts)}`:'no fill seen'}</div></a><span class="v"><span class="${x.pnl_7d>=0?'green':'red'}">${cmp(x.pnl_7d)}</span><small>${x.win_rate!=null?(x.win_rate*100).toFixed(0)+'% win':''}</small></span>${sw(x.muted,`Mute @${x.handle}`)}</div>`).join('')}</div><p class="note">Mute: ${viaH()}. Guard still watches a muted whale's exits on coins you hold.</p>`:`<div class="empty">List builds at night start</div>`}`;
};
VIEWS.whale=async(r,soft)=>{
  const w=await tryGet('whale/'+r.a); navTitle(w?'@'+w.handle:'Whale',true);
  if(!w){$('#view').innerHTML=`<div class="empty" style="margin-top:16px">This whale's page is not published yet.</div>`;return;}
  const st=(k,v)=>`<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`; const pr=w.proof||{};
  const rate=x=>x?`${Math.round(x.rate*100)}% (${x.matched}/${x.total})`:'—';
  $('#view').innerHTML=`<div class="chead" style="margin-top:12px">${mono(w.handle).replace('avatar','avatar" style="width:56px;height:56px;font-size:22px')}<div><div class="nm" style="font:700 22px var(--disp)">${safeUrl(w.profile_url)?`<a href="${esc(w.profile_url)}" target="_blank" rel="noopener" style="display:inline-flex;min-height:44px;align-items:center">@${esc(w.handle)} ↗</a>`:'@'+esc(w.handle)}</div><div class="sec">rank ${w.rank??'—'} tonight</div></div><span style="margin-left:auto">${sw(w.muted,`Mute @${w.handle}`)}</span></div>
  <div class="stats">${st('7d pnl',`<span class="${w.pnl_7d>=0?'green':'red'}">${sgn(w.pnl_7d)}</span>`)}${st('Win rate',w.win_rate!=null?(w.win_rate*100).toFixed(0)+'%':'—')}${st('Trades 7d',w.trades_7d??'—')}${st('Median hold',w.median_hold_min!=null?Math.round(w.median_hold_min)+'m':'—')}${st('Top coin share',w.top_coin_share!=null?Math.round(w.top_coin_share*(w.top_coin_share<=1?100:1))+'%':'—')}${st('Chain match',rate(pr.chain))}</div>
  <div class="stats" style="grid-template-columns:1fr 1fr 1fr">${st('FOMO witness',rate(pr.fomo))}${st('My pnl tonight',`${sgn(w.my_pnl?.tonight)} · ${w.my_pnl?.tonight_n??0}`)}${st('My pnl all time',`${sgn(w.my_pnl?.all_time)} · ${w.my_pnl?.all_time_n??0}`)}</div>
  <h2>Last 20 fills</h2>${(w.fills||[]).length?`<div class="list">${w.fills.map(f=>`<div class="li"><a class="m" href="#/coin/${f.mint}"><div class="t">${f.side==='buy'?'Bought':'Sold'} ${esc(f.symbol||f.mint.slice(0,6))} · ${usd(f.usd)}</div><div class="s">${hm(f.ts)}${f.lag_s!=null?` · lag ${Math.round(f.lag_s)}s`:''}</div></a><span class="v" style="max-width:40%;white-space:normal;font-size:13px">${f.verdict==='copied'?'<span class="green">copied</span>':f.verdict==='dropped'?`<span class="sec">dropped: ${esc(f.reason)}</span>`:f.verdict==='refused'?`<span class="sec">refused: ${esc(f.reason)}</span>`:'<span class="sec">—</span>'}</span>${fomoBtn(f.link)}</div>`).join('')}</div>`:'<div class="empty">No fills seen</div>'}
  <p class="note">Chain match: on-chain witness from the WHALE PROOF (STEP 3.3); FOMO witness: the FOMO-only check you chose.</p>`;
};
// ---------- BOTS ----------
VIEWS.bots=async(r,soft)=>{
  navTitle('Bots'); const st=LAST.state; if(!st){if(!soft)$('#view').innerHTML=`<h1 class="big">Bots</h1>${sk(200)}${sk(200)}`;return;}
  const ds=await Promise.all(Object.keys(NAMES).map(n=>tryGet(`bots/${n}/decisions`))); const od=await tryGet('orders');
  const open=(st.open_positions||[]).length;
  $('#view').innerHTML=`<h1 class="big">Bots</h1>`+(st.bots||[]).map((b,i)=>{const d=ds[i]?.decisions||[]; const ok=b.status==='ok';
    const lock=b.name==='guard'&&open?`locked while ${open} position${open>1?'s are':' is'} open`:null;
    const rows=b.name==='executor'&&(od?.rows||[]).length?od.rows.slice(0,20).map(o=>`<button class="li" onclick="openOrder(${o.id})"><span class="m"><div class="t">${o.side==='buy'?'Buy':'Sell'} ${esc(o.symbol||(o.mint||'').slice(0,6))} · ${esc(o.status)}</div><div class="s">${hm(o.ts)}${o.error?' · '+esc(o.error):''}</div></span><span class="v">${usd(o.usd)}</span></button>`).join(''):d.map(x=>`<div class="li"><a class="m" ${x.mint?`href="#/${x.decision==='rejected'?'audit':'coin'}/${x.mint}"`:''}><div class="t">${esc(x.symbol||(x.mint||'').slice(0,6)||'coin')} · ${esc(x.decision)}</div><div class="s">${esc(x.detail||'')} · ${typeof x.ts==='string'&&x.ts.endsWith('ET')?esc(x.ts.slice(11,16)):hm(x.ts)}</div></a>${fomoBtn(x.link)}</div>`).join('');
    return `<section class="grp" style="margin-bottom:14px" aria-label="${NAMES[b.name]}"><div class="li"><span class="sw" style="width:12px;height:12px;border-radius:50%;background:${ok?'#00d35a':b.paused?'#ff9f0a':'#ff453a'}" aria-hidden="true"></span><div class="m"><div class="t" style="color:${COLORS[b.name]};font-weight:700">${NAMES[b.name]}</div><div class="s">${ok?'running':esc(b.status)} · heartbeat ${b.heartbeat_s!=null?Math.round(b.heartbeat_s)+'s':'—'} · ${b.today_count??'—'} today</div></div>${sw(!b.paused,`Run ${NAMES[b.name]}`,lock||VIA)}</div>
    ${rows?`<div style="max-height:320px;overflow:auto">${rows}</div>`:`<div class="li"><span class="sec">No decisions yet</span></div>`}
    <div class="li"><a class="m blue" href="#/account/${b.name}" style="min-height:44px;display:flex;align-items:center">Settings ›</a><span class="via">${lock?esc(lock):'pause '+viaH()}</span></div></section>`;}).join('');
};
// ---------- COIN ----------
VIEWS.coin=async(r,soft)=>{
  const [c,a]=await Promise.all([tryGet('coin/'+r.a),tryGet('audit/'+r.a)]); navTitle(c?.symbol||'Coin',true);
  if(!c){$('#view').innerHTML=`<div class="empty" style="margin-top:16px">This coin is not in the published data (the desk publishes open positions and the last 24h of coins).</div>`;return;}
  const p=c.position; const passed=(a?.layers||[]).filter(l=>l.pass===true).length, n=(a?.layers||[]).length; const old=age(c.created_at);
  const since=p&&p.entry_price&&c.price?100*(c.price/p.entry_price-1):null; const paper=(p?.mode||LAST.state?.mode)==='PAPER';
  $('#view').innerHTML=`<div class="chead"><span class="nm">${esc(c.name||c.symbol||'?')}</span>${n?`<a class="shieldlink" href="#/audit/${c.mint}" aria-label="audit ${passed} of ${n} layers passed"><span class="shield">🛡 ${passed}/${n}</span></a>`:''}${paper?'<span class="pill paper">PAPER</span>':''}</div>
  <div class="sec">${esc(c.symbol||'')} · Solana${old?` · ${old} old`:''}</div>
  <div class="price">${price(c.price)}</div>${since!=null?`<div class="${since>=0?'green':'red'}" style="font-weight:600">${since>=0?'▲':'▼'} ${Math.abs(since).toFixed(1)}% since entry</div>`:''}
  <div class="chartbox" style="height:200px;margin-top:10px"><canvas id="cc" role="img" aria-label="${esc(c.symbol||'')} 1-minute candles, ${(c.candles||[]).length} minutes${p?.stop_price?', exit line at '+price(p.stop_price):''}"></canvas></div>
  ${(c.candles||[]).length?'':'<p class="note">No price reads stored for this coin in the last 24h.</p>'}
  <div class="stats"><div class="stat"><div class="k">Market cap</div><div class="v">—</div></div><div class="stat"><div class="k">Liquidity</div><div class="v">—</div></div><div class="stat"><div class="k">Holders</div><div class="v">${c.holders!=null?Number(c.holders).toLocaleString():'—'}</div></div></div>
  <p class="note">Market cap and liquidity are not stored by the desk yet, so they show —.</p>
  ${p?`<div class="list"><div class="li"><div class="m"><div class="t">Your position · ${usd(p.size_usd)} in · Executor</div><div class="s">${p.mode} · opened ${hm(p.opened_at)}${p.stop_price?' · stop '+price(p.stop_price):''}</div></div></div></div>`:'<p class="note">No position in this coin.</p>'}
  <div class="btns">${safeUrl(c.link)?`<a class="btn pri" href="${esc(c.link)}" target="_blank" rel="noopener">Open on FOMO</a>`:'<span></span>'}<button class="btn redb" id="sellNow" ${p&&!p.closed_at?'':'disabled'} aria-label="Sell now">Sell now</button></div>
  ${(c.whales||[]).length?`<h2>Whales in</h2><div class="list">${c.whales.map(w=>`<div class="li"><a class="m" href="#/whale/${encodeURIComponent(w.id)}"><div class="t">@${esc(w.handle)}</div><div class="s">first buy ${hm(w.first_buy_ts)}${w.sold_seen?' · sold':''}</div></a><span class="v">${usd(w.usd)}</span></div>`).join('')}</div>`:''}`;
  drawCandles($('#cc'),c.candles||[],p?.stop_price,(c.whales||[]).map(w=>({t:w.first_buy_ts})));
  const sn=$('#sellNow'); if(sn&&!sn.disabled) sn.onclick=()=>sellSheet(c);
};
function sellSheet(c){
  let pct=null;
  sheet(`<div class="seg" role="group" aria-label="How much to sell">${[25,50,100].map(x=>`<button data-p="${x}" aria-pressed="false">${x}%</button>`).join('')}</div>
  <button class="btn redb" id="confirmSell" style="width:100%;margin-top:16px" disabled>Confirm sell</button><p class="note">Confirm sell = POST /api/sell, then Executor clicks it. Plan B has no way to reach the box from this page: sell ${viaH()} (send: sell ${esc(c.symbol||'')}).</p>`,`Sell ${c.symbol||''}`);
  $$('#sheetBody .seg button').forEach(b=>b.onclick=()=>{pct=+b.dataset.p;$$('#sheetBody .seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#confirmSell').textContent=`Confirm sell ${pct}% · ${VIA}`;});
}
// ---------- AUDIT ----------
VIEWS.audit=async(r,soft)=>{
  const [a,c]=await Promise.all([tryGet('audit/'+r.a),tryGet('coin/'+r.a)]); navTitle(a?.symbol?`Audit · ${a.symbol}`:'Audit',true);
  if(!a){$('#view').innerHTML=`<div class="empty" style="margin-top:16px">No audit published for this coin.</div>`;return;}
  if(soft&&$('.discs')) return;  // don't replay the beam on every poll
  const L=a.layers||[];
  const ws=(c?.whales||[]); const first=ws.length?ws.map(w=>w.first_buy_ts).sort()[0]:null;
  const soc=a.score?.social_pts!=null?`Social +${a.score.social_pts}${a.social?` · ${esc(a.social)}`:''}`:'Social: off';
  $('#view').innerHTML=`<div class="chead" style="margin-top:12px"><span class="nm">${esc(a.symbol||'')}</span><span class="shield">🛡 ${L.filter(l=>l.pass===true).length}/${L.length||8}</span>${a.score?`<span class="tpill ${a.score.pass?'green':'red'}">score ${a.score.score} · ${a.score.pass?'pass':'reject'}</span>`:''}</div>
  <p class="sec">audited ${hm(a.audited_at)}${a.score?.reason?' · '+esc(a.score.reason):''}</p>
  <div class="discs ${RM()?'':'beam'}">${Array.from({length:8},(_,i)=>{const l=L[i]||{};const cls=l.pass===true?'p':l.pass===false?'f':'';return `<div class="disc" style="--i:${i}"><div class="c ${cls}"><b>${l.pass===true?'✓':l.pass===false?'✕':'–'}</b></div><div class="nm">${esc(l.name||'layer '+(i+1))}</div><div class="val">${esc(l.value??'—')}</div><div class="ok ${l.pass===true?'green':l.pass===false?'red':'sec'}">${l.pass===true?'ok':l.pass===false?'no':'no data'}</div></div>`;}).join('')}</div>
  <div class="list"><div class="li"><div class="m"><div class="t">Whales: ${ws.length?ws.map(w=>'@'+esc(w.handle)).join(' '):'none seen'}</div><div class="s">${first?`first in ${ago(first)}`:''}</div></div></div><div class="li"><div class="m"><div class="t">${soc}</div></div></div></div>
  <div class="btns" style="grid-template-columns:1fr 1fr"><a class="btn sec2" href="#/coin/${a.mint}">Coin ›</a>${safeUrl(a.link)?`<a class="btn pri" href="${esc(a.link)}" target="_blank" rel="noopener">Open on FOMO</a>`:''}</div>`;
};
// ---------- ACCOUNT + SETTINGS ----------
const LABELS={'watcher.whales_top_n':'Whales on tonight\'s list','watcher.min_windows':'Leaderboard windows a whale must be in','watcher.min_win_rate':'Minimum win rate (%)','watcher.min_trades_7d':'Minimum trades in 7 days','watcher.min_median_hold_min':'Minimum median hold (min)','watcher.max_top_coin_share':'Maximum share in one coin (%)','watcher.poll_s':'Check whales every (s)','watcher.max_lag_s':'Drop a fill older than (s)','watcher.min_whale_buy_usd':'Ignore whale buys under ($)','watcher.ignore_after_mcap_usd':'Ignore coins above market cap ($)',
 'vetter.max_dev_pct':'Max dev holding (%)','vetter.max_top10_pct':'Max top 10 holding (%)','vetter.min_lp_locked_pct':'Min liquidity locked or burned (%)','vetter.max_bundled':'Max bundled wallets','vetter.max_delegated_accounts':'Max delegated accounts','vetter.retries':'Retries per data source','vetter.min_score':'Score needed to pass','vetter.alive_volume_h1':'Min volume last hour ($)','vetter.max_chase_pct':'Max run-up before entry (%)','vetter.flow_sell_ratio':'Max sellers per buyer','vetter.cluster_bonus':'Bonus when 3 whales buy',
 'social.social_weight':'Weight of the social score','social.social_max_per_h':'Social checks per hour','social.social_timeout_s':'Social check timeout (s)','social.shill_cut':'Shill cut-off',
 'sizer.risk_per_trade_pct':'Risk per trade (% of cash)','sizer.stop_pct':'Stop loss (%)','sizer.one_whale_size':'Size with 1 whale (%)','sizer.two_whale_size':'Size with 2 whales (%)','sizer.full_whales':'Whales for full size','sizer.max_pool_pct':'Max share of the pool (%)','sizer.min_ticket_usd':'Smallest order ($)','sizer.max_ticket_usd':'Largest order ($)','sizer.max_trades_night':'Max trades per night','sizer.max_open':'Max open positions',
 'executor.dip_pct':'Buy on a dip of (%)','executor.dip_window_min':'High of the last (min)','executor.dip_wait_min':'Wait for a dip up to (min)','executor.crash_pct':'Crash, not a dip, past (%)','executor.tp_x':'Take profit at (× entry)','executor.tp_sell_pct':'Take profit sells (%)','executor.trail_pct':'Trailing stop after take profit (%)','executor.recheck_liq_drop_pct':'Skip if liquidity fell (%)','executor.recheck_price_up_pct':'Skip if price ran up (%)','executor.quote_timeout_s':'Wait for the quote (s)','executor.verify_timeout_s':'Wait for verify (s)',
 'guard.poll_s':'Check positions every (s)','guard.stop_pct':'Stop loss (%)','guard.timeout_h':'Sell dead money after (h)','guard.timeout_min_gain_pct':'Dead money below gain (%)','guard.whale_exit_sell_pct':'Sell when the whale exits (%)','guard.whale_exit_min_whales':'Whales that must exit','guard.night_loss_stop_pct':'Stop buying after a night loss of (%)',
 'desk.paper_start_cash':'PAPER start cash ($)','desk.fee_pct':'Fee above $190 (%)','desk.confirm_expiry_s':'Confirm expires after (s)','desk.prices_keep_days':'Keep prices (days)','desk.frames_keep':'Live screen frames kept','desk.logs_keep_days':'Keep logs (days)','desk.backups_keep':'Backups kept','desk.night_start':'Night starts','desk.lock_time':'No new buys after','desk.report_time':'Morning report at'};
function setRow(s){
  if(s.format==='HH:MM') return `<div class="set"><div class="lbl">${esc(LABELS[s.key]||s.key)}</div><div class="key">${esc(s.key)}</div><div class="ctl"><input class="field" value="${esc(s.value)}" disabled aria-label="${esc(LABELS[s.key]||s.key)}, ${esc(s.value)}"></div></div>`;
  const step=(String(s.min)+String(s.max)+String(s.default)).includes('.')?0.1:1; const id='s_'+s.key.replace('.','_');
  return `<div class="set" data-k="${esc(s.key)}" data-min="${s.min}" data-max="${s.max}"><div class="lbl">${esc(LABELS[s.key]||s.key)}${s.used_by_code?'':` <span class="via">· not used yet (${esc(s.not_used_yet||'')})</span>`}</div><div class="key">${esc(s.key)}</div>
  <div class="ctl"><input type="range" min="${s.min}" max="${s.max}" step="${step}" value="${s.value}" aria-label="${esc(LABELS[s.key]||s.key)} slider"><input type="number" id="${id}" inputmode="decimal" step="any" value="${s.value}" aria-label="${esc(LABELS[s.key]||s.key)}, exact value"></div>
  <div class="rng"><span>${s.min} – ${s.max}</span><button data-def="${s.default}" aria-label="Reset ${esc(LABELS[s.key]||s.key)} to default ${s.default}">default ${s.default}</button></div><div class="badmsg" hidden></div></div>`;
}
let dirty=false;
VIEWS.account=async(r,soft)=>{
  navTitle('Account'); if(soft&&dirty) return;
  const [acc,setg,st]=[await tryGet('account'),await tryGet('settings'),LAST.state];
  if(!acc||!setg){if(!soft)$('#view').innerHTML=`<h1 class="big">Account</h1>${sk(120)}${sk(300)}`;return;}
  const mode=acc.mode; const gate=acc.live_gate||{};
  const groups=Object.entries(setg.groups||{});
  $('#view').innerHTML=`<h1 class="big">Account</h1>
  <div class="grp"><div class="li"><div class="m"><div class="t">Mode</div><div class="s">LIVE needs 1 full PAPER night (${gate.full_paper_nights??0} so far), STEP 15 passed (${gate.step15_passed?'yes':'not yet'}) and you typing LIVE</div></div></div>
   <div style="padding:0 14px 12px"><div class="seg" role="group" aria-label="Mode">${['PAPER','LIVE'].map(m=>`<button disabled aria-pressed="${mode===m}" aria-label="${m}${mode===m?' (current)':''}, ${VIA}">${m}</button>`).join('')}</div>
   <div class="ctl" style="display:flex;gap:10px;margin-top:10px"><input class="field" style="flex:1" placeholder="Type LIVE" disabled aria-label="Type LIVE to switch, ${VIA}"><span class="via" style="align-self:center">${mode==='PAPER'||mode==='LIVE'?'':'desk is '+esc(mode)+' · '}${viaH()}</span></div></div></div>
  <div class="grp"><div class="li"><div class="m"><div class="t">Cash</div><div class="s">PAPER start ${usd(acc.paper_start_cash)} · free ${usd(acc.cash_free_usd)}</div></div><input class="field" value="${acc.paper_start_cash??''}" disabled aria-label="PAPER start cash, ${VIA}"></div>
   <div class="li">${safeUrl(acc.profile_url)?`<a class="m" href="${esc(acc.profile_url)}" target="_blank" rel="noopener"><div class="t">Your FOMO profile ↗</div><div class="s">@${esc(acc.fomo_handle)}</div></a>`:'<div class="m"><div class="t">Your FOMO profile</div><div class="s">handle not set</div></div>'}</div>
   <div class="li"><button class="m" id="invite" style="text-align:left;min-height:44px"><div class="t blue">Invite a friend</div><div class="s">FOMO signup link · share sheet</div></button></div></div>
  <h2>Settings</h2><p class="note">Values the desk sent. Save: ${viaH()} (send: set stop to -20%). Out of range turns red and Save stays off.</p>
  ${groups.map(([g,items])=>`<section class="grp" id="g_${esc(g)}" aria-label="${esc(NAMES[g]||g)} settings"><div class="li"><div class="m"><div class="t" style="color:${COLORS[g]||'#fff'};font-weight:700">${esc(NAMES[g]||g[0].toUpperCase()+g.slice(1))}</div></div><button class="btn sec2" disabled style="min-height:44px" aria-label="Save ${esc(g)} settings, ${VIA}">Save</button></div>${items.map(setRow).join('')}</section>`).join('')}
  <h2>Copy picks</h2><div class="grp"><div style="padding:12px 14px"><div class="seg" role="group" aria-label="Copy picks schedule">${['off','24h','12h','6h'].map(x=>`<button disabled aria-pressed="${x==='off'}">${x}</button>`).join('')}</div><p class="note">The chapter 3 prompt is not built yet.</p></div></div>
  <h2>Pushes</h2><div class="grp">${(()=>{const t=tg()||acc.telegram;const ok=!!(t&&t.connected);return `<div class="li"><div class="m"><div class="t">Pushes: Telegram ${ok?'connected':'not connected'}</div><div class="s" style="white-space:normal">${ok?`@${esc(t.bot_username)} · ${viaH()}`:esc((t&&t.state)||'the desk has not reported Telegram yet')}</div></div><span class="tpill">${ok?'connected':'off'}</span></div>`;})()}
   <div class="li"><div class="m"><div class="t">Web push</div><div class="s">Plan B: Telegram only. Pages has no server to take the subscription (POST /api/push).</div></div><span class="tpill">off</span></div>
   <div class="li" style="gap:10px">${dis('Enable notifications')}${dis('Send test push')}</div></div>
  <h2>More</h2><div class="grp"><div class="li"><div class="m"><div class="t">Watch in Grok Bot</div><div class="s">Your own computer preview opens in the Grok Bot app, not from this page</div></div></div>
   <div class="li"><button class="m" id="forget" style="text-align:left;min-height:44px"><div class="t red">Forget the data link on this phone</div></button></div></div>`;
  $('#invite').onclick=async()=>{const u=safeUrl(acc.signup_url);if(!u)return;try{if(navigator.share){await navigator.share({title:'Join FOMO',url:u});return;}}catch(e){if(e.name==='AbortError')return;}try{await navigator.clipboard.writeText(u);toast('Link copied');}catch(e){toast('Copy failed');}};
  $('#forget').onclick=()=>{if(confirm('Forget the data link? You will need the #d= link again.')){localStorage.clear();location.hash='';location.reload();}};
  $$('.set[data-k]').forEach(row=>{const rg=row.querySelector('input[type=range]'),nb=row.querySelector('input[type=number]'),msg=row.querySelector('.badmsg'),lo=+row.dataset.min,hi=+row.dataset.max;
    const chk=v=>{const bad=v===''||isNaN(+v)||+v<lo||+v>hi;nb.classList.toggle('bad',bad);msg.hidden=!bad;msg.textContent=bad?`Out of range: ${lo} – ${hi}`:'';dirty=true;};
    rg.oninput=()=>{nb.value=rg.value;chk(nb.value);}; nb.oninput=()=>{if(!isNaN(+nb.value))rg.value=nb.value;chk(nb.value);};
    row.querySelector('[data-def]').onclick=e=>{nb.value=rg.value=e.target.dataset.def;chk(nb.value);};});
  if(r.a&&$('#g_'+r.a)) $('#g_'+r.a).scrollIntoView();
};
// ---------- SEARCH ----------
let sT=null;
function recents(){try{return JSON.parse(localStorage.getItem(RECENT)||'[]');}catch(e){return [];}}
function addRecent(q){q=q.trim();if(!q)return;const L=[q,...recents().filter(x=>x!==q)].slice(0,8);localStorage.setItem(RECENT,JSON.stringify(L));}
$('#btnSearch').onclick=()=>{
  sheet(`<input class="sfield" id="q" type="search" placeholder="Name, symbol, mint or whale" aria-label="Search name, symbol, mint or whale" autocomplete="off"><div id="sres"></div>`,'Search');
  const q=$('#q'); q.focus(); const show=async()=>{const v=q.value.trim(), idx=await tryGet('search');
    if(!v){const R=recents();$('#sres').innerHTML=R.length?`<div class="row" style="margin-top:12px"><span class="sec">Recent</span><button class="blue" id="clr" style="min-height:44px">Clear</button></div><div class="chips">${R.map(x=>`<button class="chip">${esc(x)}</button>`).join('')}</div>`:'<p class="note">Coins the desk has seen and tonight\'s whales.</p>';
      $$('#sres .chip').forEach(c=>c.onclick=()=>{q.value=c.textContent;show();}); if($('#clr'))$('#clr').onclick=()=>{localStorage.removeItem(RECENT);show();}; return;}
    const lv=v.toLowerCase().replace(/^@/,''); const coins=(idx?.coins||[]).filter(c=>[c.name,c.symbol,c.mint].some(x=>(x||'').toLowerCase().includes(lv))).slice(0,20);
    const whales=(idx?.whales||[]).filter(w=>(w.handle||'').toLowerCase().includes(lv)).slice(0,10);
    const isMint=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v)&&!coins.some(c=>c.mint===v);
    $('#sres').innerHTML=(coins.length?`<h2>Coins</h2><div class="list">${coins.map(c=>`<a class="li" href="#/${(c.status||'').startsWith('rejected')?'audit':'coin'}/${c.mint}" data-q="${esc(v)}">${mono(c.symbol)}<span class="m"><div class="t">${esc(c.name||'')} · ${esc(c.symbol||'')}</div><div class="s">${esc(c.status||'seen')}</div></span></a>`).join('')}</div>`:'')
      +(whales.length?`<h2>Whales</h2><div class="list">${whales.map(w=>`<a class="li" href="#/whale/${encodeURIComponent(w.id)}" data-q="${esc(v)}">${mono(w.handle)}<span class="m"><div class="t">@${esc(w.handle)}</div><div class="s">rank ${w.rank??'—'}</div></span></a>`).join('')}</div>`:'')
      +(isMint?`<div class="empty" style="margin-top:12px">The desk has never seen this mint.<br><button class="btn sec2" disabled style="margin:12px auto 0" aria-label="Audit it now, ${VIA}">Audit it now</button><div class="via" style="margin-top:6px">= the "buy X" command · ${viaH()}</div></div>`:'')
      +(!coins.length&&!whales.length&&!isMint?'<div class="empty" style="margin-top:12px">No match</div>':'');
    $$('#sres a[data-q]').forEach(a=>a.addEventListener('click',()=>addRecent(a.dataset.q)));};
  q.oninput=()=>{clearTimeout(sT);sT=setTimeout(show,250);}; q.onkeydown=e=>{if(e.key==='Enter')addRecent(q.value);}; show();
};
// ---------- BELL ----------
function readId(){return +(localStorage.getItem(READ)||0);}
function bell(p){const L=p?.pushes||[]; $('#bellDot').hidden=!L.some(x=>x.id>readId()); $('#btnBell').setAttribute('aria-label',`Notifications${L.some(x=>x.id>readId())?', unread':''}`);}
$('#btnBell').onclick=async()=>{
  const p=await tryGet('pushes'); const L=(p?.pushes||[]).filter(x=>Date.now()-Date.parse(x.ts)<24*3600e3); const rid=readId();
  sheet(`${L.length?`<button class="blue" id="markAll" style="min-height:44px">Mark all read</button><div class="list">${L.map(x=>`<div class="li"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${x.id>rid?'#0a84ff':'transparent'};flex:none" aria-label="${x.id>rid?'unread':''}"></span><a class="m" href="${x.mint?'#/coin/'+x.mint:'#/home'}"><div class="s">Grok Bot · ${hm(x.ts)}</div><div class="t" style="white-space:normal">${esc(x.text)}</div>${x.body?`<div class="s" style="white-space:normal">${esc(x.body)}</div>`:''}</a>${fomoBtn(x.link)}</div>`).join('')}</div>`:'<div class="empty">No pushes tonight</div>'}<p class="note">${esc(p?.channel||'')}</p>`,'Notifications');
  if($('#markAll')) $('#markAll').onclick=()=>{localStorage.setItem(READ,String(Math.max(0,...L.map(x=>x.id))));bell(p);$('#btnBell').click();};
};
// ---------- start ----------
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
render(false); refresh();
