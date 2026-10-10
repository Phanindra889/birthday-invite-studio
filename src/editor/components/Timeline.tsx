import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SCENE_META } from '../../shared/config';
import { computeCues } from '../../shared/cues';
import { getBuiltinTrack, musicBeats } from '../../shared/music';
import { clampDuration } from '../../shared/timeline';
import { Icon } from '../icons';
import { usePlayer, usePlayerFrame } from '../player';
import { useStore } from '../store';

const SCENE_COLORS = ['#87CEEB', '#5B9BE0', '#F2D58A', '#A8D8F5', '#7FB2E8'];

export const Timeline: React.FC = () => {
  const { config, runtimeConfig, update, media } = useStore();
  const { seek, editBeats, setEditBeats } = usePlayer();
  const frame = usePlayerFrame();
  const cues = useMemo(() => computeCues(runtimeConfig), [runtimeConfig]);
  const tl = cues.timeline;
  const fps = tl.fps;
  const dur = tl.durationSeconds;
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const a = config.audio;
  const hasMusic = a.source !== 'none' && !(a.source === 'upload' && !runtimeConfig.musicUrl);

  const timeAt = (clientX: number) => {
    const r = bodyRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  };
  const pct = (t: number) => `${(t / dur) * 100}%`;

  // Waveform (music time mapped onto the video timeline).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const draw = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ins = media.insight;
      if (!ins || !hasMusic) return;
      const buckets = ins.peaks.length / 2;
      const trackLen = getBuiltinTrack(a.source)?.duration ?? a.trackDuration ?? ins.duration;
      const span = trackLen - a.startOffset;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(199, 232, 250, 0.75)');
      grad.addColorStop(1, 'rgba(135, 206, 235, 0.35)');
      ctx.fillStyle = grad;
      for (let x = 0; x < w; x++) {
        const vt = (x / w) * dur;
        let mt = vt + a.startOffset;
        if (a.loop && span > 1) mt = a.startOffset + (vt % span);
        if (mt > ins.duration) continue;
        const fadeOut = Math.min(1, Math.max(0, (dur - vt) / Math.max(0.01, a.fadeOut)));
        const fadeIn = Math.min(1, vt / Math.max(0.01, a.fadeIn));
        const b = Math.min(buckets - 1, Math.floor((mt / ins.duration) * buckets));
        const amp = Math.max(-ins.peaks[b * 2], ins.peaks[b * 2 + 1]) * Math.min(fadeIn, fadeOut) * a.volume;
        const y = Math.max(0.5, amp * h * 0.46);
        ctx.fillRect(x, h / 2 - y, 1, y * 2);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [media.insight, dur, a.startOffset, a.loop, a.source, a.trackDuration, a.fadeIn, a.fadeOut, a.volume, hasMusic]);

  const onBodyDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || resizing) return;
    const target = e.target as HTMLElement;
    if (editBeats && target.closest('.tl-audio')) {
      toggleBeatAt(timeAt(e.clientX));
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setScrubbing(true);
    seek(timeAt(e.clientX) * fps);
  };
  const onBodyMove = (e: React.PointerEvent) => {
    if (scrubbing) seek(timeAt(e.clientX) * fps);
  };

  const toggleBeatAt = (t: number) => {
    const width = bodyRef.current?.getBoundingClientRect().width ?? 800;
    const tol = (7 / width) * dur;
    update((d) => {
      // Editing a built-in track's exact grid turns it into a manual marker list.
      const current = musicBeats(d.audio);
      const musicT = t + d.audio.startOffset;
      const idx = current.findIndex((b) => Math.abs(b - musicT) <= tol);
      const next = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, Math.round(musicT * 1000) / 1000].sort((x, y) => x - y);
      d.audio.beats = next;
      d.audio.beatSource = 'manual';
    });
  };

  const startResize = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setResizing(id);
  };
  const moveResize = (e: React.PointerEvent) => {
    if (!resizing) return;
    const scene = tl.scenes.find((s) => s.id === resizing);
    if (!scene) return;
    let end = timeAt(e.clientX);
    // Snap the boundary to a nearby beat so transitions land on the music.
    if (config.audio.beatSync && cues.beats.length) {
      const near = cues.beats.reduce((best, b) => (Math.abs(b.t - end) < Math.abs(best - end) ? b.t : best), Infinity);
      if (Math.abs(near - end) < 0.3) end = near;
    }
    const length = Math.round(clampDuration(scene.id, end - scene.startFrame / fps) * 10) / 10;
    update(
      (d) => {
        const s = d.scenes.find((x) => x.id === resizing);
        if (s) s.durationSeconds = length;
      },
      { coalesce: `resize-${resizing}` },
    );
  };

  const ticks = [];
  for (let s = 0; s <= Math.floor(dur); s++) ticks.push(s);

  return (
    <div className="timeline" aria-label="Timeline">
      <div className="tl-toolbar">
        <div className="tl-legend">
          <span className="lg"><i className="lg-scene" /> Scenes</span>
          <span className="lg"><i className="lg-beat" /> Beats</span>
          <span className="lg"><i className="lg-down" /> Downbeats</span>
          <span className="lg"><i className="lg-cue" /> Text reveals</span>
          <span className="lg"><i className="lg-burst" /> Confetti</span>
        </div>
        <button type="button" className={`tl-edit${editBeats ? ' active' : ''}`} aria-pressed={editBeats} onClick={() => setEditBeats(!editBeats)} disabled={!hasMusic}>
          <Icon name="edit" size={14} /> {editBeats ? 'Editing beats — click the music lane to add/remove' : 'Edit beat markers'}
        </button>
      </div>
      <div className="tl-body" ref={bodyRef} onPointerDown={onBodyDown} onPointerMove={onBodyMove} onPointerUp={() => setScrubbing(false)} onPointerCancel={() => setScrubbing(false)}>
        <div className="tl-ruler">
          {ticks.map((s) => (
            <span key={s} className={`tick${s % 5 === 0 ? ' major' : ''}`} style={{ left: pct(s) }}>
              {s % 5 === 0 && <em>{s}s</em>}
            </span>
          ))}
        </div>
        <div className="tl-lane tl-scenes">
          {tl.scenes.map((s, i) => (
            <div
              key={s.id}
              className="tl-scene"
              style={{ left: pct(s.startFrame / fps), width: pct(s.durationFrames / fps), '--c': SCENE_COLORS[i % SCENE_COLORS.length] } as React.CSSProperties}
              title={`${SCENE_META[s.id].label} — ${(s.durationFrames / fps).toFixed(1)}s`}
            >
              <span className="tl-scene-name">
                <b>{i + 1}</b> {SCENE_META[s.id].short}
              </span>
              <span className="tl-scene-dur">{(s.durationFrames / fps).toFixed(1)}s</span>
              <span
                className="tl-handle"
                role="slider"
                aria-label={`${SCENE_META[s.id].short} duration`}
                aria-valuenow={Math.round((s.durationFrames / fps) * 10) / 10}
                aria-valuemin={SCENE_META[s.id].minDuration}
                aria-valuemax={SCENE_META[s.id].maxDuration}
                tabIndex={0}
                onPointerDown={(e) => startResize(e, s.id)}
                onPointerMove={moveResize}
                onPointerUp={() => setResizing(null)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                  e.preventDefault();
                  const delta = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 0.1);
                  update((d) => {
                    const sc = d.scenes.find((x) => x.id === s.id);
                    if (sc) sc.durationSeconds = Math.round(clampDuration(s.id, sc.durationSeconds + delta) * 10) / 10;
                  }, { coalesce: `resize-${s.id}` });
                }}
              />
            </div>
          ))}
        </div>
        <div className={`tl-lane tl-audio${editBeats ? ' editing' : ''}`}>
          <canvas ref={canvasRef} className="tl-wave" />
          {!hasMusic && <span className="tl-empty">No music selected</span>}
          {cues.beats.map((b, i) => (
            <span key={i} className={`tl-beat${b.downbeat ? ' down' : ''}`} style={{ left: pct(b.t) }} />
          ))}
          {tl.scenes.flatMap((s) =>
            Object.entries(cues.scenes[s.id] ?? {}).map(([key, f]) => (
              <span key={`${s.id}-${key}`} className="tl-cue" style={{ left: pct(f / fps) }} title={`${SCENE_META[s.id].short}: ${key} at ${(f / fps).toFixed(2)}s`} />
            )),
          )}
          {cues.confetti.map((c, i) => (
            <span key={i} className="tl-burst" style={{ left: pct(c.frame / fps) }} title={`Confetti at ${(c.frame / fps).toFixed(2)}s`}>
              ✦
            </span>
          ))}
        </div>
        <div className="tl-playhead" style={{ left: pct(frame / fps) }} aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
};
