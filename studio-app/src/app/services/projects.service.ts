import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, of, tap } from 'rxjs';
import { CapturedCoordinate, Project, Scene } from '../models/project.model';
import { ImageStorageService } from './image-storage.service';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly projectsKey = 'immersive360.projects';
  private readonly coordinateKey = 'selectedCoordinate';
  private readonly baselineFirstProject: Project = {
    id: 1001,
    name: 'DC Charger Hall',
    rootScene: 'hall.jpg',
    scenes: [
      {
        id: 'scene-root',
        image: 'hall.jpg',
        hotspots: [
          {
            label: 'Enter Workstation',
            x: -298.19,
            y: -248.7,
            z: -313.82,
            targetSceneId: 'scene-2',
          },
          {
            label: 'Enter Factory',
            x: -432.16,
            y: -138.16,
            z: 207.98,
            targetSceneId: 'scene-3',
          },
        ],
      },
      {
        id: 'scene-2',
        image: 'inside.jpg',
        hotspots: [],
      },
      {
        id: 'scene-3',
        image: 'factory.jpg',
        hotspots: [],
      },
    ],
  };

  constructor(
    private readonly http: HttpClient,
    private readonly imageStorageService: ImageStorageService
  ) {}

  getProjects(): Observable<Project[]> {
    const stored = this.readProjectsFromStorage();
    if (stored.length > 0) {
      const patched = this.ensureFirstProjectBaseline(stored);
      this.writeProjectsToStorage(patched);
      return of(patched);
    }

    return this.http.get<Project[]>('/data/projects.json').pipe(
      map((projects) => this.ensureFirstProjectBaseline(projects)),
      tap((projects) => this.writeProjectsToStorage(projects))
    );
  }

  getProjectById(id: string): Observable<Project | undefined> {
    return this.getProjects().pipe(map((projects) => projects.find((project) => String(project.id) === id)));
  }

  createProject(name: string, imagePath: string): Observable<Project> {
    const projects = this.readProjectsFromStorage();
    const project: Project = {
      id: Date.now(),
      name,
      rootScene: imagePath,
      scenes: [
        {
          id: 'scene-root',
          image: imagePath,
          hotspots: [],
          initialLon: 0,
          initialLat: 0,
        },
      ],
    };

    return from(this.migrateProjectImages(project)).pipe(
      tap((migratedProject) => {
        projects.push(migratedProject);
        this.writeProjectsToStorage(projects);
      }),
      map((migratedProject) => migratedProject)
    );
  }

  updateProject(updated: Project): Observable<Project> {
    return from(this.migrateProjectImages(updated)).pipe(
      tap((migratedProject) => {
        const projects = this.readProjectsFromStorage();
        const index = projects.findIndex((project) => project.id === migratedProject.id);
        if (index === -1) {
          projects.push(migratedProject);
        } else {
          projects[index] = migratedProject;
        }
        this.writeProjectsToStorage(projects);
      }),
      map((migratedProject) => migratedProject)
    );
  }

  deleteProject(projectId: number): Observable<void> {
    if (projectId === this.baselineFirstProject.id) {
      return of(void 0);
    }

    const projects = this.readProjectsFromStorage().filter((project) => project.id !== projectId);
    this.writeProjectsToStorage(projects);
    return of(void 0);
  }

  saveCapturedCoordinate(point: CapturedCoordinate): void {
    localStorage.setItem(this.coordinateKey, JSON.stringify(point));
  }

  getCapturedCoordinate(): CapturedCoordinate | null {
    try {
      const raw = localStorage.getItem(this.coordinateKey);
      return raw ? (JSON.parse(raw) as CapturedCoordinate) : null;
    } catch {
      return null;
    }
  }

  clearCapturedCoordinate(): void {
    localStorage.removeItem(this.coordinateKey);
  }

  private async migrateProjectImages(project: Project): Promise<Project> {
    const scenes = await Promise.all(
      project.scenes.map(async (scene) => this.migrateSceneImage(scene))
    );

    return {
      ...project,
      scenes,
    };
  }

  private async migrateSceneImage(scene: Scene): Promise<Scene> {
    if (scene.image.startsWith('data:')) {
      const key = `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const blob = this.dataUrlToBlob(scene.image);
      await this.imageStorageService.saveImage(key, blob);
      return {
        ...scene,
        image: `indexeddb:${key}`,
      };
    }

    return scene;
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const contentTypeMatch = header.match(/data:(.*?);base64/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

    const binaryString = atob(base64);
    const array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      array[i] = binaryString.charCodeAt(i);
    }

    return new Blob([array], { type: contentType });
  }

  private readProjectsFromStorage(): Project[] {
    try {
      const raw = localStorage.getItem(this.projectsKey);
      return raw ? (JSON.parse(raw) as Project[]) : [];
    } catch {
      return [];
    }
  }

  private writeProjectsToStorage(projects: Project[]): void {
    localStorage.setItem(this.projectsKey, JSON.stringify(projects));
  }

  private ensureFirstProjectBaseline(projects: Project[]): Project[] {
    const hasBaseline = projects.some((project) => project.id === this.baselineFirstProject.id);
    if (hasBaseline) {
      return projects;
    }
    return [this.baselineFirstProject, ...projects];
  }
}
