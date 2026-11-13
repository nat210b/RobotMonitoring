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

## Database (MongoDB)

Connection comes from `MONGODB_URI` / `MONGODB_DB` in `.env` (see `.env.example`). Check it with
`GET /api/v1/health`.

### `robots` collection — robot details

One document per machine in the room. Shared type: `Robot` in `app/lib/robots.ts`.

```jsonc
{
  "_id": { "$oid": "6af56028977f688977ade929" },
  "machineID": "LTA-02",            // machine in the 3D room (ROOM_LAYOUT id); unique
  "desc": "TEST",
  "robotID": "1",                   // unique; referenced by robotStatus.robot_id
  "robotName": "TEST",
  "robotStatus": "FAIL",            // "FAIL" | "PASS" | "MAINTAIN" — shown as the badge over the machine
  "runningNo": 1,
  "updatedAt": { "$date": "2026-11-12T06:43:52.756Z" },
  "viedoURL": ""                    // (sic) legacy field; videos are now uploaded per machine type
}
```

API: `GET /api/v1/robots`, `PUT /api/v1/robots/:machineId` (create or update from the side bar).

### `robotStatus` collection — log of each robot

One document per inspection result (a log, newest last). Shared type: `app/lib/robotStatus.ts`.

```jsonc
{
  "_id": { "$oid": "6af569c439203ae78e8ebf25" },
  "robot_id": "1",                  // must match robots.robotID
  "status": "FAIL",                 // "FAIL" | "PASS"
  "failDetail": "missing part",     // why it failed; empty for a PASS
  "datetime": { "$date": "2026-11-12T07:24:52.514Z" }
}
```

API: `POST /api/v1/robot-status` with `{ robot_id, status, failDetail?, datetime? }` (datetime defaults to
now). It answers 422 when `robot_id` matches no robot in `robots`.

### Machine videos (GridFS bucket `machineVideos`)

One video per machine **type**, shared by every machine of that type, stored in
`machineVideos.files` / `machineVideos.chunks` (file metadata carries the machine type).
API: `GET /api/v1/machine-videos`, and `GET` / `PUT` / `DELETE /api/v1/machine-videos/:type`.

## Planned direction

The intended dashboard will bring together:

- A combined-room 3D view of robots and work areas
- Isometric and free camera views of the room
- Robot activity and product workflow status
- Robot and workflow data received from MongoDB

The room view already reads and writes robot records in MongoDB (see Database above); the
remaining items are goals for future development.


if 5 machine in section that have 5 or nor than five  is have log as fail the section will display orange section and have warning 