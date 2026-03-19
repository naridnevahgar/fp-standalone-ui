import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataService, CountryDatasets } from '../../services/data.service';
import { DatasetCardComponent } from './dataset-card.component';

@Component({
  selector: 'app-dataset-catalog',
  standalone: true,
  imports: [DatasetCardComponent, MatProgressSpinnerModule, MatButtonModule, RouterLink],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (data()) {
        <div class="header-row">
          <h2 class="section-title">{{ data()!.countryName }} — Dataset Catalog</h2>
          <button mat-stroked-button [routerLink]="['/countries']">Back</button>
        </div>
        <p class="subtitle">Choose a dataset to open its opinionated analytics experience.</p>

        <div class="card-grid">
          @for (ds of data()!.datasets; track ds.id) {
            <app-dataset-card [dataset]="ds" [country]="data()!.country" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .loading {
      display: flex;
      justify-content: center;
      padding: 64px;
    }

    .subtitle {
      opacity: 0.65;
      margin-bottom: 24px;
      font-size: 0.95rem;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .section-title {
      margin: 0;
    }

    @media (max-width: 640px) {
      .header-row {
        flex-wrap: wrap;
      }
    }
  `],
})
export class DatasetCatalogComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);

  loading = signal(true);
  data = signal<CountryDatasets | null>(null);

  ngOnInit(): void {
    const country = this.route.snapshot.paramMap.get('country') ?? 'india';
    this.dataService.getCountryDatasets(country).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
