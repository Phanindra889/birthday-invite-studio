import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, cloneConfig, normalizeConfig, type InvitationConfig } from '../shared/config';
import { getBuiltinTrack } from '../shared/music';
import { computeTimeline } from '../shared/timeline';
import { analyzeAudio, idbGet, idbSet, type AudioInsight } from './media';

const STORAGE_KEY = 'invite-studio:config:v1';

export interface MediaState {
  /** Uploaded music file and its object URL (preview only). */
  musicFile: File | null;
  musicUrl: string;
  /** Waveform + analysis of the currently selected track. */
  insight: AudioInsight | null;
  analyzing: boolean;
  error: string | null;
}

interface StoreValue {
  config: InvitationConfig;
  /** Config with runtime-only values (uploaded music URL) filled in — what the preview renders. */
  runtimeConfig: InvitationConfig;
  update: (fn: (draft: InvitationConfig) => void, opts?: { coalesce?: string }) => void;
  replace: (config: InvitationConfig) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  media: MediaState;
  uploadMusic: (file: File) => Promise<void>;
  redetectBeats: () => Promise<void>;
  persistError: string | null;
}

const StoreContext = createContext<StoreValue | null>(null);

export const useStore = () => {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
};

function loadInitial(): InvitationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeConfig(JSON.parse(raw));
  } catch {
    // Storage unavailable or corrupt: fall back to defaults.
  }
  return cloneConfig(DEFAULT_CONFIG);
}

interface History {
  past: InvitationConfig[];
  present: InvitationConfig;
  future: InvitationConfig[];
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: loadInitial(), future: [] }));
  const config = history.present;
  const lastEdit = useRef<{ key: string; at: number } | null>(null);
  const [media, setMedia] = useState<MediaState>({ musicFile: null, musicUrl: '', insight: null, analyzing: false, error: null });
  const [persistError, setPersistError] = useState<string | null>(null);

  const update = useCallback((fn: (draft: InvitationConfig) => void, opts?: { coalesce?: string }) => {
    const now = Date.now();
    const key = opts?.coalesce;
    const merge = !!key && lastEdit.current?.key === key && now - lastEdit.current.at < 900;
    lastEdit.current = key ? { key, at: now } : null;
    setHistory((h) => {
      const next = cloneConfig(h.present);
      fn(next);
      return { past: merge ? h.past : [...h.past.slice(-80), h.present], present: next, future: [] };
    });
  }, []);

  const replace = useCallback((c: InvitationConfig) => {
    lastEdit.current = null;
    setHistory((h) => ({ past: [...h.past.slice(-80), h.present], present: normalizeConfig(c), future: [] }));
  }, []);

  const undo = useCallback(() => {
    lastEdit.current = null;
    setHistory((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  }, []);
  const redo = useCallback(() => {
    lastEdit.current = null;
    setHistory((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  }, []);

  // Autosave (the uploaded music itself lives in IndexedDB, not in the config).
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, musicUrl: '' }));
        setPersistError(null);
      } catch {
        setPersistError('Changes could not be saved in this browser (storage full or blocked). Use “Save config” to keep a copy.');
      }
    }, 350);
    return () => clearTimeout(id);
  }, [config]);

  // Restore a previously uploaded track.
  useEffect(() => {
    let cancelled = false;
    idbGet<File>('music')
      .then((file) => {
        if (cancelled || !file) return;
        setMedia((m) => ({ ...m, musicFile: file, musicUrl: URL.createObjectURL(file) }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Waveform + analysis for whichever track is selected.
  const source = config.audio.source;
  const builtin = getBuiltinTrack(source);
  const trackKey = builtin ? builtin.id : source === 'upload' && media.musicFile ? `upload:${media.musicFile.name}:${media.musicFile.size}` : '';
  useEffect(() => {
    if (!trackKey) {
      setMedia((m) => ({ ...m, insight: null }));
      return;
    }
    let cancelled = false;
    const load = builtin
      ? () => fetch(`/${builtin.file}`).then((r) => {
          if (!r.ok) throw new Error(`Could not load ${builtin.file}`);
          return r.arrayBuffer();
        })
      : () => media.musicFile!.arrayBuffer();
    setMedia((m) => ({ ...m, analyzing: true, error: null }));
    analyzeAudio(trackKey, load, builtin ? builtin.beatsPerBar : 4)
      .then((insight) => !cancelled && setMedia((m) => ({ ...m, insight, analyzing: false })))
      .catch(() => !cancelled && setMedia((m) => ({ ...m, analyzing: false, error: 'This audio file could not be decoded. Try an MP3, WAV or M4A file.' })));
    return () => {
      cancelled = true;
    };
  }, [trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadMusic = useCallback(
    async (file: File) => {
      setMedia((m) => ({ ...m, analyzing: true, error: null }));
      try {
        const insight = await analyzeAudio(`upload:${file.name}:${file.size}`, () => file.arrayBuffer(), 4);
        await idbSet('music', file).catch(() => undefined);
        setMedia((m) => {
          if (m.musicUrl) URL.revokeObjectURL(m.musicUrl);
          return { musicFile: file, musicUrl: URL.createObjectURL(file), insight, analyzing: false, error: null };
        });
        update((d) => {
          const video = computeTimeline(d).durationSeconds;
          d.audio.source = 'upload';
          d.audio.uploadName = file.name;
          d.audio.trackDuration = Math.round(insight.duration * 1000) / 1000;
          d.audio.startOffset = 0;
          d.audio.loop = insight.duration < video;
          d.audio.beats = insight.analysis.beats;
          d.audio.bpm = insight.analysis.bpm;
          d.audio.beatsPerBar = 4;
          d.audio.downbeatOffset = insight.analysis.downbeatOffset;
          d.audio.beatSource = 'detected';
        });
      } catch {
        setMedia((m) => ({ ...m, analyzing: false, error: 'This audio file could not be decoded. Try an MP3, WAV or M4A file.' }));
      }
    },
    [update],
  );

  const redetectBeats = useCallback(async () => {
    if (!media.insight) return;
    const a = media.insight.analysis;
    update((d) => {
      d.audio.beats = a.beats;
      d.audio.bpm = a.bpm;
      d.audio.beatsPerBar = a.beatsPerBar;
      d.audio.downbeatOffset = a.downbeatOffset;
      d.audio.beatSource = 'detected';
    });
  }, [media.insight, update]);

  const runtimeConfig = useMemo(
    () => ({ ...config, musicUrl: config.audio.source === 'upload' ? media.musicUrl : '' }),
    [config, media.musicUrl],
  );

  const value: StoreValue = {
    config,
    runtimeConfig,
    update,
    replace,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    media,
    uploadMusic,
    redetectBeats,
    persistError,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
