import * as THREE from 'three';

// The bar was lit and coloured on three r128; these keep that look on current three.
// Imported by renderer.js and materials.js so it runs before any colour or material exists.

// r152+ treats hex colours as sRGB and converts them to linear, which darkens everything.
THREE.ColorManagement.enabled = false;

// r155+ physical lighting divides light by PI where r128's legacy mode didn't; scale every intensity by this.
export const LIGHT_SCALE = Math.PI;

// r155+ point lights fall off by inverse distance; restore r128's linear ramp to the light's cutoff distance.
const ATTENUATION = /float getDistanceAttenuation\([^)]*\) \{[\s\S]*?\n\}/;
if (!ATTENUATION.test(THREE.ShaderChunk.lights_pars_begin))
  throw new Error('three.js lights_pars_begin changed: re-check web/render/three-compat.ts');
THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace(
  ATTENUATION,
  `float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	return 1.0;
}`,
);
