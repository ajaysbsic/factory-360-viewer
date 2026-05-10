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
      <div class="card-header">
        <h3>{{ p.name }}</h3>
        <span class="badge">Project</span>
      </div>
      <p class="scene-info">
        <span class="label">Root Scene:</span>
        <span class="value">{{ p.rootScene }}</span>
      </p>
      <div class="actions">
        <a class="btn btn-primary" [routerLink]="['/project', p.id]">
          <span class="btn-icon">▶</span>
          Open Viewer
        </a>
        <a class="btn btn-secondary" [routerLink]="['/project', p.id, 'edit']">
          <span class="btn-icon">✏</span>
          Edit
        </a>
        <button
          type="button"
          class="btn btn-danger"
          (click)="deleteRequested.emit(p.id)"
          [disabled]="p.id === 1001"
          title="Delete this project"
        >
          <span class="btn-icon">🗑</span>
          Delete
        </button>
      </div>
    </article>
  `,
  styles: [
    `
      .project-card {
        background: linear-gradient(135deg, #1a1f4d 0%, #151b40 100%);
        border: 1px solid rgba(79, 172, 254, 0.2);
        border-radius: 16px;
        padding: 24px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }

      .project-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, transparent 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }

      .project-card:hover {
        transform: translateY(-8px);
        border-color: rgba(79, 172, 254, 0.5);
        box-shadow: 0 16px 40px rgba(79, 172, 254, 0.2);
      }

      .project-card:hover::before {
        opacity: 1;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        gap: 12px;
      }

      h3 {
        margin: 0;
        font-size: 1.4rem;
        color: #fff;
        flex: 1;
      }

      .badge {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #0a0e27;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .scene-info {
        margin: 0 0 20px;
        padding: 12px;
        background: rgba(79, 172, 254, 0.05);
        border-left: 3px solid #4facfe;
        border-radius: 8px;
      }

      .label {
        color: #7a8fb8;
        font-size: 0.9rem;
      }

      .value {
        color: #b8c5e0;
        font-weight: 600;
        margin-left: 4px;
      }

      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
        flex: 1;
        min-width: 110px;
        justify-content: center;
      }

      .btn-icon {
        font-size: 1rem;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #0a0e27;
      }

      .btn-primary:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(79, 172, 254, 0.3);
      }

      .btn-secondary {
        background: rgba(79, 172, 254, 0.15);
        color: #4facfe;
        border: 1px solid rgba(79, 172, 254, 0.3);
      }

      .btn-secondary:hover {
        background: rgba(79, 172, 254, 0.25);
        border-color: rgba(79, 172, 254, 0.5);
      }

      .btn-danger {
        background: rgba(220, 62, 87, 0.15);
        color: #ff6b7a;
        border: 1px solid rgba(220, 62, 87, 0.3);
      }

      .btn-danger:hover:not(:disabled) {
        background: rgba(220, 62, 87, 0.25);
        border-color: rgba(220, 62, 87, 0.5);
      }

      .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (max-width: 768px) {
        .project-card {
          padding: 16px;
        }

        .btn {
          padding: 6px 10px;
          font-size: 0.85rem;
          min-width: auto;
          flex: 1;
        }
      }
    `,
  ],
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Output() deleteRequested = new EventEmitter<number>();
}
