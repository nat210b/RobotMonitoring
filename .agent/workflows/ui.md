# UI Development Workflow

When implementing UI features:

- Read docs/agent/DESIGN-SYSTEM.md.
- Inspect existing components and styling conventions.
- Reuse existing components where possible. Mainly use the reusable components in `app/component/ui`; if a generic part is missing, add it there first and then use it.
- Support Dark and Light themes.
- Maintain responsive behavior.
- Follow the 100 dvh application layout.
- Avoid introducing unnecessary dependencies.
- Verify the affected UI before completion.
- When a shared component or token changes, update docs/agent/DESIGN-SYSTEM.md and the `/design` page examples together.

Do not read the Three.js guidelines unless the task involves 3D visualization.
