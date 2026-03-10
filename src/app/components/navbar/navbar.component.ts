import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    FormsModule,
  ],
  template: `
    <mat-toolbar class="navbar">
      <span class="logo" (click)="goHome()">
        <mat-icon>show_chart</mat-icon>
        <span class="app-name">FP</span>
      </span>

      <span class="spacer"></span>

      <mat-form-field class="country-select" appearance="outline" subscriptSizing="dynamic">
        <mat-select [(value)]="selectedCountry" (selectionChange)="onCountryChange()">
          @for (c of countries; track c.id) {
            <mat-option [value]="c.id">{{ c.flag }} {{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-icon-button (click)="themeService.toggle()" [matTooltip]="themeService.isDark() ? 'Switch to light' : 'Switch to dark'">
        <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
    </mat-toolbar>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      font-size: 1.2rem;
    }
    .spacer {
      flex: 1;
    }
    .country-select {
      width: 160px;
      font-size: 0.9rem;
    }
    ::ng-deep .country-select .mat-mdc-form-field-infix {
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      min-height: unset !important;
    }
  `]
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  private router = inject(Router);

  countries = [
    { id: 'india', name: 'India', flag: '🇮🇳' },
  ];

  selectedCountry = 'india';

  goHome(): void {
    this.router.navigate(['/dashboard', this.selectedCountry]);
  }

  onCountryChange(): void {
    this.router.navigate(['/dashboard', this.selectedCountry]);
  }
}
