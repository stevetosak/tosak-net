import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './Container.module.css';

type ContainerElement = 'div' | 'header' | 'main' | 'section' | 'footer';

export interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  /** The element to render; a section of the page usually wants `section`. */
  as?: ContainerElement;
}

/** The page's width: centred, at most `--container` wide, with the gutter on both sides. */
export function Container({ as: Element = 'div', className, ...rest }: ContainerProps) {
  return <Element className={clsx(styles.container, className)} {...rest} />;
}
