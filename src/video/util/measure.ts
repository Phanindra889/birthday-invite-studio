// Deterministic text layout: measures with canvas and computes balanced line breaks,
// so headings never overflow and the preview and the render wrap identically.
import type { TextSegment } from '../../shared/markup';

export interface Word {
  text: string;
  highlight: boolean;
}

export interface TextLayout {
  fontSize: number;
  lines: Word[][];
  /** Widest line in px at fontSize. */
  width: number;
}

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

function measureRaw(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 0.55 * parseFloat(font.split('px')[0].split(' ').pop() ?? '16');
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 10;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Width at 100px, cached; scaled linearly to the requested size. */
export function measure(text: string, family: string, weight: number, size: number, fontsReady: boolean): number {
  const key = `${fontsReady ? 1 : 0}|${weight}|${family}|${text}`;
  let w = cache.get(key);
  if (w === undefined) {
    w = measureRaw(text, `${weight} 100px "${family}", sans-serif`);
    cache.set(key, w);
  }
  return (w * size) / 100;
}

export interface LayoutOptions {
  family: string;
  weight: number;
  maxWidth: number;
  maxLines: number;
  maxSize: number;
  minSize: number;
  /** Highlighted words are drawn this much larger. */
  highlightScale?: number;
  /** Extra horizontal room per word (outlines, letter spacing), as a fraction of the font size. */
  padEm?: number;
  fontsReady: boolean;
}

function toWords(lines: TextSegment[][]): Word[][] {
  return lines.map((segs) => {
    const words: Word[] = [];
    for (const seg of segs) {
      for (const w of seg.text.split(/\s+/).filter(Boolean)) words.push({ text: w, highlight: seg.highlight });
    }
    return words;
  });
}

/** Best split of `widths` into exactly n lines minimizing the widest line (small inputs: exhaustive DP). */
function balance(widths: number[], space: number, n: number): { breaks: number[]; max: number } {
  const len = widths.length;
  const lineWidth = (a: number, b: number) => {
    let w = 0;
    for (let i = a; i < b; i++) w += widths[i] + (i > a ? space : 0);
    return w;
  };
  // dp[k][i] = minimal max width splitting the first i words into k lines
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(len + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: n + 1 }, () => Array(len + 1).fill(0));
  dp[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = 1; i <= len; i++) {
      for (let j = k - 1; j < i; j++) {
        const v = Math.max(dp[k - 1][j], lineWidth(j, i));
        if (v < dp[k][i]) { dp[k][i] = v; from[k][i] = j; }
      }
    }
  }
  const breaks: number[] = [];
  let i = len;
  for (let k = n; k > 0; k--) { breaks.unshift(i); i = from[k][i]; }
  return { breaks, max: dp[n][len] };
}

export function layoutText(lines: TextSegment[][], o: LayoutOptions): TextLayout {
  const paragraphs = toWords(lines).filter((p) => p.length);
  const hs = o.highlightScale ?? 1;
  const pad = o.padEm ?? 0.08;
  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const space = measure(' ', o.family, o.weight, size, o.fontsReady);
    let ok = true;
    let total = 0;
    let widest = 0;
    const out: Word[][] = [];
    for (const words of paragraphs) {
      const widths = words.map((w) => measure(w.text, o.family, o.weight, size * (w.highlight ? hs : 1), o.fontsReady) + pad * size);
      if (Math.max(...widths) > o.maxWidth) { ok = false; break; }
      let n = 1;
      let best = balance(widths, space, 1);
      while (best.max > o.maxWidth && n < words.length) best = balance(widths, space, ++n);
      if (best.max > o.maxWidth) { ok = false; break; }
      total += n;
      widest = Math.max(widest, best.max);
      let start = 0;
      for (const b of best.breaks) { out.push(words.slice(start, b)); start = b; }
    }
    if (ok && total <= o.maxLines) return { fontSize: size, lines: out, width: widest };
    if (size - 2 < o.minSize) {
      // Last resort: smallest size, greedy lines (may exceed maxLines but never maxWidth per word).
      return { fontSize: o.minSize, lines: out.length ? out : paragraphs, width: widest };
    }
  }
  return { fontSize: o.minSize, lines: paragraphs, width: o.maxWidth };
}

/** Largest single-line font size so `text` fits `maxWidth`. */
export function fitSingleLine(text: string, family: string, weight: number, maxWidth: number, maxSize: number, minSize: number, fontsReady: boolean): number {
  const w = measure(text, family, weight, 100, fontsReady);
  if (w <= 0) return maxSize;
  return Math.max(minSize, Math.min(maxSize, Math.floor((maxWidth / w) * 100)));
}
