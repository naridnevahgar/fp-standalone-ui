import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'countries', pathMatch: 'full' },
  {
    path: 'countries',
    loadComponent: () => import('./fp/country-selection/country-selection.component').then(m => m.CountrySelectionComponent),
  },
  {
    path: 'country/:country/datasets',
    loadComponent: () => import('./fp/dataset-catalog/dataset-catalog.component').then(m => m.DatasetCatalogComponent),
  },
  {
    path: 'country/:country/datasets/:datasetId',
    loadComponent: () => import('./fp/dataset-host/dataset-host.component').then(m => m.DatasetHostComponent),
  },
  { path: '**', redirectTo: 'countries' },
];
