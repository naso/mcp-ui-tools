import type { ComponentType, ReactNode } from 'react';

import { MENU } from './pages';

/*
 * The stencils to paint with: each page's logo, and a few plain shapes. Each
 * is drawn as the paint it lets through, in the logos' grey on 32 units. A
 * plain shape has nothing cut all the way round, so its sheet stays in one
 * piece without bridges.
 */

/** A shape, with its corners rounded by a line around it. */
function Shape({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="var(--disabled)"
      stroke="var(--disabled)"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** The graffiti's smiley, as it is written: two dabs and a bracket. */
function Smiley({ size = 20 }: { size?: number }) {
  return (
    <Shape size={size}>
      <circle cx="9" cy="10.5" r="2" />
      <circle cx="9" cy="21.5" r="2" />
      <path
        d="M17.5 4.5Q29 16 17.5 27.5"
        fill="none"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
    </Shape>
  );
}

function Star({ size = 20 }: { size?: number }) {
  return (
    <Shape size={size}>
      <path d="M16 3.4L19.29 12.07L28.55 12.52L21.33 18.33L23.76 27.28L16 22.2L8.24 27.28L10.67 18.33L3.45 12.52L12.71 12.07Z" />
    </Shape>
  );
}

function Arrow({ size = 20 }: { size?: number }) {
  return (
    <Shape size={size}>
      <path d="M4.5 12.5H17V6.2L28.2 16L17 25.8V19.5H4.5Z" />
    </Shape>
  );
}

function Crown({ size = 20 }: { size?: number }) {
  return (
    <Shape size={size}>
      <path d="M5.5 25.5L4 10.5L11 16.5L16 6.5L21 16.5L28 10.5L26.5 25.5Z" />
    </Shape>
  );
}

export const STENCILS: {
  name: string;
  Shape: ComponentType<{ size?: number }>;
}[] = [
  ...MENU.map(({ name, Logo }) => ({ name, Shape: Logo })),
  { name: 'Smiley', Shape: Smiley },
  { name: 'Star', Shape: Star },
  { name: 'Arrow', Shape: Arrow },
  { name: 'Crown', Shape: Crown },
];

/**
 * A stencil's shape as an image, from the `svg` that draws it. Its grey is a
 * colour of the page's, which an image on its own doesn't have, so it is
 * drawn in black.
 */
export async function cutOf(svg: SVGSVGElement) {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  // Large, for browsers that scale an image's pixels rather than redraw it.
  copy.setAttribute('width', '1024');
  copy.setAttribute('height', '1024');
  const image = new Image();
  image.src = `data:image/svg+xml,${encodeURIComponent(
    new XMLSerializer()
      .serializeToString(copy)
      .replaceAll('var(--disabled)', '#000'),
  )}`;
  await image.decode();
  return image;
}
