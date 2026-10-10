import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { BalloonCluster, balloonPalette, type ClusterItem } from '../components/Balloon';
import { Backdrop } from '../components/Backdrop';
import { Cake } from '../components/Cake';
import { CloudBank } from '../components/Cloud';
import { Bunting } from '../components/Decor';
import { RevealText } from '../components/RevealText';
import { SparkleField } from '../components/Sparkles';
import { useConfig, useCues, useScene, useTheme } from '../theme';
import { beatPulse, clamp01, springIn, useAbsFrame } from '../util/anim';

export const CelebrationScene: React.FC = () => {
  const config = useConfig();
  const theme = useTheme();
  const cuesAll = useCues();
  const cues = cuesAll.scenes.celebration ?? {};
  const scene = useScene();
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const t = frame / fps;
  const cake = springIn(frame, cues.cake, fps, 13, 90, 1);
  const down = beatPulse(cuesAll.beats, t, 0.16, true) * theme.intensity;
  const sway = Math.sin(t * 1.1) * 1.4 * theme.intensity;
  const pal = balloonPalette(theme.c);

  const left: ClusterItem[] = [
    { x: -60, y: 930, w: 180, color: pal[1], z: 1 },
    { x: 40, y: 1060, w: 150, color: pal[3], z: 2 },
    { x: -40, y: 1170, w: 165, color: pal[0], ears: true, z: 3 },
  ];
  const right: ClusterItem[] = [
    { x: 910, y: 910, w: 180, color: pal[0], z: 1 },
    { x: 880, y: 1060, w: 150, color: pal[2], z: 2 },
    { x: 905, y: 1160, w: 165, color: pal[1], ears: true, z: 3 },
  ];

  return (
    <AbsoluteFill>
      <Backdrop variant="celebration" />
      <SparkleField count={22} seed="ce" area={{ x: 120, y: 950, w: 840, h: 700 }} gold={0.6} start={cues.cake} />
      <BalloonCluster items={left} start={scene.startFrame + Math.round(0.3 * fps)} seed="cel" />
      <BalloonCluster items={right} start={scene.startFrame + Math.round(0.45 * fps)} seed="cer" />
      <Bunting start={scene.startFrame + Math.round(0.05 * fps)} y={110} sag={60} />

      <div style={{ position: 'absolute', top: 360, left: 0, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <RevealText text={config.text.celebrationHeadline} role="display" start={cues.headline} maxWidth={900} maxSize={108} maxLines={3} highlightScale={1.4} lineHeight={1.14} />
        <RevealText text={config.text.celebrationSubline} role="script" start={cues.subline} maxWidth={880} maxSize={72} maxLines={2} lineHeight={1.15} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: (W - 680) / 2,
          top: 1000,
          opacity: clamp01(cake * 2),
          transform: `translateY(${(1 - cake) * 720}px) rotate(${sway}deg) scale(${(0.86 + 0.14 * cake) * (1 + 0.012 * down)}, ${(0.86 + 0.14 * cake) * (1 - 0.018 * down)})`,
          transformOrigin: '50% 92%',
        }}
      >
        <Cake width={680} />
      </div>
      {theme.deco.clouds && <CloudBank y={1730} />}
    </AbsoluteFill>
  );
};
