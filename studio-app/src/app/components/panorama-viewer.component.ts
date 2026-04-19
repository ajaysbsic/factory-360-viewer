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

@Component({
  selector: 'app-panorama-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="viewer">
      <h3>{{ title }}</h3>
      <div class="viewer-shell" #host>
        <div class="canvas-layer" #canvasHost></div>

        <button
          class="viewer-btn back-btn"
          type="button"
          *ngIf="activeSceneId && activeSceneId !== 'scene-root'"
          (click)="goBackToRoot()"
          aria-label="Back to root scene"
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
        border: 1px solid #d5dae2;
        border-radius: 12px;
        padding: 16px;
        background: #fff;
      }

      .viewer-shell {
        margin-top: 12px;
        min-height: 260px;
        height: 420px;
        border: 1px solid #c9d1de;
        border-radius: 12px;
        overflow: hidden;
        position: relative;
        background: #0f172a;
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

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasHost', { static: true }) canvasHostRef!: ElementRef<HTMLDivElement>;

  activeSceneId: string | null = null;
  isFullscreen = false;

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

  constructor(private readonly projectsService: ProjectsService) {}

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

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onPointerDown);
    canvas.addEventListener('mousemove', this.onPointerMove);
    canvas.addEventListener('mouseup', this.onPointerUp);
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
      this.lon = 0;
      this.lat = 0;
      this.lookLon = 0;
      this.lookLat = 0;
      this.loadScene(root.id);
    }
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
      this.loadScene(root.id);
    }
  }

  private loadScene(sceneId: string): void {
    if (!this.project) {
      return;
    }

    const nextScene = this.project.scenes.find((scene) => scene.id === sceneId);
    if (!nextScene) {
      return;
    }

    this.activeSceneId = nextScene.id;
    this.clearHotspots();

    const path = this.resolveImagePath(nextScene.image);
    this.textureLoader.load(
      path,
      (texture: THREE.Texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.mesh.material = new THREE.MeshBasicMaterial({ map: texture });
      },
      undefined,
      () => {
        this.mesh.material = new THREE.MeshBasicMaterial({ color: 0x1f2a44 });
      }
    );

    this.addHotspots(nextScene);
  }

  private resolveImagePath(image: string): string {
    if (image.startsWith('http') || image.startsWith('/') || image.startsWith('data:') || image.startsWith('blob:')) {
      return image;
    }
    return `/images/${image}`;
  }

  private addHotspots(scene: Scene): void {
    scene.hotspots.forEach((hotspot) => {
      const material = new THREE.SpriteMaterial(
        this.hotspotTexture
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
      sprite.scale.set(22, 22, 1);
      sprite.renderOrder = 10;
      sprite.userData = { targetSceneId: hotspot.targetSceneId };
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
      const targetSceneId = hitHotspots[0].object.userData['targetSceneId'] as string | undefined;
      if (targetSceneId) {
        this.loadScene(targetSceneId);
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
