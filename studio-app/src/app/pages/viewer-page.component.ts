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
          (sceneChanged)="onSceneChanged($event)"
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
            <ul *ngIf="getCurrentSceneHotspotSummaries(project).length > 0; else noHotspots">
              <li *ngFor="let hotspot of getCurrentSceneHotspotSummaries(project)" [class.active-hotspot]="activeHotspotIndex === hotspot.index">
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
              <p class="panel-note">No hotspots configured on this scene yet.</p>
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

      .mode-toggle {
        margin: 12px 0;
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      .mode-toggle button {
        border: 1px solid rgba(79, 172, 254, 0.3);
        background: rgba(79, 172, 254, 0.1);
        color: #4facfe;
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .mode-toggle button:hover {
        background: rgba(79, 172, 254, 0.2);
        border-color: rgba(79, 172, 254, 0.5);
      }

      .mode-toggle button.active {
        border-color: #4facfe;
        background: rgba(79, 172, 254, 0.25);
        color: #00f2fe;
      }

      .edit-link {
        margin-left: auto;
        text-decoration: none;
        font-weight: 600;
        color: #4facfe;
      }

      .edit-link:hover {
        color: #00f2fe;
      }

      .hint {
        margin: 8px 0;
        color: #dce8ff;
        background: rgba(79, 172, 254, 0.1);
        padding: 8px 12px;
        border-radius: 8px;
        border-left: 3px solid #4facfe;
      }

      .info-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }

      .panel {
        border: 1px solid rgba(79, 172, 254, 0.2);
        border-radius: 18px;
        background: linear-gradient(135deg, #1a1f4d 0%, #151b40 100%);
        color: #dce8ff;
        padding: 18px;
        transition: all 0.3s ease;
      }

      .panel:hover {
        border-color: rgba(79, 172, 254, 0.5);
        box-shadow: 0 8px 24px rgba(79, 172, 254, 0.1);
      }

      .panel h2 {
        margin: 0 0 12px;
        color: #fff;
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
        background: rgba(79, 172, 254, 0.25);
        font-size: 0.9rem;
        color: #00f2fe;
      }

      .control-row {
        display: flex;
        justify-content: space-between;
        margin: 12px 0 6px;
        color: #dce8ff;
      }

      .control-row strong {
        color: #4facfe;
      }

      input[type='range'] {
        width: 100%;
        accent-color: #4facfe;
      }

      .panel ul {
        margin: 0;
        padding-left: 20px;
      }

      .panel li {
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(168, 187, 220, 0.2);
        padding-bottom: 12px;
        color: #dce8ff;
      }

      .panel li.active-hotspot {
        background: rgba(79, 172, 254, 0.15);
        border-radius: 10px;
        padding: 10px;
        border: 1px solid rgba(79, 172, 254, 0.3);
      }

      .panel-note {
        color: #7a8fb8;
        margin: 14px 0 0;
      }

      .coord-editor {
        margin-top: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(60px, 1fr));
        gap: 8px;
      }

      .coord-editor label {
        color: #dce8ff;
        font-size: 0.9rem;
      }

      .coord-editor input {
        margin-top: 4px;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(79, 172, 254, 0.3);
        border-radius: 8px;
        background: rgba(79, 172, 254, 0.1);
        color: #fff;
        padding: 6px;
        transition: all 0.2s ease;
      }

      .coord-editor input:focus {
        border-color: #4facfe;
        background: rgba(79, 172, 254, 0.2);
        outline: none;
      }

      .row-actions {
        margin-top: 10px;
        display: flex;
        gap: 8px;
      }

      .action-btn {
        border: 1px solid rgba(79, 172, 254, 0.3);
        border-radius: 8px;
        background: rgba(79, 172, 254, 0.15);
        color: #4facfe;
        padding: 6px 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }

      .action-btn:hover {
        background: rgba(79, 172, 254, 0.25);
        border-color: rgba(79, 172, 254, 0.5);
        color: #00f2fe;
      }

      .action-btn.ghost {
        border-color: rgba(79, 172, 254, 0.4);
        background: rgba(79, 172, 254, 0.1);
      }

      .action-btn.danger {
        border-color: rgba(220, 62, 87, 0.3);
        background: rgba(220, 62, 87, 0.15);
        color: #ff6b7a;
      }

      .action-btn.danger:hover {
        background: rgba(220, 62, 87, 0.25);
        border-color: rgba(220, 62, 87, 0.5);
      }

      .inline-note {
        margin: 8px 0 0;
        color: #00f2fe;
        font-size: 0.9rem;
        font-weight: 600;
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
  private editableCoordinates: Record<number, CapturedCoordinate> = {};
  private readonly refreshProject$ = new Subject<void>();
  currentSceneId = 'scene-root';

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

  onSceneChanged(sceneId: string): void {
    this.currentSceneId = sceneId;
    this.activeHotspotIndex = null;
    this.editableCoordinates = {};
    this.hotspotMessage = '';
  }

  getCurrentSceneHotspotSummaries(project: {
    scenes: Array<{
      id: string;
      hotspots: Array<{ label?: string; x: number; y: number; z: number; targetSceneId?: string; type?: string; description?: string }>;
    }>;
  }): Array<{ index: number; label: string; action: string; x: number; y: number; z: number }> {
    const currentScene = project.scenes.find((scene) => scene.id === this.currentSceneId);
    if (!currentScene) {
      return [];
    }

    return currentScene.hotspots.map((hotspot, index) => {
      const type = hotspot.type ?? 'scene';
      if (type === 'info') {
        return {
          index,
          label: hotspot.label ?? 'Info',
          action: hotspot.description ? 'show info' : 'info pointer',
          x: hotspot.x,
          y: hotspot.y,
          z: hotspot.z,
        };
      }

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

  getRootHotspotSummaries(project: {
    scenes: Array<{
      id: string;
      hotspots: Array<{ label?: string; x: number; y: number; z: number; targetSceneId?: string; type?: string; description?: string }>;
    }>;
  }): Array<{ index: number; label: string; action: string; x: number; y: number; z: number }> {
    const rootScene = project.scenes.find((scene) => scene.id === 'scene-root') ?? project.scenes[0];
    if (!rootScene) {
      return [];
    }

    return rootScene.hotspots.map((hotspot, index) => {
      const type = hotspot.type ?? 'scene';
      if (type === 'info') {
        return {
          index,
          label: hotspot.label ?? 'Info',
          action: hotspot.description ? 'show info' : 'info pointer',
          x: hotspot.x,
          y: hotspot.y,
          z: hotspot.z,
        };
      }

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
    const currentScene = updated.scenes.find((scene) => scene.id === this.currentSceneId);
    if (!currentScene || !currentScene.hotspots[hotspotIndex]) {
      this.hotspotMessage = 'Hotspot not found.';
      return;
    }

    currentScene.hotspots[hotspotIndex] = {
      ...currentScene.hotspots[hotspotIndex],
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
    const currentScene = updated.scenes.find((scene) => scene.id === this.currentSceneId);
    if (!currentScene || !currentScene.hotspots[hotspotIndex]) {
      this.hotspotMessage = 'Hotspot not found.';
      return;
    }

    const [removed] = currentScene.hotspots.splice(hotspotIndex, 1);
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
