import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './Heading.module.css';

export type HeadingSize = 'display' | 'section' | 'title' | 'specimen' | 'project';

const sizeOfLevel = { 1: 'display', 2: 'section', 3: 'title' } as const;

export interface HeadingProps extends ComponentPropsWithoutRef<'h2'> {
  /** The level in the document outline. */
  level: 1 | 2 | 3;
  /** The look; by default it follows the level (display, section, title). */
  size?: HeadingSize;
  /** The longest line, in characters, where the size's default does not fit. */
  measure?: number;
}

/** A heading whose level and look are chosen apart, so the outline stays right. */
export function Heading({ level, size, measure, className, style, ...rest }: HeadingProps) {
  const Element = `h${level}` as const;
  return (
    <Element
      className={clsx(styles[size ?? sizeOfLevel[level]], className)}
      style={measure === undefined ? style : { maxWidth: `${measure}ch`, ...style }}
      {...rest}
    />
  );
}
