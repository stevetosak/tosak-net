import { clsx } from 'clsx';
import { useId, type ComponentPropsWithoutRef } from 'react';
import type { ViewBox } from './scene.ts';
import {
  facesOf,
  fixed,
  formatPoints,
  shadowOf,
  type Cuboid,
  type Footprint,
} from './projection.ts';
import styles from './model.module.css';

/** The colours of a box's faces: each has a top, a left and a right token. */
export type Material = 'block' | 'slab' | 'door' | 'tower' | 'light';

export interface ModelProps extends Omit<ComponentPropsWithoutRef<'svg'>, 'viewBox'> {
  view: ViewBox;
  /** The model's accessible name. Without one, the model is decoration and hidden from assistive technology. */
  title?: string;
}

/** The root of an isometric model: an SVG that fills its width. */
export function Model({ view, title, className, children, ...rest }: ModelProps) {
  const titleId = useId();
  const name =
    title === undefined
      ? ({ 'aria-hidden': true, focusable: 'false' } as const)
      : ({ role: 'img', 'aria-labelledby': titleId } as const);
  return (
    <svg
      className={clsx(styles.model, className)}
      viewBox={[view.x, view.y, view.width, view.height].map((n) => fixed(n, 1)).join(' ')}
      {...name}
      {...rest}
    >
      {title !== undefined && <title id={titleId}>{title}</title>}
      {children}
    </svg>
  );
}

export interface IsoBoxProps extends Omit<ComponentPropsWithoutRef<'g'>, 'children'> {
  shape: Cuboid;
  material?: Material;
}

/** A box: its left, right and top faces, drawn in that order so the top is last. */
export function IsoBox({ shape, material = 'block', className, ...rest }: IsoBoxProps) {
  const { top, left, right } = facesOf(shape);
  return (
    <g className={clsx(styles.box, styles[material], className)} {...rest}>
      <polygon className={styles.left} points={formatPoints(left)} />
      <polygon className={styles.right} points={formatPoints(right)} />
      <polygon className={styles.top} points={formatPoints(top)} />
    </g>
  );
}

/** The soft shadow that a part casts on the ground. Draw it before the part. */
export function Shadow({ footprint }: { footprint: Footprint }) {
  return <polygon className={styles.shadow} points={formatPoints(shadowOf(footprint))} />;
}
