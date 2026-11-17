import type { ReactNode } from 'react';

/*
 * The logos share a grey rounded square, 2 units of ground around what sits
 * on it, and the surface and subtle greys of the component.
 */

/**
 * A squircle tile for the home logo, with the corner that meets the square's
 * corner rounded to follow it.
 */
const TILE = {
  topLeft:
    'M13.00 6.50L12.97 8.85L12.89 9.81L12.75 10.52L12.55 11.10L12.29 11.57L11.97 11.97L11.57 12.29L11.10 12.55L10.52 12.75L9.81 12.89L8.85 12.97L6.50 13.00L6.50 13.00L4.15 12.97L3.19 12.89L2.48 12.75L1.90 12.55L1.43 12.29L1.03 11.97L0.71 11.57L0.45 11.10L0.25 10.52L0.11 9.81L0.03 8.85L0.00 6.50L0 6A6 6 0 0 1 6 0L6.50 0.00L8.85 0.03L9.81 0.11L10.52 0.25L11.10 0.45L11.57 0.71L11.97 1.03L12.29 1.43L12.55 1.90L12.75 2.48L12.89 3.19L12.97 4.15L13.00 6.50Z',
  topRight:
    'M13.00 6.50L12.97 8.85L12.89 9.81L12.75 10.52L12.55 11.10L12.29 11.57L11.97 11.97L11.57 12.29L11.10 12.55L10.52 12.75L9.81 12.89L8.85 12.97L6.50 13.00L6.50 13.00L4.15 12.97L3.19 12.89L2.48 12.75L1.90 12.55L1.43 12.29L1.03 11.97L0.71 11.57L0.45 11.10L0.25 10.52L0.11 9.81L0.03 8.85L0.00 6.50L0.00 6.50L0.03 4.15L0.11 3.19L0.25 2.48L0.45 1.90L0.71 1.43L1.03 1.03L1.43 0.71L1.90 0.45L2.48 0.25L3.19 0.11L4.15 0.03L6.50 0.00L7 0A6 6 0 0 1 13 6Z',
  bottomLeft:
    'M13.00 6.50L12.97 8.85L12.89 9.81L12.75 10.52L12.55 11.10L12.29 11.57L11.97 11.97L11.57 12.29L11.10 12.55L10.52 12.75L9.81 12.89L8.85 12.97L6.50 13.00L6 13A6 6 0 0 1 0 7L0.00 6.50L0.03 4.15L0.11 3.19L0.25 2.48L0.45 1.90L0.71 1.43L1.03 1.03L1.43 0.71L1.90 0.45L2.48 0.25L3.19 0.11L4.15 0.03L6.50 0.00L6.50 0.00L8.85 0.03L9.81 0.11L10.52 0.25L11.10 0.45L11.57 0.71L11.97 1.03L12.29 1.43L12.55 1.90L12.75 2.48L12.89 3.19L12.97 4.15L13.00 6.50Z',
  bottomRight:
    'M13 7A6 6 0 0 1 7 13L6.50 13.00L4.15 12.97L3.19 12.89L2.48 12.75L1.90 12.55L1.43 12.29L1.03 11.97L0.71 11.57L0.45 11.10L0.25 10.52L0.11 9.81L0.03 8.85L0.00 6.50L0.00 6.50L0.03 4.15L0.11 3.19L0.25 2.48L0.45 1.90L0.71 1.43L1.03 1.03L1.43 0.71L1.90 0.45L2.48 0.25L3.19 0.11L4.15 0.03L6.50 0.00L6.50 0.00L8.85 0.03L9.81 0.11L10.52 0.25L11.10 0.45L11.57 0.71L11.97 1.03L12.29 1.43L12.55 1.90L12.75 2.48L12.89 3.19L12.97 4.15L13.00 6.50Z',
};

function Ground({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--disabled)" />
      {children}
    </svg>
  );
}

/** mcp-ui-tools: four tiles, a set of tools. */
export function HomeLogo({ size = 20 }: { size?: number }) {
  return (
    <Ground size={size}>
      <path transform="translate(2 2)" d={TILE.topLeft} fill="var(--surface)" />
      <path
        transform="translate(17 2)"
        d={TILE.topRight}
        fill="var(--subtle)"
      />
      <path
        transform="translate(2 17)"
        d={TILE.bottomLeft}
        fill="var(--subtle)"
      />
      <path
        transform="translate(17 17)"
        d={TILE.bottomRight}
        fill="var(--surface)"
      />
    </Ground>
  );
}

/** Component Code: the preview beside the code. */
export function ComponentCodeLogo({ size = 20 }: { size?: number }) {
  return (
    <Ground size={size}>
      <rect x="2" y="2" width="13" height="28" rx="6" fill="var(--surface)" />
      <rect x="17" y="2" width="13" height="28" rx="6" fill="var(--subtle)" />
    </Ground>
  );
}

/** Orbit: the two rings and the dot that circles them. */
export function OrbitLogo({ size = 20 }: { size?: number }) {
  return (
    <Ground size={size}>
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="2"
      />
      <circle
        cx="16"
        cy="16"
        r="5.5"
        fill="none"
        stroke="var(--subtle)"
        strokeWidth="2"
      />
      <circle
        cx="23.78"
        cy="8.22"
        r="3.4"
        fill="var(--surface)"
        stroke="var(--disabled)"
        strokeWidth="1.6"
      />
    </Ground>
  );
}

/**
 * A tool still to come: the outline of a logo's ground, with a dashed tile
 * where its mark will sit.
 */
export function SoonLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        stroke="var(--disabled)"
      />
      <rect
        x="4.5"
        y="4.5"
        width="23"
        height="23"
        rx="4.5"
        stroke="var(--disabled)"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
