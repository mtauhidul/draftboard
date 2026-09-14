import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { SITE_NAME } from '@/lib/site';

/**
 * The link-preview card, at the size every social platform crops to.
 *
 * It is generated rather than committed as a PNG so it can be written in the
 * app's own language — the same Assistant faces the interface is set in, the
 * same violet plate as the app icon, the same surface colours — instead of a
 * screenshot that goes stale the moment the UI moves.
 *
 * The palette below is a copy of `globals.css`, which is the one place it
 * could not be read from: Satori parses a deliberately small subset of CSS and
 * will not resolve custom properties, and this file cannot import a stylesheet
 * anyway. Each value is annotated with the token it mirrors, so a palette
 * change has somewhere to look.
 */
export const alt = `${SITE_NAME} — a private, offline sketch board`;

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

/**
 * Reads a font out of `public/fonts`.
 *
 * Satori cannot fetch a font over the network and cannot be handed a URL, so
 * the bytes have to be loaded here. `process.cwd()` is the project root both
 * during `next build` and at runtime, which is what makes this work in either;
 * a path relative to this file would only be correct for the first of them.
 *
 * The two faces below are `.ttf` while the app itself is served `.woff2`, and
 * that is not duplication for its own sake: the image renderer accepts only
 * `ttf`, `otf` and `woff`, and rejects `woff2` outright with "Unsupported
 * OpenType signature wOF2". The `.ttf` files are the same two faces — the
 * woff2 ones decompressed, nothing re-cut — so the card is set in exactly the
 * typeface the interface is, rather than in a lookalike.
 */
function loadFont(file: string) {
  return readFile(join(process.cwd(), 'public', 'fonts', file));
}

const COLORS = {
  /** `--background` in the `.dark` block — the surface the app opens on. */
  surface: '#121212',
  /** `--foreground` — headings and body copy. */
  text: '#e3e3e8',
  /** `--muted-foreground` — the supporting line under the headline. */
  muted: '#b8b8b8',
  /** `--color-primary` — the app icon's plate. */
  primary: '#6965db',
  /** The lighter half of the same accent, for text on a dark surface. */
  primaryText: '#a8a5ff',
} as const;

/**
 * The mark from `src/app/icon.svg`: four nodes on a cross.
 *
 * Built from absolutely positioned boxes rather than an inline `<svg>` because
 * Satori renders flexbox and absolute positioning predictably and its SVG
 * support is narrower — the geometry also stays readable as numbers, which is
 * what makes it checkable by comparing the two drawings' arithmetic.
 *
 * `icon.svg` draws a 24-unit mark inside a 32-unit square, so every position
 * and length here is a unit from that file multiplied by `plate / 32`. Writing
 * it that way keeps the correspondence to the icon legible instead of leaving
 * a row of unexplained pixel values.
 */
function LogoMark() {
  const plate = 168;
  const scale = plate / 32;
  const white = { position: 'absolute', background: '#ffffff', borderRadius: 999 } as const;

  // The icon's stroke is 2.5 units and its end nodes are r=2, drawn on the two
  // rules' centre lines — x=12 and y=12 for the cross as a whole.
  const stroke = 2.5 * scale;
  const node = 4 * scale;
  const ruleStart = 6 * scale;
  const ruleLength = 12 * scale;

  return (
    <div
      style={{
        position: 'relative',
        width: plate,
        height: plate,
        display: 'flex',
      }}
    >
      {[
        // the horizontal rule: from x=6 to x=18, on the y=12 centre line
        { top: 12 * scale - stroke / 2, left: ruleStart, width: ruleLength, height: stroke },
        // the vertical rule: from y=6 to y=18, on the x=12 centre line
        { top: ruleStart, left: 12 * scale - stroke / 2, width: stroke, height: ruleLength },
        // the four nodes, one at each end of the two rules
        { top: 12 * scale - node / 2, left: 4 * scale - node / 2, width: node, height: node },
        { top: 12 * scale - node / 2, left: 20 * scale - node / 2, width: node, height: node },
        { top: 4 * scale - node / 2, left: 12 * scale - node / 2, width: node, height: node },
        { top: 20 * scale - node / 2, left: 12 * scale - node / 2, width: node, height: node },
      ].map((box, i) => (
        <div key={i} style={{ ...white, ...box }} />
      ))}
    </div>
  );
}

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          // The dark default, so the card looks like the thing it advertises.
          background: COLORS.surface,
          padding: 76,
          fontFamily: 'Assistant',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 168,
              height: 168,
              // The icon's own corner radius is 7/32 of its width, so scale it
              // rather than guessing at a pixel value that happens to fit.
              borderRadius: (7 / 32) * 168,
              background: COLORS.primary,
            }}
          >
            <LogoMark />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: -0.5,
              }}
            >
              {SITE_NAME}
            </div>
            <div style={{ fontSize: 28, color: COLORS.primaryText }}>
              a local-first sketch board
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.15,
              letterSpacing: -1.5,
            }}
          >
            Draw freely. Keep it to yourself.
          </div>
          <div style={{ fontSize: 30, color: COLORS.muted, lineHeight: 1.4 }}>
            Every board is saved in your own browser. No account, no server,
            nothing uploaded.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      /**
       * The same two weights the card draws in, and no more: Satori does no
       * font matching of its own — it takes the first face registered for a
       * weight — so a face nothing references only enlarges the bundle that
       * has to be carried into the renderer.
       */
      fonts: [
        {
          name: 'Assistant',
          data: await loadFont('Assistant-Regular.ttf'),
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Assistant',
          data: await loadFont('Assistant-Bold.ttf'),
          weight: 700,
          style: 'normal',
        },
      ],
    }
  );
}
