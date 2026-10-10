import { Player } from '@remotion/player';
import React, { useMemo, useState } from 'react';
import { SCENE_META } from '../../shared/config';
import { seconds } from '../../shared/format';
import { computeTimeline, sceneAtFrame, type Timeline as TL } from '../../shared/timeline';
import { Invitation } from '../../video/Invitation';
import { Icon } from '../icons';
import { usePlayer, usePlayerFrame, usePlayerState } from '../player';
import { useStore } from '../store';
import { Timeline } from './Timeline';

export const PreviewStage: React.FC = () => {
  const { runtimeConfig } = useStore();
  const { setPlayer } = usePlayer();
  const timeline = useMemo(() => computeTimeline(runtimeConfig), [runtimeConfig]);
  const inputProps = useMemo(() => ({ config: runtimeConfig }), [runtimeConfig]);
  // Frame 0 is the white cloud fade-in; open the editor on a fully revealed frame instead.
  const [initialFrame] = useState(() => Math.min(timeline.totalFrames - 1, Math.round(4.2 * runtimeConfig.fps)));

  return (
    <div className="stage">
      <div className="stage-main">
        <div className="phone" aria-label="Video preview">
          <div className="phone-screen">
            <Player
              ref={setPlayer}
              component={Invitation}
              inputProps={inputProps}
              durationInFrames={timeline.totalFrames}
              fps={runtimeConfig.fps}
              compositionWidth={runtimeConfig.width}
              compositionHeight={runtimeConfig.height}
              style={{ width: '100%', height: '100%' }}
              controls={false}
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause
              numberOfSharedAudioTags={24}
              initialFrame={initialFrame}
            />
          </div>
        </div>
      </div>
      <Transport timeline={timeline} />
      <Timeline />
    </div>
  );
};

const Transport: React.FC<{ timeline: TL }> = ({ timeline }) => {
  const { player, seek } = usePlayer();
  const frame = usePlayerFrame();
  const { playing, muted, volume } = usePlayerState();
  const scene = sceneAtFrame(timeline, frame);
  const fps = timeline.fps;
  const prev = () => {
    const before = timeline.scenes.filter((s) => s.startFrame < frame - fps * 0.4);
    seek(before.length ? before[before.length - 1].startFrame : 0);
  };
  const next = () => {
    const after = timeline.scenes.find((s) => s.startFrame > frame);
    if (after) seek(after.startFrame);
  };
  return (
    <div className="transport">
      <div className="transport-buttons">
        <button type="button" className="icon-btn" onClick={() => { seek(0); player?.play(); }} aria-label="Restart from the beginning" title="Restart">
          <Icon name="restart" />
        </button>
        <button type="button" className="icon-btn" onClick={prev} aria-label="Previous scene" title="Previous scene">
          <Icon name="prev" />
        </button>
        <button type="button" className="play-btn" onClick={() => player?.toggle()} aria-label={playing ? 'Pause' : 'Play'}>
          <Icon name={playing ? 'pause' : 'play'} size={22} />
        </button>
        <button type="button" className="icon-btn" onClick={next} aria-label="Next scene" title="Next scene">
          <Icon name="next" />
        </button>
      </div>
      <div className="transport-time" aria-live="off">
        <span className="time-now">{seconds(frame / fps)}</span>
        <span className="time-total">/ {seconds(timeline.durationSeconds)}</span>
        {scene && (
          <span className="scene-pill">
            {scene.index + 1}. {SCENE_META[scene.id].short}
          </span>
        )}
      </div>
      <div className="transport-volume">
        <button type="button" className="icon-btn" onClick={() => (muted ? player?.unmute() : player?.mute())} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
          <Icon name={muted || volume === 0 ? 'mute' : 'volume'} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          aria-label="Preview volume"
          onChange={(e) => {
            const v = Number(e.target.value);
            player?.setVolume(v);
            if (v > 0 && muted) player?.unmute();
          }}
          style={{ '--fill': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
};
