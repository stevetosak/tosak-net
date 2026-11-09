import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import styles from './Readout.module.css';

export interface ReadoutProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** What the model does now. Screen readers announce each change. */
  status: ReactNode;
  /** The id of the status line, for elements that refer to it. */
  statusId?: string;
  /** The clock of the running chapter, as shown: `0:12`. */
  time: string;
  /** Shows the clock; it is hidden while no chapter runs. */
  running?: boolean;
}

/** The line under the model: its status in words, and the clock of the chapter that runs. */
export function Readout({
  status,
  statusId,
  time,
  running = false,
  className,
  ...rest
}: ReadoutProps) {
  return (
    <div className={clsx(styles.readout, className)} {...rest}>
      <p className={styles.status} id={statusId} role="status">
        {status}
      </p>
      <span className={clsx(styles.timer, running && styles.running)} aria-hidden="true">
        {time}
      </span>
    </div>
  );
}
