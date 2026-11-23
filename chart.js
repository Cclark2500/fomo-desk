// Charts by hand on <canvas>, devicePixelRatio aware (spec STEP 10). No library.
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function fit(cv){const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;cv.width=Math.max(1,Math.round(r.width*d));cv.height=Math.max(1,Math.round(r.height*d));const x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);return {x,w:r.width,h:r.height};}
const MARK_COL={copied:'#0a84ff',bought:'#0a84ff',sold:'#00d35a',stopped:'#ff453a'};
// Balance line: points [{t,v}], start = night-start cash (dashed line), marks [{t,label,kind}] above the line, a later mark moves up a row, never overlaps.
function drawBalance(cv, pts, start, marks, prevN){
  const draw=(p)=>{
    const {x,w,h}=fit(cv); x.clearRect(0,0,w,h);
    if(!pts.length){return;}
    const top=56, bot=h-12, ts=pts.map(q=>Date.parse(q.t)), vs=pts.map(q=>q.v).concat(start!=null?[start]:[]);
    let lo=Math.min(...vs), hi=Math.max(...vs); if(hi-lo<1e-9){hi+=1;lo-=1;} const pad=(hi-lo)*.12; lo-=pad; hi+=pad;
    const t0=Math.min(...ts), t1=Math.max(...ts, t0+1);
    const X=t=>16+(w-32)*(t-t0)/(t1-t0), Y=v=>bot-(bot-top)*(v-lo)/(hi-lo);
    const n=pts.length; const xy=pts.map((q,i)=>[X(ts[i]),Y(q.v)]);
    if(p<1&&n>1){const a=xy[n-2],b=xy[n-1]; xy[n-1]=[a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p];}   // new point slides in 250ms
    if(start!=null){x.save();x.setLineDash([4,5]);x.strokeStyle='rgba(235,235,245,.3)';x.lineWidth=1;x.beginPath();x.moveTo(0,Y(start));x.lineTo(w,Y(start));x.stroke();x.restore();}
    const g=x.createLinearGradient(0,top,0,bot); g.addColorStop(0,'rgba(0,211,90,.28)'); g.addColorStop(1,'rgba(0,211,90,0)');
    x.beginPath(); xy.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b)); x.lineTo(xy[n-1][0],bot); x.lineTo(xy[0][0],bot); x.closePath(); x.fillStyle=g; x.fill();
    x.beginPath(); xy.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b)); x.strokeStyle='#00d35a'; x.lineWidth=2; x.lineJoin='round'; x.stroke();
    if(n===1){x.fillStyle='#00d35a';x.beginPath();x.arc(xy[0][0],xy[0][1],3.5,0,7);x.fill();}
    // marks: rows of 18px above the line; a later mark that would overlap goes up a row
    x.font='600 11px -apple-system,system-ui,sans-serif'; const rows=[];
    (marks||[]).forEach(m=>{const mt=Date.parse(m.t); if(mt<t0) return; const mx=Math.min(w-8,Math.max(8,X(mt))); const tw=x.measureText(m.text).width+12;
      let r=0; while((rows[r]||[]).some(([a,b])=>mx-tw/2<b+4&&mx+tw/2>a-4)) r++;
      (rows[r]=rows[r]||[]).push([mx-tw/2,mx+tw/2]);
      const ly=Math.max(4,Math.min(...xy.map(q=>q[1]))-26-r*20), lx=Math.min(w-tw-2,Math.max(2,mx-tw/2));
      x.fillStyle=MARK_COL[m.kind]||'#8e8e93'; x.beginPath(); x.roundRect?x.roundRect(lx,ly,tw,17,8):x.rect(lx,ly,tw,17); x.fill();
      x.fillStyle='#000'; x.fillText(m.text,lx+6,ly+12.5);});
  };
  if(prevN!=null&&pts.length===prevN+1&&!RM()){const t0=performance.now();const f=now=>{const p=Math.min(1,(now-t0)/250);draw(1-Math.pow(1-p,3));if(p<1)requestAnimationFrame(f);};requestAnimationFrame(f);}
  else draw(1);
}
// 1-minute candles, orange dashed exit line, whale entry dots on the candles.
function drawCandles(cv, cs, exitPrice, entries){
  const {x,w,h}=fit(cv); x.clearRect(0,0,w,h); if(!cs.length) return;
  const vals=cs.flatMap(c=>[c.h,c.l]).concat(exitPrice?[exitPrice]:[]); let lo=Math.min(...vals),hi=Math.max(...vals); if(hi-lo<=0){hi*=1.01;lo*=.99;}
  const top=10,bot=h-14,Y=v=>bot-(bot-top)*(v-lo)/(hi-lo), bw=Math.max(2,Math.min(9,(w-24)/cs.length*.7)), X=i=>12+(w-24)*(i+.5)/cs.length;
  cs.forEach((c,i)=>{const up=c.c>=c.o, col=up?'#00d35a':'#ff453a'; x.strokeStyle=col; x.fillStyle=col; x.beginPath(); x.moveTo(X(i),Y(c.h)); x.lineTo(X(i),Y(c.l)); x.stroke();
    const y1=Y(Math.max(c.o,c.c)), y2=Y(Math.min(c.o,c.c)); x.fillRect(X(i)-bw/2,y1,bw,Math.max(1,y2-y1));});
  if(exitPrice){x.save();x.setLineDash([5,4]);x.strokeStyle='#ff9f0a';x.lineWidth=1.5;x.beginPath();x.moveTo(0,Y(exitPrice));x.lineTo(w,Y(exitPrice));x.stroke();x.restore();
    x.fillStyle='#ff9f0a';x.font='600 11px system-ui';x.fillText('exit',w-30,Y(exitPrice)-4);}
  (entries||[]).forEach(e=>{const k=(e.t||'').slice(0,16); const i=cs.findIndex(c=>c.t.slice(0,16)===k); if(i<0) return;
    x.fillStyle='#64d2ff'; x.strokeStyle='#000'; x.lineWidth=2; x.beginPath(); x.arc(X(i),Y(cs[i].c),5,0,7); x.fill(); x.stroke();});
}
