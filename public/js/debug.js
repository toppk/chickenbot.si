'use strict';
/* ================= ImGui debug windows ================= */
const winsEl=document.getElementById('wins'),W={};let zTop=10,inkOn=true;
function makeWin(id,{title,x,y,w,notitle,closable=true,collapsed=false}){
  const el=document.createElement('section');el.className='win'+(notitle?' notitle':'')+(collapsed?' collapsed':'');
  el.style.left=x+'px';el.style.top=y+'px';if(w)el.style.width=w+'px';el.setAttribute('aria-label',title);
  el.innerHTML=`<div class="bar"><span class="tri" role="button" tabindex="0" aria-label="collapse"></span><span class="t">${title}</span>${closable?'<button class="x" aria-label="close">×</button>':''}</div><div class="wbody"></div>`;
  winsEl.appendChild(el);const bar=el.querySelector('.bar');
  el.addEventListener('pointerdown',()=>{document.querySelectorAll('.win.active').forEach(w=>w.classList.remove('active'));el.classList.add('active');el.style.zIndex=++zTop;});
  const tri=el.querySelector('.tri'),tg=e=>{e.stopPropagation();el.classList.toggle('collapsed');};
  tri.addEventListener('click',tg);tri.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();tg(e);}});bar.addEventListener('dblclick',tg);
  const xb=el.querySelector('.x');if(xb)xb.addEventListener('click',e=>{e.stopPropagation();el.hidden=true;});
  bar.addEventListener('pointerdown',e=>{if(e.target!==bar&&!e.target.classList.contains('t'))return;bar.setPointerCapture(e.pointerId);const ox=e.clientX-el.offsetLeft,oy=e.clientY-el.offsetTop;
    const mv=ev=>{el.style.left=clamp(ev.clientX-ox,-el.offsetWidth+60,stage.clientWidth-60)+'px';el.style.top=clamp(ev.clientY-oy,0,stage.clientHeight-21)+'px';};
    const up=()=>{bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',up);};
    bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',up);});
  W[id]=el;return el.querySelector('.wbody');
}
function toggleWin(id){const el=W[id];if(!debugShown)setDebug(true);if(el.hidden||el.classList.contains('collapsed')){el.hidden=false;el.classList.remove('collapsed');el.style.zIndex=++zTop;if(id==='wire'&&wireEl)wireEl.scrollTop=wireEl.scrollHeight;}else el.hidden=true;}
function slider(parent,id,label,min,max,get,set,fmt){
  const row=document.createElement('div');row.className='row';
  row.innerHTML=`<div class="slider" id="${id}" role="slider" tabindex="0" aria-label="${label}"><span class="g"></span><span class="v"></span></div><span class="ilab">${label}</span>`;parent.appendChild(row);
  const fr=row.querySelector('.slider'),g=row.querySelector('.g'),v=row.querySelector('.v');
  const render=()=>{const t=clamp((get()-min)/(max-min),0,1);g.style.left=`calc(${t*100}% - ${t*10}px)`;v.textContent=fmt(get());};
  const from=cx=>{const r=fr.getBoundingClientRect();set(min+clamp((cx-r.left-5)/(r.width-10),0,1)*(max-min));render();};
  fr.addEventListener('pointerdown',e=>{e.stopPropagation();fr.setPointerCapture(e.pointerId);from(e.clientX);const mv=ev=>from(ev.clientX),up=()=>{fr.removeEventListener('pointermove',mv);fr.removeEventListener('pointerup',up);};fr.addEventListener('pointermove',mv);fr.addEventListener('pointerup',up);});
  fr.addEventListener('keydown',e=>{const st=(max-min)/50;if(e.key==='ArrowRight'){set(Math.min(max,get()+st));render();e.preventDefault();e.stopPropagation();}if(e.key==='ArrowLeft'){set(Math.max(min,get()-st));render();e.preventDefault();e.stopPropagation();}});
  render();return render;
}
function check(parent,id,label,get,set,round){const b=document.createElement('button');b.type='button';b.id=id;b.className='chk'+(round?' round':'');b.innerHTML=`<span class="b"></span><span>${label}</span>`;
  const r=()=>b.classList.toggle('on',!!get());b.addEventListener('click',()=>{set(!get());r();});parent.appendChild(b);r();return r;}
function ibtn(parent,label,fn){const b=document.createElement('button');b.type='button';b.className='ibtn';b.textContent=label;b.addEventListener('click',fn);parent.appendChild(b);return b;}
function rowIn(parent){const r=document.createElement('div');r.className='row';parent.appendChild(r);return r;}
function dbg(m){wireLog('dbg',m);handle(m);}
const narrowDbg=stage.clientWidth<700;

// stats
const sb=makeWin('stats',{title:'stats',x:0,y:8,w:290,notitle:true,closable:false});W.stats.style.left='auto';W.stats.style.right='8px';
sb.innerHTML=`<div class="statsTop"><div class="stat" id="d-ft"></div><button type="button" class="ibtn" id="d-hide" aria-label="hide debug windows">Hide</button></div><div class="stat" id="d-tri"></div><div class="stat">Num Skinning Joints: ${JOINTS}</div><div class="stat" id="d-ent"></div><div class="sep"></div><div>Camera Controls:</div><div class="dim">&nbsp; LMB + Mouse Move: Orbit</div><div class="dim">&nbsp; Mouse Wheel: Zoom</div>`;
const dbgRenders=[];
dbgRenders.push(slider(sb,'d-zoom','Zoom',2.5,9,()=>CAM.zoom,v=>CAM.zoom=v,v=>v.toFixed(2)));
dbgRenders.push(slider(sb,'d-yaw','Yaw',0,360,()=>((CAM.yaw%360)+360)%360,v=>{CAM.yaw=v;idleT=0;},v=>v.toFixed(1)));
dbgRenders.push(slider(sb,'d-pitch','Pitch',PITCH_MIN,PITCH_MAX,()=>CAM.pitch,v=>CAM.pitch=v,v=>v.toFixed(1)));
sb.appendChild(Object.assign(document.createElement('div'),{className:'sep'}));
slider(sb,'d-pix','Pixel Size',1,6,()=>PIX,v=>{const n=Math.round(v);if(n!==PIX){PIX=n;resize();}},v=>String(Math.round(v)));
{const r=rowIn(sb);r.style.gap='14px';check(r,'d-ink','Ink Lines',()=>inkOn,v=>inkOn=v);dbgRenders.push(check(r,'d-orbit','Auto Orbit',()=>autoOrbit,v=>autoOrbit=v));}
sb.appendChild(Object.assign(document.createElement('div'),{className:'sep'}));
sb.insertAdjacentHTML('beforeend','<div class="stat" id="d-lofi"></div>');
{const r=rowIn(sb);dbgRenders.push(check(r,'d-lofion','Lofi',()=>lofi.on,v=>setLofi(v)));}
slider(sb,'d-lofivol','Lofi Vol',0,1,()=>lofi.vol,v=>{lofi.vol=v;},v=>v.toFixed(2));
{const r=rowIn(sb);ibtn(r,'Toggle Brain',()=>toggleWin('brain'));ibtn(r,'Toggle Wire',()=>toggleWin('wire'));}

// brain: fire any protocol command by hand
const bb=makeWin('brain',{title:'brain',x:Math.max(8,stage.clientWidth-308),y:narrowDbg?8:W.stats.offsetHeight+16,w:300,collapsed:true});
bb.insertAdjacentHTML('beforeend','<div class="dim">sends the same messages a server would</div><div>mood</div>');
const rad=document.createElement('div');rad.className='radios';bb.appendChild(rad);
const moodR=Object.keys(MOODS).map(m=>check(rad,'d-m-'+m,m,()=>hen.mood===m,()=>{brain.override=20;dbg({type:'mood',mood:m,intensity:hen.moodI});moodR.forEach(f=>f());},true));
dbgRenders.push(...moodR);
dbgRenders.push(slider(bb,'d-int','intensity',0,1,()=>hen.moodI,v=>{hen.moodI=v;hud.dirty=true;},v=>v.toFixed(2)));
bb.appendChild(Object.assign(document.createElement('div'),{className:'sep'}));
bb.insertAdjacentHTML('beforeend','<div>emote</div>');
{const r=rowIn(bb);for(const e of ['flap','peck','bob','shrug','spin'])ibtn(r,e,()=>dbg({type:'emote',emote:e}));}
{const r=rowIn(bb);ibtn(r,'spawn walk-in',()=>dbg({type:'spawn',kind:'patron'}));ibtn(r,'seat a table',()=>dbg({type:'spawn',kind:'table'}));}
{const r=rowIn(bb);r.style.gap='14px';dbgRenders.push(check(r,'d-auto','autopilot',()=>hen.auto,v=>dbg({type:'auto',on:v})));dbgRenders.push(check(r,'d-music','jukebox',()=>music,v=>dbg({type:'music',on:v})));}
dbgRenders.push(slider(bb,'d-lights','lights',0,1,()=>lightLevel,v=>{lightLevel=v;},v=>v.toFixed(2)));
{const r=rowIn(bb);const inp=document.createElement('input');inp.className='iin';inp.id='d-say';inp.placeholder='make chickenbot say...';inp.maxLength=140;r.appendChild(inp);
  const go=()=>{const t=inp.value.trim();if(!t)return;inp.value='';dbg({type:'say',text:t});};ibtn(r,'say',go);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go();}});}
{const r=rowIn(bb);ibtn(r,'serve next order',()=>{const o=orders.find(x=>x.status==='queued');if(o)dbg({type:'serve',order:o.id});});ibtn(r,'request state',()=>wireLog('sim',snapshot()));}

// wire: link settings and message log
const wb=makeWin('wire',{title:'wire',x:8,y:8,w:Math.min(460,stage.clientWidth-16)});
{const r=rowIn(wb);r.appendChild(wsUrl);ibtn(r,'Connect',()=>{const u=wsUrl.value.trim();if(/^wss?:\/\//.test(u))connect(u);else wsNote.textContent='Use a ws:// or wss:// address.';});ibtn(r,'Local',()=>disconnect(true));
  wsUrl.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();r.querySelector('.ibtn').click();}});}
wb.appendChild(wsNote);
{const r=rowIn(wb);r.style.gap='14px';check(r,'d-wstate','show state snapshots',()=>wireState,v=>wireState=v);ibtn(r,'Clear',()=>{wireBuf.length=0;wireEl.innerHTML='';});}
wb.insertAdjacentHTML('beforeend','<div class="dim">→ sent · ← received · · would send (no link)</div>');
wireEl=document.createElement('div');wireEl.className='wlog';wb.appendChild(wireEl);wireBuf.forEach(appendWire);
W.wire.hidden=true;
// shrink / show: the stats panel folds down to a small permanent tab in the same corner
const mini=document.createElement('section');mini.className='win';mini.id='dbgmini';mini.hidden=true;mini.setAttribute('aria-label','debug');
mini.innerHTML='<span class="stat" id="d-mini-ft"></span><button type="button" class="ibtn" id="d-show">Show</button>';stage.appendChild(mini);
let debugShown=true,dbgSaved=[];
function setDebug(show){
  if(show===debugShown)return;debugShown=show;
  if(!show){dbgSaved=Object.keys(W).filter(k=>!W[k].hidden);winsEl.hidden=true;mini.hidden=false;}
  else{winsEl.hidden=false;mini.hidden=true;Object.keys(W).forEach(k=>{if(dbgSaved.includes(k)||k==='stats')W[k].hidden=false;});refreshDebug();}
}
document.getElementById('d-hide').addEventListener('click',()=>setDebug(false));
document.getElementById('d-show').addEventListener('click',()=>setDebug(true));
const dMini=document.getElementById('d-mini-ft');
function placeBrain(){if(!narrowDbg&&W.stats.offsetHeight)W.brain.style.top=(W.stats.offsetTop+W.stats.offsetHeight+8)+'px';}
requestAnimationFrame(placeBrain);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeBrain);
if(narrowDbg)setDebug(false);

const dFt=document.getElementById('d-ft'),dTri=document.getElementById('d-tri'),dEnt=document.getElementById('d-ent');
function refreshDebug(){
  dFt.textContent=`Frame Time: ${ftAvg.toFixed(3)}ms`;dTri.textContent=`Num Triangles: ${tris}`;
  const dl=document.getElementById('d-lofi');if(dl)dl.textContent=lofi.on?`Lofi: ${lofi.style} · ${Math.round(lofi.bpm)} bpm · ${lofi.chordName||'...'}${music?'':' (jukebox off)'}`:'Lofi: off';
  dEnt.textContent=`Particles: ${liveP}  Glasses: ${glasses.length}  People: ${people.length}`;
  dMini.textContent=`${ftAvg.toFixed(1)}ms`;
  if(debugShown)dbgRenders.forEach(f=>f());
}
