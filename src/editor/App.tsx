import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, cloneConfig, normalizeConfig } from '../shared/config';
import { slugify } from '../shared/format';
import { validateConfig } from '../shared/validate';
import { PreviewStage } from './components/PreviewStage';
import { BrandMark, Icon } from './icons';
import { downloadBlob } from './media';
import { DesignPanel } from './panels/DesignPanel';
import { DetailsPanel } from './panels/DetailsPanel';
import { ExportPanel } from './panels/ExportPanel';
import { MusicPanel } from './panels/MusicPanel';
import { ScenesPanel } from './panels/ScenesPanel';
import { PlayerProvider } from './player';
import { StoreProvider, useStore } from './store';
import { Callout } from './ui';

const TABS = [
  { id: 'details', label: 'Details', icon: 'details', Panel: DetailsPanel },
  { id: 'scenes', label: 'Scenes', icon: 'scenes', Panel: ScenesPanel },
  { id: 'design', label: 'Design', icon: 'palette', Panel: DesignPanel },
  { id: 'music', label: 'Music', icon: 'music', Panel: MusicPanel },
  { id: 'export', label: 'Export', icon: 'film', Panel: ExportPanel },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB_KEY = 'invite-studio:tab';

const Shell: React.FC = () => {
  const { config, runtimeConfig, replace, undo, redo, canUndo, canRedo, persistError } = useStore();
  const [tab, setTab] = useState<TabId>(() => {
    try {
      const t = localStorage.getItem(TAB_KEY) as TabId | null;
      return t && TABS.some((x) => x.id === t) ? t : 'details';
    } catch {
      return 'details';
    }
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => validateConfig(runtimeConfig), [runtimeConfig]);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.length - errors;

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* per-viewer convenience only */
    }
  }, [tab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const Active = TABS.find((t) => t.id === tab)!.Panel;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <BrandMark />
          <span>Invite Studio</span>
        </div>
        <span className="project-title" title={`${config.childName} — ${config.occasion}`}>
          {config.childName || 'Untitled'} · {config.occasion}
        </span>
        <button type="button" className={`status-pill ${errors ? 'error' : warnings ? 'warning' : 'ok'}`} onClick={() => setTab(errors ? 'details' : 'export')}>
          <Icon name={errors ? 'warning' : warnings ? 'info' : 'check'} size={14} />
          {errors ? `${errors} to fix` : warnings ? `${warnings} note${warnings > 1 ? 's' : ''}` : 'Ready to export'}
        </button>
        <div className="header-actions">
          <button type="button" className="icon-btn light" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
            <Icon name="undo" />
          </button>
          <button type="button" className="icon-btn light" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
            <Icon name="redo" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => downloadBlob(new Blob([JSON.stringify({ ...config, musicUrl: '' }, null, 2)], { type: 'application/json' }), `${slugify(config.childName)}-invitation.json`)}
          >
            <Icon name="save" size={15} /> <span className="hide-sm">Save config</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="open" size={15} /> <span className="hide-sm">Load</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm('Reset every setting to the original invitation details? You can undo this.')) replace(cloneConfig(DEFAULT_CONFIG));
            }}
          >
            <Icon name="reset" size={15} /> <span className="hide-sm">Reset</span>
          </button>
          <button type="button" className="btn btn-gold btn-sm" onClick={() => setTab('export')}>
            <Icon name="film" size={15} /> Export MP4
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                replace(normalizeConfig(JSON.parse(await f.text())));
                setLoadError(null);
              } catch {
                setLoadError('That file is not a valid invitation config (JSON).');
              }
            }}
          />
        </div>
      </header>

      <aside className="sidebar">
        <nav className="tabs" role="tablist" aria-label="Editor sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={18} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="panel" role="tabpanel">
          {persistError && <Callout tone="warning">{persistError}</Callout>}
          {loadError && <Callout tone="error">{loadError}</Callout>}
          <Active />
        </div>
      </aside>

      <main className="main">
        <PreviewStage />
      </main>
    </div>
  );
};

export const App: React.FC = () => (
  <StoreProvider>
    <PlayerProvider>
      <Shell />
    </PlayerProvider>
  </StoreProvider>
);
