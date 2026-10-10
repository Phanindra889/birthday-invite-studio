import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { normalizeConfig, type InvitationConfig, type SceneId } from '../shared/config';
import { computeCues } from '../shared/cues';
import { SFX_FILES, getBuiltinTrack } from '../shared/music';
import { ConfettiLayer } from './components/Confetti';
import { SceneShell } from './components/SceneShell';
import { fontSpecs, loadFonts } from './fonts';
import { BirthdayBoyScene } from './scenes/BirthdayBoyScene';
import { CelebrationScene } from './scenes/CelebrationScene';
import { ClosingScene } from './scenes/ClosingScene';
import { EventDetailsScene } from './scenes/EventDetailsScene';
import { OpeningScene } from './scenes/OpeningScene';
import { ConfigContext, CueContext, FontsReadyContext, ThemeContext, buildTheme, useTheme } from './theme';

export type InvitationProps = { config: InvitationConfig };

const SCENES: Record<SceneId, React.FC> = {
  opening: OpeningScene,
  'birthday-boy': BirthdayBoyScene,
  celebration: CelebrationScene,
  'event-details': EventDetailsScene,
  closing: ClosingScene,
};

export function resolveMusicSrc(config: InvitationConfig): string | null {
  if (config.audio.source === 'none') return null;
  const track = getBuiltinTrack(config.audio.source);
  if (track) return staticFile(track.file);
  return config.musicUrl || null;
}

const FinalFade: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const theme = useTheme();
  const opacity = interpolate(frame, [durationInFrames - 1.2 * fps, durationInFrames - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const intro = interpolate(frame, [0, 0.35 * fps], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      {opacity > 0 && <AbsoluteFill style={{ background: theme.fadeColor, opacity }} />}
      {intro > 0 && <AbsoluteFill style={{ background: '#FFFFFF', opacity: intro }} />}
    </>
  );
};

export const Invitation: React.FC<InvitationProps> = ({ config: raw }) => {
  const config = useMemo(() => normalizeConfig(raw), [raw]);
  const theme = useMemo(() => buildTheme(config), [config]);
  const cues = useMemo(() => computeCues(config), [config]);
  const specs = fontSpecs(config.design);
  const specKey = specs.join('|');
  const { fps } = useVideoConfig();

  // Text layout is measured with canvas, so frames must wait for the fonts.
  const [fontsReady, setFontsReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading invitation fonts'));
  const released = useRef(false);
  useEffect(() => {
    let cancelled = false;
    loadFonts(specKey.split('|')).finally(() => {
      if (cancelled) return;
      setFontsReady(true);
      if (!released.current) {
        released.current = true;
        continueRender(handle);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [specKey, handle]);

  const total = cues.timeline.totalFrames;
  const music = resolveMusicSrc(config);
  const a = config.audio;
  const musicVolume = (f: number) => {
    const fin = a.fadeIn > 0 ? Math.min(1, f / (a.fadeIn * fps)) : 1;
    const fout = a.fadeOut > 0 ? Math.min(1, Math.max(0, (total - f) / (a.fadeOut * fps))) : 1;
    return Math.max(0, Math.min(1, a.volume * fin * fout));
  };

  return (
    <ConfigContext.Provider value={config}>
      <ThemeContext.Provider value={theme}>
        <CueContext.Provider value={cues}>
          <FontsReadyContext.Provider value={fontsReady}>
            <AbsoluteFill style={{ backgroundColor: theme.c.baby, overflow: 'hidden', fontFamily: `"${theme.fonts.body.family}", sans-serif` }}>
              {cues.timeline.scenes.map((scene) => {
                const Scene = SCENES[scene.id];
                return (
                  <SceneShell key={scene.id} scene={scene}>
                    <Scene />
                  </SceneShell>
                );
              })}
              <ConfettiLayer />
              <FinalFade />
              {music && (
                <Html5Audio
                  src={music}
                  volume={musicVolume}
                  trimBefore={a.startOffset > 0 ? Math.round(a.startOffset * fps) : undefined}
                  loop={a.loop}
                  name="Music"
                />
              )}
              {cues.sfx.map((e, i) => (
                <Sequence key={`${e.kind}-${i}`} from={e.frame} durationInFrames={Math.round(2.2 * fps)} name={`SFX ${e.kind}`} layout="none">
                  <Html5Audio src={staticFile(SFX_FILES[e.kind])} volume={e.volume} />
                </Sequence>
              ))}
            </AbsoluteFill>
          </FontsReadyContext.Provider>
        </CueContext.Provider>
      </ThemeContext.Provider>
    </ConfigContext.Provider>
  );
};
