import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

import { Chart, registerables, Colors } from 'chart.js';
Chart.register(...registerables);
Chart.unregister(Colors);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
