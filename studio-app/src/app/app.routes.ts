import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page.component';
import { CreateProjectComponent } from './pages/create-project.component';
import { EditProjectComponent } from './pages/edit-project.component';
import { ViewerPageComponent } from './pages/viewer-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: HomePageComponent },
  { path: 'project/new', component: CreateProjectComponent },
  { path: 'project/:id', component: ViewerPageComponent },
  { path: 'project/:id/edit', component: EditProjectComponent },
  { path: '**', redirectTo: '/dashboard' },
];
