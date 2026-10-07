'use strict';
/* ================= renderer ================= */
const stage=document.getElementById('stage'), canvas=document.getElementById('view');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false}); renderer.setPixelRatio(1);
const scene=new THREE.Scene(), BG=0x120b07;
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0.1,100); camera.layers.enable(1);
const GRAD=(()=>{const d=new Uint8Array([86,86,86,255,175,175,175,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();
const toon=(c,o)=>new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:GRAD},o||{}));
const M={
  mahog:toon(0x4a2416), mahogTop:toon(0x5e2f1a), mahogDark:toon(0x2a140b), brass:toon(0xc89a3e,{emissive:0x1e1200}),
  leather:toon(0x6a1c18), green:toon(0x2f5a3a), felt:toon(0x2a6a44), cream:toon(0xe8dcc0), black:toon(0x161210),
  boot:toon(0x231710), bulb:new THREE.MeshBasicMaterial({color:0xffe6b0}), shell:toon(0xf1ece2), copper:toon(0xb8673a,{emissive:0x1a0800}),
  comb:toon(0xd8302a,{emissive:0x300000}), beak:toon(0xe8ae22), tie:toon(0x111111), glassThick:toon(0xb8e0e2,{emissive:0x0a1a1a}),
  iron:toon(0x3a3a3a), steel:toon(0x8e979e), apron:toon(0xf2efe6), tray:toon(0x9aa2a8),
};
const GLASS=toon(0xd0eef0,{transparent:true,opacity:0.38,side:THREE.DoubleSide});
function box(w,h,d,m){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);}
function cyl(rt,rb,h,m,s=12,open=false){return new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s,1,open),m);}
function sph(r,m,s=12){return new THREE.Mesh(new THREE.SphereGeometry(r,s,Math.max(6,(s*0.6)|0)),m);}
function put(o,x,y,z,p){o.position.set(x,y,z);(p||scene).add(o);return o;}
const redraws=[];
function ctex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');const t=new THREE.CanvasTexture(c);t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}const run=()=>{g.clearRect(0,0,w,h);draw(g,w,h);t.needsUpdate=true;};run();redraws.push(run);return t;}
const plane=(w,h,tex,basic)=>new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic?new THREE.MeshBasicMaterial({map:tex,transparent:!!basic.transparent}):toon(0xffffff,{map:tex}));

/* dithered wall fade: walls between camera and bar dissolve in a 4x4 Bayer pattern */
function fadeClone(mat,uni){const m=mat.clone();m.onBeforeCompile=sh=>{sh.uniforms.uFade=uni;sh.fragmentShader='uniform float uFade;\nfloat bay2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}\nfloat bay4(vec2 a){return bay2(.5*a)*.25+bay2(a);}\n'+sh.fragmentShader.replace('void main() {','void main() {\n\tif(bay4(gl_FragCoord.xy)<uFade) discard;');};return m;}
const walls=[];
function makeWall(nx,nz){const g=new THREE.Group();scene.add(g);const w={g,n:new V3(nx,0,nz),uni:{value:0},fade:0};walls.push(w);return w;}
function finalizeWall(w){const cache=new Map();w.g.traverse(o=>{if(o.material){if(!cache.has(o.material))cache.set(o.material,fadeClone(o.material,w.uni));o.material=cache.get(o.material);}});}
