AGENTS.md
Project Identity
Project: CP-Innovation AI Team
Application: Futuristic Robot Monitoring Dashboard
Stack: Next.js, React, TypeScript, Three.js
Design: Futuristic Industrial Monitoring
Layout: Responsive, 100dvh
Themes: Dark / Light
Critical Rules
Read the installed Next.js documentation before implementing Next.js features.
Follow the actual installed package versions.
Inspect existing code before modifying or creating components.
Reuse existing components, utilities, and design tokens.
Do not introduce unnecessary dependencies.
Preserve existing architecture unless a change is necessary.
Do not fabricate real-time robot data.
Avoid unnecessary refactoring outside the requested task.
Design Rules
PASS = Green.
FAIL = Red.
WARNING = Amber.
INFO = Blue / Cyan.
IDLE = Gray.
Support Dark and Light themes.
Follow the centralized design system.
Maintain responsive layouts without unnecessary page scrolling.
Branding Rules
Team: CP-Innovation
Division: AI Team
Theme-aware badge:
Dark: public/badge-dark.svg
Light: public/badge-light.svg
Signature source: app/component/signature/BrandMarks.tsx
Application icon: public/app-icon.svg
Documentation Routing

Read only the relevant documentation for the current task:

Task	Required Documentation
UI / Styling	docs/agent/DESIGN-SYSTEM.md
Architecture / Data Flow	docs/agent/ARCHITECTURE.md
Three.js / 3D	docs/agent/THREEJS-GUIDELINES.md
Coding / Refactoring	docs/agent/CODING-STANDARDS.md

If a task spans multiple areas, read the relevant documents only.

Implementation Workflow
Understand the requested task.
Inspect relevant existing files.
Read applicable documentation.
Implement the smallest complete solution.
Reuse existing components and utilities.
Run relevant checks.
Report changed files and verification results.
Performance Rules
Avoid unnecessary React re-renders.
Avoid unnecessary client-side JavaScript.
Clean up Three.js resources.
Avoid duplicate implementations.
Do not read unrelated project documentation.
Completion Criteria

A task is complete when:

Implementation matches the requirements.
Existing functionality is preserved.
Relevant checks pass.
No unnecessary files or dependencies are introduced.
Any unresolved issues are reported clearly.