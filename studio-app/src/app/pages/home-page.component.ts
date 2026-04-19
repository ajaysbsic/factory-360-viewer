import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subject, startWith, switchMap } from 'rxjs';
import { Project } from '../models/project.model';
import { ProjectsService } from '../services/projects.service';
import { ProjectCardComponent } from '../components/project-card.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProjectCardComponent],
  template: `
    <main class="page">
      <header class="top">
        <div>
          <h1>Immersive 360 Project Studio</h1>
          <p class="muted">Create, manage, and launch reusable 360 training projects.</p>
        </div>
        <a class="primary" routerLink="/project/new">+ New Project</a>
      </header>

      <section>
        <h2>Projects</h2>
        <div class="grid" *ngIf="projects$ | async as projects">
          <app-project-card
            *ngFor="let project of projects"
            [project]="project"
            (deleteRequested)="deleteProject($event)"
          ></app-project-card>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 1080px;
        margin: 0 auto;
        padding: 24px;
      }

      .top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .muted {
        color: #4d5870;
      }

      .primary {
        background: #0f5bcf;
        color: #fff;
        text-decoration: none;
        padding: 10px 14px;
        border-radius: 10px;
        font-weight: 600;
      }

      .grid {
        display: grid;
        gap: 12px;
      }
    `,
  ],
})
export class HomePageComponent {
  private readonly refreshProjects$ = new Subject<void>();

  readonly projects$: Observable<Project[]> = this.refreshProjects$.pipe(
    startWith(void 0),
    switchMap(() => this.projectsService.getProjects())
  );

  constructor(private readonly projectsService: ProjectsService) {}

  deleteProject(projectId: number): void {
    if (projectId === 1001) {
      return;
    }

    this.projectsService.deleteProject(projectId).subscribe(() => {
      this.refreshProjects$.next();
    });
  }
}
