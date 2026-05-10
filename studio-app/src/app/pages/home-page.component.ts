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
      <header class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="gradient-text">Immersive 360</span> Project Studio
          </h1>
          <p class="hero-subtitle">Create, manage, and launch reusable 360 training projects with an intuitive interface.</p>
          <a class="cta-button" routerLink="/project/new">
            <span class="icon">+</span>
            Create New Project
          </a>
        </div>
      </header>

      <section class="projects-section">
        <div class="section-header">
          <div>
            <h2>Your Projects</h2>
            <p class="section-hint">Manage and view all your 360 panorama projects</p>
          </div>
        </div>

        <div class="grid" *ngIf="(projects$ | async) as projects">
          <div *ngIf="projects.length === 0" class="empty-state">
            <p>No projects yet. Create one to get started!</p>
          </div>
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
      * {
        box-sizing: border-box;
      }

      .page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0e27 0%, #1a1f4d 50%, #0f2a5f 100%);
        padding: 0;
        margin: 0;
      }

      .hero {
        background: linear-gradient(135deg, rgba(15, 91, 207, 0.1) 0%, rgba(79, 172, 254, 0.05) 100%);
        border-bottom: 1px solid rgba(79, 172, 254, 0.2);
        padding: 80px 24px;
        text-align: center;
      }

      .hero-content {
        max-width: 900px;
        margin: 0 auto;
      }

      .hero-title {
        font-size: 3.5rem;
        font-weight: 800;
        margin: 0 0 16px;
        color: #fff;
        line-height: 1.2;
      }

      .gradient-text {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .hero-subtitle {
        font-size: 1.2rem;
        color: #b8c5e0;
        margin: 0 0 32px;
        line-height: 1.6;
      }

      .cta-button {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #0a0e27;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 50px;
        font-weight: 700;
        font-size: 1.1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 24px rgba(79, 172, 254, 0.3);
      }

      .cta-button:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(79, 172, 254, 0.4);
      }

      .cta-button:active {
        transform: translateY(-2px);
      }

      .icon {
        font-size: 1.3rem;
        font-weight: bold;
      }

      .projects-section {
        max-width: 1200px;
        margin: 0 auto;
        padding: 60px 24px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40px;
      }

      .section-header h2 {
        font-size: 2.2rem;
        font-weight: 700;
        color: #fff;
        margin: 0;
      }

      .section-hint {
        color: #7a8fb8;
        margin: 8px 0 0;
        font-size: 0.95rem;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 24px;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 24px;
        color: #7a8fb8;
        font-size: 1.1rem;
      }

      @media (max-width: 768px) {
        .hero {
          padding: 50px 20px;
        }

        .hero-title {
          font-size: 2.2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .projects-section {
          padding: 40px 20px;
        }

        .section-header h2 {
          font-size: 1.8rem;
        }

        .grid {
          grid-template-columns: 1fr;
        }
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
