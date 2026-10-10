import React from 'react';

const PATHS: Record<string, React.ReactNode> = {
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x={6.5} y={5} width={4} height={14} rx={1.2} fill="currentColor" stroke="none" />
      <rect x={13.5} y={5} width={4} height={14} rx={1.2} fill="currentColor" stroke="none" />
    </>
  ),
  restart: <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />,
  prev: <path d="M18 6 10 12l8 6V6ZM6 6v12" />,
  next: <path d="m6 6 8 6-8 6V6Zm12 0v12" />,
  volume: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  mute: <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5ZM16 9.5l5 5M21 9.5l-5 5" />,
  upload: <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />,
  download: <path d="M12 4v12m0 0-4.5-4.5M12 16l4.5-4.5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />,
  share: <path d="M12 15V3.5m0 0L8 7.5m4-4 4 4M7 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H17" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  undo: <path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" />,
  redo: <path d="m15 7 4.5 4.5L15 16m4-4.5H9.5a5 5 0 0 0 0 10H12" />,
  save: <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm3 0v5h7V4M8 20v-6h8v6" />,
  open: <path d="M4 7.5V18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5a1 1 0 0 0-1-1h-7L10 6H5a1 1 0 0 0-1 1.5Z" />,
  reset: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4.5h-4.5" />,
  sparkle: <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7Z" />,
  details: <path d="M5 5h14M5 10h14M5 15h9M5 20h6" />,
  scenes: (
    <>
      <rect x={3.5} y={5} width={7} height={14} rx={1.5} />
      <rect x={13.5} y={5} width={7} height={14} rx={1.5} />
    </>
  ),
  palette: <path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.7-1.6h2.2A3.8 3.8 0 0 0 20.5 11 7.7 7.7 0 0 0 12 3.5ZM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01" />,
  music: <path d="M9 18V6l11-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm11-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />,
  film: (
    <>
      <rect x={3.5} y={4.5} width={17} height={15} rx={2} />
      <path d="M8 4.5v15M16 4.5v15M3.5 9h4.5M3.5 15h4.5M16 9h4.5M16 15h4.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  warning: <path d="M12 4 2.5 20h19L12 4Zm0 6v4.5m0 3h.01" />,
  info: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9h.01" />,
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth={3} />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  eye: <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  eyeOff: <path d="M3 3l18 18M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
  wand: <path d="m4 20 11-11m-2-2 2-2 4 4-2 2M17 3v2m3 1h-2M8 3l.6 1.4L10 5l-1.4.6L8 7l-.6-1.4L6 5l1.4-.6L8 3Z" />,
  tap: <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.5 15a1.6 1.6 0 0 1 2.4-2l2.1 2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />,
  image: (
    <>
      <rect x={3.5} y={4.5} width={17} height={15} rx={2} />
      <path d="m3.5 16 4.5-4.5 4 4 3-3 5.5 5.5M15 9.5h.01" />
    </>
  ),
  crop: <path d="M6 2.5V18h15.5M2.5 6H18v15.5" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5V12l3 2" />,
};

export const Icon: React.FC<{ name: keyof typeof PATHS | string; size?: number; className?: string; title?: string }> = ({ name, size = 18, className, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
  >
    {title && <title>{title}</title>}
    {PATHS[name]}
  </svg>
);

export const BrandMark: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
    <defs>
      <linearGradient id="bm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4B8BD0" />
        <stop offset="1" stopColor="#1C4F8A" />
      </linearGradient>
    </defs>
    <circle cx={32} cy={38} r={20} fill="url(#bm)" />
    <circle cx={15} cy={18} r={12} fill="url(#bm)" />
    <circle cx={49} cy={18} r={12} fill="url(#bm)" />
    <path d="M32 26.5c.7 4.7 2.8 6.8 7.5 7.5-4.7.7-6.8 2.8-7.5 7.5-.7-4.7-2.8-6.8-7.5-7.5 4.7-.7 6.8-2.8 7.5-7.5Z" fill="#F2D58A" />
  </svg>
);
