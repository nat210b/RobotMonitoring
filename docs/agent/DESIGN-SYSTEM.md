# Robot Monitoring Design System

This is the reference for the visual language and reusable UI in this project. The interactive examples live at [`/design`](../../app/design/page.tsx); shared styles and tokens live in [`app/globals.css`](../../app/globals.css), and reusable controls live in [`app/component/ui/`](../../app/component/ui/).

## Product identity

- Product: **Robot Monitoring** for the **Robot Combined Room**.
- Team: **CP-Innovation · AI Team**. Use the project signature assets and shared components in `app/component/signature/BrandMarks.tsx` for the team badge, theme-aware marks, and app icon.
- The team badge uses `public/badge-light.svg` / `public/badge-dark.svg`, follows the selected theme, and opens the developer credits modal.
- The shared app frame uses a compact header, flexible workspace, and pinned footer. Keep the main monitoring experience within one dynamic viewport (`100dvh`); allow inner panels to scroll when content exceeds their space.
- Footer credit format: `Developed by CP-Innovation · AI Team ({developerName}) ID: {appID} · v{package.version} | BuildID: {build_ID}`. The app icon is `public/app-icon.svg`.

## Visual direction

Use a futuristic operations HUD: cool cyan accents, dark or light layered surfaces, a faint technical grid, fine borders, restrained glow, and square geometry. Reserve glow for focus, active selection, and status emphasis. Keep text and controls readable over the background.

### Color tokens

| Token | Light | Dark / use |
| --- | --- | --- |
| `--brand` | `#38BDF8` | Primary cyan accent in both themes |
| `--brand-hover` | `#0EA5E9` | Hover accent |
| `--brand-active` | `#0284C7` | Pressed accent |
| `--brand-soft` | `#E3F4FD` | Dark: `#0F3350`; selected and soft brand fills |
| `--on-brand` | `#062A40` | Text on primary brand fill |
| `--background` | `#FFFFFF` | Dark: `#0E1620`; page backdrop |
| `--surface` | `#FFFFFF` | Dark: `#152130`; panels and controls |
| `--surface-2` | `#F5F8FD` | Dark: `#1B2A3B`; secondary panels |
| `--surface-3` | `#ECF1FA` | Dark: `#23344A`; hover and nested surfaces |
| `--foreground` | `#1E2A38` | Dark: `#E8EEF2`; primary text |
| `--muted` | `#78878B` | Supporting text |
| `--border` | `#B6DCF2` | Dark: `#1F5C85`; lines and dividers |
| `--success` | `#16A34A` | PASS state; dark text/dots may use `--success-light` (`#22C55E`, dark `#4ADE80`) |
| `--danger` | `#D64545` | FAIL state and destructive actions |
| `--warning` | `#D98E04` | Maintenance and caution |
| `--info` | `#6366F1` | Informational state |

Use semantic tokens (`text-danger`, `bg-success`, and `Badge` tones) instead of hard-coded status colors. Pair color with a visible label or icon: PASS is green, FAIL is red, and maintenance is amber.

### Theme and shape

- Support both light and dark themes. `app/component/settings/useSettings.ts` stores the choice and applies `data-theme` to the document root; follow the CSS token values rather than adding per-component theme overrides.
- When no explicit theme is set, CSS follows `prefers-color-scheme`.
- `--radius-card` and `--radius-control` are both `0px`. Keep cards, fields, badges, and buttons square; circular indicators such as status dots may stay round.
- Focus-visible controls use a 2px brand outline with 2px offset.

### Typography and layout

- Geist Sans is the interface font; Geist Mono is for IDs, timestamps, and technical values.
- Use `hud-title` for compact uppercase section labels. Use sentence case for explanatory text and action labels.
- The shared `Grid` / `Col` system is a responsive 12-column container grid with 480px, 720px, and 1024px container breakpoints. Prefer it for multi-column component examples and forms.
- At narrow widths, wrap header actions and stack panels. Keep the 3D room flexible; overlays should scroll internally and avoid pushing the canvas out of view.

## HUD surfaces and motion

- `.hud` gives panels a subtle tinted gradient, brand glow, and corner brackets.
- `.hud-glass` is the chamfered translucent treatment for timeline cards and overlays; retain readable contrast and clear boundaries.
- `.hud-bar` is for the app header/footer strips. `.hud-title` sets the tracked uppercase HUD label style.
- `.hud-success` and `.hud-danger` add green and red emphasis for PASS and FAIL results. A log card takes its status colour for its outline, tabs, dividers and picture frame.
- Use the shared motion tokens (`--ease`, `--duration-fast`, `--duration-base`, `--duration-slow`). Honor `prefers-reduced-motion`; the global stylesheet reduces transitions and disables the status pulse when requested.

## Component patterns

- Import shared primitives from `app/component/ui`: `Button`, `Badge`, `Card`, `Sidebar`, `Modal`, `Toggle`, `StatCard`, `Clock`, form controls, `DataTable`, charts, and layout helpers.
- Use `Button` variants `primary`, `secondary`, `ghost`, and `danger`; preserve built-in disabled, loading, and focus-visible behavior.
- Use semantic `Badge` tones: `success` for PASS, `danger` for FAIL, `warning` for MAINTAIN, and `brand` for selected/online metadata.
- `Card` provides optional title, description, actions, and footer. `Sidebar` is a docked panel with a scrolling body. `Modal` uses a native dialog and handles focus, Escape, and inert background behavior.
- `Toggle` is the on/off control (there is no checkbox): an angular HUD switch with `role="switch"`, a label, an optional hint, an ON/OFF readout, and sizes `md` and `sm` (dense lists). Disabled toggles fade and cannot be pressed.
- `Modal` also takes `width` and `height` (Tailwind class literals; default width `w-[26rem]`, height up to 80% of the screen) and a `footer` pinned under the scrolling body for actions and status. It keeps a 1rem margin plus the device safe area on every side. Use it for confirmations too, not the browser's `confirm()`.
- `StatCard` shows a spaced-out label over a large glowing number, tones `brand`, `success`, `danger`, `warning`; use it for PASS / FAIL counts.
- `Clock` is the live HUD clock (24-hour time, English date). It renders empty until mounted, so it never reads the time during render; do the same for any time-based UI to avoid prerender errors.
- Keep controls labeled, keyboard-operable, and supplied with accessible names. Do not rely on color alone to communicate robot state.

## Machine visualization

The combined-room view and assembly previews use Three.js. Reuse the existing machine components and room layout data; do not approximate calibrated machine positions or dimensions with decorative substitutes. Keep camera controls and machine overlays usable at responsive sizes.

## Keep this guide accurate

When changing shared tokens or component patterns, update this document and the `/design` examples together. Treat `app/globals.css` and the reusable component implementations as the source of truth for exact values and behavior.
