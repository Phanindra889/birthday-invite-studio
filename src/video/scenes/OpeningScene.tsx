import React from 'react';
import { AbsoluteFill, Easing, interpolate, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Cloud, CloudBank } from '../components/Cloud';
import { EarsEmblem, ShootingStar } from '../components/Decor';
import { RevealText } from '../components/RevealText';
import { Sparkle, SparkleField } from '../components/Sparkles';
import { useConfig, useCues, useScene, useTheme } from '../theme';
import { springIn, useAbsFrame } from '../util/anim';

const CURTAIN = [
  { y: -160, dx: 0, w: 980, shape: 1 },
  { y: 250, dx: -120, w: 1050, shape: 0 },
  { y: 660, dx: 30, w: 1000, shape: 2 },
  { y: 1060, dx: -80, w: 1080, shape: 1 },
  { y: 1460, dx: 0, w: 1000, shape: 0 },
];

export const OpeningScene: React.FC = () => {
  const config = useConfig();
  const theme = useTheme();
  const cues = useCues().scenes.opening ?? {};
  const scene = useScene();
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const part = interpolate(frame, [scene.startFrame + 0.05 * fps, scene.startFrame + 1.6 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const star = springIn(frame, cues.kicker, fps, 9, 140, 0.8);

  return (
    <AbsoluteFill>
      <Backdrop variant="opening" />
      <SparkleField count={16} seed="op" area={{ x: 40, y: 140, w: 1000, h: 1300 }} />
      <ShootingStar start={scene.startFrame + Math.round(0.9 * fps)} from={[W * 0.98, 210]} to={[W * 0.1, 640]} />
      {theme.deco.ears ? (
        <EarsEmblem cx={W / 2} cy={720} R={185} start={cues.ears} starAt={cues.kicker} />
      ) : (
        <svg width={W} height={1000} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <Sparkle x={W / 2} y={640} size={150 * star} color={theme.c.gold} rotate={(1 - star) * 120} />
        </svg>
      )}
      <div style={{ position: 'absolute', top: 1030, left: 0, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <RevealText text={config.text.openingKicker} role="script" start={cues.kicker} maxWidth={920} maxSize={138} maxLines={2} lineHeight={1.12} />
        <RevealText text={config.text.openingHeadline} role="display" start={cues.headline} maxWidth={940} maxSize={140} maxLines={2} highlightScale={1.45} lineHeight={1.12} />
      </div>
      {theme.deco.clouds && <CloudBank y={1650} />}
      {part < 1 && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <AbsoluteFill style={{ background: '#FFFFFF', opacity: Math.max(0, 1 - part * 2.2) }} />
          {CURTAIN.map((c, i) => (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', top: c.y, left: -380 + c.dx - part * 1100, transform: `scale(${1 + part * 0.35})` }}>
                <Cloud shape={c.shape} width={c.w} />
              </div>
              <div style={{ position: 'absolute', top: c.y + 120, left: 420 - c.dx + part * 1100, transform: `scale(${1 + part * 0.35})` }}>
                <Cloud shape={(c.shape + 1) % 3} width={c.w} />
              </div>
            </React.Fragment>
          ))}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
