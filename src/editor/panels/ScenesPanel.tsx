import React, { useMemo, useState } from 'react';
import { DEFAULT_CONFIG, SCENE_META, type TransitionId } from '../../shared/config';
import { effectiveBeatsPerBar, effectiveBpm } from '../../shared/music';
import { clampDuration, computeTimeline } from '../../shared/timeline';
import { TARGET_RANGE } from '../../shared/validate';
import { Icon } from '../icons';
import { usePlayer } from '../player';
import { useStore } from '../store';
import { Button, Callout, Section, Select, Slider, Toggle } from '../ui';

const TRANSITIONS: { value: TransitionId; label: string }[] = [
  { value: 'mix', label: 'Magical mix (recommended)' },
  { value: 'ears', label: 'Ears iris wipe' },
  { value: 'fade', label: 'Soft crossfade' },
  { value: 'slide', label: 'Slide up' },
  { value: 'zoom', label: 'Zoom through' },
];

export const ScenesPanel: React.FC = () => {
  const { config, update } = useStore();
  const { seek } = usePlayer();
  const timeline = useMemo(() => computeTimeline(config), [config]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const total = timeline.durationSeconds;
  const inRange = total >= TARGET_RANGE.min && total <= TARGET_RANGE.max;
  const bpm = config.audio.source === 'none' ? 0 : effectiveBpm(config);
  const bar = bpm > 0 ? (60 / bpm) * effectiveBeatsPerBar(config) : 0;

  const move = (from: number, to: number) =>
    update((d) => {
      const [s] = d.scenes.splice(from, 1);
      d.scenes.splice(Math.max(0, Math.min(d.scenes.length, to)), 0, s);
    });

  return (
    <>
      <Section title="Scene sequence" description="Reorder, hide or retime scenes. Drag a scene’s right edge on the timeline to retime it, too.">
        <div className={`duration-meter${inRange ? '' : ' off'}`}>
          <div>
            <strong>{total.toFixed(1)}s</strong> total
            <span> · target {TARGET_RANGE.min}–{TARGET_RANGE.max}s</span>
          </div>
          <div className="meter" aria-hidden>
            <span className="meter-range" style={{ left: `${(TARGET_RANGE.min / 60) * 100}%`, width: `${((TARGET_RANGE.max - TARGET_RANGE.min) / 60) * 100}%` }} />
            <span className="meter-mark" style={{ left: `${Math.min(100, (total / 60) * 100)}%` }} />
          </div>
        </div>
        <ol className="scene-list">
          {config.scenes.map((s, i) => {
            const meta = SCENE_META[s.id];
            const t = timeline.scenes.find((x) => x.id === s.id);
            return (
              <li
                key={s.id}
                className={`scene-card${s.enabled ? '' : ' disabled'}${overIndex === i && dragIndex !== null && dragIndex !== i ? ' drop' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                <div className="scene-top">
                  <span className="grip" title="Drag to reorder" aria-hidden>
                    <Icon name="grip" size={16} />
                  </span>
                  <span className="scene-index">{t ? t.index + 1 : '–'}</span>
                  <div className="scene-title">
                    <strong>{meta.label}</strong>
                    <span>{meta.description}</span>
                  </div>
                  <div className="scene-order">
                    <button type="button" className="mini-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${meta.short} up`}>
                      <Icon name="up" size={15} />
                    </button>
                    <button type="button" className="mini-btn" onClick={() => move(i, i + 1)} disabled={i === config.scenes.length - 1} aria-label={`Move ${meta.short} down`}>
                      <Icon name="down" size={15} />
                    </button>
                  </div>
                </div>
                <div className="scene-controls">
                  <Toggle
                    checked={s.enabled}
                    onChange={(v) =>
                      update((d) => {
                        const sc = d.scenes.find((x) => x.id === s.id)!;
                        sc.enabled = v;
                      })
                    }
                    label={s.enabled ? 'Shown' : 'Hidden'}
                  />
                  <div className="scene-duration">
                    <Slider
                      value={s.durationSeconds}
                      min={meta.minDuration}
                      max={meta.maxDuration}
                      step={0.5}
                      ariaLabel={`${meta.short} duration in seconds`}
                      format={(v) => `${v.toFixed(1)}s`}
                      onChange={(v) =>
                        update((d) => {
                          d.scenes.find((x) => x.id === s.id)!.durationSeconds = v;
                        }, { coalesce: `dur-${s.id}` })
                      }
                    />
                  </div>
                  <button type="button" className="mini-btn" disabled={!t} onClick={() => t && seek(t.startFrame)} aria-label={`Preview ${meta.short}`} title="Jump to this scene">
                    <Icon name="play" size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="row-actions">
          <Button
            icon="music"
            size="sm"
            disabled={!bar}
            title={bar ? `Round each scene to whole bars (${bar.toFixed(2)}s)` : 'Choose music with a tempo first'}
            onClick={() =>
              update((d) => {
                for (const s of d.scenes) {
                  const bars = Math.max(1, Math.round(s.durationSeconds / bar));
                  let len = bars * bar;
                  const meta = SCENE_META[s.id];
                  while (len > meta.maxDuration) len -= bar;
                  while (len < meta.minDuration) len += bar;
                  s.durationSeconds = Math.round(clampDuration(s.id, len) * 1000) / 1000;
                }
              })
            }
          >
            Fit to music bars
          </Button>
          <Button icon="reset" size="sm" variant="ghost" onClick={() => update((d) => void (d.scenes = DEFAULT_CONFIG.scenes.map((s) => ({ ...s }))))}>
            Reset order & timing
          </Button>
        </div>
        {!config.scenes.some((s) => s.enabled) && <Callout tone="error">Enable at least one scene to preview and export.</Callout>}
      </Section>

      <Section title="Transitions" description="How each scene enters. “Magical mix” alternates an ears iris, zoom, slide and fade.">
        <Select
          ariaLabel="Transition style"
          value={config.design.transition}
          options={TRANSITIONS}
          onChange={(v) =>
            update((d) => {
              d.design.transition = v;
            })
          }
        />
      </Section>
    </>
  );
};
