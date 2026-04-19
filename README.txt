DC CHARGER 360 TRAINING VIEWER - COMPLETE PROJECT DOCUMENTATION

============================================================
1) PROJECT OVERVIEW
============================================================

This project is an immersive 360-degree panorama viewer for training and inspection scenarios.
It is designed to simulate a Krpano-like experience using plain HTML, CSS, JavaScript, and Three.js.

Main use case:
- A user opens an outside panorama.
- User can rotate the camera by dragging.
- User clicks hotspots to inspect components or move into another scene.
- Scene transitions are smooth and cinematic (camera glide + zoom + crossfade).

This project currently supports 3 scenes:
- Outside (panorama.jpg)
- Inside (inside.jpg)
- Factory (factory.jpg)

Key interaction modes:
- Navigation mode: move between scenes through hotspot-driven transitions.
- Inspection mode: zoom into a component without switching scenes.


============================================================
2) TECHNOLOGY STACK
============================================================

Core technologies:
- HTML5
- CSS3
- JavaScript (vanilla, no framework)
- Three.js (local copy at libs/three.min.js)

Why this stack:
- Lightweight and easy to understand.
- No build step needed.
- Easy for beginners to run and modify.


============================================================
3) PREREQUISITES AND DEPENDENCIES
============================================================

You need:
1. A modern web browser (Chrome, Edge, Firefox).
2. A local static server (recommended):
   - VS Code Live Server extension OR
   - Python installed (for python -m http.server).

Important:
- Do NOT open index.html directly with file:// for production-style testing.
- Use a local server so image loading and browser APIs work reliably.

Project dependency:
- Three.js is already included locally:
  libs/three.min.js
- No npm install required.


============================================================
4) PROJECT STRUCTURE (CURRENT)
============================================================

D:\3D Imaging\
- index.html          -> Main page structure and UI elements
- style.css           -> All visual styling and responsive layout
- script.js           -> Core viewer logic, controls, hotspots, transitions
- README.md           -> Older short guide
- README.txt          -> This full documentation file
- libs\
  - three.min.js      -> Local Three.js runtime
- images\
  - panorama.jpg      -> Outside scene panorama
  - inside.jpg        -> Inside scene panorama
  - factory.jpg       -> Factory scene panorama
  - hotspot.png       -> Hotspot icon
  - back.png          -> Back/reset icon
  - expand.png        -> Fullscreen icon
  - collapse.png      -> Exit fullscreen icon
  - README.txt        -> Image folder notes


============================================================
5) HOW TO SET UP AND RUN
============================================================

Option A: VS Code Live Server (easy)
1. Open folder D:\3D Imaging in VS Code.
2. Install Live Server extension if not installed.
3. Open index.html.
4. Right click and choose "Open with Live Server".

Option B: Python local server
1. Open terminal in D:\3D Imaging.
2. Run:
   python -m http.server 5500
3. Open browser:
   http://localhost:5500

If port 5500 is busy, use another port:
- python -m http.server 8080
- Open http://localhost:8080


============================================================
6) HOW TO USE THE APPLICATION
============================================================

Basic controls:
- Drag mouse: look around in 360 view.
- Click hotspot: trigger inspection or scene flow.
- Reset View button (top bar):
  - If in zoom inspection mode, it exits zoom first.
  - Otherwise it resets camera orientation to default.
- Back button (inside viewer, top-left): returns to outside scene (when not on outside).
- Fullscreen button (inside viewer, top-right): toggle fullscreen mode.

Hotspot behavior (important):
A) Scene-entry hotspots (example: Enter Inside / Enter Factory)
- First click: zoom and focus hotspot for inspection with helper tooltip.
- Second click on same hotspot: enter target scene with smooth transition.

B) Inspection-only hotspots (example: Charging Gun)
- Click: smoothly zoom to target component within same scene.
- No scene switch happens.
- Use reset zoom button (inside viewer, bottom-right) to return.

Scene transition quality behavior:
- Camera rotates toward hotspot.
- Camera FOV narrows slightly for dolly-like feel.
- Overlay crossfades using target scene image.
- New scene loads and resets camera baseline.


============================================================
7) CORE LOGIC EXPLAINED (BEGINNER-FRIENDLY)
============================================================

This section explains how script.js works from top to bottom.

7.1 Data definitions
- hotspotData:
  Defines hotspots per scene.
  Each hotspot can have:
  - position (x, y, z) on panorama sphere
  - text/title
  - targetScene for scene navigation OR
  - action function for inspection zoom

- sceneImageUrls:
  Maps scene name to image path for crossfade overlay.

7.2 State object
The state object stores runtime values:
- Three.js objects (scene, camera, renderer, mesh)
- current scene and textures
- user interaction variables (lon, lat, velocity, damping)
- transition/animation flags
- zoom inspection state (isZoomed, savedView)
- two-step hotspot state (armedSceneHotspotId)

7.3 UI references
The ui object caches important DOM elements once:
- viewer container
- control buttons
- tooltip
- status labels
- overlay
This avoids repeated document lookups.

7.4 Initialization flow
init() does:
1. Validate Three.js is loaded.
2. Build 3D scene and camera.
3. Bind mouse/UI/fullscreen events.
4. Preload scene textures.
5. Start on outside scene.
6. Hide loader and start animation loop.

7.5 Panorama rendering model
- A sphere is created with large radius.
- Sphere is flipped inside-out (scale -1 on X).
- Camera is placed inside sphere.
- Panorama texture is mapped to inner sphere surface.
- Looking around is achieved by changing lon/lat.

7.6 Camera movement model
- Drag updates lon/lat targets.
- Damping smooths camera movement.
- Inertia allows natural continuation after drag.
- Pitch (lat) is clamped to avoid camera flipping.

7.7 Hotspot model
- Hotspots are Three.js sprites.
- They always face camera.
- Raycasting detects hover/click.
- Pulse and hover boost improve visibility.

7.8 Inspection zoom mode
zoomToHotspot(target) does:
1. Save current camera view (lon, lat, fov) once.
2. Animate to target lon/lat/fov.
3. Show reset-zoom button.
4. Optionally show tooltip.

resetZoomView() does:
1. Animate back to saved view.
2. Hide reset-zoom button.
3. Clear zoom state.

7.9 Two-step scene hotspot flow
For scene hotspots:
- First click: only focus/inspect and arm the hotspot.
- Second click on same hotspot: run transitionToScene().
This reduces accidental scene jumps.

7.10 Premium scene transition
transitionToScene() + crossfadeScene() combine:
- Camera tween toward hotspot
- FOV zoom effect
- Overlay image crossfade
This feels more immersive than instant switch.


============================================================
8) DESIGN DECISIONS AND WHY THEY WERE MADE
============================================================

1. Local Three.js instead of CDN:
- Some environments block CDN scripts.
- Local file guarantees offline/reliable loading.

2. No framework:
- Easier onboarding for freshers.
- Faster debugging and direct control.

3. Data-driven hotspots:
- Hotspot behavior is editable from one place.
- Easier to add training points.

4. Scene texture preloading:
- Reduces delays during transitions.
- Improves perceived smoothness.

5. Two-step scene activation:
- Better UX for training environments where accidental clicks are common.


============================================================
9) HOW TO MODIFY THE PROJECT
============================================================

9.1 Change hotspot positions
File: script.js
Location: hotspotData
- Edit x, y, z under the desired hotspot.
- Reload browser.

Tip to get coordinates:
- Click on panorama where needed.
- Coordinate helper logs values in browser console.
- Copy those values into hotspot position.

9.2 Add a new inspection hotspot (same scene)
In hotspotData for a scene, add:
- id
- title
- text
- position
- action: () => zoomToHotspot({ lon, lat, fov, tooltip })

9.3 Add a new scene
Step 1: Add image in images folder, e.g. lab.jpg
Step 2: Add texture slot in state.textures
Step 3: Add URL in sceneImageUrls
Step 4: Load texture in preloadTextures()
Step 5: Add hotspot with targetScene: "lab"
Step 6: Add hotspotData.lab = []

9.4 Change transition speed
File: script.js
- In animateCameraView callers and/or crossfade timeout, update duration values.
- Example current values are around 800ms motion and 600ms fade.

9.5 Change visual style
File: style.css
- Colors: edit variables in :root.
- Button style: .viewer-btn
- Tooltip style: .tooltip and .tooltip-content


============================================================
10) ASSET GUIDELINES
============================================================

Panorama images should be:
- Equirectangular format
- Aspect ratio close to 2:1
- High resolution recommended (for clarity), e.g. 4000x2000 or higher

If a texture fails to load:
- The app creates a fallback generated texture to avoid breaking.
- Status panel shows quality or loading warning messages.

Icons used:
- hotspot.png for hotspot sprites
- back.png for back/reset actions
- expand.png and collapse.png for fullscreen toggle


============================================================
11) TROUBLESHOOTING GUIDE
============================================================

Problem: Blank or broken viewer
- Check libs/three.min.js exists.
- Verify browser console for load errors.

Problem: Images not showing
- Confirm file names exactly match script references.
- Confirm server is running from project root.

Problem: Scene is blurry
- Source image resolution may be too low.
- Replace with higher-res 2:1 panorama.

Problem: Fullscreen icon does not toggle
- Ensure expand.png and collapse.png exist in images folder.

Problem: Clicks not working during transition
- This is expected safety behavior.
- Wait for camera animation to finish.


============================================================
12) LEARNING PATH FOR FRESHERS
============================================================

Recommended order to understand the project:
1. Read index.html to understand UI element IDs.
2. Read style.css to see layout and overlay layering.
3. Read script.js in this order:
   - hotspotData / sceneImageUrls
   - state and ui objects
   - init -> buildScene -> bindEvents
   - switchScene / transitionToScene / zoomToHotspot
   - onWindowClick / animate loop
4. Change one hotspot coordinate and test.
5. Add one inspection hotspot and test.
6. Add one new scene and route into it.


============================================================
13) FUTURE ENHANCEMENT IDEAS
============================================================

Potential improvements:
- Add keyboard navigation shortcuts.
- Add mobile touch gestures (pinch-to-zoom behavior).
- Add hotspot labels anchored near icon in 3D.
- Add analytics for hotspot clicks/time spent.
- Add localization (multi-language UI strings).
- Add AI pre-processing pipeline for image upscaling/denoise (offline workflow).


============================================================
14) QUICK REFERENCE CHECKLIST
============================================================

Before sharing/deploying:
- Confirm all scene images exist.
- Confirm icon assets exist.
- Run with local server and test transitions.
- Test fullscreen entry/exit.
- Test reset view and reset zoom flows.
- Test first-click inspect and second-click enter behavior.


END OF DOCUMENTATION
