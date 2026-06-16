import Link from 'next/link';
import styles from '@/styles/Button.module.css';

type Variant = 'cherry' | 'ghost';
type Size = 'default' | 'sm';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  variant = 'cherry',
  size = 'default',
  full = false,
  href,
  onClick,
  disabled,
  type = 'button',
  children,
  className = '',
}: ButtonProps) {
  const cls = [
    styles.btn,
    styles[variant],
    size === 'sm' ? styles.sm : '',
    full ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return <Link href={href} className={cls}>{children}</Link>;
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
