## BugFix Workflow
# Core Principles
 - Always inspect related files before making changes.
 - Identify the root cause before attempting a fix.
 - Fix the actual problem, not just its symptoms.
 - Keep changes minimal and targeted.
 - Preserve existing functionality and project architecture.
 - Avoid unnecessary refactoring or unrelated modifications.
 - Use TypeScript strict typing.
# 1. Investigation First
 - Understand the reported bug and expected behavior.
 - Identify the affected feature and related files.
 - Inspect relevant components, hooks, services, types, and dependencies.
 - Trace the data flow and execution flow.
 - Check existing error logs and console messages when available.
 - Identify the root cause before implementing a fix.

Never modify files before understanding their responsibilities and dependencies.

# 2. Impact Analysis
 - Identify all components affected by the bug.
 - Check shared utilities and dependencies.
 - Check whether the issue affects other features.
 - Inspect related types, interfaces, and enums.
 - Consider potential side effects of the proposed fix.
# 3. Implementation
 - Apply the smallest complete fix.
 - Follow existing coding conventions.
 - Reuse existing functions and utilities.
 - Preserve TypeScript type safety.
 - Avoid introducing unnecessary dependencies.
 - Do not duplicate existing business logic.
 - Do not change unrelated functionality.
# 4. Verification
 - Reproduce the original issue when possible.
 - Verify the fix against the expected behavior.
 - Test related functionality for regressions.
 - Run relevant tests, linting, and TypeScript checks.
 - Check browser console and runtime errors when applicable.
# 5. Three.js Specific Checks

When fixing 3D-related bugs:

 - Inspect the affected scene, camera, renderer, and object hierarchy.
 - Check animation loops and rendering lifecycle.
 - Check event listeners and resize handling.
 - Verify geometry, material, and texture resource management.
 - Check for memory leaks and unnecessary scene recreation.
 - Verify rendering in both Dark and Light themes.
# 6. Reporting

After fixing the bug, report:

 - Root cause.
 - Files inspected.
 - Files modified.
 - Description of the fix.
 - Tests and verification performed.
 - Remaining issues or potential risks.

Do not claim that a bug is fixed or tests pass unless verification confirms it.

# 7. Completion Checklist
 - Related files inspected first.
 - Root cause identified.
 - Impact and dependencies reviewed.
 - Minimal targeted fix implemented.
 - Existing functionality preserved.
 - TypeScript checks pass.
 - Relevant tests pass.
 - No new console or runtime errors.
 - No unrelated files modified.
## Golden Rule

Inspect → Reproduce → Trace → Identify Root Cause → Fix → Verify → Report

Never guess. Never apply blind fixes. Always understand the related code before changing it.