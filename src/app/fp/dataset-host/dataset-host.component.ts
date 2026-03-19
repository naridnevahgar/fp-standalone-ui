import { Component, Type, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { DataService, DatasetSummary } from '../../services/data.service';
import { getDatasetComponent, isDatasetImplemented } from '../datasets/dataset-registry';

@Component({
  selector: 'app-dataset-host',
  standalone: true,
  imports: [
    NgComponentOutlet,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    RouterLink,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (!dataset()) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Dataset not found</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>The selected dataset does not exist for this country.</p>
            <button mat-stroked-button [routerLink]="['/country', country(), 'datasets']">Back to catalog</button>
          </mat-card-content>
        </mat-card>
      } @else if (dataset()!.status === 'coming-soon' || !isImplemented(datasetId())) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ dataset()!.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>This dataset experience is coming soon.</p>
            <button mat-stroked-button [routerLink]="['/country', country(), 'datasets']">Back to catalog</button>
          </mat-card-content>
        </mat-card>
      } @else if (activeComponent()) {
        <ng-container *ngComponentOutlet="activeComponent(); inputs: { country: country() }"></ng-container>
      }
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      padding: 64px;
    }

    mat-card-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  `],
})
export class DatasetHostComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);

  loading = signal(true);
  country = signal('india');
  datasetId = signal('');
  dataset = signal<DatasetSummary | null>(null);

  activeComponent = computed<Type<unknown> | null>(() => getDatasetComponent(this.datasetId()));

  ngOnInit(): void {
    const country = this.route.snapshot.paramMap.get('country') ?? 'india';
    const datasetId = this.route.snapshot.paramMap.get('datasetId') ?? '';

    this.country.set(country);
    this.datasetId.set(datasetId);

    this.dataService.getCountryDatasets(country).subscribe({
      next: (result) => {
        const found = result.datasets.find((ds) => ds.id === datasetId) ?? null;
        this.dataset.set(found);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isImplemented(datasetId: string): boolean {
    return isDatasetImplemented(datasetId);
  }
}
