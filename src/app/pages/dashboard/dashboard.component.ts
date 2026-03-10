import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService, CountryDatasets } from '../../services/data.service';
import { DatasetCardComponent } from '../../components/dataset-card/dataset-card.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatasetCardComponent, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else if (data()) {
        <h2 class="section-title">{{ data()!.countryName }} — Macro Indicators</h2>
        <p class="subtitle">Government-released economic datasets for macro trend analysis</p>

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
      opacity: 0.6;
      margin-bottom: 24px;
      font-size: 0.95rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
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
