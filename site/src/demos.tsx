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

export function Toggle({
  label,
  checked = false,
  disabled = false,
}: {
  label: string;
  checked?: boolean;
  disabled?: boolean;
}) {
  const [on, setOn] = useState(checked);
  const [from, setFrom] = useState(checked);
  // A new `checked` from the code sets it again.
  if (from !== checked) {
    setFrom(checked);
    setOn(checked);
  }
  return (
    <label className="toggle" data-disabled={disabled || undefined}>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => setOn(!on)}
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
