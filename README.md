# Robot Combined Room Dashboard

A web dashboard project for monitoring robots and product workflows in a shared
operating room. The planned experience includes a Three.js 3D room model with
isometric and free-view camera modes, plus robot and product-flow information
from MongoDB.

## Project status

The current app is an early UI design-system prototype, not yet the complete
robot-monitoring dashboard. It includes reusable dashboard components and
sample fleet records. The 3D room visualization, live robot workflows, and
MongoDB integration are planned and are not implemented yet.

## Current UI prototype

The prototype demonstrates:

- Dashboard colors, typography, and surface styles
- Reusable buttons, badges, cards, form controls, and responsive grid
- A sortable robot-fleet table and pagination
- Example robot status and summary data (static sample data)

## Tech stack

- [Next.js](https://nextjs.org/) 16 with the App Router
- [React](https://react.dev/) 19 and [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Three.js](https://threejs.org/) is a project dependency for the planned 3D
  visualization; no room scene is implemented yet.

## Getting started

### Requirements

- Node.js and npm

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

```bash
npm run dev    # Start the local development server
npm run lint   # Run ESLint
npm run build  # Create a production build
npm run start  # Start the production server
```

## Project structure

```text
app/
  component/
    ui/          Reusable UI components
    machine/     Store machine component
  globals.css    Global styles and design tokens
  layout.tsx     Root layout and page metadata
  page.tsx       Current design-system prototype
public/          Static assets
```

## Planned direction

The intended dashboard will bring together:

- A combined-room 3D view of robots and work areas
- Isometric and free camera views of the room
- Robot activity and product workflow status
- Robot and workflow data received from MongoDB

These are goals for future development; the current prototype uses local sample
data and does not connect to a database.
