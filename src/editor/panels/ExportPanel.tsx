import React, { useEffect, useMemo, useRef, useState } from 'react';
import { computeTimeline } from '../../shared/timeline';
import { validateConfig } from '../../shared/validate';
import { Icon } from '../icons';
import { usePlayer } from '../player';
import { useStore } from '../store';
import { Button, Callout, Field, Section, Segmented } from '../ui';

type Stage = 'queued' | 'preparing' | 'bundling' | 'rendering' | 'encoding' | 'verifying' | 'poster' | 'done' | 'error' | 'cancelled';

interface JobView {
  id: string;
  progress: { stage: Stage; progress: number; renderedFrames?: number; totalFrames?: number; message?: string };
  error?: string;
  video?: { width: number; height: number; fps: number; durationInSeconds: number; codec: string; audioCodec: string | null; sizeBytes: number };
  renderSeconds?: number;
  fileName: string;
  videoUrl?: string;
  posterUrl?: string;
}

const STEPS: { stage: Stage[]; label: string }[] = [
  { stage: ['queued', 'preparing', 'bundling'], label: 'Prepare' },
  { stage: ['rendering'], label: 'Render frames' },
  { stage: ['encoding'], label: 'Encode H.264 + AAC' },
  { stage: ['verifying', 'poster'], label: 'Verify & poster' },
];

const fmtTime = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

export const ExportPanel: React.FC = () => {
  const { config, runtimeConfig, update, media } = useStore();
  const { player } = usePlayer();
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [server, setServer] = useState<'checking' | 'ok' | 'offline'>('checking');
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const issues = useMemo(() => validateConfig(runtimeConfig), [runtimeConfig]);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const duration = computeTimeline(config).durationSeconds;
  const running = !!job && !['done', 'error', 'cancelled'].includes(job.progress.stage);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => setServer('ok'))
      .catch(() => setServer('offline'));
    return () => esRef.current?.close();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const follow = (id: string) => {
    esRef.current?.close();
    const es = new EventSource(`/api/render/${id}/events`);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as JobView;
      setJob(data);
      if (['done', 'error', 'cancelled'].includes(data.progress.stage)) es.close();
    };
    es.onerror = () => {
      // The stream closes normally at the end; only report if we never finished.
      setJob((j) => {
        if (j && !['done', 'error', 'cancelled'].includes(j.progress.stage)) setError('Lost connection to the render server. Is `npm run dev` still running?');
        return j;
      });
      es.close();
    };
  };

  const start = async () => {
    setError(null);
    setJob(null);
    player?.pause();
    try {
      const cfg = { ...runtimeConfig, musicUrl: '' };
      if (cfg.audio.source === 'upload') {
        if (!media.musicFile) throw new Error('Upload the music file again (Music tab) before exporting.');
        const ext = media.musicFile.name.split('.').pop() ?? '';
        const up = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': media.musicFile.type || 'application/octet-stream', 'X-File-Ext': ext }, body: media.musicFile });
        const body = await up.json();
        if (!up.ok) throw new Error(body.error ?? 'Uploading the music failed.');
        cfg.musicUrl = body.url;
      }
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg, options: { fps: config.fps, resolution, quality } }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'The render could not be started.');
      setStartedAt(Date.now());
      setNow(Date.now());
      setJob(body);
      follow(body.id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cancel = async () => {
    if (job) await fetch(`/api/render/${job.id}/cancel`, { method: 'POST' }).catch(() => undefined);
  };

  const share = async () => {
    if (!job?.videoUrl) return;
    try {
      const blob = await fetch(job.videoUrl).then((r) => r.blob());
      const file = new File([blob], job.fileName, { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${config.childName} — ${config.occasion}` });
      } else {
        setError('Sharing files isn’t supported in this browser. Download the MP4 and share it from your phone or WhatsApp.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError('Sharing was not completed.');
    }
  };

  const p = job?.progress;
  const elapsed = (now - startedAt) / 1000;
  const eta = p && p.progress > 0.12 && running ? (elapsed / p.progress) * (1 - p.progress) : null;
  const activeStep = p ? STEPS.findIndex((s) => s.stage.includes(p.stage)) : -1;

  return (
    <>
      <Section title="Export settings" description="Renders a real MP4 (H.264 video, AAC audio) on this computer.">
        <Field label="Aspect ratio">
          {() => (
            <Segmented
              ariaLabel="Aspect ratio"
              value="9:16"
              options={[
                { value: '9:16', label: '9:16 vertical' },
                { value: '16:9', label: '16:9 (coming soon)', disabled: true, title: 'The composition is ready for a landscape layout; scene layouts are portrait-only for now.' },
              ]}
              onChange={() => undefined}
            />
          )}
        </Field>
        <Field label="Resolution">
          {() => (
            <Segmented
              ariaLabel="Resolution"
              value={resolution}
              options={[
                { value: '1080p', label: '1080 × 1920' },
                { value: '720p', label: '720 × 1280' },
              ]}
              onChange={setResolution}
            />
          )}
        </Field>
        <div className="grid-2">
          <Field label="Frame rate" hint="Also used by the preview.">
            {() => (
              <Segmented
                ariaLabel="Frame rate"
                value={config.fps}
                options={[
                  { value: 30, label: '30 fps' },
                  { value: 60, label: '60 fps' },
                ]}
                onChange={(v) => update((d) => void (d.fps = v))}
              />
            )}
          </Field>
          <Field label="Quality">
            {() => (
              <Segmented
                ariaLabel="Quality"
                value={quality}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'high', label: 'High' },
                ]}
                onChange={setQuality}
              />
            )}
          </Field>
        </div>
        <p className="export-summary">
          <Icon name="film" size={16} /> {duration.toFixed(1)}s · {resolution === '1080p' ? '1080×1920' : '720×1280'} · {config.fps} fps · MP4 (H.264 + AAC)
        </p>
      </Section>

      <Section title="Render">
        {server === 'offline' && (
          <Callout tone="error">
            The local render server isn’t reachable. Start the editor with <code>npm run dev</code> (or <code>npm run preview</code> after a build) — static hosting can preview but not export.
          </Callout>
        )}
        {errors.length > 0 && (
          <Callout tone="error">
            Fix before exporting: {errors.map((e) => e.message).join(' ')}
          </Callout>
        )}
        {warnings.length > 0 && errors.length === 0 && (
          <Callout tone="warning">
            {warnings.length} note{warnings.length > 1 ? 's' : ''}: {warnings.map((w) => w.message).join(' ')}
          </Callout>
        )}
        <div className="row-actions">
          {!running ? (
            <Button variant="primary" size="lg" icon="film" onClick={start} disabled={server !== 'ok' || errors.length > 0 || media.analyzing}>
              {job?.progress.stage === 'done' ? 'Render again' : 'Render MP4'}
            </Button>
          ) : (
            <Button variant="danger" icon="x" onClick={cancel}>
              Cancel render
            </Button>
          )}
        </div>

        {job && p && p.stage !== 'done' && (
          <div className={`render-progress ${p.stage}`} aria-live="polite">
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.label} className={p.stage === 'error' || p.stage === 'cancelled' ? '' : i < activeStep ? 'done' : i === activeStep ? 'active' : ''}>
                  <span className="step-dot">{i < activeStep ? <Icon name="check" size={12} /> : i + 1}</span>
                  {s.label}
                </li>
              ))}
            </ol>
            <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.progress * 100)}>
              <span style={{ width: `${Math.max(2, p.progress * 100)}%` }} />
            </div>
            <div className="progress-meta">
              <span>{p.message}</span>
              <span>
                {Math.round(p.progress * 100)}%{running && ` · ${fmtTime(elapsed)}`}
                {eta !== null && ` · ~${fmtTime(eta)} left`}
              </span>
            </div>
          </div>
        )}
        {(error || job?.error) && (
          <Callout tone="error">
            <strong>Export failed.</strong> {error ?? job?.error}
          </Callout>
        )}
        {job?.progress.stage === 'cancelled' && <Callout tone="warning">The render was cancelled. Nothing was exported.</Callout>}
      </Section>

      {job?.progress.stage === 'done' && job.video && job.videoUrl && (
        <Section title="Your invitation is ready">
          <Callout tone="success">
            Verified: {job.video.codec.toUpperCase()} {job.video.width}×{job.video.height} at {job.video.fps} fps, {job.video.audioCodec?.toUpperCase()} audio, {job.video.durationInSeconds.toFixed(1)}s,{' '}
            {(job.video.sizeBytes / 1e6).toFixed(1)} MB{job.renderSeconds ? ` · rendered in ${fmtTime(job.renderSeconds)}` : ''}.
          </Callout>
          <video className="result-video" src={job.videoUrl} poster={job.posterUrl} controls playsInline preload="metadata" />
          <div className="row-actions">
            <a className="btn btn-primary btn-md" href={`${job.videoUrl}?download=1`} download={job.fileName}>
              <Icon name="download" /> Download MP4
            </a>
            <a className="btn btn-secondary btn-md" href={`${job.posterUrl}?download=1`} download>
              <Icon name="image" /> Poster image
            </a>
            <Button icon="share" onClick={share}>
              Share…
            </Button>
            <Button
              icon="link"
              variant="ghost"
              onClick={() => {
                navigator.clipboard?.writeText(new URL(job.videoUrl!, location.href).href).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                });
              }}
            >
              {copied ? 'Copied' : 'Copy local link'}
            </Button>
          </div>
          <p className="field-hint">The local link works on this computer only. To send the invitation, download the MP4 and share it via WhatsApp, email or social media.</p>
        </Section>
      )}
    </>
  );
};
