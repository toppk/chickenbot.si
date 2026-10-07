'use strict';
/* ================= orders, patrons, waitress ================= */
const orders=[];let orderSeq=1;
function makeOrder(kind,drinks,who){const o={id:'o'+(orderSeq++),kind,drinks,who,angle:kind==='table'?STATION_A:who.stool.a,status:'queued',made:0,created:clock,glasses:[]};orders.push(o);
  send({type:'event',event:'order',order:o.id,kind,drinks,patron:kind==='bar'?{id:who.id,name:who.name,regular:!!who.regular}:null,table:kind==='table'?tables.indexOf(who):null});return o;}
function freeStool(){const f=stools.filter(s=>!s.occupant);return f.length?pick(f):null;}
function bubbleOrder(p,drink,prefix){say(p,`${prefix?prefix+' ':''}<img src="${ICONS[drink]}" alt=""> ${DRINKS[drink].name}`,3.2,true);}

const REGULARS=[
  {name:'Gus',stoolIdx:5,drink:'stout',look:{jacket:0x4a5a2f,skin:0xe0b48a,pants:0x3d2f22,hair:0x8a8a8a,cap:0x5a4028,beard:0x9a9a9a}},
  {name:'Marla',stoolIdx:4,drink:'wine',look:{jacket:0x2f3a5a,skin:0xf0c9a0,pants:0x2b2b33,hair:0x7a2a10,bun:true,scarf:0xa0281c}},
  {name:'Otis',stoolIdx:6,drink:'whiskey',look:{jacket:0xe8dcc0,vest:0x7a5a2a,skin:0x9a6a48,pants:0x24304a,hair:0x1a1a1a,bald:true,specs:true}},
];
const regulars=[];
function seatAtStool(p,st){st.occupant=p;p.stool=st;p.pos.copy(st.seat);p.wantHeading=p.heading=headingTo(-st.seat.x,-st.seat.z);p.seatY=0.75;p.sitTarget=1;p.sit=1;}
for(const r of REGULARS){const p=buildPerson(Object.assign({name:r.name,regular:true,drink:r.drink,kind:'regular'},r.look));const st=stools[r.stoolIdx];seatAtStool(p,st);p.state='drinking';p.sipRate=0.06;
  const g=buildGlass(r.drink);g.pos.copy(st.spot);g.state='bar';g.fill=rand(0.35,0.9);g.owner=p;p.glass=g;regulars.push(p);}

const NAMES=['Rosa','Dev','Hank','Priya','Theo','Lena','Marco','Ines','Sully','Bea','Kofi','Nadia','Walt','Yuki','Frank','Opal'];
function randomLook(){const o={jacket:pick(JACKETS),skin:pick(SKINS),pants:pick(PANTS),hair:pick(HAIR)};const r=Math.random();if(r<0.2)o.cap=pick(JACKETS);else if(r<0.32)o.beanie=pick([0xa0281c,0x2a4a6a,0xc8a040]);if(Math.random()<0.2)o.beard=o.hair;if(Math.random()<0.2)o.specs=true;if(Math.random()<0.2)o.ponytail=true;if(Math.random()<0.15)o.scarf=pick([0xa0281c,0x2a6a5a,0xd8b048]);return o;}

function spawnWalkup(name,drink,fromChat){
  const st=freeStool();if(!st)return null;
  const p=buildPerson(Object.assign({name:name||pick(NAMES),kind:'walkup',drink:drink||pick(DRINK_KEYS)},randomLook()));
  p.pos.copy(DOOR);p.heading=p.wantHeading=0;st.occupant=p;p.stool=st;p.state='arriving';p.rounds=fromChat?1:(Math.random()<0.3?2:1);
  doorSwing=1;
  walkTo(p,st.approach,()=>{p.pos.copy(st.seat);p.wantHeading=headingTo(-st.seat.x,-st.seat.z);p.seatY=0.75;p.sitTarget=1;p.state='ordering';p.t=0.7;});
  send({type:'event',event:'arrive',patron:{id:p.id,name:p.name}});
  return p;
}
function spawnTable(n){
  const t=tables.filter(t=>t.state==='free');if(!t.length)return null;const tb=pick(t);
  tb.state='arriving';tb.group=[];const k=Math.min(n||(1+(Math.random()*tb.seats.length)|0),tb.seats.length);
  const seats=[...tb.seats].sort(()=>Math.random()-0.5).slice(0,k);
  seats.forEach((s,i)=>{const p=buildPerson(Object.assign({name:pick(NAMES),kind:'table',drink:pick(DRINK_KEYS)},randomLook()));p.pos.copy(DOOR);p.pos.x+=(i-1)*0.3;s.occupant=p;p.seat=s;p.table=tb;p.state='arriving';
    p.path=[];setTimeout(()=>{walkTo(p,s.pos,()=>{p.wantHeading=s.heading;p.seatY=s.seatY;p.sitTarget=1;p.state='seated';if(tb.group.every(q=>q.state==='seated')&&tb.state==='arriving'){tb.state='waiting';tb.waitSince=clock;}});},i*600);
    tb.group.push(p);});
  doorSwing=1;send({type:'event',event:'arrive',table:tables.indexOf(tb),size:k});return tb;
}
function leave(p){
  p.sitTarget=0;p.state='leaving';if(p.stool){p.stool.occupant=null;}if(p.seat){p.seat.occupant=null;}
  if(p.glass){p.glass.owner=null;if(p.glass.state==='hand'||p.glass.state==='return'){p.glass.state=p.glass.restState||'bar';p.glass.pos.copy(p.glass.rest);}}
  setTimeout(()=>walkTo(p,DOOR,()=>{removePerson(p);doorSwing=1;}),500);
  send({type:'event',event:'leave',patron:{id:p.id,name:p.name}});
}
function updatePatrons(dt){
  for(const p of [...people]){
    if(p.kind==='waitress')continue;
    if(p.state==='ordering'){p.t-=dt;if(p.t<=0){bubbleOrder(p,p.drink,p.regular?'the usual,':null);makeOrder('bar',[p.drink],p);p.state='waiting';p.waitSince=clock;}}
    if(p.state==='waiting'&&clock-p.waitSince>28&&!p.grumbled){p.grumbled=true;say(p,'...any time now.',2.5);}
    if(p.state==='drinking'){sipLogic(p,dt);const g=p.glass;
      if(g&&g.fill<=0.02&&(g.state==='bar'||g.state==='table')){
        if(p.regular){if(!p.refillT)p.refillT=rand(3,8);p.refillT-=dt;if(p.refillT<=0){p.refillT=0;p.wave=1.2;g.owner=null;p.glass=null;p.state='ordering';p.t=0.4;}}
        else if(p.kind==='walkup'){p.rounds--;if(p.rounds>0){g.owner=null;p.glass=null;p.state='ordering';p.t=1.2;p.drink=Math.random()<0.7?p.drink:pick(DRINK_KEYS);}else{p.glass.owner=null;p.glass=null;leave(p);}}
        else if(p.kind==='table'){p.state='done';}
      }}
    if(p.kind==='regular'&&Math.random()<dt*0.02&&!p.talk)p.head.rotation.y=rand(-0.6,0.6);
  }
  for(const tb of tables){if(tb.state==='drinking'&&tb.group.every(p=>p.state==='done')){tb.state='dirty';for(const p of tb.group){if(p.glass)p.glass.owner=null;p.glass=null;leave(p);}tb.group=[];}}
}
// waitress
const june=buildPerson({name:'June',kind:'waitress',jacket:0x1e1e22,skin:0xc89070,pants:0x1e1e22,hair:0x2a1408,ponytail:true,apron:true,tray:true});
const STATION_SPOT=polar(STATION_A,3.08);
june.pos.copy(STATION_SPOT);june.heading=june.wantHeading=headingTo(-1,0);june.speed=1.6;june.state='idle';june.tray=true;
function juneTick(dt){
  const j=june;if(j.state!=='idle')return;
  const ready=orders.find(o=>o.kind==='table'&&o.status==='ready');
  if(ready&&j.pos.distanceTo(STATION_SPOT)<0.1){
    j.state='pickup';j.wantHeading=headingTo(-1,0);
    setTimeout(()=>{ready.glasses.forEach((g,i)=>{g.state='tray';g.owner=j;g.trayOff=new V3((i-1)*0.11,0.04,0.1+((i%2)?0.06:-0.04));});j.carrying=true;ready.status='delivering';
      const tb=ready.who;walkTo(j,tb.pos.clone().add(new V3(Math.cos(tb.angle+Math.PI)*0.95,0,Math.sin(tb.angle+Math.PI)*0.95)),()=>{
        j.wantHeading=headingTo(tb.pos.x-j.pos.x,tb.pos.z-j.pos.z);
        setTimeout(()=>{tb.group.forEach((p,i)=>{const g=ready.glasses[i];if(!g)return;g.state='lift';g.from.copy(g.pos);g.to.copy(p.seat.place);g.t=0;g.next='table';g.owner=p;p.glass=g;p.state='drinking';p.sipT=rand(1.5,4);});
          tb.state='drinking';ready.status='done';j.carrying=false;send({type:'event',event:'served',order:ready.id});
          walkTo(j,STATION_SPOT,()=>{j.state='idle';j.wantHeading=headingTo(-1,0);});},700);});},500);
    return;
  }
  const waiting=tables.find(t=>t.state==='waiting');
  if(waiting){waiting.state='taking';j.state='taking';
    walkTo(j,waiting.pos.clone().add(new V3(Math.cos(waiting.angle+Math.PI)*0.95,0,Math.sin(waiting.angle+Math.PI)*0.95)),()=>{
      j.wantHeading=headingTo(waiting.pos.x-j.pos.x,waiting.pos.z-j.pos.z);j.writing=true;say(j,'What can I get you?',1.8);
      waiting.group.forEach((p,i)=>setTimeout(()=>bubbleOrder(p,p.drink),500+i*500));
      setTimeout(()=>{j.writing=false;waiting.state='ordered';makeOrder('table',waiting.group.map(p=>p.drink),waiting);walkTo(j,STATION_SPOT,()=>{j.state='idle';j.wantHeading=headingTo(-1,0);});},900+waiting.group.length*500);});
    return;
  }
  const dirty=tables.find(t=>t.state==='dirty');
  if(dirty){dirty.state='bussing';j.state='bussing';
    walkTo(j,dirty.pos.clone().add(new V3(Math.cos(dirty.angle+Math.PI)*0.95,0,Math.sin(dirty.angle+Math.PI)*0.95)),()=>{
      j.carrying=true;const gs=glasses.filter(g=>g.state==='table'&&!g.owner&&g.pos.distanceTo(dirty.pos)<1.3);
      gs.forEach((g,i)=>{g.state='tray';g.owner=j;g.trayOff=new V3((i-1)*0.11,0.04,0.1);});
      walkTo(j,STATION_SPOT,()=>{gs.forEach(g=>{g.state='bus';g.t=0.3;});j.carrying=false;dirty.state='free';j.state='idle';j.wantHeading=headingTo(-1,0);});});
    return;
  }
  if(j.pos.distanceTo(STATION_SPOT)>0.1){j.state='return';walkTo(j,STATION_SPOT,()=>{j.state='idle';j.wantHeading=headingTo(-1,0);});}
}
