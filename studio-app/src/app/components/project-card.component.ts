import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Project } from '../models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="project-card" *ngIf="project as p">
      <h3>{{ p.name }}</h3>
      <p>Root scene: {{ p.rootScene }}</p>
      <div class="actions">
        <a [routerLink]="['/project', p.id]">Open Viewer</a>
        <a [routerLink]="['/project', p.id, 'edit']">Edit Project</a>
        <button type="button" class="danger" (click)="deleteRequested.emit(p.id)" [disabled]="p.id === 1001">Delete Project</button>
      </div>
    </article>
  `,
  styles: [
    `
      .project-card {
        border: 1px solid #d5dae2;
        border-radius: 12px;
        padding: 16px;
        background: #fff;
      }

      h3 {
        margin: 0 0 8px;
      }

      p {
        margin: 0 0 12px;
        color: #455065;
      }

      .actions {
        display: flex;
        gap: 12px;
      }

      a {
        text-decoration: none;
        color: #0f5bcf;
        font-weight: 600;
      }

      .danger {
        border: 1px solid #d8324a;
        background: #fff1f3;
        color: #a60f2d;
        border-radius: 8px;
        padding: 6px 10px;
        font-weight: 600;
        cursor: pointer;
      }

      .danger:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Output() deleteRequested = new EventEmitter<number>();
}
