// Plain <canvas> line chart, no library.
function drawLine(canvas, points){
  const c=canvas.getContext('2d'), W=canvas.width, H=canvas.height, p=20;
  c.clearRect(0,0,W,H); c.strokeStyle='#2a3542'; c.strokeRect(p,p,W-2*p,H-2*p);
  if(!points||points.length<2){c.fillStyle='#8b98a5';c.font='14px sans-serif';c.fillText('no data yet (paper mode)',p+8,H/2);return;}
  const ys=points.map(q=>q[1]), lo=Math.min(...ys), hi=Math.max(...ys)||1, x0=points[0][0], x1=points[points.length-1][0]||1;
  c.strokeStyle='#3fb950'; c.lineWidth=2; c.beginPath();
  points.forEach(([x,y],i)=>{const X=p+(x-x0)/(x1-x0||1)*(W-2*p), Y=H-p-(y-lo)/((hi-lo)||1)*(H-2*p); i?c.lineTo(X,Y):c.moveTo(X,Y);});
  c.stroke();
}
