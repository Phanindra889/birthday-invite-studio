import React, { useEffect, useRef, useState } from 'react';
import { tapTempo } from '../../audio/beatDetection';
import type { BeatSource, MusicSource } from '../../shared/config';
import { BUILTIN_TRACKS, beatGrid, effectiveBeatsPerBar, effectiveBpm, getBuiltinTrack, musicBeats } from '../../shared/music';
import { Icon } from '../icons';
import { usePlayer } from '../player';
import { useStore } from '../store';
import { Button, Callout, Chip, Field, Section, Segmented, Slider, Toggle } from '../ui';

const SOURCE_LABEL: Record<BeatSource, string> = {
  track: 'Exact beat grid of the built-in track',
  detected: 'Detected automatically from the audio',
  grid: 'Generated from tempo',
  manual: 'Edited by hand',
};

export const MusicPanel: React.FC = () => {
  const { config, update, media, uploadMusic, redetectBeats } = useStore();
  const { player, editBeats, setEditBeats } = usePlayer();
  const a = config.audio;
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const bpm = effectiveBpm(config);
  const bpb = effectiveBeatsPerBar(config);
  const [gridBpm, setGridBpm] = useState(String(bpm));
  const [gridOffset, setGridOffset] = useState('0');
  const beats = musicBeats(a);
  const track = getBuiltinTrack(a.source);
  const trackLen = track?.duration ?? a.trackDuration;
  const hasUpload = !!media.musicFile;

  useEffect(() => setGridBpm(String(bpm)), [bpm]);
  useEffect(() => () => audioRef.current?.pause(), []);

  const preview = (id: string, url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const el = audioRef.current;
    if (previewing === id) {
      el.pause();
      setPreviewing(null);
      return;
    }
    player?.pause();
    el.src = url;
    el.volume = a.volume;
    el.currentTime = 0;
    el.onended = () => setPreviewing(null);
    el.play().then(() => setPreviewing(id)).catch(() => setPreviewing(null));
  };

  const select = (source: MusicSource) => {
    audioRef.current?.pause();
    setPreviewing(null);
    if (source === 'upload') {
      if (media.musicFile) uploadMusic(media.musicFile);
      else fileRef.current?.click();
      return;
    }
    const t = getBuiltinTrack(source);
    update((d) => {
      d.audio.source = source;
      d.audio.startOffset = 0;
      d.audio.loop = false;
      if (t) {
        d.audio.beatSource = 'track';
        d.audio.bpm = t.bpm;
        d.audio.beatsPerBar = t.beatsPerBar;
        d.audio.downbeatOffset = 0;
        d.audio.trackDuration = t.duration;
        d.audio.beats = [];
      }
    });
  };

  /** Switches away from the built-in exact grid so edits apply to an explicit marker list. */
  const applyGrid = (newBpm: number, offset: number, perBar = bpb) =>
    update((d) => {
      d.audio.bpm = newBpm;
      d.audio.beatsPerBar = perBar;
      d.audio.beats = beatGrid(newBpm, offset, trackLen || 45);
      d.audio.beatSource = 'grid';
      d.audio.downbeatOffset = 0;
    }, { coalesce: 'grid' });

  const onTap = () => {
    const now = performance.now() / 1000;
    const next = taps.length && now - taps[taps.length - 1] > 2.5 ? [now] : [...taps, now].slice(-12);
    setTaps(next);
    const tapped = tapTempo(next);
    if (!tapped || next.length < 4) return;
    const period = 60 / tapped;
    // While the preview plays, the last tap also sets the beat phase.
    let offset = beats[0] ?? 0;
    if (player?.isPlaying()) {
      const musicT = player.getCurrentFrame() / config.fps + a.startOffset;
      offset = ((musicT % period) + period) % period;
    }
    applyGrid(tapped, offset);
  };

  const tracks: { id: MusicSource; title: string; mood: string; url?: string }[] = [
    ...BUILTIN_TRACKS.map((t) => ({ id: t.id, title: t.title, mood: t.mood, url: `/${t.file}` })),
    { id: 'upload', title: hasUpload ? a.uploadName || media.musicFile!.name : 'Upload your own track', mood: hasUpload ? `${trackLen ? `${trackLen.toFixed(1)}s · ` : ''}stored in this browser` : 'MP3, WAV, M4A, AAC, OGG or FLAC', url: media.musicUrl || undefined },
    { id: 'none', title: 'No music', mood: 'Silent video (sound effects still play if enabled)' },
  ];

  return (
    <>
      <Section title="Music" description="Both built-in tracks are original synthesized arrangements, free to use and share.">
        <div className="track-list" role="radiogroup" aria-label="Music track">
          {tracks.map((t) => (
            <div key={t.id} className={`track${a.source === t.id ? ' active' : ''}`}>
              <button type="button" role="radio" aria-checked={a.source === t.id} className="track-main" onClick={() => select(t.id)}>
                <span className="track-radio" aria-hidden />
                <span className="track-text">
                  <strong>{t.title}</strong>
                  <span>{t.mood}</span>
                </span>
              </button>
              {t.url && (
                <button type="button" className="mini-btn" onClick={() => preview(t.id, t.url!)} aria-label={previewing === t.id ? `Stop ${t.title}` : `Listen to ${t.title}`} title="Listen">
                  <Icon name={previewing === t.id ? 'pause' : 'play'} size={14} />
                </button>
              )}
              {t.id === 'upload' && hasUpload && (
                <button type="button" className="mini-btn" onClick={() => fileRef.current?.click()} aria-label="Choose another file" title="Choose another file">
                  <Icon name="upload" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMusic(f);
            e.target.value = '';
          }}
        />
        {media.analyzing && <Callout>Analyzing the track and detecting beats…</Callout>}
        {media.error && <Callout tone="error">{media.error}</Callout>}
        {a.source === 'upload' && !hasUpload && !media.analyzing && <Callout tone="warning">The uploaded track isn’t available in this browser. Upload it again to preview and export.</Callout>}
      </Section>

      {a.source !== 'none' && (
        <Section title="Playback">
          <Field label="Music volume">
            {(id) => <Slider id={id} value={a.volume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((d) => void (d.audio.volume = v), { coalesce: 'vol' })} />}
          </Field>
          <div className="grid-2">
            <Field label="Fade in">
              {(id) => <Slider id={id} value={a.fadeIn} min={0} max={3} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => update((d) => void (d.audio.fadeIn = v), { coalesce: 'fadein' })} />}
            </Field>
            <Field label="Fade out">
              {(id) => <Slider id={id} value={a.fadeOut} min={0} max={6} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => update((d) => void (d.audio.fadeOut = v), { coalesce: 'fadeout' })} />}
            </Field>
          </div>
          {a.source === 'upload' && trackLen > 0 && (
            <>
              <Field label="Start the song at" hint="Skip an intro — beat markers shift with it.">
                {(id) => (
                  <Slider id={id} value={a.startOffset} min={0} max={Math.max(0, Math.floor(trackLen - 5))} step={0.1} format={(v) => `${v.toFixed(1)}s`} onChange={(v) => update((d) => void (d.audio.startOffset = v), { coalesce: 'offset' })} />
                )}
              </Field>
              <Toggle checked={a.loop} onChange={(v) => update((d) => void (d.audio.loop = v))} label="Loop if the song is shorter than the video" />
            </>
          )}
        </Section>
      )}

      {a.source !== 'none' && (
        <Section title="Beat sync" description="Text reveals, confetti, balloon bounces and sparkle pulses snap to these markers.">
          <Toggle checked={a.beatSync} onChange={(v) => update((d) => void (d.audio.beatSync = v))} label="Sync animations to the beat" description="Turn off to use fixed timings instead." />
          <div className="beat-status">
            <div>
              <strong>{beats.length}</strong> markers · <strong>{bpm || '–'}</strong> BPM · {bpb} beats per bar
            </div>
            <span>{SOURCE_LABEL[a.beatSource]}</span>
          </div>
          <div className="row-actions">
            <Button size="sm" icon="wand" disabled={!media.insight || media.analyzing} onClick={redetectBeats} title="Run beat detection on the selected track">
              Detect beats
            </Button>
            <Button size="sm" icon="tap" onClick={onTap} title="Tap along with the music (play the preview for phase)">
              Tap tempo{taps.length > 1 ? ` (${taps.length})` : ''}
            </Button>
            <Button size="sm" icon="edit" variant={editBeats ? 'primary' : 'secondary'} aria-pressed={editBeats} onClick={() => setEditBeats(!editBeats)}>
              {editBeats ? 'Done editing' : 'Edit on timeline'}
            </Button>
            {track && a.beatSource !== 'track' && (
              <Button size="sm" icon="reset" variant="ghost" onClick={() => select(a.source)}>
                Restore exact grid
              </Button>
            )}
          </div>
          <div className="grid-3">
            <Field label="Tempo (BPM)">
              {(id) => <input id={id} className="input" type="number" min={40} max={220} step={0.1} value={gridBpm} onChange={(e) => setGridBpm(e.target.value)} />}
            </Field>
            <Field label="First beat (s)">
              {(id) => <input id={id} className="input" type="number" min={0} max={10} step={0.01} value={gridOffset} onChange={(e) => setGridOffset(e.target.value)} />}
            </Field>
            <Field label=" ">
              {() => (
                <Button
                  disabled={!(Number(gridBpm) >= 40 && Number(gridBpm) <= 220)}
                  onClick={() => applyGrid(Number(gridBpm), Math.max(0, Number(gridOffset) || 0))}
                >
                  Apply grid
                </Button>
              )}
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Beats per bar">
              {() => (
                <Segmented
                  size="sm"
                  ariaLabel="Beats per bar"
                  value={bpb}
                  options={[2, 3, 4, 6].map((n) => ({ value: n, label: String(n) }))}
                  onChange={(n) => {
                    if (a.beatSource === 'track') applyGrid(bpm, track?.offset ?? 0, n);
                    else update((d) => void (d.audio.beatsPerBar = n));
                  }}
                />
              )}
            </Field>
            <Field label="Downbeat on marker">
              {() => (
                <Segmented
                  size="sm"
                  ariaLabel="Which marker is the first downbeat"
                  value={a.beatSource === 'track' ? 0 : a.downbeatOffset % bpb}
                  options={Array.from({ length: bpb }, (_, i) => ({ value: i, label: `#${i + 1}`, disabled: a.beatSource === 'track' && i > 0 }))}
                  onChange={(i) => update((d) => void (d.audio.downbeatOffset = i))}
                />
              )}
            </Field>
          </div>
        </Section>
      )}

      <Section title="Sound effects" description="Soft chimes, sparkles and balloon pops placed on the same beat-synced cues.">
        <Toggle checked={a.sfx.enabled} onChange={(v) => update((d) => void (d.audio.sfx.enabled = v))} label="Play sound effects" />
        {a.sfx.enabled && (
          <>
            <Field label="Effects volume">
              {(id) => <Slider id={id} value={a.sfx.volume} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((d) => void (d.audio.sfx.volume = v), { coalesce: 'sfxvol' })} />}
            </Field>
            <div className="chip-grid">
              {(['chimes', 'sparkles', 'pops', 'whooshes'] as const).map((k) => (
                <Chip key={k} active={a.sfx[k]} icon={a.sfx[k] ? 'check' : 'plus'} onClick={() => update((d) => void (d.audio.sfx[k] = !d.audio.sfx[k]))}>
                  {{ chimes: 'Chimes', sparkles: 'Sparkles', pops: 'Balloon pops', whooshes: 'Transition whooshes' }[k]}
                </Chip>
              ))}
            </div>
          </>
        )}
      </Section>
    </>
  );
};
