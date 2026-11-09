// The camera of a still model: a translate and a scale that fit one part of the
// scene into a panel, so a CSS transition can move between parts.
import { fixed, type Rect } from './projection.ts';

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A frame of the camera: the scene is scaled, then moved by x and y. */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/** The frame that fits a screen rectangle into the panel, centred, with a margin. */
export function frameRect(rect: Rect, panel: Size, pad = 48): Camera {
  const scale = Math.min(
    (panel.width - 2 * pad) / (rect.x1 - rect.x0),
    (panel.height - 2 * pad) / (rect.y1 - rect.y0),
  );
  return {
    x: panel.width / 2 - (scale * (rect.x0 + rect.x1)) / 2,
    y: panel.height / 2 - (scale * (rect.y0 + rect.y1)) / 2,
    scale,
  };
}

/** A frame as a CSS transform, for a group whose transform origin is 0 0. */
export function cameraTransform({ x, y, scale }: Camera): string {
  return `translate(${fixed(x, 1)}px, ${fixed(y, 1)}px) scale(${fixed(scale, 4)})`;
}
