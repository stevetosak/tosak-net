// The isometric projection of the model kit: world units in, SVG user units out.
// In the world, x runs to the lower right of the screen, y to the lower left and
// z up. The arithmetic follows the prototype's generator (reference/parts.py)
// term by term, so the same scene gives the same points to the last decimal.

/** The projection's constants: the axes sit 30 degrees off the horizontal. */
export const iso = {
  cos: Math.cos(30 * (Math.PI / 180)),
  sin: 0.5,
  /** The SVG length of one world unit. */
  unit: 40,
} as const;

/** A point on the screen, in SVG user units. */
export type Point = readonly [x: number, y: number];

/** A place on the ground, in world units. */
export type Ground = readonly [x: number, y: number];

/** A box in world units: its corner nearest the origin, then its size along x, y and z. */
export interface Cuboid {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
}

/** An area of the ground, in world units. */
export interface Footprint {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly d: number;
}

/** A rectangle on the screen, by its two corners. */
export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The three faces of a box that the viewer sees, each as four screen points. */
export interface Faces {
  readonly top: readonly Point[];
  /** The face on the y + d side, at the lower left. */
  readonly left: readonly Point[];
  /** The face on the x + w side, at the lower right. */
  readonly right: readonly Point[];
}

export function cuboid(x: number, y: number, z: number, w: number, d: number, h: number): Cuboid {
  return { x, y, z, w, d, h };
}

export function project(x: number, y: number, z: number): Point {
  return [(x - y) * iso.cos * iso.unit, ((x + y) * iso.sin - z) * iso.unit];
}

export function facesOf({ x, y, z, w, d, h }: Cuboid): Faces {
  return {
    top: [
      project(x, y, z + h),
      project(x + w, y, z + h),
      project(x + w, y + d, z + h),
      project(x, y + d, z + h),
    ],
    left: [
      project(x, y + d, z),
      project(x + w, y + d, z),
      project(x + w, y + d, z + h),
      project(x, y + d, z + h),
    ],
    right: [
      project(x + w, y, z),
      project(x + w, y + d, z),
      project(x + w, y + d, z + h),
      project(x + w, y, z + h),
    ],
  };
}

/** The light falls from behind: a shadow is its footprint moved this far, in world units. */
const shadowShift = { x: 0.4, y: 0.1 } as const;

/** The shadow a footprint casts on the ground, as four screen points. */
export function shadowOf({ x, y, w, d }: Footprint): readonly Point[] {
  const { x: sx, y: sy } = shadowShift;
  return [
    project(x + sx, y + sy, 0),
    project(x + w + sx, y + sy, 0),
    project(x + w + sx, y + d + sy, 0),
    project(x + sx, y + d + sy, 0),
  ];
}

/** The smallest screen rectangle that holds every visible face of the boxes. */
export function boundsOf(boxes: readonly Cuboid[]): Rect {
  const points = boxes.flatMap((box) => {
    const { top, left, right } = facesOf(box);
    return [...top, ...left, ...right];
  });
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * The ground corner of a w by d footprint whose left screen corner sits `left`
 * world units from the origin and whose corner has the depth x + y = `depth`.
 * It lines parts up on the screen without arithmetic in two axes.
 */
export function placeFootprint(left: number, depth: number, w: number, d: number): Ground {
  const diff = left / iso.cos + d;
  return [(diff + depth) / 2, (depth - diff) / 2];
}

/** A number as the model writes it: fixed decimals, as Python's `f'{v:.Nf}'`. */
export function fixed(value: number, digits: number): string {
  return value.toFixed(digits);
}

/** Screen points as an SVG `points` attribute, to one decimal. */
export function formatPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${fixed(x, 1)},${fixed(y, 1)}`).join(' ');
}
