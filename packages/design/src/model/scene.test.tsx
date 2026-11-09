// The model kit against the accepted prototype: reference/index.html is the
// output of reference/parts.py, so every point the kit draws for the same scene
// must be the same, to the decimal the generator writes.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cameraTransform } from './camera.ts';
import { IsoBox, Model } from './Model.tsx';
import { Plant } from './Plant.tsx';
import {
  anchors,
  jobShapes,
  labelPositions,
  plantView,
  tourCameras,
  workerIds,
  type TourFocus,
} from './scene.ts';
import { fixed, type Point } from './projection.ts';

const page = readFileSync(new URL('../../../../reference/index.html', import.meta.url), 'utf8');

function match(source: string, pattern: RegExp, what: string): RegExpExecArray {
  const found = pattern.exec(source);
  if (!found) throw new Error(`reference/index.html has no ${what}`);
  return found;
}

const hero = match(page, /<svg class="model model--hero".*?<\/svg>/s, 'hero model')[0];
const tour = match(page, /<svg class="model model--tour".*?<\/svg>/s, 'tour model')[0];
const [, heroDefs = '', heroScene = ''] = match(
  hero,
  /<defs>(.*?)<\/defs>(.*?)<g class="air">/s,
  'hero scene',
);

/** What a renderer drew, as the generator writes it: polygon points and translations, in order. */
function geometry(markup: string): string[] {
  return [...markup.matchAll(/points="([^"]+)"|transform="translate\(([^)]+)\)"/g)].map(
    ([, points, translate]) => points ?? `translate ${translate ?? ''}`,
  );
}

const rounded = (point: Point): number[] => point.map((n) => Number(fixed(n, 1)));
/** The numbers in a path or a translation, or in the values of attributes. */
const numbers = (text: string): number[] =>
  [...text.replace(/[a-z]\w*=/gi, ' ').matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);

describe('the plant against the prototype', () => {
  it('draws every face, shadow and job of the hero at the same points, in the same order', () => {
    const expected = geometry(heroScene);
    expect(expected.length).toBeGreaterThan(80);
    expect(geometry(renderToStaticMarkup(<Plant />))).toEqual(expected);
  });

  it('has the same view box', () => {
    const [, viewBox] = match(hero, /viewBox="([^"]+)"/, 'hero view box');
    const svg = renderToStaticMarkup(<Model view={plantView} />);
    expect(svg).toContain(`viewBox="${viewBox ?? ''}"`);
  });

  it('draws the block, the data stack and the ticket as its templates do', () => {
    const template = (id: string): string =>
      match(heroDefs, new RegExp(`<g id="tpl-${id}".*?</g></g>`, 's'), `template ${id}`)[0];
    const drawn = (kind: keyof typeof jobShapes): string[] =>
      geometry(
        renderToStaticMarkup(
          <g>
            {jobShapes[kind].map((s, n) => (
              <IsoBox key={n} shape={s} />
            ))}
          </g>,
        ),
      );
    expect(drawn('A')).toEqual(geometry(template('block')));
    expect(drawn('data')).toEqual(geometry(template('data')));
    expect(drawn('ticket')).toEqual(geometry(template('ticket')));
  });

  it('gives the hero motion the same anchors', () => {
    const [, json = '{}'] = match(hero, /data-meta='([^']+)'/, 'hero meta');
    const meta = JSON.parse(json) as Record<string, unknown>;
    expect(meta).toEqual({
      slots: Object.fromEntries(workerIds.map((id) => [id, anchors.slots[id].map(rounded)])),
      vault: rounded(anchors.vaultTop),
      start: rounded(anchors.arrival),
      door: rounded(anchors.doorThrough),
      tip: rounded(anchors.blockTip),
      ticket: rounded(anchors.towerTop),
    });
  });

  it('frames each tour step with the same camera', () => {
    const steps = [...page.matchAll(/data-focus="(\w+)" data-cam="([^"]+)"/g)];
    expect(steps.length).toBeGreaterThan(3);
    for (const [, focus = '', transform] of steps) {
      expect(cameraTransform(tourCameras[focus as TourFocus]), focus).toBe(transform);
    }
    const [, start] = match(tour, /<g class="cam" style="transform: ([^"]+)">/, 'tour camera');
    expect(cameraTransform(tourCameras.all)).toBe(start);
  });

  it('gives the tour the same drop, door path and restore arc', () => {
    const [, drop = ''] = match(tour, /<line class="drop" ([^/]+)\/>/, 'drop line');
    const [, hover = ''] = match(
      tour,
      /class="blk is-new" transform="translate\(([^)]+)\)"/,
      'hover',
    );
    const [, arc = ''] = match(tour, /<path class="arc" d="([^"]+)"/, 'restore arc');
    const dots = [...tour.matchAll(/<circle r="5" cx="([^"]+)" cy="([^"]+)"\/>/g)];
    const { land, restoreArc, arrival, doorThrough } = anchors;
    const hovering = rounded(anchors.hover);

    expect(numbers(hover)).toEqual(hovering);
    expect(numbers(drop)).toEqual(
      [land[0], anchors.hover[1] + 40, land[0], land[1]].map((n) => Number(fixed(n, 1))),
    );
    expect(numbers(arc)).toEqual(
      [restoreArc.from, restoreArc.control, restoreArc.to].flatMap(rounded),
    );
    expect(dots.map(([, cx, cy]) => [Number(cx), Number(cy)])).toEqual(
      [0.15, 0.5, 0.85].map((f) =>
        rounded([
          arrival[0] + (doorThrough[0] - arrival[0]) * f,
          arrival[1] + (doorThrough[1] - arrival[1]) * f,
        ]),
      ),
    );
  });

  it('puts the captions under the same parts', () => {
    const positions = [...page.matchAll(/<span style="--x: ([\d.]+)%">/g)].map(([, x]) => x);
    expect(positions).toEqual(
      (['door', 'workers', 'control', 'vault'] as const).map((part) =>
        fixed(labelPositions[part], 2),
      ),
    );
  });
});

describe('a model without a title', () => {
  it('is hidden from assistive technology', () => {
    const svg = renderToStaticMarkup(<Model view={plantView} />);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
  });

  it('with a title, is an image named by it', () => {
    const svg = renderToStaticMarkup(<Model view={plantView} title="The plant" />);
    const [, id] = /aria-labelledby="([^"]+)"/.exec(svg) ?? [];
    expect(svg).toContain('role="img"');
    expect(svg).toContain(`<title id="${id ?? ''}">The plant</title>`);
  });
});
