const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const SH={sun:'#ff3d35',circle:'#ffe66d',diamond:'#ff7b54',square:'#f5f7ff',triangle:'#a8ffcf',cross:'#d7a7ff'};
const COLORS=['#ff2a22','#ffe66d','#ff9f43','#f5f7ff','#a8ffcf','#7ec8ff','#d7a7ff','#ff6fa5'];
function glyph(s,c){const i='rgba(255,255,255,.6)';
if(s==='sun'){let l='';for(let k=0;k<36;k++){const a=Math.PI*2*k/36;l+=`<line x1="${50+Math.cos(a)*34}" y1="${50+Math.sin(a)*34}" x2="${50+Math.cos(a)*44}" y2="${50+Math.sin(a)*44}"/>`}return `<g stroke="${c}" stroke-width="2">${l}</g><circle cx="50" cy="50" r="29" fill="${c}"/>`}
if(s==='circle')return `<circle cx="50" cy="50" r="32" fill="${c}"/><circle cx="50" cy="50" r="42" fill="none" stroke="${c}" stroke-width="2"/>`;
if(s==='diamond')return `<path d="M50 4L96 50 50 96 4 50Z" fill="${c}"/><path d="M50 19L81 50 50 81 19 50Z" fill="none" stroke="${i}" stroke-width="2"/>`;
if(s==='square')return `<rect x="13" y="13" width="74" height="74" fill="${c}"/><rect x="25" y="25" width="50" height="50" fill="none" stroke="${i}" stroke-width="3"/>`;
if(s==='triangle')return `<path d="M50 5L96 90H4Z" fill="${c}"/><path d="M50 25L78 78H22Z" fill="none" stroke="${i}" stroke-width="3"/>`;
return `<path d="M37 5H63V37H95V63H63V95H37V63H5V37H37Z" fill="${c}"/>`}
const svg=(s,c)=>`<svg viewBox="0 0 100 100">${glyph(s,c)}</svg>`;
let width,height,progress=12,travel=0,travelV=0,advV=0,enc=0,stage=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t)),hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function resize(){const p=Math.min(devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=width*p;canvas.height=height*p;ctx.setTransform(p,0,0,p,0,0)}
addEventListener('resize',resize);resize();
// ---- multiplayer lobby (room presence only: shape, colour, phase, taps)
let room=null,solo=false,spec=false,uMax=0,lastT={},sig='',me={j:Date.now()+Math.random(),ph:'create',s:'circle',c:'#ff2a22',t:0};
const sun={shape:'sun',color:'#ff3d35'};
function setMe(p){Object.assign(me,p);if(room)room.presence(p).catch(()=>{})}
function everyone(){const a=[{id:'me',p:me,me:true}];if(room)room.peers().forEach(x=>{if(x.sameTab||x.kind!=='viewer'||!x.presence||!x.presence.j)return;a.push({id:x.peer,p:x.presence,me:false})});return a.sort((x,y)=>x.p.j-y.p.j)}
function mqttRoom(){
 let code=location.hash.slice(1).toLowerCase().replace(/[^a-z0-9]/g,'');if(!code){code=Math.random().toString(36).slice(2,6);location.hash=code}
 const id=Math.random().toString(36).slice(2,10),base='almost-there-x7/'+code+'/',topic=base+id,P={},cbs=[];let mine={};
 const cl=mqtt.connect('wss://broker.emqx.io:8084/mqtt',{clientId:'at_'+id,keepalive:30,reconnectPeriod:2000,will:{topic,payload:'',retain:true,qos:0}});
 const pub=()=>{if(cl.connected)cl.publish(topic,JSON.stringify({p:mine,ts:Date.now()}),{retain:true})},fire=()=>cbs.forEach(f=>f());
 cl.on('connect',()=>{cl.subscribe(base+'+');pub()});
 cl.on('message',(t,m)=>{const k=t.slice(base.length);if(k===id)return;if(!m.length)delete P[k];else{try{P[k]={p:JSON.parse(m.toString()).p,seen:Date.now()}}catch(e){return}}fire()});
 setInterval(()=>{pub();let ch=false;for(const k in P)if(Date.now()-P[k].seen>9000){delete P[k];ch=true}if(ch)fire()},3000);
 return{presence(p){Object.assign(mine,p);pub();return Promise.resolve()},peers:()=>Object.keys(P).map(k=>({peer:k,sameTab:false,kind:'viewer',presence:P[k].p})),onPeers(f){cbs.push(f)}}}
(async()=>{try{let r=null;if(typeof claude!=='undefined')r=await claude.use('room');if(!r&&typeof mqtt!=='undefined')r=mqttRoom();if(r){room=r;r.presence(me).catch(()=>{});r.onPeers(refresh,()=>{})}else solo=true}catch(e){solo=true}refresh()})();
setInterval(()=>refresh(),500);
function renderMaker(){const on=me.ph==='create';$('preview').innerHTML=svg(me.s,me.c);
$('shapeRow').innerHTML='';Object.keys(SH).forEach(s=>{const b=document.createElement('button');b.className='pick'+(s===me.s?' on':'');b.disabled=!on;b.innerHTML=svg(s,me.c);b.setAttribute('aria-label',s);b.onclick=()=>{setMe({s});renderMaker();refresh()};$('shapeRow').appendChild(b)});
$('colorRow').innerHTML='';COLORS.forEach(c=>{const b=document.createElement('button');b.className='sw'+(c===me.c?' on':'');b.disabled=!on;b.style.background=c;b.setAttribute('aria-label',c);b.onclick=()=>{setMe({c});renderMaker();refresh()};$('colorRow').appendChild(b)});
$('go').disabled=!on;$('go').innerHTML=on?'&rarr;':'&#10003;'}
renderMaker();
$('go').onclick=()=>{if(me.ph!=='create')return;setMe({ph:'ready'});renderMaker();refresh()};
function renderSlots(co){const h=[];for(let i=0;i<6;i++){const x=co[i];h.push(x?`<div class="slot on${x.p.ph!=='create'?' rdy':''}${x.me?' me':''}">${svg(x.p.s,x.p.c)}</div>`:'<div class="slot"></div>')}const t=h.join('');if($('slots').dataset.h!==t){$('slots').dataset.h=t;$('slots').innerHTML=t}}
function enterGame(player){$('createScreen').classList.add('hidden');$('hud').hidden=false;$('flock').hidden=false;stage=2;spec=!player;}
function refresh(){const all=everyone(),co=all.slice(0,6),play=all.filter(x=>x.p.ph==='play'),inCo=co.some(x=>x.me);
if(stage===0){
 if(play.length&&me.ph!=='play'&&(me.ph==='create'||!inCo)){enterGame(false)}
 else{renderSlots(co);if(me.ph==='ready'&&inCo&&(solo||(co.length>=2&&co.every(x=>x.p.ph!=='create')))){setMe({ph:'play',t:0});enterGame(true)}}}
if(stage>=2)renderGame(all.filter(x=>x.p.ph==='play'))}
function renderGame(pl){const N=pl.length||1,ts=pl.map(x=>x.p.t||0),m=Math.min(...ts),part=ts.filter(t=>t>m).length/N;
uMax=Math.max(uMax,Math.min(9,m+part));progress=12+uMax/9*87;travel=uMax*.18;update(ts.reduce((a,b)=>a+b,0));
const sg=pl.map(x=>x.id+x.p.s+x.p.c).join();if(sg!==sig){sig=sg;$('flockIn').innerHTML=pl.map(x=>x.me?`<button class="pl me" data-id="me" aria-label="Tap to move forward">${svg(x.p.s,x.p.c)}<span class="tap-ring"></span><span class="tap-label">TAP</span></button>`:`<div class="pl" data-id="${x.id}">${svg(x.p.s,x.p.c)}</div>`).join('')}
pl.forEach(x=>{const el=$('flockIn').querySelector('[data-id="'+x.id+'"]');if(!el)return;const t=x.p.t||0;el.classList.toggle('wait',t<=m&&stage<3);
if(lastT[x.id]!==undefined&&t>lastT[x.id])el.animate([{transform:'scale(1)'},{transform:'scale(.86)'},{transform:'scale(1)'}],{duration:220,easing:'ease-out'});lastT[x.id]=t});
if(uMax>=9&&stage!==3){stage=3;$('hud').style.opacity='0';[...$('flockIn').children].forEach(c=>c.classList.remove('wait'))}}
// ---- canvas
function line(x1,y1,x2,y2,c,w=1){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
function belief(x,y,r,s,c,a=1){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=c;ctx.strokeStyle=c;ctx.lineWidth=Math.max(1,r*.06);
if(s==='sun'){for(let i=0;i<36;i++){const t=Math.PI*2*i/36;line(x+Math.cos(t)*r*1.12,y+Math.sin(t)*r*1.12,x+Math.cos(t)*r*1.48,y+Math.sin(t)*r*1.48,c,Math.max(.6,r*.025))}ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
else if(s==='circle'){ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.beginPath();ctx.arc(x,y,r*1.32,0,7);ctx.stroke()}
else if(s==='diamond'){ctx.beginPath();ctx.moveTo(x,y-r*1.25);ctx.lineTo(x+r*1.25,y);ctx.lineTo(x,y+r*1.25);ctx.lineTo(x-r*1.25,y);ctx.closePath();ctx.fill()}
else if(s==='square'){ctx.fillRect(x-r,y-r,r*2,r*2);ctx.strokeRect(x-r*.67,y-r*.67,r*1.34,r*1.34)}
else if(s==='triangle'){ctx.beginPath();ctx.moveTo(x,y-r*1.2);ctx.lineTo(x+r*1.12,y+r);ctx.lineTo(x-r*1.12,y+r);ctx.closePath();ctx.fill()}
else{const k=r*.32;ctx.beginPath();[[-k,-r],[k,-r],[k,-k],[r,-k],[r,k],[k,k],[k,r],[-k,r],[-k,k],[-r,k],[-r,-k],[-k,-k]].forEach((p,i)=>i?ctx.lineTo(x+p[0],y+p[1]):ctx.moveTo(x+p[0],y+p[1]));ctx.closePath();ctx.fill()}
ctx.restore()}
function frame(cx,cy,w,h,a,col,fill){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=fill;ctx.fillRect(cx-w/2,cy-h/2,w,h);ctx.strokeStyle=col;ctx.lineWidth=.9;ctx.strokeRect(cx-w/2,cy-h/2,w,h);ctx.restore()}
function draw(){
const adv=clamp((progress-12)/87,0,1);advV+=(adv-advV)*.08;travelV+=(travel-travelV)*.1;enc+=((stage===3?1:0)-enc)*.03;
const cx=width/2,hz=height*.47,mv=travelV%1,F=[238,24,30];
const top=mix(mix([119,169,238],[255,40,36],advV),F,enc),mid=mix(mix([184,213,255],[255,44,40],advV),F,enc),bot=mix(mix([7,19,44],[215,12,22],advV),F,enc);
const g=ctx.createLinearGradient(0,0,0,height);g.addColorStop(0,`rgb(${top})`);g.addColorStop(.48,`rgb(${mid})`);g.addColorStop(1,`rgb(${bot})`);ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
const gl=ctx.createRadialGradient(cx,hz,0,cx,hz,Math.max(width,height)*.62);gl.addColorStop(0,`rgba(255,255,255,${.6*(1-enc*.6)})`);gl.addColorStop(.32,`rgba(255,200,200,${.12*(1-enc)})`);gl.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.fillRect(0,0,width,height);
const ga=1-enc*.85,lc=mix([229,241,255],[255,190,185],advV);
for(let i=-9;i<=9;i++)line(cx,hz,cx+i*width*.105,height*1.08,`rgba(${lc},${.32*ga})`);
for(let i=1;i<=18;i++){const r=(i/18+mv)%1,y=hz+height*.62*r*r,sp=width*.78*r;line(cx-sp,y,cx+sp,y,`rgba(${lc},${(.08+r*.22)*ga})`)}
const n=Math.round(22+advV*40+enc*170),base=mix([224,240,255],[255,200,195],advV);
for(let i=0;i<n;i++){const d=(i/n+mv/n)%1,sc=.018+d*d*(1.38+enc*.7),fw=Math.min(width*(.94+enc*1.1),width*sc),fh=Math.min(height*(1.3+enc*1.1),height*sc*1.12);
const col=mix(base,i%2?[255,176,168]:[120,0,10],enc);frame(cx,hz+height*.1*d,fw,fh,Math.min(1,(.14+d*.6)*(1+enc*.9)),`rgb(${col})`,`rgba(120,0,10,${.03*enc})`)}
const r=Math.min(width,height)*.055*(1+Math.sin(performance.now()*.0018)*.012);
const h=ctx.createRadialGradient(cx,hz,r*.5,cx,hz,r*3.2);h.addColorStop(0,`rgba(255,255,255,${.25+enc*.2})`);h.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=h;ctx.fillRect(cx-r*4,hz-r*4,r*8,r*8);
belief(cx,hz,r,sun.shape,sun.color);
const v=ctx.createRadialGradient(cx,height*.5,Math.min(width,height)*.3,cx,height*.5,Math.max(width,height)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(60,0,6,${.18+enc*.1})`);ctx.fillStyle=v;ctx.fillRect(0,0,width,height);
requestAnimationFrame(draw)}
function update(sum){const p=Math.min(progress,99.9);$('percent').textContent=p.toFixed(1)+'%';$('progressFill').style.width=p+'%';$('tapCount').textContent='TAPS '+String(sum).padStart(3,'0');$('message').textContent=progress>=55?'KEEP GOING':'YOUR FUTURE'}
let wt;
function tap(){if(stage<2||spec)return;
if(stage===3){const w=$('tapWarning');w.classList.add('show');clearTimeout(wt);wt=setTimeout(()=>w.classList.remove('show'),1800);return}
const pl=everyone().filter(x=>x.p.ph==='play'),m=Math.min(...pl.map(x=>x.p.t||0));
if(me.t>m)return;setMe({t:me.t+1});refresh()}
$('flockIn').addEventListener('click',e=>{if(e.target.closest('.pl.me'))tap()});
addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&stage>=2&&!spec){e.preventDefault();tap()}});
draw();
