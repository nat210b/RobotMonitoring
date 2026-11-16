## Feature Development Workflow
# Core Principles
 - Develop using TypeScript with strict type safety.
 - Prefer explicit types over any.
 - Use ENUM values for predefined constants and fixed states.
 - Keep the implementation simple, readable, and maintainable.
 - Follow existing project architecture and conventions.
 - Design features to be easy to extend and manage.
 - Avoid unnecessary abstractions and duplicated logic.
# 1. TypeScript Standards
 - Define explicit types and interfaces for application data.
 - Avoid implicit any and unsafe type assertions.
 - Reuse existing types when possible.
 - Keep type definitions separate from business logic.
 - Use strict typing for function parameters, return values, and component props.
# 2. Enum Management
Use TypeScript enums for fixed and predefined values.
Create separate enum definitions for each logical domain or data category.
Do not combine unrelated enums into a single file.
Avoid scattering hardcoded string or numeric values throughout the application.
Reuse centralized enum definitions across components and services.
Enum Organization
text
src/
└── types/
    ├── enums/
    │   ├── RobotStatus.enum.ts
    │   ├── RobotMode.enum.ts
    │   ├── ConnectionStatus.enum.ts
    │   └── TaskStatus.enum.ts
    │
    ├── interfaces/
    │   ├── Robot.interface.ts
    │   ├── Task.interface.ts
    │   └── Monitoring.interface.ts
    │
    └── index.ts

Enum Example
typescript
// RobotStatus.enum.ts

export enum RobotStatus {
  PASS = "PASS",
  FAIL = "FAIL",
  WARNING = "WARNING",
  IDLE = "IDLE",
}

typescript
// RobotMode.enum.ts

export enum RobotMode {
  AUTO = "AUTO",
  MANUAL = "MANUAL",
  MAINTENANCE = "MAINTENANCE",
  EMERGENCY = "EMERGENCY",
}

# 3. Data Separation

Separate data definitions according to their responsibilities.

 - types/: TypeScript types and interfaces.
 - enums/: Enumerations and predefined values.
 - constants/: Application-wide constant values.
 - data/: Static data and mock data.
 - services/: API communication and external services.
 - hooks/: Reusable React hooks.
 - utils/: Reusable utility functions.

Do not mix mock data, API logic, UI components, and type definitions in the same file unless there is a clear reason.

# 4. Feature Organization
 - Organize code by feature or domain when appropriate.
 - Keep related components, hooks, services, and types logically grouped.
 - Avoid oversized components.
 - Separate UI rendering from business logic.
 - Reuse shared components instead of duplicating implementations.
 - Keep feature dependencies clear and predictable.
# 5. Project Management

For every new feature:

 - Understand the requirement and expected behavior.
 - Inspect existing project architecture.
 - Identify affected modules and dependencies.
 - Define required types, interfaces, and enums first.
 - Separate data structures from implementation logic.
 - Implement the feature in small, manageable steps.
 - Integrate with existing components and services.
 - Test functionality and edge cases.
 - Review the implementation for unnecessary complexity.
 - Report completed work and remaining issues.
# 6. Code Quality
 - Use descriptive and consistent naming.
 - Avoid duplicated business logic.
 - Avoid unnecessary dependencies.
 - Keep functions focused on a single responsibility.
 - Handle errors explicitly.
 - Preserve backward compatibility where practical.
 - Do not refactor unrelated code.
 - Follow existing linting and formatting rules.
# 7. Completion Checklist
 - TypeScript strict typing maintained.
 - Required enums defined and reused.
 - Each enum has a clear domain responsibility.
 - Types and interfaces are separated from implementation.
 - Data and business logic are separated.
 - Components are reusable where appropriate.
 - No unnecessary hardcoded values.
 - Feature works with existing architecture.
 - Relevant tests and checks pass.
 - Implementation is documented when necessary.
## Golden Rule

Type First → Enum First → Data Separation → Implementation → Integration → Verification

Build features that are predictable, type-safe, modular, easy to manage, and easy to extend.