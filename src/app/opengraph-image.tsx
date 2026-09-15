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
  /** The lighter half of `--color-primary`, for text on a dark surface. */
  primaryText: '#a8a5ff',
} as const;

/**
 * The app icon, as something Satori can draw.
 *
 * Satori will not follow a URL and will not accept a JSX `<svg>`, so the icon
 * goes in as a data URI. Reading it out of `src/app/icon.svg` — instead of
 * drawing the mark again here — is the whole point of this function: the card
 * and the favicon are then one file, and the violet plate, the corner radius
 * and the cross of nodes can only ever change together.
 *
 * This file used to rebuild the mark from absolutely positioned boxes, and it
 * had drifted from the icon in two ways nothing would have caught: it drew a
 * vertical rule where the icon draws two diagonals, and it never applied the
 * `translate(5.8 5.8) scale(0.85)` the icon wraps its glyph in, so the mark
 * sat up and to the left inside the plate and slightly too large. Two drawings
 * of one shape is one drawing too many, so the plate is gone from here as
 * well: the icon brings its own, at its own `rx`, in its own violet.
 *
 * The icon sits under `src/app/`, which Next does not trace for the module
 * graph of this route, so `next.config.ts` names it in
 * `outputFileTracingIncludes` — without that the file is absent from a
 * deployed standalone build and this read throws at runtime.
 */
async function loadIcon() {
  const svg = await readFile(join(process.cwd(), 'src', 'app', 'icon.svg'));
  return `data:image/svg+xml;base64,${svg.toString('base64')}`;
}

export default async function Image() {
  const icon = await loadIcon();

  return new ImageResponse(
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
        {/*
          The mark is the icon file itself, at 168px — the plate, its corner
          radius and the violet all come from `icon.svg` rather than from
          numbers repeated here. It is a plain `<img>` rather than a
          `next/image` because Satori reads the bytes directly and never
          touches the image optimiser.
        */}
        <img src={icon} width={168} height={168} alt="" />
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
    </div>,
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
