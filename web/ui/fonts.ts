import ps2pRanges from '@fontsource/press-start-2p/unicode.json';
import ps2p_cyrillic_ext from '@fontsource/press-start-2p/files/press-start-2p-cyrillic-ext-400-normal.woff2';
import ps2p_cyrillic from '@fontsource/press-start-2p/files/press-start-2p-cyrillic-400-normal.woff2';
import ps2p_greek from '@fontsource/press-start-2p/files/press-start-2p-greek-400-normal.woff2';
import ps2p_latin_ext from '@fontsource/press-start-2p/files/press-start-2p-latin-ext-400-normal.woff2';
import ps2p_latin from '@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2';
import vt323Ranges from '@fontsource/vt323/unicode.json';
import vt323_vietnamese from '@fontsource/vt323/files/vt323-vietnamese-400-normal.woff2';
import vt323_latin_ext from '@fontsource/vt323/files/vt323-latin-ext-400-normal.woff2';
import vt323_latin from '@fontsource/vt323/files/vt323-latin-400-normal.woff2';
import stmRanges from '@fontsource/share-tech-mono/unicode.json';
import stm_latin from '@fontsource/share-tech-mono/files/share-tech-mono-latin-400-normal.woff2';

// The three OFL fonts, served from this site (no third-party requests). They're imported here rather
// than from CSS because Bun's CSS bundler inlines font url()s as data: URLs, which would load every
// subset up front and need a font-src exception in the CSP. Browsers still fetch each subset only
// when text in its unicode-range is drawn. The build copies the licences to dist/licenses/.
const FACES: [family: string, url: string, unicodeRange: string][] = [
  ['Press Start 2P', ps2p_cyrillic_ext, ps2pRanges['cyrillic-ext']],
  ['Press Start 2P', ps2p_cyrillic, ps2pRanges.cyrillic],
  ['Press Start 2P', ps2p_greek, ps2pRanges.greek],
  ['Press Start 2P', ps2p_latin_ext, ps2pRanges['latin-ext']],
  ['Press Start 2P', ps2p_latin, ps2pRanges.latin],
  ['VT323', vt323_vietnamese, vt323Ranges.vietnamese],
  ['VT323', vt323_latin_ext, vt323Ranges['latin-ext']],
  ['VT323', vt323_latin, vt323Ranges.latin],
  ['Share Tech Mono', stm_latin, stmRanges.latin],
];
for (const [family, url, unicodeRange] of FACES)
  document.fonts.add(new FontFace(family, `url(${url}) format('woff2')`, { unicodeRange, display: 'swap' }));
