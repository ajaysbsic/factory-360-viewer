import { Component } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, startWith, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ProjectsService } from '../services/projects.service';
import { PanoramaViewerComponent } from '../components/panorama-viewer.component';
import { CapturedCoordinate, Project } from '../models/project.model';

@Component({
  selector: 'app-viewer-page',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, RouterLink, PanoramaViewerComponent],
  template: `
    <main class="page">
      <a routerLink="/dashboard">← Back to dashboard</a>
      <section *ngIf="project$ | async as project">
        <h1>{{ project.name }} Viewer</h1>
        <p class="muted">Root panorama: {{ project.rootScene }}</p>

        <div class="mode-toggle">
          <button type="button" [class.active]="!captureMode" (click)="setCaptureMode(false)">View Mode</button>
          <button type="button" [class.active]="captureMode" (click)="setCaptureMode(true)">Capture Coordinate</button>
          <a class="edit-link" [routerLink]="['/project', project.id, 'edit']">Go to Editor</a>
        </div>

        <p class="hint" *ngIf="captureMode">Capture mode active: click anywhere on panorama to store x/y/z.</p>
        <p class="hint" *ngIf="lastCaptured">
          Last captured: x={{ lastCaptured.x.toFixed(2) }}, y={{ lastCaptured.y.toFixed(2) }}, z={{ lastCaptured.z.toFixed(2) }}
        </p>

        <app-panorama-viewer
          [title]="project.name + ' - Interactive Viewer'"
          [project]="project"
          [captureMode]="captureMode"
          [sensitivity]="sensitivity"
          [damping]="damping"
          (coordinateCaptured)="onCoordinateCaptured($event)"
        ></app-panorama-viewer>

        <section class="info-grid">
          <article class="panel">
            <div class="panel-head">
              <h2>Viewer Controls</h2>
              <span class="status">{{ captureMode ? 'Capture Mode' : 'Ready' }}</span>
            </div>

            <label class="control-row" for="sensitivity">Sensitivity <strong>{{ sensitivity.toFixed(2) }}</strong></label>
            <input
              id="sensitivity"
              type="range"
              min="0.04"
              max="0.5"
              step="0.01"
              [value]="sensitivity"
              (input)="onSensitivityInput($event)"
            />

            <label class="control-row" for="damping">Damping <strong>{{ damping.toFixed(2) }}</strong></label>
            <input
              id="damping"
              type="range"
              min="0.02"
              max="0.35"
              step="0.01"
              [value]="damping"
              (input)="onDampingInput($event)"
            />

            <p class="panel-note">
              {{ getControlsMessage(project) }}
            </p>
          </article>

          <article class="panel">
            <h2>Hotspots</h2>
            <ul *ngIf="getRootHotspotSummaries(project).length > 0; else noHotspots">
              <li *ngFor="let hotspot of getRootHotspotSummaries(project)" [class.active-hotspot]="activeHotspotIndex === hotspot.index">
                <strong>{{ hotspot.label }}</strong> — {{ hotspot.action }}

                <div class="coord-editor">
                  <label>
                    X
                    <input
                      type="number"
                      [value]="getEditableValue(hotspot.index, 'x', hotspot.x)"
                      step="0.01"
                      (focus)="setActiveHotspot(hotspot.index)"
                      (input)="setEditableValue(hotspot.index, 'x', $event)"
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      [value]="getEditableValue(hotspot.index, 'y', hotspot.y)"
                      step="0.01"
                      (focus)="setActiveHotspot(hotspot.index)"
                      (input)="setEditableValue(hotspot.index, 'y', $event)"
                    />
                  </label>
                  <label>
                    Z
                    <input
                      type="number"
                      [value]="getEditableValue(hotspot.index, 'z', hotspot.z)"
                      step="0.01"
                      (focus)="setActiveHotspot(hotspot.index)"
                      (input)="setEditableValue(hotspot.index, 'z', $event)"
                    />
                  </label>
                </div>

                <div class="row-actions">
                  <button type="button" class="action-btn ghost" (click)="setActiveHotspot(hotspot.index)">Edit Hotspot</button>
                  <button
                    type="button"
                    class="action-btn"
                    (click)="updateHotspotCoordinate(project, hotspot.index)"
                  >
                    Update
                  </button>
                  <button type="button" class="action-btn danger" (click)="deleteHotspot(project, hotspot.index)">Delete</button>
                </div>
                <p class="inline-note" *ngIf="activeHotspotIndex === hotspot.index">Selected for capture updates.</p>
              </li>
            </ul>
            <ng-template #noHotspots>
              <p class="panel-note">No hotspots configured on the root scene yet.</p>
            </ng-template>
            <p class="panel-note" *ngIf="hotspotMessage">{{ hotspotMessage }}</p>
          </article>
        </section>
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

      .mode-toggle {
        margin: 12px 0;
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      .mode-toggle button {
        border: 1px solid #d0d7e4;
        background: #fff;
        color: #22304f;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
      }

      .mode-toggle button.active {
        border-color: #0f5bcf;
        background: #e8f0ff;
      }

      .edit-link {
        margin-left: auto;
        text-decoration: none;
        font-weight: 600;
      }

      .hint {
        margin: 8px 0;
        color: #37445f;
      }

      .info-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .panel {
        border: 1px solid #1f3561;
        border-radius: 18px;
        background: linear-gradient(180deg, #041331 0%, #021028 100%);
        color: #dce8ff;
        padding: 18px;
      }

      .panel h2 {
        margin: 0 0 12px;
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .status {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(84, 176, 255, 0.25);
        font-size: 0.9rem;
      }

      .control-row {
        display: flex;
        justify-content: space-between;
        margin: 12px 0 6px;
      }

      input[type='range'] {
        width: 100%;
      }

      .panel ul {
        margin: 0;
        padding-left: 20px;
      }

      .panel li {
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(168, 187, 220, 0.2);
        padding-bottom: 12px;
      }

      .panel li.active-hotspot {
        background: rgba(84, 176, 255, 0.12);
        border-radius: 10px;
        padding: 10px;
      }

      .panel-note {
        color: #a8bbdc;
        margin: 14px 0 0;
      }

      .coord-editor {
        margin-top: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(60px, 1fr));
        gap: 8px;
      }

      .coord-editor input {
        margin-top: 4px;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #2c4a7f;
        border-radius: 8px;
        background: #0b1f47;
        color: #dce8ff;
        padding: 6px;
      }

      .row-actions {
        margin-top: 10px;
        display: flex;
        gap: 8px;
      }

      .action-btn {
        border: 1px solid #3e7ae3;
        border-radius: 8px;
        background: #123b7e;
        color: #e8f1ff;
        padding: 6px 10px;
        cursor: pointer;
      }

      .action-btn.ghost {
        border-color: #5b88d2;
        background: #0f2d5d;
      }

      .action-btn.danger {
        border-color: #c63e57;
        background: #5d1f30;
      }

      .inline-note {
        margin: 8px 0 0;
        color: #9ed0ff;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class ViewerPageComponent {
  captureMode = false;
  sensitivity = 0.12;
  damping = 0.08;
  lastCaptured: CapturedCoordinate | null = this.projectsService.getCapturedCoordinate();
  hotspotMessage = '';
  activeHotspotIndex: number | null = null;
  private readonly editableCoordinates: Record<number, CapturedCoordinate> = {};
  private readonly refreshProject$ = new Subject<void>();

  readonly project$ = combineLatest([this.route.paramMap, this.refreshProject$.pipe(startWith(void 0))]).pipe(
    switchMap(([params]) => this.projectsService.getProjectById(params.get('id') ?? ''))
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly projectsService: ProjectsService
  ) {}

  setCaptureMode(enabled: boolean): void {
    this.captureMode = enabled;
    if (enabled && this.activeHotspotIndex === null) {
      this.hotspotMessage = 'Select a hotspot row with Edit Hotspot before capturing.';
    }
  }

  onCoordinateCaptured(point: CapturedCoordinate): void {
    this.lastCaptured = point;
    if (this.activeHotspotIndex === null) {
      this.hotspotMessage = 'Coordinate captured. Select a hotspot row to auto-apply it.';
      return;
    }

    this.editableCoordinates[this.activeHotspotIndex] = {
      x: Number(point.x.toFixed(2)),
      y: Number(point.y.toFixed(2)),
      z: Number(point.z.toFixed(2)),
    };
    this.hotspotMessage = `Captured coordinate applied to hotspot #${this.activeHotspotIndex + 1}. Click Update to save.`;
  }

  onSensitivityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value)) {
      this.sensitivity = value;
    }
  }

  onDampingInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(value)) {
      this.damping = value;
    }
  }

  getControlsMessage(project: { scenes: Array<{ id: string }> }): string {
    const hasFactoryScene = project.scenes.some((scene) => scene.id.toLowerCase().includes('factory'));
    if (hasFactoryScene) {
      return 'Factory scene loaded. Use back button to return outside.';
    }
    return 'Use hotspot links to move between connected scenes.';
  }

  getRootHotspotSummaries(project: {
    scenes: Array<{
      id: string;
      hotspots: Array<{ label?: string; x: number; y: number; z: number; targetSceneId: string }>;
    }>;
  }): Array<{ index: number; label: string; action: string; x: number; y: number; z: number }> {
    const rootScene = project.scenes.find((scene) => scene.id === 'scene-root') ?? project.scenes[0];
    if (!rootScene) {
      return [];
    }

    return rootScene.hotspots.map((hotspot, index) => {
      const targetScene = project.scenes.find((scene) => scene.id === hotspot.targetSceneId);
      return {
        index,
        label: hotspot.label ?? 'Hotspot',
        action: targetScene ? `open ${targetScene.id.replace(/-/g, ' ')} view` : 'open linked scene',
        x: hotspot.x,
        y: hotspot.y,
        z: hotspot.z,
      };
    });
  }

  updateHotspotCoordinate(project: Project, hotspotIndex: number): void {
    const draft = this.editableCoordinates[hotspotIndex];
    if (!draft) {
      this.hotspotMessage = 'No coordinate selected. Edit values or capture a coordinate first.';
      return;
    }

    const nextX = Number(draft.x);
    const nextY = Number(draft.y);
    const nextZ = Number(draft.z);
    if ([nextX, nextY, nextZ].some((value) => Number.isNaN(value))) {
      this.hotspotMessage = 'Invalid coordinate values. Please use valid numbers.';
      return;
    }

    const updated = this.cloneProject(project);
    const rootScene = updated.scenes.find((scene) => scene.id === 'scene-root') ?? updated.scenes[0];
    if (!rootScene || !rootScene.hotspots[hotspotIndex]) {
      this.hotspotMessage = 'Hotspot not found.';
      return;
    }

    rootScene.hotspots[hotspotIndex] = {
      ...rootScene.hotspots[hotspotIndex],
      x: Number(nextX.toFixed(2)),
      y: Number(nextY.toFixed(2)),
      z: Number(nextZ.toFixed(2)),
    };

    this.projectsService.updateProject(updated).subscribe(() => {
      this.hotspotMessage = 'Hotspot coordinate updated.';
      this.editableCoordinates[hotspotIndex] = {
        x: Number(nextX.toFixed(2)),
        y: Number(nextY.toFixed(2)),
        z: Number(nextZ.toFixed(2)),
      };
      this.refreshProject$.next();
    });
  }

  deleteHotspot(project: Project, hotspotIndex: number): void {
    const updated = this.cloneProject(project);
    const rootScene = updated.scenes.find((scene) => scene.id === 'scene-root') ?? updated.scenes[0];
    if (!rootScene || !rootScene.hotspots[hotspotIndex]) {
      this.hotspotMessage = 'Hotspot not found.';
      return;
    }

    const [removed] = rootScene.hotspots.splice(hotspotIndex, 1);
    const removedTargetSceneId = removed?.targetSceneId;

    if (removedTargetSceneId) {
      updated.scenes = updated.scenes.filter((scene) => scene.id !== removedTargetSceneId);
      updated.scenes = updated.scenes.map((scene) => ({
        ...scene,
        hotspots: scene.hotspots.filter((hotspot) => hotspot.targetSceneId !== removedTargetSceneId),
      }));
    }

    this.projectsService.updateProject(updated).subscribe(() => {
      this.hotspotMessage = 'Hotspot deleted and linked scene removed.';
      this.activeHotspotIndex = null;
      Object.keys(this.editableCoordinates).forEach((key) => {
        delete this.editableCoordinates[Number(key)];
      });
      this.refreshProject$.next();
    });
  }

  setActiveHotspot(hotspotIndex: number): void {
    this.activeHotspotIndex = hotspotIndex;
    this.hotspotMessage = `Hotspot #${hotspotIndex + 1} selected for capture updates.`;
  }

  getEditableValue(hotspotIndex: number, axis: 'x' | 'y' | 'z', fallback: number): number {
    if (!this.editableCoordinates[hotspotIndex]) {
      this.editableCoordinates[hotspotIndex] = {
        x: Number.NaN,
        y: Number.NaN,
        z: Number.NaN,
      };
    }

    if (Number.isNaN(this.editableCoordinates[hotspotIndex][axis])) {
      this.editableCoordinates[hotspotIndex][axis] = Number(fallback.toFixed(2));
    }

    return this.editableCoordinates[hotspotIndex][axis];
  }

  setEditableValue(hotspotIndex: number, axis: 'x' | 'y' | 'z', event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeric = Number(input.value);
    if (Number.isNaN(numeric)) {
      return;
    }

    if (!this.editableCoordinates[hotspotIndex]) {
      this.editableCoordinates[hotspotIndex] = { x: 0, y: 0, z: 0 };
    }

    this.editableCoordinates[hotspotIndex][axis] = numeric;
  }

  private cloneProject(project: Project): Project {
    return {
      ...project,
      scenes: project.scenes.map((scene) => ({
        ...scene,
        hotspots: scene.hotspots.map((hotspot) => ({ ...hotspot })),
      })),
    };
  }
}
