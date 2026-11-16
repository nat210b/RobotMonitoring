# Coding Standards

Rules for code in this project. They describe how the code is written today; follow them unless a task says otherwise. For visual rules see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), for 3D see [THREEJS-GUIDELINES.md](THREEJS-GUIDELINES.md).

## Next.js version

This is not the Next.js you may know: APIs and conventions can differ. Before writing route, rendering or config code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices (see `AGENTS.md`).

## Project layout

| Path | What lives there |
| --- | --- |
| `app/` | Routes: `page.tsx` (main room), `show/` (presentation), `design/` (UI kit preview) |
| `app/api/v1/` | Route handlers, one folder per resource |
| `app/lib/` | Shared types, validation and data access (see "Client and server code") |
| `app/component/ui/` | Reusable UI kit; import from `app/component/ui` |
| `app/component/<feature>/` | Feature components: `room`, `robot`, `machine`, `settings`, `signature` |

Use the `@/` alias for imports that leave a feature folder (`@/app/lib/robots`). Keep related components, hooks and types together, and do not refactor unrelated code.

## TypeScript

- `strict` is on. No `any`, no implicit `any`, no unchecked `as` casts on data from outside the app (JSON, `localStorage`, request bodies); validate it first, as `validateRobotInput` and `validateRobotStatusInput` do.
- Type component props, function parameters and return values explicitly where inference is not obvious.
- Reuse existing types (`Robot`, `RobotStatusLogEntry`, ...) instead of redeclaring them.
- Fixed sets of values (statuses, modes) are `as const` arrays with a derived union type, defined once in `app/lib` and reused: `INSPECTION_STATUSES`, `ROBOT_STATUSES`. Do not scatter string literals like `"PASS"` through new code when a constant exists.

## Client and server code

- Shared types, limits and validation go in `app/lib/<name>.ts` and must stay free of server-only code.
- Anything that touches MongoDB or the file system goes in `app/lib/<name>.server.ts` and imports `server-only`.
- Route handlers validate input, return JSON with a clear message, and use the right status: `400` invalid body, `422` valid but rejected (for example an unknown robot), `500` server failure (log it, do not leak details).
- Client components say `"use client"`. Do not import `.server.ts` files into them.

## React

- Do not read impure values while rendering: `Date.now()`, `new Date()`, `Math.random()`, `crypto.randomUUID()`. Next.js fails the prerender and React lints it. Start from a neutral value and set the real one in an effect, a timer callback or an event handler.
- Do not call `setState` directly in an effect body. Subscribe and set state in a callback, or compute the value while rendering. Where a one-time load from `localStorage` really needs it, disable the rule on that line with a reason.
- Do not read or write refs during render.
- Wrap browser storage (`localStorage`) in `try`/`catch`; the page must work without it.
- Keep effect cleanups complete: timers, listeners, observers and 3D resources are released on unmount.
- Keep values passed to heavy children (the 3D room, charts) stable with `useMemo` / `useCallback` so a tick elsewhere does not re-render them.

## Performance

- Cap long lists: draw the newest items and add a "show more" control instead of hundreds of nodes.
- Expensive one-time work (rendering 3D thumbnails) happens once, when idle, and is cached.
- When many items arrive at once, show them at once; animate only a few.
- Prefer one timer that wakes at the next change over a timer that ticks every second.

## Code quality

- Names describe what a thing is. Functions do one job. Handle errors explicitly and tell the user when an action fails.
- Do not duplicate logic that already exists in `app/lib` or the UI kit; extend the shared piece instead.
- Avoid new dependencies unless there is no reasonable alternative.
- UI uses the kit in `app/component/ui` (including `Modal` for confirmations, never `confirm()` / `alert()`). Add a missing generic part there first.
- Keep comments for the why, not the what.

## Before you finish

Run these and fix what they report. Do not say something works unless you ran it.

```bash
npx tsc --noEmit
npm run lint
```

Also check the changed screen in both themes and at a narrow width, and the browser console for errors.
