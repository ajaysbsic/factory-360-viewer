import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { ProjectsService } from '../services/projects.service';
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

        <div class="layout">
          <app-panorama-viewer
            [title]="'Scene Editor: ' + project.name"
            [project]="project"
          ></app-panorama-viewer>

          <section class="panel">
            <h3>Add Scene + Hotspot</h3>
            <p class="muted">Creates a new scene and links it from root scene using the captured coordinate.</p>

            <form [formGroup]="form" class="grid" (ngSubmit)="addSceneAndHotspot(project)">
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
              <label>
                Upload Target 360 Image
                <input type="file" accept="image/*" (change)="onTargetImageSelected($event)" />
              </label>
              <p class="muted small" *ngIf="selectedTargetFileName">Selected upload: {{ selectedTargetFileName }}</p>

              <label>
                Or use existing image path/name
                <input type="text" formControlName="targetImage" placeholder="inside-room.jpg or /images/inside-room.jpg" />
              </label>
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
      }

      .muted {
        color: #4d5870;
      }

      .layout {
        margin-top: 16px;
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 12px;
      }

      .panel {
        border: 1px solid #d5dae2;
        border-radius: 12px;
        padding: 16px;
        background: #fff;
      }

      .grid {
        display: grid;
        gap: 10px;
      }

      input {
        display: block;
        margin-top: 6px;
        width: 100%;
        padding: 8px;
      }

      button {
        width: fit-content;
        padding: 8px 12px;
      }

      .notice {
        margin-top: 12px;
        color: #14532d;
      }

      .small {
        margin-top: -6px;
        font-size: 0.9rem;
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
  readonly capturedCoordinate: CapturedCoordinate | null = this.projectsService.getCapturedCoordinate();
  message = '';
  selectedTargetImageDataUrl: string | null = null;
  selectedTargetFileName = '';

  readonly form = this.fb.group({
    x: [this.capturedCoordinate?.x ?? 0, Validators.required],
    y: [this.capturedCoordinate?.y ?? 0, Validators.required],
    z: [this.capturedCoordinate?.z ?? 0, Validators.required],
    targetImage: [''],
  });

  readonly project$ = this.route.paramMap.pipe(
    switchMap((params) => this.projectsService.getProjectById(params.get('id') ?? ''))
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly projectsService: ProjectsService,
    private readonly fb: FormBuilder
  ) {}

  onTargetImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.selectedTargetFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedTargetImageDataUrl = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  addSceneAndHotspot(project: Project): void {
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();
    const typedTargetImage = value.targetImage?.trim() ?? '';
    const targetImage = this.selectedTargetImageDataUrl ?? typedTargetImage;
    if (!targetImage) {
      this.message = 'Please upload a target 360 image or provide an existing image path.';
      return;
    }

    const newSceneId = `scene-${project.scenes.length + 1}`;

    const updated: Project = {
      ...project,
      scenes: project.scenes.map((scene) => ({
        ...scene,
        hotspots: [...scene.hotspots],
      })),
    };

    updated.scenes.push({
      id: newSceneId,
      image: targetImage,
      hotspots: [],
    });

    const rootScene = updated.scenes.find((scene) => scene.id === 'scene-root') ?? updated.scenes[0];
    rootScene.hotspots.push({
      x: Number(value.x ?? 0),
      y: Number(value.y ?? 0),
      z: Number(value.z ?? 0),
      targetSceneId: newSceneId,
    });

    this.projectsService.updateProject(updated).subscribe(() => {
      this.projectsService.clearCapturedCoordinate();
      this.selectedTargetImageDataUrl = null;
      this.selectedTargetFileName = '';
      this.form.patchValue({ targetImage: '' });
      this.message = `Added ${newSceneId} and linked hotspot to root scene.`;
    });
  }
}
