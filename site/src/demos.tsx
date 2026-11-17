import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export function Button({
  variant = 'primary',
  size = 'medium',
  radius = 8,
  disabled = false,
  children,
}: {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  radius?: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      style={{ '--radius': `${radius}px` } as CSSProperties}
    >
      {children}
    </button>
  );
}

/**
 * A switch with a label. Given `onCheckedChange`, as Component Code passes,
 * `checked` is the code's to set, so switching it rewrites the code.
 */
export function Toggle({
  label,
  checked = false,
  disabled = false,
  onCheckedChange,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const [own, setOwn] = useState(checked);
  const on = onCheckedChange ? checked : own;
  return (
    <label className="toggle" data-disabled={disabled || undefined}>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => (onCheckedChange ?? setOwn)(!on)}
      />
      {label}
    </label>
  );
}

const TONES = {
  neutral: 'var(--muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
};

export function Badge({
  tone = 'neutral',
  count,
  children,
}: {
  tone?: keyof typeof TONES;
  count?: number;
  children: ReactNode;
}) {
  return (
    <span className="badge" style={{ '--tone': TONES[tone] } as CSSProperties}>
      {children}
      {count ? <b>{count}</b> : null}
    </span>
  );
}
