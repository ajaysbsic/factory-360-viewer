# DC Charger Panorama Viewer

An immersive 360 degree panorama viewer for DC charger training built with HTML, CSS, JavaScript, and Three.js.

## Project structure

D:\3D Imaging\
- index.html
- style.css
- script.js
- images\
  - panorama.jpg

## How to run with Live Server

1. Install the Live Server extension in VS Code.
2. Open the D:\3D Imaging folder.
3. Right-click index.html.
4. Select Open with Live Server.

If you prefer a simple local server, run Python HTTP server from the project folder and open port 5500 in the browser.

## Where to place the panorama image

Add your equirectangular image here:

images/panorama.jpg

Recommended size:
- 2:1 aspect ratio
- Example: 4000 × 2000 or 6000 × 3000
- JPG is preferred for fast loading

If panorama.jpg is missing, the viewer automatically shows a generated fallback panorama so the app still runs.

## Key implementation notes

- Sphere creation:
  The viewer creates a large sphere and flips it inside out by applying negative scale on the X axis. The camera sits inside the sphere.

- Texture mapping:
  The panorama image is loaded as an equirectangular texture and mapped onto the inner surface of the sphere.

- Mouse controls:
  Dragging updates longitude and latitude targets, while damping smoothly interpolates the camera motion.

- Vertical limit:
  The pitch is clamped so the camera cannot flip upside down.

- Hotspots:
  Hotspots are placed with latitude and longitude values, converted into 3D coordinates, and rendered as sprites that always face the camera.

## How to replace the panorama image

1. Export a 360 panorama in equirectangular format.
2. Name it panorama.jpg.
3. Put it in the images folder.
4. Refresh the page in Live Server.

## How to add more hotspots

Open script.js and add another item to the HOTSPOT_DEFS array with:
- id
- title
- message
- lat
- lon

Use the existing hotspot entries as the template.
