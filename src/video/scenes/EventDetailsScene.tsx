import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { alpha, darken, mix } from '../../shared/color';
import { eventRows } from '../../shared/cues';
import { formatLongDate, resolveTimeLabel, venueLine } from '../../shared/format';
import { parseMarkup } from '../../shared/markup';
import { BalloonCluster, balloonPalette } from '../components/Balloon';
import { Backdrop } from '../components/Backdrop';
import { IconBadge, Ribbon } from '../components/Decor';
import { RevealText } from '../components/RevealText';
import { SparkleField } from '../components/Sparkles';
import { useConfig, useCues, useFontsReady, useScene, useTheme } from '../theme';
import { clamp01, entrance, springIn, useAbsFrame } from '../util/anim';
import { fitSingleLine, layoutText } from '../util/measure';

const CARD = { x: 64, top: 440, w: 952, h: 1230 };
const PAD = 64;

export const EventDetailsScene: React.FC = () => {
  const config = useConfig();
  const theme = useTheme();
  const cues = useCues().scenes['event-details'] ?? {};
  const scene = useScene();
  const fontsReady = useFontsReady();
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const { c } = theme;
  const body = theme.fonts.body;
  const display = theme.fonts.display;
  const inner = CARD.w - PAD * 2;
  const rowTextW = inner - 128;
  const rows = eventRows(config);
  const pal = balloonPalette(c);

  const values: Record<string, { label: string; value: string; sub?: string; icon: string }> = {
    date: { label: 'Date', value: formatLongDate(config.eventDate), icon: 'date' },
    time: { label: 'Time', value: resolveTimeLabel(config), icon: 'time' },
    venue: { label: 'Venue', value: venueLine(config) || 'Venue to be announced', sub: config.venueAddress.trim() || undefined, icon: 'venue' },
    rsvp: { label: 'RSVP', value: config.rsvpContact.trim(), icon: 'rsvp' },
  };

  // Estimate the content height and scale everything down if optional fields make it too tall.
  const layout = useMemo(() => {
    const title = layoutText(parseMarkup(config.childName), { family: display.family, weight: display.weight, maxWidth: inner, maxLines: 1, maxSize: 100, minSize: 78, fontsReady });
    const titleLines = title.lines.length === 1 && title.fontSize >= 78 ? 1 : 2;
    const msg = config.text.inviteMessage.trim()
      ? layoutText(parseMarkup(config.text.inviteMessage), { family: body.family, weight: 700, maxWidth: inner, maxLines: 3, maxSize: 40, minSize: 32, fontsReady })
      : null;
    const sub = values.venue.sub
      ? layoutText(parseMarkup(values.venue.sub), { family: body.family, weight: 700, maxWidth: rowTextW, maxLines: 3, maxSize: 36, minSize: 28, fontsReady })
      : null;
    const estimate =
      (titleLines === 1 ? 108 : 210) + 84 + 56 + (msg ? msg.lines.length * msg.fontSize * 1.32 + 24 : 0) + rows.length * 128 + (rows.length - 1) * 22 + (sub ? sub.lines.length * sub.fontSize * 1.28 : 0) + (config.parentsNames.trim() ? 84 : 0) + 4 * 26;
    const k = (CARD.h - PAD * 2) / estimate;
    return { titleLines, k: Math.min(1.12, Math.max(0.72, k)) };
  }, [config.childName, config.text.inviteMessage, config.parentsNames, values.venue.sub, rows.length, display, body, inner, rowTextW, fontsReady]);
  const k = layout.k;

  const card = springIn(frame, cues.card, fps, 14, 110);
  // Two ears peeking over the card's top corners (card-local coordinates).
  const ears = [CARD.w * 0.2, CARD.w * 0.8].map((cx) => ({ cx, cy: 30, r: 138 }));
  const earSlide = springIn(frame, cues.card + Math.round(0.25 * fps), fps, 12, 100);
  const align = theme.align;

  return (
    <AbsoluteFill>
      <Backdrop variant="event-details" />
      <SparkleField count={10} seed="ed" area={{ x: 30, y: 120, w: 1020, h: 300 }} />
      <BalloonCluster
        items={[
          { x: -70, y: 1520, w: 170, color: pal[0], ears: true, z: 1 },
          { x: 900, y: 1500, w: 170, color: pal[1], z: 1 },
        ]}
        start={scene.startFrame + Math.round(0.6 * fps)}
        seed="edb"
      />
      <div style={{ position: 'absolute', top: 168, left: 0, width: W, display: 'flex', justifyContent: 'center' }}>
        <Ribbon text={config.text.inviteHeader} start={cues.header} size={74} maxWidth={900} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.top,
          width: CARD.w,
          height: CARD.h,
          opacity: clamp01(card * 2),
          transform: `translateY(${(1 - card) * 160}px) scale(${0.94 + 0.06 * card})`,
        }}
      >
        {theme.deco.ears &&
          ears.map((e, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: e.cx - e.r,
                top: e.cy - e.r + (1 - earSlide) * 150,
                width: e.r * 2,
                height: e.r * 2,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, ${mix(c.deep, '#FFFFFF', 0.3)} 0%, ${c.deep} 55%, ${darken(c.deep, 0.3)} 100%)`,
                boxShadow: `0 0 0 8px #FFFFFF, 0 20px 40px ${alpha(c.deep, 0.3)}`,
              }}
            />
          ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 64,
            background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${alpha(mix('#FFFFFF', c.baby, 0.25), 0.97)} 100%)`,
            boxShadow: `0 0 0 7px ${c.gold}, 0 0 0 16px ${alpha('#FFFFFF', 0.85)}, 0 50px 90px ${alpha(darken(c.deep, 0.3), 0.32)}`,
          }}
        />
        <div style={{ position: 'absolute', inset: 22, borderRadius: 48, border: `3px dashed ${alpha(c.sky, 0.85)}` }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: `${PAD * 0.9}px ${PAD}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: align === 'left' ? 'flex-start' : 'center',
            justifyContent: 'center',
            gap: 26 * k,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center' }}>
            <RevealText text={config.childName} role="display" surface="card" start={cues.title} maxWidth={inner} maxSize={Math.round(100 * k)} minSize={layout.titleLines === 1 ? Math.round(78 * k) : 60} maxLines={layout.titleLines} lineHeight={1.02} color={c.deep} />
            <RevealText text={config.occasion} role="script" surface="card" start={cues.title + Math.round(0.3 * fps)} maxWidth={inner} maxSize={Math.round(66 * k)} maxLines={1} lineHeight={1.25} color={theme.goldDeep} />
          </div>
          <Divider progress={springIn(frame, cues.title, fps, 16, 90)} width={inner * 0.7} />
          {config.text.inviteMessage.trim() && (
            <RevealText text={config.text.inviteMessage} role="body" surface="card" start={cues.title + Math.round(0.5 * fps)} maxWidth={inner} maxSize={Math.round(40 * k)} minSize={30} maxLines={3} lineHeight={1.32} color={mix(c.deep, '#1D2B44', 0.45)} weight={700} anim="fade" stagger={2} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * k, alignSelf: 'stretch' }}>
            {rows.map((row, i) => {
              const v = values[row];
              const e = entrance(frame, cues[`row${i}`], fps, 'rise', theme.intensity);
              const icon = springIn(frame, cues[`row${i}`], fps, 9, 170, 0.7);
              const size = fitSingleLine(v.value, body.family, 800, rowTextW, Math.round(54 * k), 34, fontsReady);
              const wraps = size <= 34 && v.value.length > 28;
              return (
                <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 26, opacity: e.opacity, transform: `translateY(${e.y * 0.6}px)` }}>
                  <div style={{ transform: `scale(${icon})` }}>
                    <IconBadge icon={v.icon} size={Math.round(104 * k)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: rowTextW }}>
                    <div style={{ fontFamily: `"${body.family}", sans-serif`, fontWeight: 800, fontSize: Math.round(28 * k), letterSpacing: '0.16em', textTransform: 'uppercase', color: mix(c.deep, c.sky, 0.45) }}>{v.label}</div>
                    <div style={{ fontFamily: `"${body.family}", sans-serif`, fontWeight: 800, fontSize: size, lineHeight: 1.12, color: c.deep, whiteSpace: wraps ? 'normal' : 'nowrap' }}>{v.value}</div>
                    {v.sub && (
                      <div style={{ fontFamily: `"${body.family}", sans-serif`, fontWeight: 700, fontSize: Math.round(34 * k), lineHeight: 1.28, color: mix(c.deep, '#1D2B44', 0.4), marginTop: 4 }}>{v.sub}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {config.parentsNames.trim() && (
            <RevealText text={`${config.text.signoffPrefix} ${config.parentsNames.trim()}`} role="script" surface="card" start={cues.footer} maxWidth={inner} maxSize={Math.round(56 * k)} maxLines={2} color={theme.goldDeep} anim="fade" />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Divider: React.FC<{ progress: number; width: number }> = ({ progress, width }) => {
  const t = useTheme();
  const half = (width / 2 - 40) * progress;
  return (
    <svg width={width} height={44} style={{ overflow: 'visible' }}>
      <line x1={width / 2 - 40 - half} y1={22} x2={width / 2 - 40} y2={22} stroke={t.c.gold} strokeWidth={4} strokeLinecap="round" />
      <line x1={width / 2 + 40} y1={22} x2={width / 2 + 40 + half} y2={22} stroke={t.c.gold} strokeWidth={4} strokeLinecap="round" />
      <g transform={`translate(${width / 2} 26) scale(${progress})`} fill={t.c.deep}>
        <circle r={13} />
        <circle cx={-13} cy={-13} r={8} />
        <circle cx={13} cy={-13} r={8} />
      </g>
    </svg>
  );
};
