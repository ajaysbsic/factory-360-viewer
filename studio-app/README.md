# Immersive 360 Project Studio (Phase 1/2 Foundation)

This folder contains the Angular product foundation for the next phase of the 360 platform.

## What is implemented now

- Multi-page Angular app with routing
- Dashboard (Home) with project listing
- Create Project page (form placeholder)
- Edit Project page (scene editor shell)
- Viewer page (interactive viewer shell)
- Reusable components:
  - Project Card
  - Hotspot Form
  - Panorama Viewer shell
- Data model for User -> Projects -> Scenes -> Hotspots
- JSON-backed starter data file for projects

## Folder map

- `src/app/pages` -> route-level pages
- `src/app/components` -> reusable UI blocks
- `src/app/services` -> data/service layer
- `src/app/models` -> TypeScript interfaces
- `src/data/projects.json` -> initial project dataset

## Run locally

```bash
cd studio-app
npm install
npm start
```

App URLs:
- Local: `http://localhost:4200/`
- Network: `http://<your-ip>:4200/`

## Build

```bash
npm run build
```

Build output:
- `dist/studio-app`

## Notes for next phases

This foundation intentionally keeps persistence and editor behavior as placeholders.
In upcoming phases, add:
- project CRUD API
- real scene uploader
- real Three.js panorama renderer inside `PanoramaViewerComponent`
- hotspot placement tools and scene graph editor
