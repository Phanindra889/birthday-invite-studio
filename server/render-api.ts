// Local render API, mounted into the Vite dev/preview server (see vite.config.ts).
//
//   GET  /api/health                 renderer status
//   POST /api/assets                 upload a music file (raw body) -> { url }
//   GET  /api/assets/:file           serve an uploaded asset
//   POST /api/render                 { config, options } -> { id }
//   GET  /api/render/:id             job status
//   GET  /api/render/:id/events      progress stream (server-sent events)
//   POST /api/render/:id/cancel      cancel a running job
//   GET  /api/render/:id/video       the verified MP4 (supports Range; ?download=1)
//   GET  /api/render/:id/poster      poster JPEG (?download=1)
import { makeCancelSignal } from '@remotion/renderer';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';
import { slugify } from '../src/shared/format';
import { renderInvitation, type RenderOptions, type RenderProgress, type VerifiedVideo } from './render-core';

interface Job {
  id: string;
  progress: RenderProgress;
  error?: string;
  video?: VerifiedVideo;
  fileName: string;
  outDir: string;
  createdAt: number;
  renderSeconds?: number;
  listeners: Set<ServerResponse>;
  cancel?: () => void;
}

const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const EXT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac',
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4',
};

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error(`Upload is larger than ${Math.round(limit / 1e6)} MB.`));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/** Streams a file with HTTP Range support (needed for seeking in <video>). */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string, type: string, downloadName?: string) {
  if (!existsSync(file)) return json(res, 404, { error: 'File not found.' });
  const size = statSync(file).size;
  res.setHeader('Content-Type', type);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store');
  if (downloadName) res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start >= size || start > end) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${size}`);
      return res.end();
    }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Length', size);
  createReadStream(file).pipe(res);
}

function publicJob(job: Job) {
  return {
    id: job.id,
    progress: job.progress,
    error: job.error,
    video: job.video,
    renderSeconds: job.renderSeconds,
    fileName: job.fileName,
    videoUrl: job.video ? `/api/render/${job.id}/video` : undefined,
    posterUrl: job.video ? `/api/render/${job.id}/poster` : undefined,
  };
}

export function renderApi({ root }: { root: string }): Plugin {
  const assetsDir = path.join(root, '.cache', 'assets');
  const rendersDir = path.join(root, 'out', 'renders');
  const jobs = new Map<string, Job>();
  let queue: Promise<void> = Promise.resolve();

  const emit = (job: Job) => {
    const payload = `data: ${JSON.stringify(publicJob(job))}\n\n`;
    for (const l of job.listeners) l.write(payload);
    if (['done', 'error', 'cancelled'].includes(job.progress.stage)) {
      for (const l of job.listeners) l.end();
      job.listeners.clear();
    }
  };

  const startJob = (config: Record<string, unknown>, options: RenderOptions, origin: string): Job => {
    const id = randomUUID().slice(0, 8);
    const name = typeof config.childName === 'string' ? config.childName : 'invitation';
    const job: Job = {
      id,
      progress: { stage: 'queued', progress: 0, message: 'Waiting for the renderer…' },
      fileName: `${slugify(name)}-1st-birthday-invitation.mp4`,
      outDir: path.join(rendersDir, id),
      createdAt: Date.now(),
      listeners: new Set(),
    };
    jobs.set(id, job);
    // Uploaded assets are referenced by path; the headless browser needs absolute URLs.
    for (const key of ['musicUrl', 'photoUrl']) {
      const v = config[key];
      if (typeof v === 'string' && v.startsWith('/api/assets/')) config[key] = origin + v;
    }
    const { cancelSignal, cancel } = makeCancelSignal();
    let cancelled = false;
    job.cancel = () => {
      cancelled = true;
      cancel();
      if (job.progress.stage === 'queued') {
        job.progress = { stage: 'cancelled', progress: 0, message: 'Cancelled.' };
        emit(job);
      }
    };
    queue = queue.then(async () => {
      if (cancelled) return;
      try {
        const result = await renderInvitation({
          root,
          config,
          options,
          outDir: job.outDir,
          fileName: job.fileName,
          cancelSignal,
          onProgress: (p) => {
            job.progress = p;
            emit(job);
          },
        });
        job.video = result.video;
        job.renderSeconds = result.renderSeconds;
        job.progress = { stage: 'done', progress: 1, message: 'Your invitation video is ready.' };
      } catch (err) {
        if (cancelled) {
          job.progress = { stage: 'cancelled', progress: 0, message: 'Render cancelled.' };
        } else {
          job.error = (err as Error).message || String(err);
          job.progress = { stage: 'error', progress: job.progress.progress, message: 'The render failed.' };
          console.error('[render]', err);
        }
      }
      emit(job);
    });
    return job;
  };

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const read = req.method === 'GET' || req.method === 'HEAD';
    if (!url.pathname.startsWith('/api/')) return next();
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    try {
      if (parts[1] === 'health' && req.method === 'GET') {
        return json(res, 200, { ok: true, renderer: 'remotion', busy: [...jobs.values()].some((j) => !['done', 'error', 'cancelled'].includes(j.progress.stage)) });
      }

      if (parts[1] === 'assets') {
        if (req.method === 'POST' && parts.length === 2) {
          const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
          const ext = AUDIO_TYPES[type] ?? String(req.headers['x-file-ext'] ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
          if (!ext || !EXT_TYPES[ext]) return json(res, 415, { error: `Unsupported file type "${type || 'unknown'}". Use MP3, WAV, M4A, AAC, OGG or FLAC.` });
          const body = await readBody(req, 60e6);
          if (!body.length) return json(res, 400, { error: 'The uploaded file is empty.' });
          const hash = createHash('sha1').update(body).digest('hex').slice(0, 20);
          mkdirSync(assetsDir, { recursive: true });
          const file = `${hash}.${ext}`;
          if (!existsSync(path.join(assetsDir, file))) writeFileSync(path.join(assetsDir, file), body);
          return json(res, 200, { url: `/api/assets/${file}` });
        }
        if (read && parts.length === 3 && /^[a-f0-9]{20}\.[a-z0-9]+$/.test(parts[2])) {
          const ext = parts[2].split('.').pop()!;
          return sendFile(req, res, path.join(assetsDir, parts[2]), EXT_TYPES[ext] ?? 'application/octet-stream');
        }
      }

      if (parts[1] === 'render') {
        if (req.method === 'POST' && parts.length === 2) {
          const body = JSON.parse((await readBody(req, 25e6)).toString('utf8'));
          if (!body || typeof body.config !== 'object') return json(res, 400, { error: 'Missing invitation config.' });
          const o = body.options ?? {};
          const options: RenderOptions = {
            fps: o.fps === 60 ? 60 : 30,
            resolution: o.resolution === '720p' ? '720p' : '1080p',
            quality: o.quality === 'high' ? 'high' : 'standard',
          };
          const origin = `http://${req.headers.host ?? 'localhost:5173'}`;
          const job = startJob(body.config, options, origin);
          return json(res, 202, publicJob(job));
        }
        const job = jobs.get(parts[2] ?? '');
        if (!job) return json(res, 404, { error: 'Render job not found (the server may have restarted).' });
        const action = parts[3];
        if (!action && req.method === 'GET') return json(res, 200, publicJob(job));
        if (action === 'events' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
          res.write(`data: ${JSON.stringify(publicJob(job))}\n\n`);
          if (['done', 'error', 'cancelled'].includes(job.progress.stage)) return res.end();
          job.listeners.add(res);
          req.on('close', () => job.listeners.delete(res));
          return;
        }
        if (action === 'cancel' && req.method === 'POST') {
          job.cancel?.();
          return json(res, 200, publicJob(job));
        }
        const download = url.searchParams.get('download') === '1';
        if (action === 'video' && read && job.video) {
          return sendFile(req, res, path.join(job.outDir, job.fileName), 'video/mp4', download ? job.fileName : undefined);
        }
        if (action === 'poster' && read && job.video) {
          return sendFile(req, res, path.join(job.outDir, 'poster.jpg'), 'image/jpeg', download ? job.fileName.replace(/\.mp4$/, '-poster.jpg') : undefined);
        }
      }
      return json(res, 404, { error: 'Unknown API route.' });
    } catch (err) {
      return json(res, 500, { error: (err as Error).message || 'Server error.' });
    }
  };

  return {
    name: 'invite-render-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
