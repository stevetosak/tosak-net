import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './Fact.module.css';

/** A measured statement. Put each figure in `<b>`: it is set heavy, with tabular numerals. */
export function Fact({ className, ...rest }: ComponentPropsWithoutRef<'p'>) {
  return <p className={clsx(styles.fact, className)} {...rest} />;
}
