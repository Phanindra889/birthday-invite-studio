import type { PlayerRef } from '@remotion/player';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface PlayerCtx {
  player: PlayerRef | null;
  setPlayer: (p: PlayerRef | null) => void;
  seek: (frame: number) => void;
  /** UI state shared between the music panel and the timeline. */
  editBeats: boolean;
  setEditBeats: (v: boolean) => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [editBeats, setEditBeats] = useState(false);
  const seek = useCallback((frame: number) => player?.seekTo(Math.max(0, Math.round(frame))), [player]);
  return <Ctx.Provider value={{ player, setPlayer, seek, editBeats, setEditBeats }}>{children}</Ctx.Provider>;
};

export const usePlayer = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer outside PlayerProvider');
  return v;
};

/** Current frame, updated on playback and seeks. Only components that need it re-render. */
export function usePlayerFrame(): number {
  const { player } = usePlayer();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!player) return;
    setFrame(player.getCurrentFrame());
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('seeked', onFrame);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('seeked', onFrame);
    };
  }, [player]);
  return frame;
}

export function usePlayerState() {
  const { player } = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    if (!player) return;
    setPlaying(player.isPlaying());
    setMuted(player.isMuted());
    setVolume(player.getVolume());
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMute = (e: { detail: { isMuted: boolean } }) => setMuted(e.detail.isMuted);
    const onVolume = (e: { detail: { volume: number } }) => setVolume(e.detail.volume);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onPause);
    player.addEventListener('mutechange', onMute);
    player.addEventListener('volumechange', onVolume);
    return () => {
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onPause);
      player.removeEventListener('mutechange', onMute);
      player.removeEventListener('volumechange', onVolume);
    };
  }, [player]);
  return { playing, muted, volume };
}
