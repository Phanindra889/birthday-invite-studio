// Self-hosted, OFL-licensed fonts (via @fontsource) so renders never depend on a font CDN.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/luckiest-guy/400.css';
import '@fontsource/chewy/400.css';
import '@fontsource/dancing-script/600.css';
import '@fontsource/dancing-script/700.css';
import '@fontsource/pacifico/400.css';
import '@fontsource/great-vibes/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/600.css';
import '@fontsource/quicksand/700.css';

import type { DesignConfig } from '../shared/config';
import { BODY_FONTS, DISPLAY_FONTS, SCRIPT_FONTS, findFont } from '../shared/themes';

export function fontSpecs(design: DesignConfig): string[] {
  const specs: string[] = [];
  for (const f of [
    findFont(DISPLAY_FONTS, design.fonts.display),
    findFont(SCRIPT_FONTS, design.fonts.script),
    findFont(BODY_FONTS, design.fonts.body),
  ]) {
    for (const w of f.weights) specs.push(`${w} 64px "${f.family}"`);
  }
  return specs;
}

/** Resolves once every font used by the design is loaded (latin subset). */
export async function loadFonts(specs: string[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(specs.map((s) => document.fonts.load(s, 'AaBbYy 1!').catch(() => [])));
  await document.fonts.ready;
}
