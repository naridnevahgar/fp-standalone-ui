import { Component, HostListener, Input, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService, IipItemsResponse, IipLine } from '../../../services/data.service';
import { ThemeService } from '../../../services/theme.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

interface Nic2Option {
  code: string;
  name: string;
}

interface Nic5Option {
  code: number;
  label: string;
  itemCount: number;
}

interface MetricRow {
  metric: 'value' | 'mom' | 'yoy';
  metricLabel: string;
  cells: Record<string, number | null>;
  provisionalPeriods: Set<string>;
}

interface LineTable {
  lineId: string;
  lineLabel: string;
  rows: MetricRow[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;
  return `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-iip-item-level',
  standalone: true,
  imports: [
    FormsModule, RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatButtonToggleModule,
    MatTableModule, MatExpansionModule, MatChipsModule, MatProgressSpinnerModule, NgChartsModule,
  ],
  template: `
    <div class="page-container">
      @if (loading() && !response()) {
        <div class="loading"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (response()) {

        <div class="breadcrumb">
          <a [routerLink]="['/country', country, 'datasets']" class="back-link">
            <mat-icon>arrow_back</mat-icon> India Datasets
          </a>
          <span class="crumb-sep">/</span>
          <span>IIP Item Charts</span>
        </div>

        <div class="detail-header">
          <div>
            <h2>Index of Industrial Production &ndash; Item Level</h2>
            <p class="meta">Base Year: 2022-23 = 100 &middot; Source: National Statistical Office (NSO), MoSPI</p>
          </div>
        </div>

        <mat-card class="filters-card">
          <mat-card-content>
            <div class="filters-row">
              <div class="filter-field nic-wrapper" [class.disabled]="loading()">
                <label class="filter-label">NIC 2 Sector</label>
                <button type="button" class="nic-trigger" (click)="toggleNic2Drop()">
                  @if (selectedNic2()) {
                    <span>{{ selectedNic2Label() }}</span>
                  } @else {
                    <span class="placeholder">All sectors (avg. per NIC2)</span>
                  }
                  <span class="arrow" [class.open]="nic2DropOpen()">&#9660;</span>
                </button>
                @if (selectedNic2()) {
                  <button type="button" class="clear-btn" (click)="clearNic2()">Clear</button>
                }
                @if (nic2DropOpen()) {
                  <div class="nic-dropdown">
                    <input type="text" class="nic-search" placeholder="Search sectors&hellip;"
                      [ngModel]="nic2Search()" (ngModelChange)="nic2Search.set($event)"
                      (click)="$event.stopPropagation()" />
                    <div class="nic-option-list">
                      @for (opt of filteredNic2Options(); track opt.code) {
                        <div class="nic-option" [class.selected]="selectedNic2() === opt.code" (click)="selectNic2(opt.code)">
                          <span class="opt-code">{{ opt.code }}</span> {{ opt.name }}
                        </div>
                      }
                      @if (filteredNic2Options().length === 0) {
                        <p class="no-results">No sectors match.</p>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="filter-field nic-wrapper" [class.disabled]="!selectedNic2() || loading()">
                <label class="filter-label">NIC 5 Item Group</label>
                <button type="button" class="nic-trigger" [disabled]="!selectedNic2()" (click)="toggleNic5Drop()">
                  @if (selectedNic5() !== null) {
                    <span>{{ selectedNic5Label() }}</span>
                  } @else {
                    <span class="placeholder">{{ selectedNic2() ? 'All item groups (avg. per NIC5)' : 'Select a NIC2 sector first' }}</span>
                  }
                  <span class="arrow" [class.open]="nic5DropOpen()">&#9660;</span>
                </button>
                @if (selectedNic5() !== null) {
                  <button type="button" class="clear-btn" (click)="clearNic5()">Clear</button>
                }
                @if (nic5DropOpen()) {
                  <div class="nic-dropdown">
                    <input type="text" class="nic-search" placeholder="Search item groups&hellip;"
                      [ngModel]="nic5Search()" (ngModelChange)="nic5Search.set($event)"
                      (click)="$event.stopPropagation()" />
                    <div class="nic-option-list">
                      @for (opt of filteredNic5Options(); track opt.code) {
                        <div class="nic-option" [class.selected]="selectedNic5() === opt.code" (click)="selectNic5(opt.code)">
                          <span class="opt-code">{{ opt.code }}</span> {{ opt.label }}
                        </div>
                      }
                      @if (filteredNic5Options().length === 0) {
                        <p class="no-results">No item groups match.</p>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="filter-field">
                <label class="filter-label">From</label>
                <select [ngModel]="startDate()" (ngModelChange)="onStartDateChange($event)">
                  @for (opt of dateRangeOptions(); track opt.period) {
                    <option [value]="opt.period">{{ opt.label }}</option>
                  }
                </select>
              </div>

              <div class="filter-field">
                <label class="filter-label">To</label>
                <select [ngModel]="endDate()" (ngModelChange)="onEndDateChange($event)">
                  @for (opt of dateRangeOptions(); track opt.period) {
                    <option [value]="opt.period">{{ opt.label }}</option>
                  }
                </select>
              </div>

              <button mat-stroked-button type="button" (click)="resetDateRange()">Last 1 Year</button>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="chart-container">
          <mat-card class="viz-card">
            <div class="viz-header">
              <h3 class="viz-title">{{ levelTitle() }}</h3>
              <mat-button-toggle-group [value]="chartMode()" (change)="chartMode.set($event.value)" hideSingleSelectionIndicator>
                <mat-button-toggle value="multiples"><mat-icon>grid_view</mat-icon> Grid</mat-button-toggle>
                <mat-button-toggle value="heatmap"><mat-icon>calendar_view_month</mat-icon> Heatmap</mat-button-toggle>
                <mat-button-toggle value="topn"><mat-icon>trending_up</mat-icon> Top Movers</mat-button-toggle>
                <mat-button-toggle value="all"><mat-icon>show_chart</mat-icon> All Lines</mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            <mat-card-content>
              @switch (chartMode()) {
                @case ('multiples') {
                  <div class="multiples-grid">
                    @for (line of response()!.lines; track line.id) {
                      <div class="multiple-tile">
                        <div class="tile-title" [title]="line.label">{{ line.label }}</div>
                        <div class="tile-stats">
                          <span>{{ formatValue(latestValueFor(line)) }}</span>
                          <span [class]="getTrendClass(latestMomFor(line))">
                            {{ formatPct(latestMomFor(line)) }}
                            @if (latestMomFor(line) !== null) {
                              <mat-icon class="trend-icon">{{ getTrendIcon(latestMomFor(line)) }}</mat-icon>
                            }
                          </span>
                        </div>
                        <div class="tile-canvas-wrap">
                          <canvas baseChart [data]="miniChartData(line)" [options]="miniChartOptions" [type]="'line'"></canvas>
                        </div>
                      </div>
                    }
                  </div>
                }
                @case ('heatmap') {
                  <div class="table-container">
                    <table class="heatmap-table">
                      <thead>
                        <tr>
                          <th class="heatmap-label-col">Line</th>
                          @for (period of allPeriods(); track period) {
                            <th>{{ periodLabels().get(period) ?? period }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (line of response()!.lines; track line.id) {
                          <tr>
                            <td class="heatmap-label-col" [title]="line.label">{{ line.label }}</td>
                            @for (period of allPeriods(); track period) {
                              <td class="heatmap-cell" [style.background]="heatColor(momFor(line, period))">
                                {{ formatPct(momFor(line, period)) }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
                @case ('topn') {
                  <div class="topn-controls">
                    <div class="filter-field nic-wrapper add-sector-wrapper">
                      <button type="button" class="nic-trigger" (click)="toggleAddDrop()">
                        <span class="placeholder">+ Add a line to compare&hellip;</span>
                        <span class="arrow" [class.open]="addDropOpen()">&#9660;</span>
                      </button>
                      @if (addDropOpen()) {
                        <div class="nic-dropdown">
                          <input type="text" class="nic-search" placeholder="Search&hellip;"
                            [ngModel]="addSearch()" (ngModelChange)="addSearch.set($event)"
                            (click)="$event.stopPropagation()" />
                          <div class="nic-option-list">
                            @for (l of filteredAddableLines(); track l.id) {
                              <div class="nic-option" (click)="pinSector(l.id)">{{ l.label }}</div>
                            }
                            @if (filteredAddableLines().length === 0) {
                              <p class="no-results">No more lines to add.</p>
                            }
                          </div>
                        </div>
                      }
                    </div>
                    <button mat-stroked-button type="button" (click)="showAllInTopN.set(!showAllInTopN())">
                      {{ showAllInTopN() ? 'Show Top 8 Only' : 'Show All ' + response()!.lines.length }}
                    </button>
                  </div>
                  @if (pinnedLines().length) {
                    <div class="pin-chips">
                      @for (l of pinnedLines(); track l.id) {
                        <span class="pin-chip">
                          {{ l.label }}
                          <button type="button" class="pin-chip-remove" (click)="unpinSector(l.id)">&times;</button>
                        </span>
                      }
                    </div>
                  }
                  <canvas baseChart [data]="chartData()" [options]="chartOptions()" [type]="'line'"></canvas>
                }
                @default {
                  <canvas baseChart
                    [data]="chartData()"
                    [options]="chartOptions()"
                    [type]="'line'">
                  </canvas>
                }
              }
            </mat-card-content>
          </mat-card>
        </div>

        <mat-accordion class="lines-accordion" multi="true">
          @for (lt of lineTables(); track lt.lineId) {
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title [title]="lt.lineLabel">{{ lt.lineLabel }}</mat-panel-title>
              </mat-expansion-panel-header>
              <ng-template matExpansionPanelContent>
                <div class="table-container">
                  <table mat-table [dataSource]="lt.rows" class="data-table">
                    <ng-container matColumnDef="metric">
                      <th mat-header-cell *matHeaderCellDef>Metric</th>
                      <td mat-cell *matCellDef="let row">{{ row.metricLabel }}</td>
                    </ng-container>

                    @for (period of allPeriods(); track period) {
                      <ng-container [matColumnDef]="period">
                        <th mat-header-cell *matHeaderCellDef>{{ periodLabels().get(period) ?? period }}</th>
                        <td mat-cell *matCellDef="let row">
                          @if (row.metric === 'value') {
                            {{ formatValue(row.cells[period]) }}
                            @if (row.provisionalPeriods.has(period)) { <mat-chip class="prov-chip">P</mat-chip> }
                          } @else {
                            <span [class]="getTrendClass(row.cells[period])">
                              {{ formatPct(row.cells[period]) }}
                              @if (row.cells[period] !== null) {
                                <mat-icon class="trend-icon">{{ getTrendIcon(row.cells[period]) }}</mat-icon>
                              }
                            </span>
                          }
                        </td>
                      </ng-container>
                    }

                    <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns()"></tr>
                  </table>
                </div>
              </ng-template>
            </mat-expansion-panel>
          }
        </mat-accordion>
      }
    </div>
  `,
  styles: [`
    .loading { display: flex; justify-content: center; padding: 64px; }

    .breadcrumb {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 0.9rem; opacity: 0.7;
    }
    .back-link { display: flex; align-items: center; gap: 4px; text-decoration: none; color: inherit; }
    .back-link:hover { opacity: 1; }
    .crumb-sep { opacity: 0.4; }

    .detail-header { margin-bottom: 16px; }
    .meta { font-size: 0.85rem; opacity: 0.6; margin-top: 4px; }

    .filters-card { margin-bottom: 16px; }
    .filters-row { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .filter-field { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; position: relative; }
    .filter-label { opacity: 0.7; }
    .filter-field select {
      min-width: 140px; padding: 6px 8px; border-radius: 6px;
      border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
    }

    .nic-wrapper { min-width: 220px; }
    .nic-wrapper.disabled { opacity: 0.5; }
    .nic-trigger {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      min-width: 220px; padding: 6px 10px; border-radius: 6px;
      border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
      cursor: pointer; font-size: 0.85rem;
    }
    .nic-trigger:disabled { cursor: not-allowed; }
    .nic-trigger .placeholder { opacity: 0.6; }
    .nic-trigger .arrow { font-size: 0.7rem; transition: transform 0.15s ease; }
    .nic-trigger .arrow.open { transform: rotate(180deg); }
    .clear-btn {
      align-self: flex-start; margin-top: 4px; background: none; border: none;
      color: inherit; opacity: 0.6; font-size: 0.75rem; cursor: pointer; padding: 0;
    }
    .clear-btn:hover { opacity: 1; }

    .nic-dropdown {
      position: absolute; top: 100%; left: 0; z-index: 300; margin-top: 4px;
      min-width: 280px; max-width: 360px; border-radius: 8px;
      background: var(--mat-app-background-color, #2a2a2a);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      border: 1px solid rgba(128,128,128,0.3);
      padding: 8px;
    }
    .nic-search {
      width: 100%; box-sizing: border-box; padding: 6px 8px; margin-bottom: 6px;
      border-radius: 6px; border: 1px solid rgba(128,128,128,0.4);
      background: transparent; color: inherit;
    }
    .nic-option-list { max-height: 260px; overflow-y: auto; }
    .nic-option { padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .nic-option:hover { background: rgba(128,128,128,0.15); }
    .nic-option.selected { background: rgba(66,165,245,0.2); font-weight: 600; }
    .opt-code { opacity: 0.6; margin-right: 6px; }
    .no-results { font-size: 0.8rem; opacity: 0.6; padding: 6px 8px; }

    .chart-container { padding: 16px 0; }
    .viz-header {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px; padding: 16px 16px 0;
    }
    .viz-title { margin: 0; font-size: 1.1rem; font-weight: 500; }

    .multiples-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .multiple-tile {
      background: rgba(128,128,128,0.08); border-radius: 8px; padding: 10px;
    }
    .tile-title {
      font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; margin-bottom: 4px;
    }
    .tile-stats {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.8rem; margin-bottom: 6px;
    }
    .tile-canvas-wrap { position: relative; height: 50px; }

    .heatmap-table { border-collapse: collapse; font-size: 0.75rem; }
    .heatmap-table th, .heatmap-table td { padding: 6px 10px; text-align: center; white-space: nowrap; }
    .heatmap-label-col {
      position: sticky; left: 0; background: var(--mat-app-background-color, #2a2a2a);
      text-align: left; z-index: 1; max-width: 240px; overflow: hidden; text-overflow: ellipsis;
    }
    .heatmap-cell { color: #fff; }

    .topn-controls { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .pin-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .pin-chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px 4px 12px;
      border-radius: 16px; background: rgba(66,165,245,0.2); font-size: 0.8rem;
    }
    .pin-chip-remove {
      background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem;
      line-height: 1; padding: 0 2px; opacity: 0.7;
    }
    .pin-chip-remove:hover { opacity: 1; }

    .lines-accordion { display: block; margin-top: 16px; }
    .lines-accordion ::ng-deep .mat-expansion-panel-header-title { white-space: normal; line-height: 1.3; }
    .lines-accordion ::ng-deep .mat-expansion-panel-header {
      height: auto; min-height: 48px; padding: 12px 24px;
    }

    .table-container { overflow-x: auto; padding: 8px 0; }
    .data-table { width: 100%; }
    .data-table th, .data-table td { white-space: nowrap; }
    .prov-chip { font-size: 0.7rem; margin-left: 4px; }
    .trend-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; }
  `]
})
export class IipItemLevelComponent implements OnInit {
  @Input({ required: true }) country = 'india';

  private dataService = inject(DataService);
  private themeService = inject(ThemeService);

  loading = signal(true);
  response = signal<IipItemsResponse | null>(null);

  nic2Catalog = signal<Nic2Option[]>([]);
  nic5Catalog = signal<Nic5Option[]>([]);

  selectedNic2 = signal<string | null>(null);
  selectedNic5 = signal<number | null>(null);
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  nic2DropOpen = signal(false);
  nic2Search = signal('');
  nic5DropOpen = signal(false);
  nic5Search = signal('');

  chartMode = signal<'multiples' | 'heatmap' | 'topn' | 'all'>('multiples');
  pinnedLineIds = signal<Set<string>>(new Set());
  showAllInTopN = signal(false);
  addDropOpen = signal(false);
  addSearch = signal('');

  filteredNic2Options = computed(() => {
    const q = this.nic2Search().toLowerCase().trim();
    const opts = this.nic2Catalog();
    return q ? opts.filter(o => o.name.toLowerCase().includes(q) || o.code.includes(q)) : opts;
  });

  filteredNic5Options = computed(() => {
    const q = this.nic5Search().toLowerCase().trim();
    const opts = this.nic5Catalog();
    return q ? opts.filter(o => o.label.toLowerCase().includes(q) || String(o.code).includes(q)) : opts;
  });

  topMoverIds = computed<Set<string>>(() => {
    const lines = this.response()?.lines ?? [];
    const withMove = lines.map(l => {
      const last = l.series[l.series.length - 1];
      const abs = last?.momPercent != null ? Math.abs(last.momPercent) : -1;
      return { id: l.id, abs };
    });
    withMove.sort((a, b) => b.abs - a.abs);
    return new Set(withMove.slice(0, 8).map(x => x.id));
  });

  visibleLineIds = computed<Set<string>>(() => {
    return new Set([...this.topMoverIds(), ...this.pinnedLineIds()]);
  });

  pinnedLines = computed<IipLine[]>(() => {
    const pinned = this.pinnedLineIds();
    return (this.response()?.lines ?? []).filter(l => pinned.has(l.id));
  });

  addableLines = computed<IipLine[]>(() => {
    const visible = this.visibleLineIds();
    return (this.response()?.lines ?? []).filter(l => !visible.has(l.id));
  });

  filteredAddableLines = computed<IipLine[]>(() => {
    const q = this.addSearch().toLowerCase().trim();
    const opts = this.addableLines();
    return q ? opts.filter(l => l.label.toLowerCase().includes(q)) : opts;
  });

  selectedNic2Label = computed(() => {
    const code = this.selectedNic2();
    return this.nic2Catalog().find(o => o.code === code)?.name ?? code;
  });

  selectedNic5Label = computed(() => {
    const code = this.selectedNic5();
    const opt = this.nic5Catalog().find(o => o.code === code);
    return opt ? opt.label : code;
  });

  levelTitle = computed(() => {
    switch (this.response()?.level) {
      case 'nic2': return 'Average Index by NIC2 Sector';
      case 'nic5': return 'Average Index by NIC5 Item Group';
      case 'item': return 'Index by Item';
      default: return '';
    }
  });

  dateRangeOptions = computed(() => {
    const r = this.response();
    if (!r?.earliestPeriod || !r?.latestPeriod) return [] as Array<{ period: string; label: string }>;

    const opts: Array<{ period: string; label: string }> = [];
    let [y, m] = r.earliestPeriod.split('-').map(Number);
    const [ly, lm] = r.latestPeriod.split('-').map(Number);
    while (y < ly || (y === ly && m <= lm)) {
      opts.push({ period: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTH_NAMES[m - 1]} ${y}` });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return opts;
  });

  allPeriods = computed(() => {
    const set = new Set<string>();
    for (const line of this.response()?.lines ?? []) {
      for (const e of line.series) set.add(e.period);
    }
    return Array.from(set).sort();
  });

  periodLabels = computed(() => {
    const map = new Map<string, string>();
    for (const line of this.response()?.lines ?? []) {
      for (const e of line.series) map.set(e.period, e.label);
    }
    return map;
  });

  private palette = ['#b942f5', '#5072ef', '#74c6af', '#ffa726', '#db2b5d', '#26c6da', '#65ea31', '#ffee58'];
  private getColor(index: number): string {
    return this.palette[index % this.palette.length];
  }

  chartData = computed<ChartData<'line'>>(() => {
    const periods = this.allPeriods();
    let lines = this.response()?.lines ?? [];
    if (this.chartMode() === 'topn' && !this.showAllInTopN()) {
      const visible = this.visibleLineIds();
      lines = lines.filter(l => visible.has(l.id));
    }
    return {
      labels: periods.map(p => this.periodLabels().get(p) ?? p),
      datasets: lines.map((line, i) => {
        const byPeriod = new Map(line.series.map(e => [e.period, e.value]));
        return {
          label: line.label,
          data: periods.map(p => byPeriod.get(p) ?? null),
          borderColor: this.getColor(i),
          backgroundColor: this.getColor(i),
          pointRadius: 2,
          pointHitRadius: 8,
          tension: 0.3,
          fill: false,
        };
      }),
    };
  });

  chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const textColor = this.themeService.isDark() ? '#e0e0e0' : '#424242';
    const gridColor = this.themeService.isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    return {
      responsive: true,
      interaction: { mode: 'nearest', intersect: true },
      hover: { mode: 'nearest', intersect: true },
      scales: {
        y: { title: { display: true, text: 'Index', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
      },
      plugins: {
        legend: { labels: { color: textColor, usePointStyle: true } },
        tooltip: {
          mode: 'nearest',
          intersect: true,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` },
        },
      },
    };
  });

  miniChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: { x: { display: false }, y: { display: false } },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  miniChartData(line: IipLine): ChartData<'line'> {
    const periods = this.allPeriods();
    const byPeriod = new Map(line.series.map(e => [e.period, e.value]));
    const values = periods.map(p => byPeriod.get(p) ?? null);
    const color = this.miniLineColor(values);
    return {
      labels: periods,
      datasets: [{ data: values, borderColor: color, borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 }],
    };
  }

  private miniLineColor(values: (number | null)[]): string {
    const first = values.find(v => v !== null) ?? null;
    const last = [...values].reverse().find(v => v !== null) ?? null;
    if (first == null || last == null || first === last) return '#9e9e9e';
    return last > first ? '#4caf50' : '#f44336';
  }

  latestValueFor(line: IipLine): number | null {
    const last = line.series[line.series.length - 1];
    return last ? last.value : null;
  }

  latestMomFor(line: IipLine): number | null {
    const last = line.series[line.series.length - 1];
    return last ? last.momPercent : null;
  }

  momFor(line: IipLine, period: string): number | null {
    const entry = line.series.find(e => e.period === period);
    return entry ? entry.momPercent : null;
  }

  heatColor(v: number | null): string {
    if (v === null || v === undefined) return 'rgba(128,128,128,0.08)';
    const intensity = Math.min(Math.abs(v) / 15, 1);
    return v >= 0 ? `rgba(76,175,80,${0.15 + intensity * 0.65})` : `rgba(244,67,54,${0.15 + intensity * 0.65})`;
  }

  toggleAddDrop(): void {
    this.addDropOpen.set(!this.addDropOpen());
  }

  pinSector(id: string): void {
    this.pinnedLineIds.update(s => new Set(s).add(id));
    this.addSearch.set('');
    this.addDropOpen.set(false);
  }

  unpinSector(id: string): void {
    this.pinnedLineIds.update(s => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  displayedColumns = computed(() => ['metric', ...this.allPeriods()]);

  lineTables = computed<LineTable[]>(() => {
    const lines = this.response()?.lines ?? [];

    return lines.map(line => {
      const values: Record<string, number | null> = {};
      const moms: Record<string, number | null> = {};
      const yoys: Record<string, number | null> = {};
      const provisionalPeriods = new Set<string>();

      for (const e of line.series) {
        values[e.period] = e.value;
        moms[e.period] = e.momPercent;
        yoys[e.period] = e.yoyPercent;
        if (e.provisional) provisionalPeriods.add(e.period);
      }

      const rows: MetricRow[] = [
        { metric: 'value', metricLabel: 'Value', cells: values, provisionalPeriods },
        { metric: 'mom', metricLabel: 'MoM%', cells: moms, provisionalPeriods },
        { metric: 'yoy', metricLabel: 'YoY%', cells: yoys, provisionalPeriods },
      ];

      return { lineId: line.id, lineLabel: line.label, rows };
    });
  });

  ngOnInit(): void {
    this.dataService.getIipItems().subscribe({
      next: (result) => {
        this.nic2Catalog.set(result.lines.map(l => ({ code: l.id, name: l.label })));
        const end = result.latestPeriod;
        this.endDate.set(end);
        this.startDate.set(end ? shiftPeriod(end, -11) : null);
        this.fetch();
      },
      error: () => this.loading.set(false),
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.dataService
      .getIipItems(this.selectedNic2(), this.selectedNic5(), this.startDate(), this.endDate())
      .subscribe({
        next: (result) => {
          this.response.set(result);
          if (result.level === 'nic5') {
            this.nic5Catalog.set(
              result.lines.map(l => ({ code: l.nic5 as number, label: l.label, itemCount: l.itemCount }))
            );
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleNic2Drop(): void {
    this.nic2DropOpen.set(!this.nic2DropOpen());
    this.nic5DropOpen.set(false);
  }

  toggleNic5Drop(): void {
    if (!this.selectedNic2()) return;
    this.nic5DropOpen.set(!this.nic5DropOpen());
    this.nic2DropOpen.set(false);
  }

  selectNic2(code: string): void {
    this.selectedNic2.set(code);
    this.selectedNic5.set(null);
    this.nic5Catalog.set([]);
    this.nic2DropOpen.set(false);
    this.nic2Search.set('');
    this.fetch();
  }

  selectNic5(code: number): void {
    this.selectedNic5.set(code);
    this.nic5DropOpen.set(false);
    this.nic5Search.set('');
    this.fetch();
  }

  clearNic2(): void {
    this.selectedNic2.set(null);
    this.selectedNic5.set(null);
    this.nic5Catalog.set([]);
    this.fetch();
  }

  clearNic5(): void {
    this.selectedNic5.set(null);
    this.fetch();
  }

  onStartDateChange(period: string): void {
    this.startDate.set(period);
    if (this.endDate() && period > this.endDate()!) this.endDate.set(period);
    this.fetch();
  }

  onEndDateChange(period: string): void {
    this.endDate.set(period);
    if (this.startDate() && period < this.startDate()!) this.startDate.set(period);
    this.fetch();
  }

  resetDateRange(): void {
    const latest = this.response()?.latestPeriod;
    if (!latest) return;
    this.endDate.set(latest);
    this.startDate.set(shiftPeriod(latest, -11));
    this.fetch();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.nic-wrapper')) {
      this.nic2DropOpen.set(false);
      this.nic5DropOpen.set(false);
      this.addDropOpen.set(false);
    }
  }

  formatValue(v: number | null): string {
    return v === null || v === undefined ? 'NA' : v.toFixed(1);
  }

  formatPct(v: number | null): string {
    if (v === null || v === undefined) return 'NA';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v}%`;
  }

  getTrendClass(v: number | null | undefined): string {
    if (v === null || v === undefined) return '';
    if (v > 0) return 'trend-up';
    if (v < 0) return 'trend-down';
    return 'trend-flat';
  }

  getTrendIcon(v: number | null | undefined): string {
    if (v === null || v === undefined) return '';
    if (v > 0) return 'trending_up';
    if (v < 0) return 'trending_down';
    return 'trending_flat';
  }
}
