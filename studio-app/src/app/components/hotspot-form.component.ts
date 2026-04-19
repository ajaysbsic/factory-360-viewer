import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-hotspot-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel">
      <h3>Add Hotspot</h3>
      <form [formGroup]="form" class="grid" (ngSubmit)="submit()">
        <label>
          Label
          <input type="text" formControlName="title" />
        </label>
        <label>
          Target Scene ID
          <input type="text" formControlName="targetSceneId" />
        </label>
        <button type="submit" [disabled]="form.invalid">Save Hotspot (phase placeholder)</button>
      </form>
    </section>
  `,
  styles: [
    `
      .panel {
        border: 1px solid #d5dae2;
        border-radius: 12px;
        padding: 16px;
        background: #fff;
      }

      .grid {
        display: grid;
        gap: 12px;
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
export class HotspotFormComponent {
  readonly form = this.fb.group({
    title: ['', Validators.required],
    targetSceneId: ['', Validators.required],
  });

  constructor(private readonly fb: FormBuilder) {}

  submit(): void {
    if (this.form.valid) {
      console.log('Hotspot payload (placeholder):', this.form.getRawValue());
    }
  }
}
