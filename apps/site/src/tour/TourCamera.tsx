// The tour's picture: the same plant, still, framed by a camera that moves to
// the part each step of the tour is about. The steps are plain text around it;
// the camera follows the step in the middle of the screen.
import {
  Job,
  Model,
  Plant,
  anchors,
  cameraTransform,
  fixed,
  iso,
  tourCameras,
  tourPanel,
  type Point,
  type TourFocus,
} from '@tosak/design/model';
import { useEffect, useRef, useState } from 'react';
import styles from './TourCamera.module.css';

const point = (p: Point): string => p.map((n) => fixed(n, 1)).join(' ');
const focuses = new Set<string>(Object.keys(tourCameras));
const isFocus = (value: string | undefined): value is TourFocus =>
  value !== undefined && focuses.has(value);

export default function TourCamera() {
  const [focus, setFocus] = useState<TourFocus>('all');
  const figure = useRef<HTMLElement>(null);

  useEffect(() => {
    const tour = figure.current?.closest('[data-tour]');
    const steps = tour ? [...tour.querySelectorAll<HTMLElement>('[data-tour-step]')] : [];
    const first = steps[0];
    if (!first) return;
    const onStep = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const next = (entry.target as HTMLElement).dataset['tourStep'];
          if (entry.isIntersecting && isFocus(next)) setFocus(next);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    // Above the first step, the camera shows the whole plant again.
    const onTop = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting && entry.boundingClientRect.top > 0) setFocus('all');
    });
    for (const step of steps) onStep.observe(step);
    onTop.observe(first);
    return () => {
      onStep.disconnect();
      onTop.disconnect();
    };
  }, []);

  const [x, y] = anchors.land;
  const { from, control, to } = anchors.restoreArc;
  return (
    <figure ref={figure} className={styles.figure} data-focus={focus}>
      <Model view={{ x: 0, y: 0, ...tourPanel }}>
        <g className={styles.camera} style={{ transform: cameraTransform(tourCameras[focus]) }}>
          <Plant />
          <g className={styles.extra} data-extra="road">
            <line
              className={styles.path}
              x1={fixed(x, 1)}
              y1={fixed(anchors.hover[1] + iso.unit, 1)}
              x2={fixed(x, 1)}
              y2={fixed(y, 1)}
            />
            <Job
              kind="A"
              worker="w1"
              slot={2}
              release="new"
              transform={`translate(${point(anchors.hover)})`}
            />
          </g>
          <g className={styles.extra} data-extra="drill">
            <path className={styles.path} d={`M${point(from)} Q${point(control)} ${point(to)}`} />
          </g>
        </g>
      </Model>
    </figure>
  );
}
