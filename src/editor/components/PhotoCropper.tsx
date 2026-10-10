import React, { useEffect, useRef, useState } from 'react';
import { Button, Slider } from '../ui';

const VIEW = 300;
const OUT = 900;

/** Square crop with pan (drag) and zoom; previews the round frame used in the video. */
export const PhotoCropper: React.FC<{ src: string; onCancel: () => void; onDone: (dataUrl: string) => void }> = ({ src, onCancel, onDone }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Base scale makes the shorter side fill the square.
  const base = img ? VIEW / Math.min(img.width, img.height) : 1;
  const scale = base * zoom;
  const w = img ? img.width * scale : VIEW;
  const h = img ? img.height * scale : VIEW;
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(VIEW - w, p.x)),
    y: Math.min(0, Math.max(VIEW - h, p.y)),
  });
  useEffect(() => {
    if (img) setPos((p) => clamp(p.x === 0 && p.y === 0 ? { x: (VIEW - w) / 2, y: (VIEW - h) / 2 } : p));
  }, [img, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext('2d')!;
    const k = OUT / VIEW;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, pos.x * k, pos.y * k, w * k, h * k);
    onDone(c.toDataURL('image/jpeg', 0.88));
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="crop-title" tabIndex={-1} ref={dialogRef}>
        <h2 id="crop-title">Crop photo</h2>
        <p className="modal-sub">Drag to position the face in the circle. Use the slider to zoom.</p>
        <div
          className="crop-area"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          {img ? <img src={src} alt="" draggable={false} style={{ width: w, height: h, transform: `translate(${pos.x}px, ${pos.y}px)` }} /> : <span className="crop-loading">Loading…</span>}
          <div className="crop-mask" aria-hidden />
        </div>
        <label className="crop-zoom">
          <span>Zoom</span>
          <Slider value={zoom} min={1} max={4} step={0.01} onChange={setZoom} format={(v) => `${v.toFixed(1)}×`} ariaLabel="Zoom" />
        </label>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" onClick={apply} disabled={!img}>
            Use photo
          </Button>
        </div>
      </div>
    </div>
  );
};
