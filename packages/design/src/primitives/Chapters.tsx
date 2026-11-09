import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import styles from './Chapters.module.css';

export interface ChapterListProps extends ComponentPropsWithoutRef<'div'> {
  /** Names the group for screen readers: "Chapters of the model". */
  'aria-label': string;
  /** How many chapters sit in the row beside the pause button on a wide screen. */
  count: number;
}

/** The row of chapter buttons, with the pause button first. */
export function ChapterList({ count, className, style, ...rest }: ChapterListProps) {
  const vars = { '--chapter-count': count } as CSSProperties;
  return (
    <div
      role="group"
      className={clsx(styles.list, className)}
      style={{ ...vars, ...style }}
      {...rest}
    />
  );
}

export interface ChapterButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'type'> {
  /** The chapter's number, shown before its name. */
  n: number;
  /** The chapter that plays now. */
  current?: boolean;
  /** A chapter that has played in this run. */
  done?: boolean;
}

/** One chapter: a rule above its number and name; the rule turns magenta while it plays. */
export function ChapterButton({
  n,
  current = false,
  done = false,
  className,
  children,
  ...rest
}: ChapterButtonProps) {
  return (
    <button
      type="button"
      className={clsx(styles.chapter, className)}
      aria-current={current ? 'true' : undefined}
      data-state={done ? 'done' : undefined}
      {...rest}
    >
      <span className={styles.n}>{n}</span> {children}
    </button>
  );
}

export interface PauseButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'type' | 'children' | 'aria-label'
> {
  paused: boolean;
  /** What the button pauses, for its accessible name: "the model". */
  subject: string;
}

/** Holds and resumes the whole model: its label says what a press does next. */
export function PauseButton({ paused, subject, className, ...rest }: PauseButtonProps) {
  return (
    <button
      type="button"
      className={clsx(styles.chapter, styles.pause, className)}
      aria-label={`${paused ? 'Play' : 'Pause'} ${subject}`}
      {...rest}
    >
      {paused ? 'Play' : 'Pause'}
    </button>
  );
}
