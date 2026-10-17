import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

export interface DashboardKpisResponse {
	salesTotal: number;
	purchaseTotal: number;
	salesCount: number;
	purchaseCount: number;
	reservationsCount: number;
	confirmedCount: number;
	inventoryItems: number;
	cashIn30: number;
	cashOut30: number;
	treasuries: number;
	storeCount: number;
	supplierCount: number;
	bankAccountCount: number;
}

export interface DashboardChartSeriesResponse {
	name: string;
	data: number[];
}

export interface DashboardChartResponse {
	categories: string[];
	series: DashboardChartSeriesResponse[];
	statusCounts?: Record<string, number>;
}

export interface DashboardOverviewResponse {
	kpis: DashboardKpisResponse;
	salesPurchase: DashboardChartResponse;
	reservations: DashboardChartResponse;
	treasury: DashboardChartResponse;
	inventory: DashboardChartResponse;
}

@Injectable({ providedIn: "root" })
export class DashboardService {
	private baseUrl = environment.server_urls[environment.active_server].baseApi;

	constructor(private http: HttpClient) {}

	getKpis(): Observable<DashboardKpisResponse> {
		return this.http.get<DashboardKpisResponse>(
			`${this.baseUrl}dashboard/kpis`,
		);
	}

	/**
	 * Single round-trip aggregate (backend 86cazwqpu): KPIs + all 4 charts,
	 * one shared permission lookup server-side. The per-endpoint methods below
	 * remain for backward compatibility but the dashboard page uses this one.
	 */
	getOverview(): Observable<DashboardOverviewResponse> {
		return this.http.get<DashboardOverviewResponse>(
			`${this.baseUrl}dashboard/overview`,
		);
	}

	getSalesPurchaseChart(): Observable<DashboardChartResponse> {
		return this.http.get<DashboardChartResponse>(
			`${this.baseUrl}dashboard/charts/sales-purchase`,
		);
	}

	getReservationsChart(): Observable<DashboardChartResponse> {
		return this.http.get<DashboardChartResponse>(
			`${this.baseUrl}dashboard/charts/reservations`,
		);
	}

	getTreasuryChart(): Observable<DashboardChartResponse> {
		return this.http.get<DashboardChartResponse>(
			`${this.baseUrl}dashboard/charts/treasury`,
		);
	}

	getInventoryChart(): Observable<DashboardChartResponse> {
		return this.http.get<DashboardChartResponse>(
			`${this.baseUrl}dashboard/charts/inventory`,
		);
	}
}
