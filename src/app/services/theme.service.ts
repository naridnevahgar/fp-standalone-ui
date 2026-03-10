import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('fp-theme');
    if (saved === 'light') {
      this.isDark.set(false);
      document.documentElement.classList.add('light-theme');
    }
  }

  toggle(): void {
    const newDark = !this.isDark();
    this.isDark.set(newDark);
    if (newDark) {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('fp-theme', 'dark');
    } else {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('fp-theme', 'light');
    }
  }
}
