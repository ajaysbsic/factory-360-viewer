import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectsService } from '../services/projects.service';
import { ImageStorageService } from '../services/image-storage.service';

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

      .panel {
        margin-top: 16px;
        border: 1px solid rgba(79, 172, 254, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: grid;
        gap: 12px;
        background: linear-gradient(135deg, #1a1f4d 0%, #151b40 100%);
        color: #dce8ff;
        transition: all 0.3s ease;
      }

      .panel:hover {
        border-color: rgba(79, 172, 254, 0.5);
        box-shadow: 0 8px 24px rgba(79, 172, 254, 0.1);
      }

      .panel label {
        color: #dce8ff;
        font-weight: 600;
      }

      input {
        display: block;
        margin-top: 6px;
        width: 100%;
        padding: 8px;
        border: 1px solid rgba(79, 172, 254, 0.3);
        border-radius: 8px;
        background: rgba(79, 172, 254, 0.1);
        color: #fff;
        transition: all 0.2s ease;
      }

      input:focus {
        border-color: #4facfe;
        background: rgba(79, 172, 254, 0.2);
        outline: none;
      }

      input[type="file"] {
        padding: 4px;
      }

      button {
        width: fit-content;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #0a0e27;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      button:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
    `,
  ],
})
export class CreateProjectComponent {
  private selectedImageFile: Blob | null = null;
  private selectedRootImageKey = '';

  readonly form = this.fb.group({
    name: ['', Validators.required],
    rootScene: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly projectsService: ProjectsService,
    private readonly imageStorageService: ImageStorageService,
    private readonly router: Router
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.selectedImageFile = file;
  }

  async submit(): Promise<void> {
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();
    const name = value.name?.trim() ?? '';
    let rootScene = value.rootScene?.trim() ?? '';

    if (this.selectedImageFile) {
      const key = `image-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      rootScene = `indexeddb:${key}`;
      try {
        await this.imageStorageService.saveImage(key, this.selectedImageFile);
      } catch (error) {
        console.error('Failed to save root image to IndexedDB', error);
        return;
      }
    }

    this.projectsService.createProject(name, rootScene).subscribe((project) => {
      void this.router.navigate(['/project', project.id]);
    });
  }
}
