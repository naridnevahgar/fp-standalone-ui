import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sector {
  id: string;
  name: string;
  weight: number;
}

export interface MonthlyEntry {
  period: string;
  label: string;
  provisional?: boolean;
  index?: Record<string, number>;
  growth?: Record<string, number>;
  values?: Record<string, number>;
}

export interface YearlyEntry {
  year: string;
  index?: Record<string, number>;
  growth?: Record<string, number>;
  values?: Record<string, number>;
}

export interface DatasetDetail {
  id: string;
  name: string;
  shortName: string;
  country: string;
  baseYear?: string;
  baseValue?: number;
  source?: string;
  releaseDate?: string;
  nextRelease?: string;
  description?: string;
  sectors: Sector[];
  commodities: string[];
  monthly: MonthlyEntry[];
  yearly: YearlyEntry[];
}

export interface DatasetSummary {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  latestPeriod: string;
  latestGrowth: number | null;
  cumulativeGrowth?: number;
  cumulativePeriod?: string;
  status: string;
  releaseDate?: string;
  file?: string;
}

export interface CountryDatasets {
  country: string;
  countryName: string;
  datasets: DatasetSummary[];
}

export interface IipSeriesEntry {
  period: string;
  label: string;
  value: number;
  provisional?: boolean;
  momPercent: number | null;
  yoyPercent: number | null;
}

export interface IipLine {
  id: string;
  label: string;
  nic2: string;
  nic2Name: string;
  nic5: number | null;
  itemCount: number;
  unit: string | null;
  series: IipSeriesEntry[];
}

export interface IipItemsResponse {
  level: 'nic2' | 'nic5' | 'item';
  count: number;
  earliestPeriod: string | null;
  latestPeriod: string | null;
  lines: IipLine[];
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private basePath = `${environment.apiUrl}/datasets`;

  getCountryDatasets(country: string): Observable<CountryDatasets> {
    return this.http.get<CountryDatasets>(`${this.basePath}/${country}`);
  }

  getDatasetDetail(country: string, datasetId: string): Observable<DatasetDetail> {
    return this.http.get<DatasetDetail>(`${this.basePath}/${country}/${datasetId}`);
  }

  getIipItems(
    nic2?: string | null,
    nic5?: number | null,
    startDate?: string | null,
    endDate?: string | null,
  ): Observable<IipItemsResponse> {
    let params = new HttpParams();
    if (nic2) params = params.set('nic2', nic2);
    if (nic5 != null) params = params.set('nic5', nic5);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    return this.http.get<IipItemsResponse>(`${environment.apiUrl}/iip-items`, { params });
  }
}
