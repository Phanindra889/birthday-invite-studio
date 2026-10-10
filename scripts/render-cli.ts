// Command-line export (no editor needed):
//
//   npm run render
//   npm run render -- --config my-invitation.json --out out/my-invite.mp4 --fps 60 --resolution 720p --quality high
//
// A config JSON can be downloaded from the editor ("Save config").
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG } from '../src/shared/config';
import { renderInvitation, type RenderOptions } from '../server/render-core';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config = arg('config') ? JSON.parse(readFileSync(path.resolve(arg('config')!), 'utf8')) : DEFAULT_CONFIG;
const out = path.resolve(root, arg('out') ?? 'out/invitation.mp4');
const options: RenderOptions = {
  fps: arg('fps') === '60' ? 60 : 30,
  resolution: arg('resolution') === '720p' ? '720p' : '1080p',
  quality: arg('quality') === 'high' ? 'high' : 'standard',
};

let last = '';
try {
  const result = await renderInvitation({
    root,
    config,
    options,
    outDir: path.dirname(out),
    fileName: path.basename(out),
    onProgress: (p) => {
      const line = `[${p.stage}] ${Math.round(p.progress * 100)}% ${p.message ?? ''}`;
      if (line !== last && (p.stage !== 'rendering' || (p.renderedFrames ?? 0) % 60 === 0)) console.log(line);
      last = line;
    },
  });
  const v = result.video;
  console.log('\n✔ Verified MP4');
  console.log(`  file      ${path.relative(root, result.videoPath)} (${(v.sizeBytes / 1e6).toFixed(1)} MB)`);
  console.log(`  video     ${v.codec} ${v.width}x${v.height} @ ${v.fps} fps, ${v.durationInSeconds.toFixed(2)} s`);
  console.log(`  audio     ${v.audioCodec}`);
  console.log(`  poster    ${path.relative(root, result.posterPath)}`);
  console.log(`  took      ${result.renderSeconds.toFixed(1)} s`);
} catch (err) {
  console.error(`\n✖ Render failed: ${(err as Error).message}`);
  process.exitCode = 1;
}
