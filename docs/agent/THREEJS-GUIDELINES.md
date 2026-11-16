## Three.js Guidelines
# Core Rules
- Follow the installed Three.js version.
- Inspect existing scene architecture before making changes.
- Keep Three.js logic separate from UI components where practical.
- Reuse existing geometries and materials.
- Avoid unnecessary scene recreation.
- Dispose of geometries, materials, textures, and renderers appropriately.
- Handle resize and component unmount.
- Avoid unnecessary rendering operations.
- Keep 3D visualization responsive.
# Robot Visualization
- Maintain consistent robot coordinates and positioning.
- Keep robot identification consistent with monitoring data.
- Distinguish robot operational states visually.
- PASS = Green.
- FAIL = Red.
- WARNING = Amber.
- IDLE = Gray.
# Theme
- Support Dark and Light environments.
- Use centralized theme tokens where applicable.
- Keep scene lighting and background consistent with the active theme.
# Performance
- Avoid unnecessary React state updates.
- Avoid creating duplicate rendering loops.
- Clean up event listeners and animation frames.
- Avoid memory leaks.
- Optimize rendering based on actual monitoring requirements.