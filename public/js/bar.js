'use strict';
/* ================= centre bar ================= */
{
  const prof=[[BAR_IN+0.02,0],[BAR_OUT-0.06,0],[BAR_OUT-0.06,0.95],[BAR_OUT+0.08,0.98],[BAR_OUT+0.1,1.05],[BAR_OUT+0.05,TOP],[BAR_IN,TOP],[BAR_IN,1.02],[BAR_IN+0.02,1.0],[BAR_IN+0.02,0]].map(p=>new THREE.Vector2(p[0],p[1]));
  const bar=new THREE.Mesh(new THREE.LatheGeometry(prof,64),M.mahog); scene.add(bar);
  const topRing=new THREE.Mesh(new THREE.RingGeometry(BAR_IN,BAR_OUT+0.05,64),M.mahogTop); topRing.rotation.x=-Math.PI/2; topRing.position.y=TOP+0.002; scene.add(topRing);
  const rail=new THREE.Mesh(new THREE.TorusGeometry(BAR_OUT+0.12,0.03,5,64),M.brass); rail.rotation.x=Math.PI/2; rail.position.y=0.24; scene.add(rail);
  for(let i=0;i<24;i++){const a=i/24*TAU;const p=put(box(0.05,0.82,0.05,M.mahogDark),Math.cos(a)*(BAR_OUT-0.04),0.48,Math.sin(a)*(BAR_OUT-0.04));p.rotation.y=-a;}
  const well=new THREE.Mesh(new THREE.RingGeometry(1.42,BAR_IN,48),toon(0x4a4e52)); well.rotation.x=-Math.PI/2; well.position.y=0.95; scene.add(well);
  put(cyl(1.42,1.42,0.9,M.mahogDark,40,true),0,0.5,0).material=M.mahogDark;
  // island and back-bar bottles
  put(cyl(ISLAND_R,ISLAND_R+0.05,1.0,M.mahog,24),0,0.5,0); put(cyl(ISLAND_R+0.06,ISLAND_R+0.06,0.06,M.mahogTop,24),0,1.03,0);
  put(cyl(0.58,0.62,0.4,M.mahog,20),0,1.26,0); put(cyl(0.64,0.64,0.04,M.mahogTop,20),0,1.47,0);
  put(cyl(0.3,0.34,0.36,M.mahog,16),0,1.67,0); put(cyl(0.08,0.08,1.1,M.brass,8),0,2.4,0); put(sph(0.14,M.brass,10),0,2.95,0);
  const BOT=[0x2f6a2a,0x8a2a14,0x2a4a8a,0xb8902a,0x6a1430,0x1a5a50,0xc06a1a,0x5a3a1a];
  for(const [r,y,n] of [[0.72,1.06,22],[0.5,1.49,14]])for(let i=0;i<n;i++){const a=i/n*TAU+rand(-0.05,0.05),col=pick(BOT),h=rand(0.22,0.34);const mm=toon(col,{emissive:col,emissiveIntensity:0.25});const b=put(cyl(0.05,0.058,h,mm,6),Math.cos(a)*r,y+h/2,Math.sin(a)*r);put(cyl(0.018,0.026,0.08,mm,5),0,h/2+0.04,0,b);}
  // waitress station rails
  for(const d of [-0.16,0.16]){const p=polar(STATION_A+d,2.3,TOP);put(cyl(0.02,0.02,0.22,M.brass,6),p.x,TOP+0.11,p.z);}
  {const a=polar(STATION_A-0.16,2.3),b=polar(STATION_A+0.16,2.3);const r=put(cyl(0.02,0.02,0.75,M.brass,6),(a.x+b.x)/2,TOP+0.22,(a.z+b.z)/2);r.rotation.x=Math.PI/2;}
  // pendant lamps
  for(let i=0;i<4;i++){const a=i/4*TAU+Math.PI/4,p=polar(a,2.15);put(cyl(0.008,0.008,1.2,M.black,4),p.x,3.1,p.z);
    const sh=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,5,0,TAU,0,Math.PI/2),M.green);sh.material.side=THREE.DoubleSide;put(sh,p.x,2.38,p.z);put(sph(0.06,M.bulb,6),p.x,2.38,p.z);
    const l=new THREE.PointLight(0xffd090,0.55,4.5,1);l.position.set(p.x,2.1,p.z);scene.add(l);pendLights.push(l);}
}
// stools
const stools=[];
for(let i=1;i<12;i++){const a=i/12*TAU;const p=polar(a,STOOL_R);
  put(cyl(0.035,0.035,0.7,M.brass,6),p.x,0.36,p.z); put(cyl(0.2,0.22,0.03,M.iron,10),p.x,0.015,p.z);
  const tr=put(new THREE.Mesh(new THREE.TorusGeometry(0.16,0.015,4,10),M.brass),p.x,0.32,p.z); tr.rotation.x=Math.PI/2;
  put(cyl(0.21,0.2,0.08,M.leather,12),p.x,0.72,p.z);
  stools.push({a,seat:polar(a,STOOL_R),approach:polar(a,3.3),spot:polar(a,2.26,TOP),occupant:null});}
// tables
const tables=[];
function roundTable(x,z){
  put(cyl(0.05,0.05,0.72,M.iron,6),x,0.36,z); put(cyl(0.3,0.32,0.03,M.iron,10),x,0.015,z); put(cyl(0.5,0.5,0.05,M.mahogTop,16),x,0.74,z);
  const base=Math.atan2(-z,-x), seats=[];
  for(const da of [0,2.1,-2.1]){const a=base+da, sp=new V3(x+Math.cos(a)*0.85,0,z+Math.sin(a)*0.85);
    put(box(0.4,0.05,0.4,M.mahog),sp.x,0.45,sp.z); for(const [ox,oz] of [[-.16,-.16],[.16,-.16],[-.16,.16],[.16,.16]])put(box(0.04,0.45,0.04,M.mahogDark),sp.x+ox,0.22,sp.z+oz);
    const back=put(box(0.4,0.5,0.05,M.mahog),sp.x+Math.cos(a)*0.2,0.72,sp.z+Math.sin(a)*0.2); back.rotation.y=-a+Math.PI/2;
    seats.push({pos:sp,heading:headingTo(x-sp.x,z-sp.z),place:new V3(x+Math.cos(a)*0.32,0.765,z+Math.sin(a)*0.32),occupant:null,seatY:0.47});}
  tables.push({pos:new V3(x,0,z),seats,state:'free',group:[],angle:Math.atan2(z,x)});
}
roundTable(-4.9,-4.9); roundTable(4.9,-4.9); roundTable(4.9,4.6); roundTable(-4.9,4.6);
{// booth under the window
  const x=0,z=6.35; put(box(0.75,0.05,1.3,M.mahogTop),x,0.74,z); put(box(0.1,0.72,0.1,M.iron),x,0.36,z);
  const seats=[];
  for(const s of [-1,1]){put(box(0.5,0.45,1.5,M.leather),x+s*0.72,0.23,z);put(box(0.12,1.15,1.5,M.leather),x+s*0.98,0.58,z);
    for(const dz of [-0.35,0.35]){const sp=new V3(x+s*0.7,0,z+dz);seats.push({pos:sp,heading:headingTo(-s,0),place:new V3(x+s*0.2,0.765,z+dz),occupant:null,seatY:0.47});}}
  tables.push({pos:new V3(x,0,z),seats,state:'free',group:[],angle:Math.PI/2});
}
