import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { CapturedCoordinate, Project } from '../models/project.model';

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

  constructor(private readonly http: HttpClient) {}

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
        },
      ],
    };

    projects.push(project);
    this.writeProjectsToStorage(projects);
    return of(project);
  }

  updateProject(updated: Project): Observable<Project> {
    const projects = this.readProjectsFromStorage();
    const index = projects.findIndex((project) => project.id === updated.id);
    if (index === -1) {
      projects.push(updated);
    } else {
      projects[index] = updated;
    }

    this.writeProjectsToStorage(projects);
    return of(updated);
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
    const withoutFirst = projects.filter((project) => project.id !== this.baselineFirstProject.id);
    return [this.baselineFirstProject, ...withoutFirst];
  }
}
