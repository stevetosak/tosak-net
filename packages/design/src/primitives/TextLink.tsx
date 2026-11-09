import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './TextLink.module.css';

export type TextLinkProps = ComponentPropsWithoutRef<'a'> & { href: string };

/** A link that stands alone, outside running text: bold, with the accent underline. */
export function TextLink({ className, ...rest }: TextLinkProps) {
  return <a className={clsx(styles.link, className)} {...rest} />;
}
