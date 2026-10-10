import React, { useMemo } from 'react';
import { DEFAULT_TEXT, type InvitationConfig, type TextKey } from '../../shared/config';
import { formatLongDate, formatTime12h, resolveTimeLabel } from '../../shared/format';
import { validateConfig } from '../../shared/validate';
import { useStore } from '../store';
import { Button, Field, Section, TextArea, TextInput } from '../ui';

type StringKey = { [K in keyof InvitationConfig]: InvitationConfig[K] extends string ? K : never }[keyof InvitationConfig];

const MESSAGE_GROUPS: { scene: string; fields: { key: TextKey; label: string; rows?: number }[] }[] = [
  { scene: 'Scene 1 · Opening', fields: [{ key: 'openingKicker', label: 'Opening line' }, { key: 'openingHeadline', label: 'Opening headline' }] },
  { scene: 'Scene 2 · Name reveal', fields: [{ key: 'nameTagline', label: 'Tagline under the name' }] },
  { scene: 'Scene 3 · Celebration', fields: [{ key: 'celebrationHeadline', label: 'Headline', rows: 2 }, { key: 'celebrationSubline', label: 'Sub line' }] },
  { scene: 'Scene 4 · Invitation card', fields: [{ key: 'inviteHeader', label: 'Ribbon header' }, { key: 'inviteMessage', label: 'Invitation message', rows: 3 }] },
  {
    scene: 'Scene 5 · Closing',
    fields: [
      { key: 'closingHeadline', label: 'Closing headline', rows: 2 },
      { key: 'closingMessage', label: 'Closing message', rows: 2 },
      { key: 'signoffPrefix', label: 'Sign-off before parents’ names' },
    ],
  },
];

export const DetailsPanel: React.FC = () => {
  const { config, update } = useStore();
  const issues = useMemo(() => validateConfig(config), [config]);
  const issue = (field: string) => issues.find((i) => i.field === field);
  const set = (key: StringKey) => (v: string) =>
    update((d) => {
      (d[key] as string) = v;
    }, { coalesce: key });
  const setText = (key: TextKey) => (v: string) =>
    update((d) => {
      d.text[key] = v;
    }, { coalesce: `text.${key}` });
  const autoLabel = `${formatTime12h(config.eventTime)} onwards`;

  return (
    <>
      <Section title="Birthday details" description="Used in every scene. Optional fields only appear in the video once you fill them in.">
        <Field label="Birthday child’s name" issue={issue('childName')}>
          {(id) => <TextInput id={id} value={config.childName} onChange={set('childName')} autoComplete="off" />}
        </Field>
        <Field label="Occasion" issue={issue('occasion')}>
          {(id) => <TextInput id={id} value={config.occasion} onChange={set('occasion')} />}
        </Field>
        <div className="grid-2">
          <Field label="Date" issue={issue('eventDate')} hint={formatLongDate(config.eventDate)}>
            {(id) => <TextInput id={id} type="date" value={config.eventDate} onChange={set('eventDate')} />}
          </Field>
          <Field label="Start time" issue={issue('eventTime')} hint={formatTime12h(config.eventTime)}>
            {(id) => (
              <TextInput
                id={id}
                type="time"
                value={config.eventTime}
                onChange={(v) =>
                  update((d) => {
                    // Keep an auto-style label in sync with the time unless it was customized.
                    const oldAuto = `${formatTime12h(d.eventTime)} onwards`;
                    if (!d.timeLabel.trim() || d.timeLabel === oldAuto) d.timeLabel = `${formatTime12h(v)} onwards`;
                    d.eventTime = v;
                  }, { coalesce: 'eventTime' })
                }
              />
            )}
          </Field>
        </div>
        <Field label="Time label" hint={<>Shown as “{resolveTimeLabel(config)}”. Leave empty for “{autoLabel}”.</>}>
          {(id) => <TextInput id={id} value={config.timeLabel} placeholder={autoLabel} onChange={set('timeLabel')} />}
        </Field>
        <div className="grid-2">
          <Field label="Venue name" issue={issue('venueName')}>
            {(id) => <TextInput id={id} value={config.venueName} onChange={set('venueName')} />}
          </Field>
          <Field label="City">{(id) => <TextInput id={id} value={config.city} onChange={set('city')} />}</Field>
        </div>
        <Field label="Full venue address" optional issue={issue('venueAddress')} hint="Shown under the venue on the invitation card.">
          {(id) => <TextArea id={id} value={config.venueAddress} placeholder="To be added later" onChange={set('venueAddress')} rows={2} />}
        </Field>
        <Field label="Parents’ names" optional hint="Shown as a sign-off on the card and at the end.">
          {(id) => <TextInput id={id} value={config.parentsNames} placeholder="To be added later" onChange={set('parentsNames')} />}
        </Field>
        <Field label="RSVP / contact details" optional issue={issue('rsvpContact')} hint="Adds an RSVP row to the invitation card.">
          {(id) => <TextInput id={id} value={config.rsvpContact} placeholder="To be added later" onChange={set('rsvpContact')} />}
        </Field>
      </Section>

      <Section
        title="Messages"
        description={
          <>
            Wrap words in <code>*stars*</code> to make them gold and 3D. Press Enter for a new line. Clear a field to hide it.
          </>
        }
        actions={
          <Button size="sm" variant="ghost" icon="reset" onClick={() => update((d) => void (d.text = { ...DEFAULT_TEXT }))}>
            Reset wording
          </Button>
        }
      >
        {MESSAGE_GROUPS.map((g) => (
          <fieldset key={g.scene} className="group">
            <legend>{g.scene}</legend>
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label} issue={issue(`text.${f.key}`)}>
                {(id) => <TextArea id={id} value={config.text[f.key]} onChange={setText(f.key)} rows={f.rows ?? 1} />}
              </Field>
            ))}
          </fieldset>
        ))}
      </Section>
    </>
  );
};
