import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar class="navbar">
      <span class="logo" (click)="goHome()">
        <mat-icon>show_chart</mat-icon>
        <span class="app-name">FP</span>
      </span>

      <span class="spacer"></span>

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
  `]
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/countries']);
  }
}
