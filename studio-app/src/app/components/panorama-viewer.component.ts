import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { CapturedCoordinate, Project, Scene } from '../models/project.model';
import { ProjectsService } from '../services/projects.service';
import { ImageStorageService } from '../services/image-storage.service';

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="viewer">
      <h3>{{ title }}</h3>
      <div class="viewer-shell" #host>
        <div class="canvas-layer" #canvasHost></div>
        <div class="hover-tooltip" *ngIf="hoverInfoText" [style.left.px]="hoverTooltipX" [style.top.px]="hoverTooltipY">
          {{ hoverInfoText }}
        </div>

        <button
          class="viewer-btn back-btn"
          type="button"
          *ngIf="activeSceneId && activeSceneId !== 'scene-root'"
          (click)="goBack()"
          aria-label="Back to previous scene"
        >
          <img src="/images/back.png" alt="Back" />
        </button>

        <button
          class="viewer-btn fullscreen-btn"
          type="button"
          (click)="toggleFullscreen()"
          aria-label="Toggle fullscreen"
        >
          <img [src]="isFullscreen ? '/images/collapse.png' : '/images/expand.png'" alt="Fullscreen" />
        </button>
      </div>
    </section>
  `,
  styles: [
    `
      .viewer {
        border: 1px solid rgba(79, 172, 254, 0.2);
        border-radius: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #1a1f4d 0%, #151b40 100%);
        color: #fff;
      }

      .viewer-shell {
        margin-top: 12px;
        min-height: 260px;
        height: 420px;
        border: 1px solid rgba(79, 172, 254, 0.3);
        border-radius: 12px;
        overflow: hidden;
        position: relative;
        background: #0a0e27;
      }

      .canvas-layer {
        position: absolute;
        inset: 0;
      }

      .viewer-btn {
        position: absolute;
        z-index: 5;
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.55);
        padding: 8px;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
      }

      .viewer-btn img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .back-btn {
        top: 12px;
        left: 12px;
      }

      .fullscreen-btn {
        top: 12px;
        right: 12px;
      }

      .hover-tooltip {
        position: absolute;
        z-index: 15;
        max-width: 260px;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-size: 0.85rem;
        border-radius: 10px;
        pointer-events: none;
        white-space: normal;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
      }
    `,
  ],
})
export class PanoramaViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = 'Interactive Viewer';
  @Input() project: Project | null = null;
  @Input() captureMode = false;
  @Input() sensitivity = 0.12;
  @Input() damping = 0.08;
  @Output() coordinateCaptured = new EventEmitter<CapturedCoordinate>();
  @Output() sceneChanged = new EventEmitter<string>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasHost', { static: true }) canvasHostRef!: ElementRef<HTMLDivElement>;

  activeSceneId: string | null = null;
  isFullscreen = false;
  navigationHistory: string[] = [];

  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mesh!: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hotspots: THREE.Sprite[] = [];
  private lon = 0;
  private lat = 0;
  private lookLon = 0;
  private lookLat = 0;
  private onPointerDownLon = 0;
  private onPointerDownLat = 0;
  private onPointerDownX = 0;
  private onPointerDownY = 0;
  private isUserInteracting = false;
  private animationHandle = 0;
  private readonly textureLoader = new THREE.TextureLoader();
  private hotspotTexture: THREE.Texture | null = null;
  private infoTexture: THREE.Texture | null = null;
  hoverInfoText = '';
  hoverTooltipX = 0;
  hoverTooltipY = 0;

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly imageStorageService: ImageStorageService
  ) {}

  ngAfterViewInit(): void {
    this.setupThree();
    this.bindEvents();
    this.animationLoop();
    requestAnimationFrame(() => this.loadInitialScene());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      this.loadInitialScene();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationHandle);
    this.renderer?.dispose();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private setupThree(): void {
    const host = this.canvasHostRef.nativeElement;
    this.camera = new THREE.PerspectiveCamera(75, host.clientWidth / Math.max(host.clientHeight, 1), 1, 1100);
    this.camera.position.set(0, 0, 0.1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(host.clientWidth, Math.max(host.clientHeight, 1));
    host.innerHTML = '';
    host.appendChild(this.renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    this.infoTexture = this.createInfoTexture();

    this.textureLoader.load(
      '/images/hotspot.png',
      (texture: THREE.Texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.hotspotTexture = texture;
        if (this.activeSceneId) {
          this.loadScene(this.activeSceneId);
        }
      },
      undefined,
      () => {
        this.hotspotTexture = null;
      }
    );
  }

  private createInfoTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create info texture');
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(56, 161, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', size / 2, size / 2 + 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onPointerDown);
    canvas.addEventListener('mousemove', this.onPointerMove);
    canvas.addEventListener('pointermove', this.onPointerHover);
    canvas.addEventListener('mouseup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('mouseleave', this.onPointerUp);
    canvas.addEventListener('click', this.onClick);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onPointerUp as EventListener);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  goBackToRoot(): void {
    if (!this.project) {
      return;
    }

    const root = this.project.scenes.find((scene) => scene.id === 'scene-root') ?? this.project.scenes[0];
    if (root) {
      this.navigationHistory = [];
      this.lon = root.initialLon ?? 0;
      this.lat = root.initialLat ?? 0;
      this.lookLon = root.initialLon ?? 0;
      this.lookLat = root.initialLat ?? 0;
      void this.loadScene(root.id, true);
    }
  }

  goBack(): void {
    if (this.navigationHistory.length === 0) {
      this.goBackToRoot();
      return;
    }

    const previousSceneId = this.navigationHistory.pop()!;
    void this.loadScene(previousSceneId, true);
  }

  toggleFullscreen(): void {
    const host = this.hostRef?.nativeElement;
    if (!host) {
      return;
    }

    if (!document.fullscreenElement) {
      host.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  private readonly onFullscreenChange = (): void => {
    this.isFullscreen = !!document.fullscreenElement;
    this.onResize();
  };

  private readonly onResize = (): void => {
    const host = this.canvasHostRef.nativeElement;
    this.camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(host.clientWidth, Math.max(host.clientHeight, 1));
  };

  private loadInitialScene(): void {
    if (!this.project || !this.mesh) {
      return;
    }

    const root = this.project.scenes.find((scene) => scene.id === 'scene-root') ?? this.project.scenes[0];
    if (root) {
      void this.loadScene(root.id);
    }
  }

  private async loadScene(sceneId: string, skipHistory = false): Promise<void> {
    if (!this.project) {
      return;
    }

    const nextScene = this.project.scenes.find((scene) => scene.id === sceneId);
    if (!nextScene) {
      return;
    }

    // Update navigation history
    if (!skipHistory && this.activeSceneId && this.activeSceneId !== sceneId) {
      this.navigationHistory.push(this.activeSceneId);
    }

    this.activeSceneId = nextScene.id;
    this.clearHotspots();

    // Set initial viewing angles
    this.lon = nextScene.initialLon ?? 0;
    this.lat = nextScene.initialLat ?? 0;
    this.lookLon = nextScene.initialLon ?? 0;
    this.lookLat = nextScene.initialLat ?? 0;

    this.sceneChanged.emit(nextScene.id);

    const path = this.resolveImagePath(nextScene.image);
    try {
      const texture = await this.loadTexture(path);
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.mesh.material = new THREE.MeshBasicMaterial({ map: texture });
      } else {
        this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x1f2a44 });
      }
    } catch {
      this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x1f2a44 });
    }

    this.addHotspots(nextScene);
  }

  private async loadTexture(path: string): Promise<THREE.Texture | null> {
    if (path.startsWith('indexeddb:')) {
      const key = path.replace('indexeddb:', '');
      const blob = await this.imageStorageService.getImage(key);
      if (!blob) {
        return null;
      }

      const url = URL.createObjectURL(blob);
      try {
        return await new Promise((resolve, reject) => {
          this.textureLoader.load(
            url,
            (texture: THREE.Texture) => resolve(texture),
            undefined,
            (error) => reject(error)
          );
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    return await new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture: THREE.Texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  }

  private resolveImagePath(image: string): string {
    if (image.startsWith('http') || image.startsWith('/') || image.startsWith('data:') || image.startsWith('blob:') || image.startsWith('indexeddb:')) {
      return image;
    }
    return `/images/${image}`;
  }

  private addHotspots(scene: Scene): void {
    scene.hotspots.forEach((hotspot) => {
      const type = hotspot.type ?? 'scene';
      const material = new THREE.SpriteMaterial(
        type === 'info'
          ? {
              map: this.infoTexture ?? undefined,
              transparent: true,
              depthTest: false,
              depthWrite: false,
            }
          : this.hotspotTexture
          ? {
              map: this.hotspotTexture,
              transparent: true,
              depthTest: false,
              depthWrite: false,
            }
          : { color: 0xffd966 }
      );
      const sprite = new THREE.Sprite(material);
      sprite.position.set(hotspot.x, hotspot.y, hotspot.z);
      sprite.scale.set(type === 'info' ? 28 : 25, type === 'info' ? 28 : 25, 1);
      sprite.center.set(0.5, 0.5);
      sprite.frustumCulled = false;
      sprite.renderOrder = 10;
      sprite.userData = {
        targetSceneId: hotspot.targetSceneId,
        type,
        description: hotspot.description,
      };
      this.scene.add(sprite);
      this.hotspots.push(sprite);
    });
  }

  private clearHotspots(): void {
    this.hotspots.forEach((sprite) => {
      this.scene.remove(sprite);
      sprite.material.dispose();
    });
    this.hotspots = [];
  }

  private readonly onPointerDown = (event: MouseEvent): void => {
    this.isUserInteracting = true;
    this.onPointerDownX = event.clientX;
    this.onPointerDownY = event.clientY;
    this.onPointerDownLon = this.lon;
    this.onPointerDownLat = this.lat;
  };

  private readonly onPointerMove = (event: MouseEvent): void => {
    if (!this.isUserInteracting) {
      return;
    }

    this.lon = (this.onPointerDownX - event.clientX) * this.sensitivity + this.onPointerDownLon;
    this.lat = (event.clientY - this.onPointerDownY) * this.sensitivity + this.onPointerDownLat;
  };

  private readonly onTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) {
      return;
    }
    const touch = event.touches[0];
    this.isUserInteracting = true;
    this.onPointerDownX = touch.clientX;
    this.onPointerDownY = touch.clientY;
    this.onPointerDownLon = this.lon;
    this.onPointerDownLat = this.lat;
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    if (!this.isUserInteracting || event.touches.length !== 1) {
      return;
    }
    const touch = event.touches[0];
    this.lon = (this.onPointerDownX - touch.clientX) * this.sensitivity + this.onPointerDownLon;
    this.lat = (touch.clientY - this.onPointerDownY) * this.sensitivity + this.onPointerDownLat;
    event.preventDefault();
  };

  private readonly onPointerUp = (): void => {
    this.isUserInteracting = false;
  };

  private readonly onPointerHover = (event: PointerEvent): void => {
    if (this.isUserInteracting) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.hotspots, false);
    const infoHit = hits.find((hit) => hit.object.userData?.['type'] === 'info');
    if (infoHit) {
      this.hoverInfoText = (infoHit.object.userData?.['description'] as string) || 'Info';
      this.hoverTooltipX = event.clientX - rect.left + 10;
      this.hoverTooltipY = event.clientY - rect.top + 10;
    } else {
      this.hoverInfoText = '';
    }
  };

  private readonly onPointerLeave = (): void => {
    this.hoverInfoText = '';
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!this.project || !this.activeSceneId) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.captureMode) {
      const intersects = this.raycaster.intersectObject(this.mesh, false);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const payload: CapturedCoordinate = {
          x: Number(point.x.toFixed(2)),
          y: Number(point.y.toFixed(2)),
          z: Number(point.z.toFixed(2)),
        };
        this.projectsService.saveCapturedCoordinate(payload);
        this.coordinateCaptured.emit(payload);
      }
      return;
    }

    const hitHotspots = this.raycaster.intersectObjects(this.hotspots, false);
    if (hitHotspots.length > 0) {
      const data = hitHotspots[0].object.userData as { targetSceneId?: string; type?: string };
      if (data.type !== 'info' && data.targetSceneId) {
        this.loadScene(data.targetSceneId);
      }
    }
  };

  private animationLoop(): void {
    this.animationHandle = requestAnimationFrame(() => this.animationLoop());

    this.lat = Math.max(-85, Math.min(85, this.lat));
    this.lookLon += (this.lon - this.lookLon) * this.damping;
    this.lookLat += (this.lat - this.lookLat) * this.damping;

    const phi = THREE.MathUtils.degToRad(90 - this.lookLat);
    const theta = THREE.MathUtils.degToRad(this.lookLon);

    const target = new THREE.Vector3(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );

    this.camera.lookAt(target);
    this.renderer.render(this.scene, this.camera);
  }
}
