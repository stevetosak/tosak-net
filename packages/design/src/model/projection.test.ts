import { describe, expect, it } from 'vitest';
import { cameraTransform, frameRect } from './camera.ts';
import {
  boundsOf,
  cuboid,
  facesOf,
  formatPoints,
  iso,
  placeFootprint,
  project,
  shadowOf,
} from './projection.ts';

const close = (actual: readonly number[], expected: readonly number[]): void => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, n) => expect(value).toBeCloseTo(expected[n] ?? Number.NaN, 9));
};

describe('project', () => {
  it('puts the origin at the origin of the screen', () => {
    close(project(0, 0, 0), [0, 0]);
  });

  it('draws x to the lower right, y to the lower left and z straight up, one unit each', () => {
    const run = iso.cos * iso.unit;
    close(project(1, 0, 0), [run, iso.unit / 2]);
    close(project(0, 1, 0), [-run, iso.unit / 2]);
    close(project(0, 0, 1), [0, -iso.unit]);
  });
});

describe('facesOf', () => {
  it('gives the top, left and right faces of a unit cube', () => {
    const faces = facesOf(cuboid(0, 0, 0, 1, 1, 1));
    expect(formatPoints(faces.top)).toBe('0.0,-40.0 34.6,-20.0 0.0,0.0 -34.6,-20.0');
    expect(formatPoints(faces.left)).toBe('-34.6,20.0 0.0,40.0 0.0,0.0 -34.6,-20.0');
    expect(formatPoints(faces.right)).toBe('34.6,20.0 0.0,40.0 0.0,0.0 34.6,-20.0');
  });
});

describe('boundsOf', () => {
  it('holds every visible corner of the boxes', () => {
    const b = boundsOf([cuboid(0, 0, 0, 1, 1, 1), cuboid(2, 0, 0, 1, 1, 2)]);
    const run = iso.cos * iso.unit;
    close([b.x0, b.y0, b.x1, b.y1], [-run, -40, 3 * run, 80]);
  });
});

describe('placeFootprint', () => {
  it('puts the left screen corner at the given distance, at the given depth', () => {
    const [x, y] = placeFootprint(2.6, 4, 2.75, 2.75);
    expect(x + y).toBeCloseTo(4, 9);
    expect(project(x, y + 2.75, 0)[0]).toBeCloseTo(2.6 * iso.unit, 9);
  });
});

describe('shadowOf', () => {
  it('is the footprint on the ground, moved away from the light', () => {
    const shadow = shadowOf({ x: 0, y: 0, w: 1, d: 1 });
    close(shadow[0] ?? [], project(0.4, 0.1, 0));
    close(shadow[2] ?? [], project(1.4, 1.1, 0));
  });
});

describe('frameRect', () => {
  const panel = { width: 800, height: 600 };

  it('fits the rectangle inside the margin and centres it', () => {
    const rect = { x0: 100, y0: 0, x1: 300, y1: 100 };
    const camera = frameRect(rect, panel);
    expect(camera.scale).toBeCloseTo(Math.min(704 / 200, 504 / 100), 9);
    expect(camera.x + camera.scale * 200).toBeCloseTo(panel.width / 2, 9);
    expect(camera.y + camera.scale * 50).toBeCloseTo(panel.height / 2, 9);
  });

  it('writes a CSS transform', () => {
    expect(cameraTransform({ x: 86.04, y: -1.25, scale: 0.55861 })).toBe(
      'translate(86.0px, -1.3px) scale(0.5586)',
    );
  });
});
