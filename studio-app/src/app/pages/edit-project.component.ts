import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, startWith, Subject, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProjectsService } from '../services/projects.service';
import { ImageStorageService } from '../services/image-storage.service';
import { PanoramaViewerComponent } from '../components/panorama-viewer.component';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CapturedCoordinate, Project } from '../models/project.model';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [NgIf, AsyncPipe, RouterLink, ReactiveFormsModule, PanoramaViewerComponent],
  template: `
    <main class="page">
      <a routerLink="/dashboard">← Back to dashboard</a>
      <section *ngIf="project$ | async as project">
        <h1>Edit: {{ project.name }}</h1>
        <p class="muted">Project ID: {{ project.id }}</p>

        <p class="muted" *ngIf="capturedCoordinate as coord">
          Captured coordinate loaded: x={{ coord.x.toFixed(2) }}, y={{ coord.y.toFixed(2) }}, z={{ coord.z.toFixed(2) }}
        </p>
      <p class="hint" *ngIf="captureMode">
        Capture mode active in editor: click anywhere on the panorama to store x/y/z.
      </p>

        <div class="layout">
          <div class="editor-panel">
            <div class="mode-toggle">
              <button type="button" [class.active]="!captureMode" (click)="setCaptureMode(false)">Edit Mode</button>
              <button type="button" [class.active]="captureMode" (click)="setCaptureMode(true)">Capture Coordinate</button>
            </div>
            <app-panorama-viewer
              [title]="'Scene Editor: ' + project.name"
              [project]="project"
              [captureMode]="captureMode"
              (coordinateCaptured)="onCoordinateCaptured($event)"
              (sceneChanged)="onSceneChanged($event)"
            ></app-panorama-viewer>
          </div>

          <section class="panel">
            <h3>Current Scene: {{ currentSceneId }}</h3>
            <p class="muted">Set initial viewing angle for this scene.</p>

            <form [formGroup]="viewingAngleForm" class="grid" (ngSubmit)="updateViewingAngle(project)">
              <label>
                Initial Longitude (Horizontal)
                <input type="number" formControlName="initialLon" step="0.01" />
              </label>
              <label>
                Initial Latitude (Vertical)
                <input type="number" formControlName="initialLat" step="0.01" />
              </label>
              <button type="submit" [disabled]="viewingAngleForm.invalid">Set Viewing Angle</button>
            </form>

            <hr />

            <h3>Add Scene + Hotspot</h3>
            <p class="muted">Creates a new scene and links it from the current scene using the captured coordinate.</p>

            <form [formGroup]="form" class="grid" (ngSubmit)="addSceneAndHotspot(project)">
              <label>
                Hotspot Type
                <select formControlName="hotspotType">
                  <option value="scene">Scene Link</option>
                  <option value="info">Info Pointer</option>
                </select>
              </label>

              <label>
                Hotspot Label
                <input type="text" formControlName="label" placeholder="Optional label" />
              </label>

              <label>
                Coordinate X
                <input type="number" formControlName="x" step="0.01" />
              </label>
              <label>
                Coordinate Y
                <input type="number" formControlName="y" step="0.01" />
              </label>
              <label>
                Coordinate Z
                <input type="number" formControlName="z" step="0.01" />
              </label>

              <label *ngIf="form.get('hotspotType')?.value === 'info'">
                Description
                <textarea formControlName="description" rows="3"></textarea>
              </label>

              <div *ngIf="form.get('hotspotType')?.value === 'scene'">
                <label>
                  Upload Target 360 Image
                  <input type="file" accept="image/*" (change)="onTargetImageSelected($event)" />
                </label>
                <p class="muted small" *ngIf="selectedTargetFileName">Selected upload: {{ selectedTargetFileName }}</p>

                <label>
                  Or use existing image path/name
                  <input type="text" formControlName="targetImage" placeholder="inside-room.jpg or /images/inside-room.jpg" />
                </label>
              </div>

              <button type="submit" [disabled]="form.invalid">Add Scene</button>
            </form>
            <p class="notice" *ngIf="message">{{ message }}</p>
          </section>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 24px;
        background: #0a0e27;
        color: #fff;
        min-height: 100vh;
      }

      a {
        color: #4facfe;
        text-decoration: none;
        font-weight: 600;
      }

      a:hover {
        color: #00f2fe;
      }

      .muted {
        color: #7a8fb8;
      }

      .layout {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 12px;
      }

      .panel {
        border: 1px solid rgba(79, 172, 254, 0.2);
        border-radius: 12px;
        padding: 16px;
        background: linear-gradient(135deg, #1a1f4d 0%, #151b40 100%);
        color: #dce8ff;
        transition: all 0.3s ease;
      }

      .panel:hover {
        border-color: rgba(79, 172, 254, 0.5);
        box-shadow: 0 8px 24px rgba(79, 172, 254, 0.1);
      }

      .panel h3 {
        margin: 0 0 8px;
        color: #fff;
      }

      .grid {
        display: grid;
        gap: 10px;
      }

      .grid label {
        color: #dce8ff;
        font-weight: 600;
      }

      input {
        display: block;
        margin-top: 6px;
        width: 100%;
        padding: 8px;
        border: 1px solid rgba(79, 172, 254, 0.3);
        border-radius: 8px;
        background: rgba(79, 172, 254, 0.1);
        color: #fff;
        transition: all 0.2s ease;
      }

      input:focus {
        border-color: #4facfe;
        background: rgba(79, 172, 254, 0.2);
        outline: none;
      }

      input[type="file"] {
        padding: 4px;
      }

      button {
        width: fit-content;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #0a0e27;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      button:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .notice {
        margin-top: 12px;
        color: #00f2fe;
        background: rgba(79, 172, 254, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        border-left: 3px solid #4facfe;
      }

      .small {
        margin-top: -6px;
        font-size: 0.9rem;
        color: #7a8fb8;
      }

      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class EditProjectComponent {
  capturedCoordinate: CapturedCoordinate | null = this.projectsService.getCapturedCoordinate();
  captureMode = false;
  message = '';
  selectedTargetFile: Blob | null = null;
  selectedTargetFileName = '';
  currentSceneId = 'scene-root';
  private currentProject: Project | null = null;
  private readonly refreshProject$ = new Subject<void>();

  readonly form = this.fb.group({
    hotspotType: ['scene', Validators.required],
    label: [''],
    description: [''],
    x: [this.capturedCoordinate?.x ?? 0, Validators.required],
    y: [this.capturedCoordinate?.y ?? 0, Validators.required],
    z: [this.capturedCoordinate?.z ?? 0, Validators.required],
    targetImage: [''],
  });

  readonly viewingAngleForm = this.fb.group({
    initialLon: [0, Validators.required],
    initialLat: [0, Validators.required],
  });

  readonly project$ = combineLatest([this.route.paramMap, this.refreshProject$.pipe(startWith(void 0))]).pipe(
    switchMap(([params]) => this.projectsService.getProjectById(params.get('id') ?? '')),
    tap((project) => {
      if (!project) {
        return;
      }
      this.currentProject = project;
      const currentScene = project.scenes.find((scene) => scene.id === this.currentSceneId) ?? project.scenes[0];
      this.viewingAngleForm.patchValue({
        initialLon: currentScene.initialLon ?? 0,
        initialLat: currentScene.initialLat ?? 0,
      }, { emitEvent: false });
    })
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly projectsService: ProjectsService,
    private readonly imageStorageService: ImageStorageService,
    private readonly fb: FormBuilder
  ) {}

  onSceneChanged(sceneId: string): void {
    this.currentSceneId = sceneId;
    if (!this.currentProject) {
      return;
    }
    const currentScene = this.currentProject.scenes.find((scene) => scene.id === sceneId);
    if (!currentScene) {
      return;
    }
    this.viewingAngleForm.patchValue({
      initialLon: currentScene.initialLon ?? 0,
      initialLat: currentScene.initialLat ?? 0,
    }, { emitEvent: false });
  }

  setCaptureMode(enabled: boolean): void {
    this.captureMode = enabled;
    if (enabled) {
      this.message = 'Edit capture mode enabled. Click the panorama to capture a coordinate.';
    }
  }

  onCoordinateCaptured(point: CapturedCoordinate): void {
    this.capturedCoordinate = point;
    this.projectsService.saveCapturedCoordinate(point);
    this.message = `Coordinate captured: x=${point.x.toFixed(2)}, y=${point.y.toFixed(2)}, z=${point.z.toFixed(2)}`;
  }

  updateViewingAngle(project: Project): void {
    if (!this.viewingAngleForm.valid) {
      return;
    }

    const value = this.viewingAngleForm.getRawValue();
    const updated = {
      ...project,
      scenes: project.scenes.map((scene) =>
        scene.id === this.currentSceneId
          ? { ...scene, initialLon: value.initialLon ?? 0, initialLat: value.initialLat ?? 0 }
          : scene
      ),
    };

    this.projectsService.updateProject(updated).subscribe(() => {
      this.message = `Viewing angle updated for ${this.currentSceneId}.`;
      this.refreshProject$.next();
    });
  }

  onTargetImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.selectedTargetFileName = file.name;
    this.selectedTargetFile = file;
  }

  async addSceneAndHotspot(project: Project): Promise<void> {
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();
    const isInfoPointer = value.hotspotType === 'info';
    const label = value.label?.trim() || (isInfoPointer ? 'Info' : 'Hotspot');
    const description = (value.description ?? '').trim();

    const updated: Project = {
      ...project,
      scenes: project.scenes.map((scene) => ({
        ...scene,
        hotspots: [...scene.hotspots],
      })),
    };

    const currentScene = updated.scenes.find((scene) => scene.id === this.currentSceneId);
    if (!currentScene) {
      this.message = 'Current scene not found.';
      return;
    }

    if (isInfoPointer) {
      currentScene.hotspots.push({
        type: 'info',
        label,
        description: description || 'Info hotspot',
        x: Number(value.x ?? 0),
        y: Number(value.y ?? 0),
        z: Number(value.z ?? 0),
      });

      this.projectsService.updateProject(updated).subscribe(() => {
        this.projectsService.clearCapturedCoordinate();
        this.selectedTargetFile = null;
        this.selectedTargetFileName = '';
        this.form.patchValue({ targetImage: '' });
        this.message = `Added info pointer to ${this.currentSceneId}.`;
        this.refreshProject$.next();
      });
      return;
    }

    const typedTargetImage = value.targetImage?.trim() ?? '';
    let targetImage = typedTargetImage;

    if (this.selectedTargetFile) {
      const key = `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      targetImage = `indexeddb:${key}`;
      try {
        await this.imageStorageService.saveImage(key, this.selectedTargetFile);
      } catch (error) {
        console.error('Failed to save uploaded image to IndexedDB', error);
        this.message = 'Could not save the uploaded image. Please try again.';
        return;
      }
    }

    if (!targetImage) {
      this.message = 'Please upload a target 360 image or provide an existing image path.';
      return;
    }

    const newSceneId = `scene-${project.scenes.length + 1}`;
    updated.scenes.push({
      id: newSceneId,
      image: targetImage,
      hotspots: [],
      initialLon: 0,
      initialLat: 0,
    });

    currentScene.hotspots.push({
      type: 'scene',
      label,
      x: Number(value.x ?? 0),
      y: Number(value.y ?? 0),
      z: Number(value.z ?? 0),
      targetSceneId: newSceneId,
    });

    this.projectsService.updateProject(updated).subscribe(() => {
      this.projectsService.clearCapturedCoordinate();
      this.selectedTargetFile = null;
      this.selectedTargetFileName = '';
      this.form.patchValue({ targetImage: '' });
      this.message = `Added ${newSceneId} and linked hotspot to ${this.currentSceneId}.`;
      this.refreshProject$.next();
    });
  }
}
