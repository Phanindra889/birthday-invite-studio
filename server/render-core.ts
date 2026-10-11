// Shared rendering pipeline used by the editor's render API and the CLI:
// bundle the Remotion composition -> render H.264/AAC MP4 -> verify the file -> poster image.
import { bundle } from '@remotion/bundler';
import {
  ensureBrowser,
  getVideoMetadata,
  renderMedia,
  renderStill,
  selectComposition,
  type CancelSignal,
} from '@remotion/renderer';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { normalizeConfig, type InvitationConfig } from '../src/shared/config';
import { computeTimeline } from '../src/shared/timeline';
import { validateConfig } from '../src/shared/validate';

export type RenderStage = 'queued' | 'preparing' | 'bundling' | 'rendering' | 'encoding' | 'verifying' | 'poster' | 'done' | 'error' | 'cancelled';

export interface RenderOptions {
  fps: 30 | 60;
  resolution: '1080p' | '720p';
  quality: 'standard' | 'high';
}

export interface RenderProgress {
  stage: RenderStage;
  /** Overall progress 0..1. */
  progress: number;
  renderedFrames?: number;
  encodedFrames?: number;
  totalFrames?: number;
  message?: string;
}

export interface VerifiedVideo {
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  codec: string;
  audioCodec: string | null;
  sizeBytes: number;
}

export interface RenderResult {
  videoPath: string;
  posterPath: string;
  video: VerifiedVideo;
  renderSeconds: number;
}

export const COMPOSITION_ID = 'Invitation';

let cachedBundle: { stamp: string; serveUrl: Promise<string> } | null = null;

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return newest;
}

/** Bundles once and re-bundles only when the composition source or public assets changed. */
export function getBundle(root: string, onProgress?: (p: number) => void): Promise<string> {
  const stamp = `${newestMtime(path.join(root, 'src'))}-${newestMtime(path.join(root, 'public'))}`;
  if (cachedBundle && cachedBundle.stamp === stamp) return cachedBundle.serveUrl;
  const serveUrl = bundle({
    entryPoint: path.join(root, 'src/video/index.ts'),
    publicDir: path.join(root, 'public'),
    onProgress: (p) => onProgress?.(p / 100),
  });
  cachedBundle = { stamp, serveUrl };
  serveUrl.catch(() => {
    if (cachedBundle?.serveUrl === serveUrl) cachedBundle = null;
  });
  return serveUrl;
}

export function outputSize(opts: RenderOptions) {
  return opts.resolution === '720p' ? { width: 720, height: 1280, scale: 2 / 3 } : { width: 1080, height: 1920, scale: 1 };
}

/** Frame used for the poster/thumbnail: the name reveal if present, otherwise 40% in. */
export function posterFrame(config: InvitationConfig): number {
  const tl = computeTimeline(config);
  const bb = tl.scenes.find((s) => s.id === 'birthday-boy');
  if (bb) return Math.min(bb.endFrame - 1, bb.startFrame + Math.round(bb.durationFrames * 0.62));
  return Math.round(tl.totalFrames * 0.4);
}

export async function verifyVideo(file: string, expected: { width: number; height: number; fps: number; durationInSeconds: number; expectAudio: boolean }): Promise<VerifiedVideo> {
  const size = statSync(file).size;
  if (size < 50_000) throw new Error(`The rendered file is unexpectedly small (${size} bytes).`);
  const meta = await getVideoMetadata(file);
  const problems: string[] = [];
  if (meta.codec !== 'h264') problems.push(`video codec is ${meta.codec}, expected h264`);
  if (expected.expectAudio && meta.audioCodec !== 'aac') problems.push(`audio codec is ${meta.audioCodec ?? 'missing'}, expected aac`);
  if (meta.width !== expected.width || meta.height !== expected.height) problems.push(`size is ${meta.width}x${meta.height}, expected ${expected.width}x${expected.height}`);
  if (Math.abs(meta.fps - expected.fps) > 0.5) problems.push(`frame rate is ${meta.fps}, expected ${expected.fps}`);
  if (meta.durationInSeconds === null || Math.abs(meta.durationInSeconds - expected.durationInSeconds) > 0.35) {
    problems.push(`duration is ${meta.durationInSeconds ?? 'unknown'}s, expected ${expected.durationInSeconds.toFixed(2)}s`);
  }
  if (!meta.canPlayInVideoTag) problems.push('the file is not playable in a standard <video> element');
  if (problems.length) throw new Error(`Verification failed: ${problems.join('; ')}.`);
  return {
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
    durationInSeconds: meta.durationInSeconds ?? expected.durationInSeconds,
    codec: meta.codec,
    audioCodec: meta.audioCodec,
    sizeBytes: size,
  };
}

export async function renderInvitation(args: {
  root: string;
  config: unknown;
  options: RenderOptions;
  outDir: string;
  fileName?: string;
  onProgress: (p: RenderProgress) => void;
  cancelSignal?: CancelSignal;
}): Promise<RenderResult> {
  const { root, options, outDir, onProgress, cancelSignal } = args;
  const started = Date.now();
  const config = normalizeConfig(args.config);
  config.fps = options.fps;
  const errors = validateConfig(config).filter((i) => i.level === 'error');
  if (errors.length) throw new Error(errors.map((e) => e.message).join(' '));
  mkdirSync(outDir, { recursive: true });

  onProgress({ stage: 'preparing', progress: 0, message: 'Preparing the renderer…' });
  await ensureBrowser({
    onBrowserDownload: () => ({
      version: null,
      onProgress: ({ percent }) => onProgress({ stage: 'preparing', progress: 0, message: `Downloading the headless browser (one time)… ${Math.round(percent * 100)}%` }),
    }),
  });

  onProgress({ stage: 'bundling', progress: 0.01, message: 'Bundling the video composition…' });
  const serveUrl = await getBundle(root, (p) => onProgress({ stage: 'bundling', progress: 0.01 + p * 0.07, message: 'Bundling the video composition…' }));

  const inputProps = { config };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps });
  const size = outputSize(options);
  const videoPath = path.join(outDir, args.fileName ?? 'invitation.mp4');
  const totalFrames = composition.durationInFrames;

  onProgress({ stage: 'rendering', progress: 0.08, renderedFrames: 0, encodedFrames: 0, totalFrames, message: 'Rendering frames…' });
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    pixelFormat: 'yuv420p',
    crf: options.quality === 'high' ? 16 : 20,
    imageFormat: 'jpeg',
    jpegQuality: 92,
    scale: size.scale,
    enforceAudioTrack: true,
    // Small cloud instances run out of memory with several Chrome tabs; set RENDER_CONCURRENCY=1 there.
    concurrency: process.env.RENDER_CONCURRENCY ? Number(process.env.RENDER_CONCURRENCY) : null,
    outputLocation: videoPath,
    overwrite: true,
    cancelSignal,
    onProgress: ({ progress, renderedFrames, encodedFrames, stitchStage }) => {
      const encoding = stitchStage === 'muxing' || renderedFrames >= totalFrames;
      onProgress({
        stage: encoding ? 'encoding' : 'rendering',
        progress: 0.08 + progress * 0.84,
        renderedFrames,
        encodedFrames,
        totalFrames,
        message: encoding ? 'Encoding H.264 video and AAC audio…' : `Rendering frame ${renderedFrames} of ${totalFrames}…`,
      });
    },
  });

  onProgress({ stage: 'verifying', progress: 0.93, totalFrames, message: 'Verifying the MP4 file…' });
  const video = await verifyVideo(videoPath, {
    width: size.width,
    height: size.height,
    fps: options.fps,
    durationInSeconds: totalFrames / options.fps,
    expectAudio: true,
  });

  onProgress({ stage: 'poster', progress: 0.96, totalFrames, message: 'Creating the poster image…' });
  const posterPath = path.join(outDir, 'poster.jpg');
  await renderStill({ composition, serveUrl, inputProps, frame: posterFrame(config), output: posterPath, imageFormat: 'jpeg', jpegQuality: 90, scale: size.scale, overwrite: true });

  return { videoPath, posterPath, video, renderSeconds: (Date.now() - started) / 1000 };
}
