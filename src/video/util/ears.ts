// Geometry for the original three-circle "ears" motif used across the design.

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export const EAR_RATIO = 0.62;
const EAR_DIST = 1.2;

export function earsCircles(cx: number, cy: number, R: number): { head: Circle; left: Circle; right: Circle } {
  const d = R * EAR_DIST * Math.SQRT1_2;
  const r = R * EAR_RATIO;
  return {
    head: { cx, cy, r: R },
    left: { cx: cx - d, cy: cy - d, r },
    right: { cx: cx + d, cy: cy - d, r },
  };
}

/** Outline path of the union of the head and both ears (clockwise). */
export function earsOutlinePath(cx: number, cy: number, R: number): string {
  if (R <= 0.5) return `M ${cx} ${cy} Z`;
  const r = R * EAR_RATIO;
  const dist = R * EAR_DIST;
  // Angle at the head center between the ear axis and each intersection point.
  const a = (R * R - r * r + dist * dist) / (2 * dist);
  const delta = Math.acos(Math.min(1, Math.max(-1, a / R)));
  const pt = (angle: number) => [cx + R * Math.cos(angle), cy + R * Math.sin(angle)].map((v) => v.toFixed(2)).join(' ');
  const left = (-135 * Math.PI) / 180;
  const right = (-45 * Math.PI) / 180;
  const L1 = pt(left - delta);
  const L2 = pt(left + delta);
  const R1 = pt(right - delta);
  const R2 = pt(right + delta);
  const rs = r.toFixed(2);
  const Rs = R.toFixed(2);
  return `M ${L1} A ${rs} ${rs} 0 1 1 ${L2} A ${Rs} ${Rs} 0 0 1 ${R1} A ${rs} ${rs} 0 1 1 ${R2} A ${Rs} ${Rs} 0 1 1 ${L1} Z`;
}

/** Bounding box of the ears shape for a head radius R centered at (0,0). */
export function earsBounds(R: number) {
  const { left } = earsCircles(0, 0, R);
  const halfW = Math.max(R, -left.cx + left.r);
  const top = left.cy - left.r;
  return { width: halfW * 2, top, bottom: R, height: R - top };
}
