import * as THREE from 'three';
import { state } from '../core/state.ts';
import { renderer, stage } from './renderer.ts';

// Post-process: render at low resolution, then pixelate and draw ink outlines.
export let RW = 2,
  RH = 2,
  /** device pixels per art pixel */
  SCALE = 1,
  rtColor: THREE.WebGLRenderTarget,
  rtNormal: THREE.WebGLRenderTarget,
  VW = 1,
  VH = 1;
export const post = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    tNormal: { value: null },
    res: { value: new THREE.Vector2(1, 1) },
    scale: { value: 1 },
    dth: { value: 0.22 / 99.9 },
    ink: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `uniform sampler2D tColor,tDepth,tNormal;uniform vec2 res;uniform float scale,dth,ink;varying vec2 vUv;
  vec2 U(vec2 p){return (p+0.5)/res;}
  void main(){vec2 px=floor(gl_FragCoord.xy/scale);vec3 c=texture2D(tColor,U(px)).rgb;float d=texture2D(tDepth,U(px)).x;vec3 n=texture2D(tNormal,U(px)).xyz*2.-1.;
    float d1=texture2D(tDepth,U(px+vec2(1.,0.))).x,d2=texture2D(tDepth,U(px-vec2(1.,0.))).x,d3=texture2D(tDepth,U(px+vec2(0.,1.))).x,d4=texture2D(tDepth,U(px-vec2(0.,1.))).x;
    float e=0.;if(max(max(d1-d,d2-d),max(d3-d,d4-d))>dth)e=1.;
    if(d<0.9999){vec3 n1=texture2D(tNormal,U(px+vec2(1.,0.))).xyz*2.-1.,n3=texture2D(tNormal,U(px+vec2(0.,1.))).xyz*2.-1.;if((d1<0.9999&&dot(n,n1)<0.55)||(d3<0.9999&&dot(n,n3)<0.55))e=max(e,0.8);}
    float lum=dot(c,vec3(0.299,0.587,0.114));
    if(d<0.9999&&lum<0.09&&mod(px.x+px.y,4.)<1.)c*=0.55;
    c=floor(c*18.+0.5)/18.;
    c=mix(c,vec3(0.07,0.04,0.03),e*0.92*ink);
    gl_FragColor=vec4(c,1.);}`,
  depthTest: false,
  depthWrite: false,
});
export const postScene = new THREE.Scene(),
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
export const normalMat = new THREE.MeshNormalMaterial();
function makeTargets() {
  if (rtColor) {
    rtColor.depthTexture?.dispose();
    rtColor.dispose();
    rtNormal.dispose();
  }
  const o = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
  rtColor = new THREE.WebGLRenderTarget(RW, RH, o);
  rtColor.depthTexture = new THREE.DepthTexture(RW, RH);
  rtNormal = new THREE.WebGLRenderTarget(RW, RH, o);
  post.uniforms.tColor.value = rtColor.texture;
  post.uniforms.tDepth.value = rtColor.depthTexture;
  post.uniforms.tNormal.value = rtNormal.texture;
  post.uniforms.res.value.set(RW, RH);
}
let lastSize = '';
export function resize() {
  VW = Math.max(2, stage.clientWidth);
  VH = Math.max(2, stage.clientHeight);
  const dpr = window.devicePixelRatio || 1,
    DW = Math.round(VW * dpr),
    DH = Math.round(VH * dpr);
  // a whole number of device pixels per art pixel keeps every art pixel square and the same size;
  // rounding keeps the row count near the target on any screen
  const scale = Math.max(1, Math.round(DH / state.artRows));
  const size = `${DW}x${DH}@${scale}`;
  // ResizeObserver also fires once on observe; rebuilding unchanged targets would only churn GPU memory
  if (size === lastSize) return;
  lastSize = size;
  SCALE = scale;
  // the canvas is sized in device pixels (pixel ratio stays 1, so point sizes stay in art pixels)
  renderer.setSize(DW, DH, false);
  RW = Math.ceil(DW / SCALE);
  RH = Math.ceil(DH / SCALE);
  post.uniforms.scale.value = SCALE;
  makeTargets();
}
new ResizeObserver(resize).observe(stage);
// moving the window to a screen with a different pixel density doesn't resize the stage
const watchDpr = () =>
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
    'change',
    () => {
      resize();
      watchDpr();
    },
    { once: true },
  );
watchDpr();
