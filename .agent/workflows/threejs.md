# Three.js Development Workflow

When implementing 3D features:

- Read docs/agent/THREEJS-GUIDELINES.md.
- Inspect the existing Three.js implementation.
- Identify affected scenes, components, and resources.
- Preserve existing scene architecture.
- Implement only the required changes.
- Verify rendering, resizing, and cleanup.
- Check for rendering errors and resource leaks.

## Building a new machine model from drawings

The user supplies the machine as a PDF with five views: ISO, Front, Back, Left and Right. When a task includes one:

- Read all five views before modelling. Take proportions and positions from the Front / Back / Left / Right views, and use ISO to check the overall shape and how the parts fit together.
- Follow the existing machine layout under `app/component/machine/<MachineName>/` (an `index.tsx` viewer component and a `model.ts` that builds the scene), reusing shared pieces from `app/component/machine/parts.ts`.
- Make the model a reusable component that works on its own (like the assemblies shown on `/design`) and can also be placed in the room (`app/component/room/model.ts`) without changes to the model itself.
- Do not approximate calibrated dimensions or positions with decorative substitutes. If a view is unclear or two views disagree, ask the user instead of guessing.
- Compare the result against each of the five views, then verify rendering, resizing and cleanup as above.

Read DESIGN-SYSTEM.md only when the task affects visual styling or theme integration.
