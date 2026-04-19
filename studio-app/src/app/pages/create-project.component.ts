import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsService } from '../services/projects.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="page">
      <a routerLink="/dashboard">← Back to dashboard</a>
      <h1>Create New Project</h1>
      <p class="muted">Create a project with a root 360 panorama. Data is saved in localStorage.</p>

      <form [formGroup]="form" class="panel" (ngSubmit)="submit()">
        <label>
          Project Name
          <input type="text" formControlName="name" />
        </label>
        <label>
          Start Image (360 panorama)
          <input type="file" accept="image/*" (change)="onFileChange($event)" />
        </label>
        <button type="submit" [disabled]="form.invalid">Save Project</button>
      </form>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 720px;
        margin: 0 auto;
        padding: 24px;
      }

      .muted {
        color: #4d5870;
      }

      .panel {
        margin-top: 16px;
        border: 1px solid #d5dae2;
        border-radius: 12px;
        padding: 16px;
        display: grid;
        gap: 12px;
        background: #fff;
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
    `,
  ],
})
export class CreateProjectComponent {
  private selectedImageDataUrl = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    rootScene: ['', Validators.required],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly projectsService: ProjectsService,
    private readonly router: Router
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      this.selectedImageDataUrl = result;
      this.form.patchValue({ rootScene: result });
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();
    const name = value.name?.trim() ?? '';
    const rootScene = this.selectedImageDataUrl || value.rootScene?.trim() || '';

    this.projectsService.createProject(name, rootScene).subscribe((project) => {
      void this.router.navigate(['/project', project.id]);
    });
  }
}
