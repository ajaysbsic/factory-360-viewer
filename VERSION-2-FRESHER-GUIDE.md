# Version 2 Implementation Guide for Freshers

This guide explains how to work on Version 2 of the Immersive 360 Project Studio without coding agents.

## 1. What Version 2 Is

Version 2 is the Angular-based product inside `studio-app`.

Main user flows:
- Dashboard: list all projects
- Create Project: create a new project and root panorama
- Viewer: open project, inspect hotspots, capture coordinates
- Edit Project: add scenes, upload target image, connect hotspot to scene

## 2. Repository Structure

Root folder has two tracks:
- Legacy V1 (static app): `index.html`, `script.js`, `style.css`, `images`
- Version 2 Angular app: `studio-app`

Important folders in Version 2:
- `studio-app/src/app/pages`: route pages (`home`, `viewer`, `edit`, `create`)
- `studio-app/src/app/components`: reusable UI (project card, panorama viewer)
- `studio-app/src/app/services`: project persistence (`projects.service.ts`)
- `studio-app/src/app/models`: data interfaces
- `studio-app/public/images`: static assets (icons and sample panoramas)

## 3. Prerequisites

Install these tools:
- Node.js LTS (recommended even-numbered LTS version)
- npm (comes with Node.js)
- Git
- VS Code

## 4. First-Time Setup

From repository root:

```bash
cd studio-app
npm install
```

Start development server:

```bash
npm start -- --host 0.0.0.0 --port 4300
```

Open either:
- `http://localhost:4300/dashboard`
- `http://<your-lan-ip>:4300/dashboard`

## 5. Core Data Model

`Project` contains:
- `id`
- `name`
- `rootScene`
- `scenes[]`

Each `Scene` contains:
- `id` (example: `scene-root`, `scene-2`)
- `image` (either `/images/file.jpg` or uploaded data URL)
- `hotspots[]`

Each `Hotspot` contains:
- `x`, `y`, `z`
- `targetSceneId`
- optional `label`

## 6. How to Add a New Scene Correctly

1. Open project viewer.
2. Turn on **Capture Coordinate**.
3. Click on panorama where hotspot should be placed.
4. Go to **Edit Project**.
5. Upload target 360 image in **Upload Target 360 Image**.
6. Click **Add Scene**.

Result:
- New scene is created.
- Root scene hotspot is linked to new scene.

## 7. How to Edit Existing Hotspot Coordinates

1. Open viewer page for the project.
2. In **Hotspots** panel, click **Edit Hotspot** on the required row.
3. Enable **Capture Coordinate**.
4. Click on the panorama.
5. Captured x/y/z auto-fill selected hotspot row.
6. Click **Update** to save.

Manual edit is also possible by typing x/y/z directly and clicking **Update**.

## 8. How to Delete a Hotspot Safely

From viewer hotspot row, click **Delete**.

Current behavior:
- Removes the selected hotspot from root scene.
- Removes linked target scene from project scenes.
- Removes linked references pointing to that scene.

Note:
- If scene image was an uploaded data URL, deleting scene removes that image data from local project storage.
- If scene image references a physical file under `public/images`, file remains on disk and only project reference is removed.

## 9. How to Delete a Project

From Dashboard, click **Delete Project** on the target card.

Current rule:
- Baseline Project `1001` is protected and cannot be deleted.

## 10. Persistence Behavior

Source of truth for runtime edits:
- Browser `localStorage` key for projects: managed by `ProjectsService`

Implication:
- Two users on different browsers/devices do not share edits.
- Clearing browser storage resets runtime changes for that browser.

## 11. Common Change Locations

If you need to change dashboard card actions:
- `studio-app/src/app/components/project-card.component.ts`
- `studio-app/src/app/pages/home-page.component.ts`

If you need to change hotspot panel behavior:
- `studio-app/src/app/pages/viewer-page.component.ts`

If you need to change 3D viewer controls/icons/interaction:
- `studio-app/src/app/components/panorama-viewer.component.ts`

If you need to change data persistence rules:
- `studio-app/src/app/services/projects.service.ts`

## 12. Quality Check Before Commit

Run:

```bash
cd studio-app
npm run build
```

Minimum expected:
- Build completes without errors.
- Viewer opens on dashboard route.
- Add/Edit/Delete hotspot flows work.
- Back and fullscreen icons visible.

## 13. Git Workflow (Without Agents)

Use this sequence for each change:

```bash
git checkout -b <feature-branch-name>
git add .
git commit -m "Describe what you changed"
git push -u origin <feature-branch-name>
```

Recommended branch naming examples:
- `feature/hotspot-edit-flow`
- `fix/viewer-icon-overlay`
- `docs/version-2-guide`

## 14. Troubleshooting

If dev server fails on port 4200:
- Start on another port:

```bash
npm start -- --host 0.0.0.0 --port 4300
```

If icon/image not visible:
- Verify file exists in `studio-app/public/images`
- Verify URL path starts with `/images/...`
- Hard refresh browser (`Ctrl+F5`)

If old data keeps showing:
- LocalStorage may contain stale project state.
- Clear storage for app origin and reload.

## 15. Future Enhancements (Recommended)

- Replace localStorage with backend API
- Add project-level image management and cleanup tools
- Add hotspot reorder support
- Add undo/redo in editor
- Add tests for project service and viewer interactions

---

Document owner: Version 2 team
Last updated: 2026-04-19
