// QA helper: renders still frames of the invitation for visual review.
//
//   npm run stills                          -> key frames of every scene (default config)
//   npm run stills -- --config my.json      -> same, with a saved config
//   npm run stills -- --frames 0,150,600    -> specific frames
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, normalizeConfig } from '../src/shared/config';
import { computeCues } from '../src/shared/cues';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config = normalizeConfig(arg('config') ? JSON.parse(readFileSync(arg('config')!, 'utf8')) : DEFAULT_CONFIG);
const outDir = path.resolve(root, arg('out') ?? 'out/stills');
const prefix = arg('prefix') ?? 'frame';
const scale = Number(arg('scale') ?? 0.5);
mkdirSync(outDir, { recursive: true });

const cues = computeCues(config);
let frames: number[];
if (arg('frames')) {
  frames = arg('frames')!.split(',').map(Number);
} else {
  // For each scene: mid-transition, mid-reveal and fully revealed.
  frames = cues.timeline.scenes.flatMap((s) => [
    ...(s.enterFrames ? [s.from + Math.round(s.enterFrames / 2)] : [Math.round(0.6 * config.fps)]),
    s.startFrame + Math.round(s.durationFrames * 0.35),
    s.endFrame - Math.round(0.9 * config.fps),
  ]);
}

console.log('Bundling…');
await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/video/index.ts'), publicDir: path.join(root, 'public') });
const inputProps = { config };
const composition = await selectComposition({ serveUrl, id: 'Invitation', inputProps });
console.log(`Composition ${composition.width}x${composition.height} @${composition.fps}fps, ${composition.durationInFrames} frames`);
for (const frame of frames) {
  const output = path.join(outDir, `${prefix}-${String(frame).padStart(4, '0')}.jpg`);
  await renderStill({ composition, serveUrl, inputProps, frame, output, imageFormat: 'jpeg', jpegQuality: 88, scale });
  console.log(`  ${path.relative(root, output)}`);
}
