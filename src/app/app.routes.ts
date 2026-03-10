import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard/india', pathMatch: 'full' },
  {
    path: 'dashboard/:country',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'dashboard/:country/dataset/:datasetId',
    loadComponent: () => import('./pages/dataset-detail/dataset-detail.component').then(m => m.DatasetDetailComponent),
  },
  { path: '**', redirectTo: 'dashboard/india' },
];
