const textureLoader = new THREE.TextureLoader();
const hotspotIconLoader = new THREE.TextureLoader();

const hotspotData = {
  outside: [
    {
      id: "enter-inside",
      title: "Enter Inside",
      text: "Enter Charger",
      position: { x: -298.19, y: -248.7, z: -313.82 },
      targetScene: "inside",
    },
    {
      id: "enter-factory",
      title: "Enter Factory",
      text: "Open Factory View",
      position: { x: -432.16, y: -138.16, z: 207.98 },
      targetScene: "factory",
    },
  ],
  inside: [],
  factory: [],
};

const sceneImageUrls = {
  outside: "images/panorama.jpg",
  inside: "images/inside.jpg",
  factory: "images/factory.jpg",
};

const state = {
  scene: null,
  camera: null,
  renderer: null,
  mesh: null,
  textures: {
    outside: null,
    inside: null,
    factory: null,
  },
  currentScene: "outside",
  activeHotspots: [],
  hoveredSprite: null,
  activeHotspot: null,
  raycaster: null,
  mouse: null,
  isUserInteracting: false,
  lon: 0,
  lat: 0,
  lookLon: 0,
  lookLat: 0,
  velocityLon: 0,
  velocityLat: 0,
  onPointerDownLon: 0,
  onPointerDownLat: 0,
  onPointerDownX: 0,
  onPointerDownY: 0,
  lastPointerX: 0,
  lastPointerY: 0,
  movedDistance: 0,
  sensitivity: 0.12,
  damping: 0.08,
  inertia: 0.92,
  isTransitioning: false,
  isCameraAnimating: false,
  isZoomed: false,
  savedView: null,
  enableCoordinateHelper: true,
  hotspotIconTexture: null,
};

const ui = {
  viewerContainer: document.getElementById("viewerContainer"),
  renderContainer: document.getElementById("renderContainer"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
  statusText: document.getElementById("statusText"),
  statusBadge: document.getElementById("statusBadge"),
  tooltip: document.getElementById("tooltip"),
  tooltipText: document.getElementById("tooltip-text"),
  closeTooltip: document.getElementById("close-tooltip"),
  resetView: document.getElementById("resetView"),
  sensitivityControl: document.getElementById("sensitivityControl"),
  sensitivityValue: document.getElementById("sensitivityValue"),
  dampingControl: document.getElementById("dampingControl"),
  dampingValue: document.getElementById("dampingValue"),
  backBtn: document.getElementById("backBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  fullscreenIcon: document.getElementById("fullscreenIcon"),
  resetZoomBtn: document.getElementById("resetZoomBtn"),
  sceneTransition: document.getElementById("sceneTransition"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  if (typeof THREE === "undefined") {
    failInitialization("Three.js did not load. Check libs/three.min.js.");
    return;
  }

  try {
    syncControlLabels();
    buildScene();
    bindEvents();
    await preloadTextures();
    switchScene("outside", true);
    ui.loadingOverlay.classList.add("is-hidden");
    setStatus("Outside scene loaded. Click a hotspot to navigate.", "Ready");
    animate();
  } catch (error) {
    failInitialization(`Viewer initialization failed: ${error.message}`);
  }
}

function failInitialization(message) {
  ui.loadingOverlay.classList.add("is-hidden");
  setStatus(message, "Error");
}

function buildScene() {
  state.scene = new THREE.Scene();

  state.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / Math.max(window.innerHeight, 1),
    1,
    1000
  );
  state.camera.position.set(0, 0, 0.1);

  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setPixelRatio(window.devicePixelRatio || 1);
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  ui.renderContainer.appendChild(state.renderer.domElement);
  state.raycaster = new THREE.Raycaster();
  state.mouse = new THREE.Vector2();

  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  state.mesh = new THREE.Mesh(geometry, material);
  state.scene.add(state.mesh);

  onResize();
}

function bindEvents() {
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mouseleave", onMouseUp);
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd, { passive: false });
  document.addEventListener("touchcancel", onTouchEnd, { passive: false });
  window.addEventListener("click", onWindowClick);
  window.addEventListener("resize", onResize);
  document.addEventListener("fullscreenchange", onFullscreenChange);

  ui.resetView.addEventListener("click", resetView);
  ui.resetZoomBtn.addEventListener("click", resetZoomView);
  ui.closeTooltip.addEventListener("click", hideTooltip);
  ui.fullscreenBtn.addEventListener("click", toggleFullscreen);
  ui.backBtn.addEventListener("click", () => {
    if (state.currentScene !== "outside") {
      crossfadeScene("outside");
    }
  });

  ui.sensitivityControl.addEventListener("input", () => {
    state.sensitivity = Number(ui.sensitivityControl.value);
    syncControlLabels();
  });

  ui.dampingControl.addEventListener("input", () => {
    state.damping = Number(ui.dampingControl.value);
    syncControlLabels();
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    ui.viewerContainer.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function onFullscreenChange() {
  const isFullscreen = !!document.fullscreenElement;
  ui.fullscreenBtn.classList.toggle("fullscreen-active", isFullscreen);

  if (ui.fullscreenIcon) {
    ui.fullscreenIcon.src = isFullscreen ? "images/collapse.png" : "images/expand.png";
    ui.fullscreenIcon.alt = isFullscreen ? "Exit fullscreen" : "Fullscreen";
  }

  onResize();
}

function syncControlLabels() {
  ui.sensitivityValue.textContent = Number(ui.sensitivityControl.value).toFixed(2);
  ui.dampingValue.textContent = Number(ui.dampingControl.value).toFixed(2);
}

function applyTextureQuality(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = state.renderer.capabilities.getMaxAnisotropy();
}

function loadTexture(url, label) {
  return new Promise((resolve) => {
    textureLoader.load(
      url,
      (texture) => {
        applyTextureQuality(texture);

        if (texture.image?.width && texture.image?.height) {
          const ratio = texture.image.width / texture.image.height;
          if (texture.image.width < 4000 || Math.abs(ratio - 2) > 0.05) {
            setStatus(
              `${label} loaded, but image is below recommended quality (target: >= 4000x2000, 2:1).`,
              "Quality Notice"
            );
          }
        }
        resolve(texture);
      },
      undefined,
      () => {
        resolve(createFallbackTexture(label));
      }
    );
  });
}

async function preloadTextures() {
  ui.loadingText.textContent = "Loading panoramas...";
  setStatus("Loading scene textures.", "Loading");

  // User confirmed outside scene is the existing panorama image.
  state.textures.outside = await loadTexture("images/panorama.jpg", "Outside Scene");
  state.textures.inside = await loadTexture("images/inside.jpg", "Inside Scene");
  state.textures.factory = await loadTexture("images/factory.jpg", "Factory Scene");
}

function createFallbackTexture(label) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1e3f64");
  gradient.addColorStop(1, "#132238");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#e6f4ff";
  ctx.textAlign = "center";
  ctx.font = "bold 56px Segoe UI";
  ctx.fillText(`${label} Fallback`, canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "30px Segoe UI";
  ctx.fillStyle = "#9cc4ea";
  ctx.fillText("Required panorama image could not be loaded", canvas.width / 2, canvas.height / 2 + 36);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function switchScene(sceneName) {
  if (!state.textures[sceneName]) {
    return;
  }

  clearZoomState();

  state.currentScene = sceneName;
  state.mesh.material.map = state.textures[sceneName];
  state.mesh.material.needsUpdate = true;

  state.lon = 0;
  state.lat = 0;
  state.lookLon = 0;
  state.lookLat = 0;
  state.velocityLon = 0;
  state.velocityLat = 0;
  state.camera.fov = 75;
  state.camera.updateProjectionMatrix();

  loadHotspots(sceneName);
  if (sceneName === "outside" && state.activeHotspots.length > 0) {
    focusViewOnHotspot(state.activeHotspots[0]);
  }
  updateUI();
  hideTooltip();

  setStatus(
    sceneName === "inside"
      ? "Inside scene loaded. Use back button to return outside."
      : sceneName === "factory"
        ? "Factory scene loaded. Use back button to return outside."
        : "Outside scene loaded. Click hotspots to navigate.",
    "Ready"
  );
}

function animateCameraView(target, duration, onComplete) {
  const startLon = state.lon;
  const startLat = state.lat;
  const startFov = state.camera.fov;
  const start = performance.now();

  state.isCameraAnimating = true;

  function step(time) {
    const progress = Math.min((time - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    const lon = THREE.MathUtils.lerp(startLon, target.lon, ease);
    const lat = THREE.MathUtils.lerp(startLat, target.lat, ease);

    state.lon = lon;
    state.lat = lat;
    state.lookLon = lon;
    state.lookLat = lat;

    state.camera.fov = THREE.MathUtils.lerp(startFov, target.fov, ease);
    state.camera.updateProjectionMatrix();

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    state.isCameraAnimating = false;
    if (onComplete) {
      onComplete();
    }
  }

  requestAnimationFrame(step);
}

function zoomToHotspot(target) {
  if (state.isTransitioning || state.isCameraAnimating) {
    return;
  }

  if (!state.isZoomed) {
    state.savedView = {
      lon: state.lon,
      lat: state.lat,
      fov: state.camera.fov,
    };
  }

  state.isZoomed = true;
  setStatus("Entering inspection mode.", "Inspect");

  animateCameraView(
    {
      lon: target.lon,
      lat: target.lat,
      fov: target.fov,
    },
    800,
    () => {
      ui.resetZoomBtn.classList.remove("hidden");
      if (target.tooltip) {
        showTooltip(target.tooltip);
      }
      setStatus("Inspection mode active. Use reset zoom to return.", "Inspect");
    }
  );
}

function resetZoomView() {
  if (!state.savedView || state.isTransitioning || state.isCameraAnimating) {
    return;
  }

  const saved = state.savedView;
  hideTooltip();
  setStatus("Returning from inspection mode.", "Ready");

  animateCameraView(saved, 800, () => {
    clearZoomState();
    setStatus("Returned to previous view.", "Ready");
  });
}

function clearZoomState() {
  state.isZoomed = false;
  state.savedView = null;
  ui.resetZoomBtn.classList.add("hidden");
}

function transitionToScene(hotspot, nextScene) {
  if (state.isTransitioning || state.isCameraAnimating || !state.textures[nextScene]) {
    return;
  }

  state.isTransitioning = true;
  hideTooltip();

  hotspot.userData.clickBoost = 1.3;

  const target = hotspot.position.clone().normalize();
  const targetLon = THREE.MathUtils.radToDeg(Math.atan2(target.z, target.x));
  const targetLat = THREE.MathUtils.radToDeg(Math.asin(target.y));

  animateCameraView(
    {
      lon: targetLon,
      lat: targetLat,
      fov: 55,
    },
    800,
    () => {
      crossfadeScene(nextScene);
    }
  );
}

function crossfadeScene(sceneName) {
  if (!state.textures[sceneName]) {
    state.isTransitioning = false;
    return;
  }

  ui.sceneTransition.style.backgroundImage = `url('${sceneImageUrls[sceneName]}')`;
  ui.sceneTransition.style.opacity = 1;

  window.setTimeout(() => {
    switchScene(sceneName);
    ui.sceneTransition.style.opacity = 0;
    state.isTransitioning = false;
  }, 600);
}

function focusViewOnHotspot(hotspot) {
  if (!hotspot?.position) {
    return;
  }

  const p = hotspot.position;
  const radius = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
  const theta = Math.atan2(p.z, p.x);
  const phi = Math.acos(THREE.MathUtils.clamp(p.y / radius, -1, 1));

  const targetLon = THREE.MathUtils.radToDeg(theta);
  const targetLat = 90 - THREE.MathUtils.radToDeg(phi);

  state.lon = targetLon;
  state.lat = targetLat;
  state.lookLon = targetLon;
  state.lookLat = targetLat;
}

function updateUI() {
  if (state.currentScene !== "outside") {
    ui.backBtn.classList.remove("hidden");
  } else {
    ui.backBtn.classList.add("hidden");
  }
}

function loadHotspots(sceneName) {
  state.activeHotspots.forEach((hotspot) => {
    state.scene.remove(hotspot);
    if (hotspot.material?.map) {
      hotspot.material.map.dispose();
    }
    hotspot.material?.dispose();
  });
  state.activeHotspots = [];

  hotspotData[sceneName].forEach((data) => {
    const hotspot = createHotspot(data.position, data.text, data.title, data.id);
    hotspot.userData.onClick = data.action;
    hotspot.userData.targetScene = data.targetScene || null;
    state.activeHotspots.push(hotspot);
  });
}

function createHotspot(position, text, title, id) {
  const material = new THREE.SpriteMaterial({
    map: getHotspotIconTexture(),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    color: 0xffd966,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(position.x, position.y, position.z);
  sprite.scale.set(34, 34, 1);
  sprite.userData = {
    id,
    title,
    info: text,
    baseScale: 34,
    phase: Math.random() * Math.PI * 2,
    hoverBoost: 1.1,
    clickBoost: 1,
  };

  state.scene.add(sprite);
  return sprite;
}

function getHotspotIconTexture() {
  if (state.hotspotIconTexture) {
    return state.hotspotIconTexture;
  }

  state.hotspotIconTexture = hotspotIconLoader.load("images/hotspot.png", (loaded) => {
    applyTextureQuality(loaded);
  });
  applyTextureQuality(state.hotspotIconTexture);

  return state.hotspotIconTexture;
}

function onMouseDown(event) {
  if (event.button !== 0) {
    return;
  }

  if (state.isTransitioning || state.isCameraAnimating) {
    return;
  }

  hideTooltip();
  state.isUserInteracting = true;
  state.movedDistance = 0;
  state.onPointerDownX = event.clientX;
  state.onPointerDownY = event.clientY;
  state.lastPointerX = event.clientX;
  state.lastPointerY = event.clientY;
  state.onPointerDownLon = state.lon;
  state.onPointerDownLat = state.lat;
  state.velocityLon = 0;
  state.velocityLat = 0;
  ui.viewerContainer.classList.add("is-dragging");
}

function onTouchStart(event) {
  if (event.touches.length !== 1 || state.isTransitioning || state.isCameraAnimating) {
    return;
  }

  const touch = event.touches[0];
  hideTooltip();
  state.isUserInteracting = true;
  state.movedDistance = 0;
  state.onPointerDownX = touch.clientX;
  state.onPointerDownY = touch.clientY;
  state.lastPointerX = touch.clientX;
  state.lastPointerY = touch.clientY;
  state.onPointerDownLon = state.lon;
  state.onPointerDownLat = state.lat;
  state.velocityLon = 0;
  state.velocityLat = 0;
  ui.viewerContainer.classList.add("is-dragging");
}

function onMouseMove(event) {
  updatePointerRay(event);

  if (state.isUserInteracting) {
    state.lon = (state.onPointerDownX - event.clientX) * state.sensitivity + state.onPointerDownLon;
    state.lat = (event.clientY - state.onPointerDownY) * state.sensitivity + state.onPointerDownLat;

    state.velocityLon = -(event.movementX || 0) * state.sensitivity * 0.1;
    state.velocityLat = (event.movementY || 0) * state.sensitivity * 0.1;
    state.movedDistance = Math.max(
      state.movedDistance,
      Math.abs(event.clientX - state.onPointerDownX) + Math.abs(event.clientY - state.onPointerDownY)
    );
    return;
  }

  updateHoveredHotspot();
}

function onTouchMove(event) {
  if (event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  updatePointerRay(touch);

  if (state.isUserInteracting) {
    state.lon = (state.onPointerDownX - touch.clientX) * state.sensitivity + state.onPointerDownLon;
    state.lat = (touch.clientY - state.onPointerDownY) * state.sensitivity + state.onPointerDownLat;

    const deltaX = touch.clientX - state.lastPointerX;
    const deltaY = touch.clientY - state.lastPointerY;
    state.velocityLon = -deltaX * state.sensitivity * 0.1;
    state.velocityLat = deltaY * state.sensitivity * 0.1;

    state.lastPointerX = touch.clientX;
    state.lastPointerY = touch.clientY;

    state.movedDistance = Math.max(
      state.movedDistance,
      Math.abs(touch.clientX - state.onPointerDownX) + Math.abs(touch.clientY - state.onPointerDownY)
    );

    // Prevent page scroll while dragging panorama on touch devices.
    event.preventDefault();
    return;
  }
}

function onMouseUp() {
  if (!state.isUserInteracting) {
    return;
  }

  state.isUserInteracting = false;
  ui.viewerContainer.classList.remove("is-dragging");
}

function onTouchEnd(event) {
  if (event.touches.length > 0) {
    return;
  }

  if (!state.isUserInteracting) {
    return;
  }

  state.isUserInteracting = false;
  ui.viewerContainer.classList.remove("is-dragging");
}

function updatePointerRay(event) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHoveredHotspot() {
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const intersects = state.raycaster.intersectObjects(state.activeHotspots, false);
  const sprite = intersects.length > 0 && intersects[0].object.type === "Sprite"
    ? intersects[0].object
    : null;

  if (sprite) {
    document.body.style.cursor = "pointer";

    if (state.hoveredSprite !== sprite) {
      if (state.hoveredSprite) {
        state.hoveredSprite.userData.hoverBoost = 1;
      }
      state.hoveredSprite = sprite;
      state.hoveredSprite.userData.hoverBoost = 1.3;
    }
  } else {
    document.body.style.cursor = "default";

    if (state.hoveredSprite) {
      state.hoveredSprite.userData.hoverBoost = 1;
      state.hoveredSprite = null;
    }
  }
}

function onWindowClick(event) {
  if (state.isTransitioning || state.isCameraAnimating || state.isUserInteracting || state.movedDistance >= 8) {
    return;
  }

  if (event.target instanceof Element && event.target.closest(".viewer-btn")) {
    return;
  }

  updatePointerRay(event);
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const intersects = state.raycaster.intersectObjects(state.scene.children, false);

  if (intersects.length === 0) {
    hideTooltip();
    logSphereCoordinate(event);
    return;
  }

  const obj = intersects[0].object;

  if (obj.type === "Sprite") {
    if (obj.userData.targetScene) {
      transitionToScene(obj, obj.userData.targetScene);
    } else if (obj.userData.onClick) {
      obj.userData.onClick();
    } else {
      showTooltip(obj.userData.info);
      setStatus(`${obj.userData.title} selected.`, "Ready");
    }
  } else {
    hideTooltip();
    logSphereCoordinate(event);
  }
}

function logSphereCoordinate(event) {
  if (!state.enableCoordinateHelper || !state.mesh) {
    return;
  }

  updatePointerRay(event);
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const intersects = state.raycaster.intersectObject(state.mesh, false);

  if (intersects.length === 0) {
    return;
  }

  const point = intersects[0].point;
  const output = {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
    z: Number(point.z.toFixed(2)),
  };
  console.log("Hotspot position:", output);
  setStatus(`Coordinate logged: x=${output.x}, y=${output.y}, z=${output.z}`, "Ready");
}

function showTooltip(text) {
  ui.tooltipText.innerText = text;
  ui.tooltip.classList.remove("hidden");
}

function hideTooltip() {
  ui.tooltip.classList.add("hidden");
  state.activeHotspot = null;
}

function resetView() {
  if (state.isZoomed) {
    resetZoomView();
    return;
  }

  state.lon = 0;
  state.lat = 0;
  state.lookLon = 0;
  state.lookLat = 0;
  state.velocityLon = 0;
  state.velocityLat = 0;
  state.camera.fov = 75;
  state.camera.updateProjectionMatrix();
  hideTooltip();
  setStatus("View reset to default direction.", "Ready");
}

function animate() {
  requestAnimationFrame(animate);

  if (!state.isUserInteracting) {
    state.lon += state.velocityLon;
    state.lat += state.velocityLat;
    state.velocityLon *= state.inertia;
    state.velocityLat *= state.inertia;

    if (Math.abs(state.velocityLon) < 0.0001) {
      state.velocityLon = 0;
    }
    if (Math.abs(state.velocityLat) < 0.0001) {
      state.velocityLat = 0;
    }
  }

  state.lat = Math.max(-85, Math.min(85, state.lat));
  state.lookLon += (state.lon - state.lookLon) * state.damping;
  state.lookLat += (state.lat - state.lookLat) * state.damping;

  const phi = THREE.MathUtils.degToRad(90 - state.lookLat);
  const theta = THREE.MathUtils.degToRad(state.lookLon);

  const target = new THREE.Vector3(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta)
  );

  state.camera.lookAt(target);

  state.scene.children.forEach((obj) => {
    if (obj.type !== "Sprite") {
      return;
    }

    const data = obj.userData;
    if (!data.baseScale) {
      return;
    }

    data.phase += 0.05;
    data.clickBoost += (1 - (data.clickBoost || 1)) * 0.16;
    const pulseScale = data.baseScale + Math.sin(Date.now() * 0.005 + data.phase) * 2;
    const finalScale = pulseScale * (data.hoverBoost || 1) * (data.clickBoost || 1);
    obj.scale.set(finalScale, finalScale, 1);
  });

  state.renderer.render(state.scene, state.camera);
}

function onResize() {
  if (!state.camera || !state.renderer) {
    return;
  }

  const width = ui.renderContainer.clientWidth;
  const height = Math.max(ui.renderContainer.clientHeight, 1);

  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height);
}

function setStatus(message, badge) {
  ui.statusText.textContent = message;
  ui.statusBadge.textContent = badge;
}
