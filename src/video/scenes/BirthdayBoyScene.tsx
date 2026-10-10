import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { BalloonCluster, balloonPalette, type ClusterItem } from '../components/Balloon';
import { Backdrop } from '../components/Backdrop';
import { CloudBank } from '../components/Cloud';
import { NumberOne } from '../components/NumberOne';
import { PhotoFrame } from '../components/PhotoFrame';
import { RevealText } from '../components/RevealText';
import { SparkleField } from '../components/Sparkles';
import { useConfig, useCues, useScene, useTheme } from '../theme';
import { beatPulse, clamp01, fadeIn, springIn, useAbsFrame } from '../util/anim';

export const BirthdayBoyScene: React.FC = () => {
  const config = useConfig();
  const theme = useTheme();
  const cuesAll = useCues();
  const cues = cuesAll.scenes['birthday-boy'] ?? {};
  const scene = useScene();
  const frame = useAbsFrame();
  const { fps, width: W } = useVideoConfig();
  const t = frame / fps;
  const hasPhoto = !!config.photoUrl;
  const hero = springIn(frame, cues.hero, fps, 9, 110, 0.9);
  const one = springIn(frame, cues.one, fps, 7, 160, 0.7);
  const pulse = beatPulse(cuesAll.beats, t, 0.25, true) * theme.intensity;
  const float = Math.sin(t * 1.6) * 10 * theme.intensity;
  const pal = balloonPalette(theme.c);

  const left: ClusterItem[] = [
    { x: -60, y: 1440, w: 190, color: pal[0], z: 1 },
    { x: 70, y: 1540, w: 160, color: pal[2], z: 2 },
    { x: -10, y: 1620, w: 175, color: pal[1], ears: true, z: 3 },
    { x: 170, y: 1660, w: 140, color: pal[3], z: 0 },
  ];
  const right: ClusterItem[] = [
    { x: 900, y: 1420, w: 190, color: pal[1], z: 1 },
    { x: 790, y: 1560, w: 165, color: pal[3], z: 0 },
    { x: 900, y: 1600, w: 175, color: pal[0], ears: true, z: 3 },
    { x: 760, y: 1680, w: 140, color: pal[2], z: 2 },
  ];

  return (
    <AbsoluteFill>
      <Backdrop variant="birthday-boy" />
      <SparkleField count={18} seed="bb" area={{ x: 40, y: 120, w: 1000, h: 1500 }} />
      <BalloonCluster items={left} start={scene.startFrame} seed="bbl" />
      <BalloonCluster items={right} start={scene.startFrame + Math.round(0.2 * fps)} seed="bbr" />

      <div style={{ position: 'absolute', top: 150, left: 0, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ height: 760, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {hasPhoto ? (
            <>
              <div style={{ opacity: clamp01(hero * 2), transform: `translateY(${float}px) scale(${0.55 + 0.45 * hero}) rotate(${(1 - hero) * -10}deg)` }}>
                <PhotoFrame src={config.photoUrl} size={540} shape={theme.photoFrame} drawProgress={fadeIn(frame, cues.hero, 1.2 * fps)} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: theme.photoFrame === 'ears' ? -40 : -110,
                  bottom: 10,
                  opacity: clamp01(one * 3),
                  transform: `translateY(${(1 - one) * -260}px) scale(${(0.6 + 0.4 * one) * (1 + 0.06 * pulse)}) rotate(${8 + Math.sin(t * 2) * 3}deg)`,
                  transformOrigin: '50% 100%',
                }}
              >
                <NumberOne height={290} />
              </div>
            </>
          ) : (
            <div
              style={{
                opacity: clamp01(hero * 3),
                transform: `translateY(${(1 - hero) * -420 + float}px) scale(${(0.7 + 0.3 * hero) * (1 + 0.05 * pulse)})`,
                transformOrigin: '50% 100%',
              }}
            >
              <NumberOne height={700} />
            </div>
          )}
        </div>
        <RevealText text={config.childName} role="display" start={cues.name} split="letter" maxWidth={960} maxSize={150} maxLines={2} lineHeight={1.04} style={{ marginTop: 10 }} />
        <RevealText text={config.text.nameTagline} role="display" start={cues.tagline} maxWidth={940} maxSize={84} maxLines={3} highlightScale={1.35} lineHeight={1.16} style={{ marginTop: 18 }} />
      </div>
      {theme.deco.clouds && <CloudBank y={1700} />}
    </AbsoluteFill>
  );
};
