import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './Button.module.css';

interface Look {
  /** Primary is the one main action of a section; secondary is outlined. */
  variant?: 'primary' | 'secondary';
}

export type ButtonLinkProps = Look & ComponentPropsWithoutRef<'a'> & { href: string };
export type ButtonActionProps = Look & ComponentPropsWithoutRef<'button'> & { href?: never };
export type ButtonProps = ButtonLinkProps | ButtonActionProps;

/** A pill-shaped action: a link when it has an `href`, a button when it does something here. */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant = 'primary', className, ...rest } = props;
    return <a className={clsx(styles.button, styles[variant], className)} {...rest} />;
  }
  const { variant = 'primary', className, type = 'button', ...rest } = props;
  return (
    <button type={type} className={clsx(styles.button, styles[variant], className)} {...rest} />
  );
}
