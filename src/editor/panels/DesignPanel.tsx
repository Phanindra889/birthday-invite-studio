import React, { useRef, useState } from 'react';
import type { BodyFontId, DecorationId, DisplayFontId, ScriptFontId, TextAnimationId, ThemeColors } from '../../shared/config';
import { BACKGROUNDS, BODY_FONTS, DISPLAY_FONTS, SCRIPT_FONTS, THEME_PRESETS } from '../../shared/themes';
import { PhotoCropper } from '../components/PhotoCropper';
import { Icon } from '../icons';
import { readAsDataUrl } from '../media';
import { useStore } from '../store';
import { Button, Callout, Chip, ColorField, Field, Section, Segmented, Select, Slider } from '../ui';

const COLOR_LABELS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'sky', label: 'Sky blue' },
  { key: 'baby', label: 'Baby blue' },
  { key: 'deep', label: 'Deep blue' },
  { key: 'gold', label: 'Gold accent' },
  { key: 'silver', label: 'Soft silver' },
  { key: 'white', label: 'White' },
];

const DECORATIONS: { id: DecorationId; label: string }[] = [
  { id: 'ears', label: 'Mickey-style ears' },
  { id: 'balloons', label: 'Balloons' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'confetti', label: 'Confetti' },
  { id: 'lightRays', label: 'Light rays' },
  { id: 'bokeh', label: 'Floating lights' },
  { id: 'bunting', label: 'Bunting' },
];

const BG_PREVIEW: Record<string, string> = {
  sky: 'linear-gradient(180deg,#F1F9FE,#C7E8FA 45%,#87CEEB)',
  dreamy: 'linear-gradient(180deg,#FFFFFF,#E7F4FD 50%,#D5E6F3)',
  polka: 'radial-gradient(circle at 25% 25%,rgba(255,255,255,.8) 0 5px,transparent 6px) 0 0/22px 22px, radial-gradient(circle at 75% 75%,rgba(255,255,255,.8) 0 5px,transparent 6px) 0 0/22px 22px, linear-gradient(180deg,#DCEFFB,#A9DCF2)',
  twilight: 'radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px) 0 0/18px 18px, linear-gradient(180deg,#0E2746,#1E4F86 70%,#3F86C4)',
};

export const DesignPanel: React.FC = () => {
  const { config, update } = useStore();
  const d = config.design;
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith('image/')) return setPhotoError('Please choose an image file (JPG, PNG or HEIC exported as JPG).');
    if (file.size > 25e6) return setPhotoError('That image is larger than 25 MB. Please choose a smaller one.');
    setCropSrc(await readAsDataUrl(file));
  };

  return (
    <>
      <Section title="Theme" description="Sky-blue presets tuned for contrast. Fine-tune any color below.">
        <div className="preset-grid">
          {THEME_PRESETS.map((p) => {
            const active = config.theme === p.id && COLOR_LABELS.every(({ key }) => d.colors[key].toUpperCase() === p.colors[key].toUpperCase());
            return (
              <button
                key={p.id}
                type="button"
                className={`preset${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() =>
                  update((x) => {
                    x.theme = p.id;
                    x.design.colors = { ...p.colors };
                  })
                }
              >
                <span className="preset-swatches">
                  {(['baby', 'sky', 'deep', 'gold', 'silver'] as const).map((k) => (
                    <i key={k} style={{ background: p.colors[k] }} />
                  ))}
                </span>
                <span className="preset-name">{p.name}</span>
              </button>
            );
          })}
        </div>
        <div className="color-grid">
          {COLOR_LABELS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              value={d.colors[key]}
              onChange={(v) =>
                update((x) => {
                  x.design.colors[key] = v;
                }, { coalesce: `color-${key}` })
              }
            />
          ))}
        </div>
      </Section>

      <Section title="Background">
        <div className="bg-grid" role="radiogroup" aria-label="Background style">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={d.background === b.id}
              className={`bg-card${d.background === b.id ? ' active' : ''}`}
              onClick={() =>
                update((x) => {
                  x.design.background = b.id;
                })
              }
            >
              <span className="bg-thumb" style={{ background: BG_PREVIEW[b.id] }} />
              <span className="bg-name">{b.label}</span>
              <span className="bg-desc">{b.description}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <Field label="Headline font">
          {(id) => (
            <div className="font-row">
              <Select id={id} value={d.fonts.display} options={DISPLAY_FONTS.map((f) => ({ value: f.id, label: f.label }))} onChange={(v: DisplayFontId) => update((x) => void (x.design.fonts.display = v))} />
              <span className="font-sample" style={{ fontFamily: `"${DISPLAY_FONTS.find((f) => f.id === d.fonts.display)?.family}"`, fontWeight: 700 }}>
                Mounish
              </span>
            </div>
          )}
        </Field>
        <Field label="Script accent font">
          {(id) => (
            <div className="font-row">
              <Select id={id} value={d.fonts.script} options={SCRIPT_FONTS.map((f) => ({ value: f.id, label: f.label }))} onChange={(v: ScriptFontId) => update((x) => void (x.design.fonts.script = v))} />
              <span className="font-sample" style={{ fontFamily: `"${SCRIPT_FONTS.find((f) => f.id === d.fonts.script)?.family}"` }}>
                Little Star
              </span>
            </div>
          )}
        </Field>
        <Field label="Body font">
          {(id) => (
            <div className="font-row">
              <Select id={id} value={d.fonts.body} options={BODY_FONTS.map((f) => ({ value: f.id, label: f.label }))} onChange={(v: BodyFontId) => update((x) => void (x.design.fonts.body = v))} />
              <span className="font-sample" style={{ fontFamily: `"${BODY_FONTS.find((f) => f.id === d.fonts.body)?.family}"`, fontWeight: 800 }}>
                7:00 PM
              </span>
            </div>
          )}
        </Field>
        <Field label="Text size" hint="Text always shrinks to fit, so it never overflows the frame.">
          {(id) => <Slider id={id} value={d.textScale} min={0.85} max={1.15} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((x) => void (x.design.textScale = v), { coalesce: 'textScale' })} />}
        </Field>
        <div className="grid-2">
          <Field label="Alignment">
            {() => (
              <Segmented
                ariaLabel="Text alignment"
                value={d.textAlign}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'left', label: 'Left' },
                ]}
                onChange={(v) => update((x) => void (x.design.textAlign = v))}
              />
            )}
          </Field>
          <Field label="Text animation">
            {() => (
              <Select<TextAnimationId>
                ariaLabel="Text animation"
                value={d.textAnimation}
                options={[
                  { value: 'pop', label: 'Pop' },
                  { value: 'rise', label: 'Rise' },
                  { value: 'bounce', label: 'Bounce' },
                  { value: 'fade', label: 'Fade' },
                ]}
                onChange={(v) => update((x) => void (x.design.textAnimation = v))}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Motion & decorations">
        <Field label="Animation intensity" hint="Scales motion, beat pulses and particle counts.">
          {(id) => (
            <Slider
              id={id}
              value={d.intensity}
              min={0.5}
              max={1.5}
              step={0.05}
              format={(v) => (v < 0.8 ? 'Subtle' : v > 1.2 ? 'Lively' : 'Balanced')}
              onChange={(v) => update((x) => void (x.design.intensity = v), { coalesce: 'intensity' })}
            />
          )}
        </Field>
        <div className="chip-grid">
          {DECORATIONS.map((x) => (
            <Chip key={x.id} active={d.decorations[x.id]} icon={d.decorations[x.id] ? 'check' : 'plus'} onClick={() => update((c) => void (c.design.decorations[x.id] = !c.design.decorations[x.id]))}>
              {x.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Baby photo" description="Optional. Without a photo, the name reveal shows the big golden number 1.">
        <div className="photo-row">
          <div className={`photo-thumb ${d.photoFrame}`}>{config.photoUrl ? <img src={config.photoUrl} alt="Cropped baby photo" /> : <Icon name="image" size={28} />}</div>
          <div className="photo-actions">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <Button icon="upload" onClick={() => fileRef.current?.click()}>
              {config.photoUrl ? 'Replace photo' : 'Upload photo'}
            </Button>
            {config.photoUrl && (
              <>
                <Button icon="crop" variant="ghost" onClick={() => setCropSrc(config.photoUrl)}>
                  Re-crop
                </Button>
                <Button icon="trash" variant="ghost" onClick={() => update((x) => void (x.photoUrl = ''))}>
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
        {photoError && <Callout tone="error">{photoError}</Callout>}
        <Field label="Frame shape">
          {() => (
            <Segmented
              ariaLabel="Photo frame shape"
              value={d.photoFrame}
              options={[
                { value: 'ears', label: 'Mickey-style ears' },
                { value: 'circle', label: 'Circle' },
              ]}
              onChange={(v) => update((x) => void (x.design.photoFrame = v))}
            />
          )}
        </Field>
      </Section>

      {cropSrc && (
        <PhotoCropper
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onDone={(url) => {
            update((x) => void (x.photoUrl = url));
            setCropSrc(null);
          }}
        />
      )}
    </>
  );
};
