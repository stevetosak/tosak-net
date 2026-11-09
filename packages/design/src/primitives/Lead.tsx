import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './Lead.module.css';

/** The sentence or two under a heading that says what the section is about. */
export function Lead({ className, ...rest }: ComponentPropsWithoutRef<'p'>) {
  return <p className={clsx(styles.lead, className)} {...rest} />;
}
