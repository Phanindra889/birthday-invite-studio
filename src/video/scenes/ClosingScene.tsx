import React from 'react';
import { AbsoluteFill, random, useVideoConfig } from 'remotion';
import { Balloon, BalloonCluster, EarBalloon, balloonPalette } from '../components/Balloon';
import { Backdrop } from '../components/Backdrop';
import { CloudBank } from '../components/Cloud';
import { NumberOne } from '../components/NumberOne';
import { RevealText } from '../components/RevealText';
import { SparkleField } from '../components/Sparkles';
import { useConfig, useCues, useScene, useTheme } from '../theme';
import { beatPulse, clamp01, springIn, useAbsFrame } from '../util/anim';

/** Balloons released from the bottom that drift up past the top edge. */
const BalloonRelease: React.FC<{ start: number }> = ({ start }) => {
  const theme = useTheme();
  const frame = useAbsFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  if (!theme.deco.balloons || frame < start) return null;
  const pal = balloonPalette(theme.c);
  const t = (frame - start) / fps;
  const n = Math.round(14 * Math.min(1.4, Math.max(0.6, theme.intensity)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const r = (k: string) => random(`rel-${i}-${k}`);
        const delay = r('d') * 1.4;
        const tt = t - delay;
        if (tt < 0) return null;
        const speed = 380 + r('v') * 260;
        const y = H + 80 - tt * speed - 0.5 * 40 * tt * tt;
        const x = r('x') * (W - 160) + Math.sin(tt * 1.4 + i) * 40;
        const w = 120 + r('w') * 90;
        if (y < -500) return null;
        const Comp = r('e') < 0.25 ? EarBalloon : Balloon;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, transform: `rotate(${Math.sin(tt * 1.2 + i) * 6}deg)` }}>
            <Comp color={pal[i % pal.length]} width={w} sway={Math.sin(tt * 2 + i) * 10} />
          </div>
        );
      })}
    </>
  );
};

export const ClosingScene: React.FC = () => {
  const config = useConfig();
  const theme = useTheme();
  const cuesAll = useCues();
  const cues = cuesAll.scenes.closing ?? {};
  const scene = useScene();
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const t = frame / fps;
  const one = springIn(frame, cues.one, fps, 8, 130, 0.9);
  const finale = springIn(frame, cues.finale, fps, 8, 120);
  const pulse = beatPulse(cuesAll.beats, t, 0.25, true) * theme.intensity;
  const pal = balloonPalette(theme.c);
  const parents = config.parentsNames.trim();

  return (
    <AbsoluteFill>
      <Backdrop variant="closing" />
      <SparkleField count={20} seed="cl" area={{ x: 40, y: 140, w: 1000, h: 1500 }} />
      <BalloonCluster
        items={[
          { x: -60, y: 1300, w: 180, color: pal[1], z: 1 },
          { x: 40, y: 1440, w: 160, color: pal[3], ears: true, z: 2 },
          { x: 900, y: 1290, w: 180, color: pal[0], ears: true, z: 1 },
          { x: 820, y: 1440, w: 160, color: pal[2], z: 2 },
        ]}
        start={scene.startFrame + Math.round(0.4 * fps)}
        seed="clb"
      />
      <BalloonRelease start={cues.finale} />

      <div style={{ position: 'absolute', top: 200, left: 0, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <RevealText text={config.text.closingHeadline} role="display" start={cues.headline} maxWidth={950} maxSize={104} maxLines={3} highlightScale={1.3} lineHeight={1.12} />
        <RevealText text={config.text.closingMessage} role="body" start={cues.message} maxWidth={900} maxSize={58} maxLines={3} lineHeight={1.28} weight={800} anim="rise" />
      </div>

      <div style={{ position: 'absolute', top: 800, left: 0, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            height: 560,
            opacity: clamp01(one * 3),
            transform: `translateY(${Math.sin(t * 1.5) * 10}px) scale(${one * (1 + 0.05 * pulse + 0.06 * Math.sin(Math.min(1, finale) * Math.PI))}) rotate(${(1 - one) * -14}deg)`,
            transformOrigin: '50% 60%',
          }}
        >
          <NumberOne height={540} />
        </div>
        <RevealText text={config.childName} role="display" start={cues.name} split="letter" maxWidth={960} maxSize={112} minSize={72} maxLines={2} lineHeight={1.04} style={{ marginTop: 6 }} />
        {parents && (
          <RevealText text={`${config.text.signoffPrefix} ${parents}`} role="script" start={cues.name + Math.round(1.1 * fps)} maxWidth={900} maxSize={60} maxLines={2} anim="fade" style={{ marginTop: 8 }} />
        )}
      </div>
      {theme.deco.clouds && <CloudBank y={1740} />}
    </AbsoluteFill>
  );
};
