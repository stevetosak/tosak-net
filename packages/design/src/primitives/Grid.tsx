import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { cssVar } from '../tokens/css.ts';
import type { TokenName } from '../tokens/values.ts';
import styles from './Grid.module.css';

type Column = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type SpaceToken = Extract<TokenName, `space-${string}`>;

export interface GridProps extends ComponentPropsWithoutRef<'div'> {
  /** The gap between rows, as a space token. */
  rowGap?: SpaceToken;
  /** How cells sit in their row (`align-items`). */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
}

/** The 12-column grid of the page, with the column gap of the tokens. */
export function Grid({ rowGap, align, className, style, ...rest }: GridProps) {
  const vars = { '--grid-row-gap': rowGap && cssVar(rowGap), alignItems: align } as CSSProperties;
  return <div className={clsx(styles.grid, className)} style={{ ...vars, ...style }} {...rest} />;
}

export interface CellProps extends ComponentPropsWithoutRef<'div'> {
  /** The first column, 1 to 12; by default the cell follows the one before it. */
  start?: Column;
  /** How many columns the cell spans; 12 by default. */
  span?: Column;
  /** Keep the place below the narrow breakpoint, where cells otherwise take the full row. */
  keep?: boolean;
}

/** One cell of a `Grid`, placed by its first column and its span. */
export function Cell({ start, span, keep = false, className, style, ...rest }: CellProps) {
  const vars = { '--cell-start': start, '--cell-span': span } as CSSProperties;
  return (
    <div
      className={clsx(styles.cell, keep && styles.keep, className)}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
}
