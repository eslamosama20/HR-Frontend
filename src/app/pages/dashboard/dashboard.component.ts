import { ChangeDetectorRef, Component, OnInit, signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { TranslationService } from "../../modules/i18n";
import { PermissionModel } from "../../models/auth/permission.model";
import { AuthService } from "../../modules/auth";
import { UserAccountModel } from "../../models/auth/userAccount.model";
import { ApexOptions } from "ng-apexcharts";
import { Router } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

import { EmployeeService } from "src/app/services/hr/employee.service";
import { AttendanceService } from "src/app/services/hr/attendance.service";
import { EmploymentTypeService } from "src/app/services/hr/employment-type.service";
import { ShiftService } from "src/app/services/hr/shift.service";
import { MonthlyLoanService } from "src/app/services/hr/monthly-loan.service";
import { PenaltyService } from "src/app/services/hr/penalty.service";
import { BonusService } from "src/app/services/hr/bonus.service";
import { OvertimeHoursService } from "src/app/services/hr/overtime-hours.service";
import { LeaveApplicationService } from "src/app/services/hr/leave-application.service";
import { FingerprintDeviceSettingsService } from "src/app/services/hr/fingerprint-device-settings.service";
import { EmployeeModel } from "src/app/models/hr/employee.model";
import { AttendanceModel } from "src/app/models/hr/attendance.model";

interface HrKpi {
	id: string;
	title: string;
	value: number;
	icon: string;
	tone: string;
	isCurrency?: boolean;
	route: string;
}

@Component({
	selector: "app-dashboard",
	templateUrl: "./dashboard.component.html",
	styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
	activeLanguage: string = "ar";
	userPermissionsSignal = signal<PermissionModel[]>([]);
	public userSignal = signal<UserAccountModel>(null);
	loadingSignal = signal(true);

	// Quick counters
	totalEmployees = 0;
	totalShifts = 0;
	totalJobTitles = 0;
	totalDevices = 0;

	// Attendance stats
	presentToday = 0;
	absentToday = 0;
	onLeaveToday = 0;
	lateToday = 0;

	// Financials
	totalLoansAmount = 0;
	totalBonusesCount = 0;
	totalPenaltiesCount = 0;
	totalOvertimeHours = 0;
	pendingLeavesCount = 0;

	currencyCode = "SAR";

	kpis: HrKpi[] = [];

	latestEmployees: EmployeeModel[] = [];
	todayAttendances: AttendanceModel[] = [];

	attendancePieChart: ApexOptions = {};
	employeesByShiftChart: ApexOptions = {};

	constructor(
		private cdr: ChangeDetectorRef,
		public router: Router,
		private authService: AuthService,
		public translateService: TranslateService,
		public translationService: TranslationService,
		private employeeService: EmployeeService,
		private attendanceService: AttendanceService,
		private employmentTypeService: EmploymentTypeService,
		private shiftService: ShiftService,
		private monthlyLoanService: MonthlyLoanService,
		private penaltyService: PenaltyService,
		private bonusService: BonusService,
		private overtimeHoursService: OvertimeHoursService,
		private leaveApplicationService: LeaveApplicationService,
		private fingerprintDeviceSettingsService: FingerprintDeviceSettingsService,
	) {
		this.activeLanguage = translationService.getSelectedLanguage() || "ar";
		this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
			if (res) {
				this.user = res;
				this.userPermissions = (res.userRoles || [])
					.map((ur) => (ur.role?.rolePermissions || []).map((rp) => rp.permission))
					.reduce((acc, val) => acc.concat(val), []);
			}
			this.cdr.markForCheck();
		});
	}

	ngOnInit(): void {
		this.initChartTemplates();
		this.loadHrData();
	}

	get userPermissions(): PermissionModel[] {
		return this.userPermissionsSignal();
	}

	set userPermissions(permissions: PermissionModel[]) {
		this.userPermissionsSignal.set(permissions);
	}

	hasPermission(name: string): boolean {
		return this.userPermissionsSignal().some((p) => p.name === name);
	}

	get user() {
		return this.userSignal();
	}

	set user(user: UserAccountModel) {
		this.userSignal.set(user);
	}

	get loading() {
		return this.loadingSignal();
	}

	set loading(loading: boolean) {
		this.loadingSignal.set(loading);
	}

	private initChartTemplates() {
		this.attendancePieChart = {
			series: [0, 0, 0, 0],
			labels: ["حاضر", "غياب", "إجازة", "تأخير"],
			chart: {
				type: "donut",
				height: 280,
				toolbar: { show: false },
				fontFamily: "Almarai, sans-serif",
			},
			colors: ["#10b981", "#ef4444", "#3b82f6", "#f59e0b"],
			dataLabels: { enabled: true },
			legend: { position: "bottom", fontFamily: "Almarai, sans-serif" },
			tooltip: { enabled: true },
		};

		this.employeesByShiftChart = {
			series: [
				{
					name: "عدد الموظفين",
					data: [],
				},
			],
			chart: {
				type: "bar",
				height: 280,
				toolbar: { show: false },
				fontFamily: "Almarai, sans-serif",
			},
			colors: ["#6366f1"],
			plotOptions: {
				bar: {
					borderRadius: 6,
					columnWidth: "45%",
					dataLabels: { position: "top" },
				},
			},
			xaxis: {
				categories: [],
				labels: { style: { fontFamily: "Almarai, sans-serif" } },
			},
			yaxis: {
				labels: { style: { fontFamily: "Almarai, sans-serif" } },
			},
			grid: { borderColor: "#f1f5f9" },
		};
	}

	private loadHrData() {
		this.loading = true;

		// 1. Employees
		this.employeeService.getAll().pipe(catchError(() => of([]))).subscribe((employees) => {
			this.totalEmployees = employees?.length || 0;
			this.latestEmployees = (employees || []).slice(0, 5);

			// Count employees by shift
			const shiftMap = new Map<string, number>();
			(employees || []).forEach((e) => {
				const shiftName = e.shift?.name || "بدون وردية";
				shiftMap.set(shiftName, (shiftMap.get(shiftName) || 0) + 1);
			});

			const shiftNames = Array.from(shiftMap.keys());
			const shiftCounts = Array.from(shiftMap.values());

			this.employeesByShiftChart = {
				...this.employeesByShiftChart,
				xaxis: { categories: shiftNames.length ? shiftNames : ["افتراضي"] },
				series: [{ name: "عدد الموظفين", data: shiftCounts.length ? shiftCounts : [this.totalEmployees] }],
			};

			this.updateKpis();
			this.cdr.markForCheck();
		});

		// 2. Job Titles (Employment Types)
		this.employmentTypeService.getAll().pipe(catchError(() => of([]))).subscribe((types) => {
			this.totalJobTitles = types?.length || 0;
			this.cdr.markForCheck();
		});

		// 3. Shifts
		this.shiftService.getAll().pipe(catchError(() => of([]))).subscribe((shifts) => {
			this.totalShifts = shifts?.length || 0;
			this.cdr.markForCheck();
		});

		// 4. Devices
		this.fingerprintDeviceSettingsService.getAll().pipe(catchError(() => of([]))).subscribe((devs) => {
			this.totalDevices = devs?.length || 0;
			this.cdr.markForCheck();
		});

		// 5. Attendances
		this.attendanceService.getAll().pipe(catchError(() => of([]))).subscribe((records) => {
			const list = records || [];
			this.todayAttendances = list.slice(0, 6);

			let present = 0;
			let absent = 0;
			let onLeave = 0;
			let late = 0;

			list.forEach((rec) => {
				if (rec.attendanceFlag === "Present") present++;
				else if (rec.attendanceFlag === "Absent") absent++;
				else if (rec.attendanceFlag === "OnLeaveWithPermission" || rec.attendanceFlag === "OnLeaveWithoutPermission") onLeave++;
				else if (rec.attendanceFlag === "LateEntry" || rec.attendanceFlag === "LateWithPermission") late++;
				else present++;
			});

			this.presentToday = present;
			this.absentToday = absent;
			this.onLeaveToday = onLeave;
			this.lateToday = late;

			this.attendancePieChart = {
				...this.attendancePieChart,
				series: [present, absent, onLeave, late],
			};

			this.updateKpis();
			this.loading = false;
			this.cdr.markForCheck();
		});

		// 6. Loans
		this.monthlyLoanService.getAll().pipe(catchError(() => of([]))).subscribe((loans) => {
			this.totalLoansAmount = (loans || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
			this.updateKpis();
			this.cdr.markForCheck();
		});

		// 7. Bonuses
		this.bonusService.getAll().pipe(catchError(() => of([]))).subscribe((bonuses) => {
			this.totalBonusesCount = bonuses?.length || 0;
			this.updateKpis();
			this.cdr.markForCheck();
		});

		// 8. Penalties
		this.penaltyService.getAll().pipe(catchError(() => of([]))).subscribe((pens) => {
			this.totalPenaltiesCount = pens?.length || 0;
			this.updateKpis();
			this.cdr.markForCheck();
		});

		// 9. Overtime Hours
		this.overtimeHoursService.getAll().pipe(catchError(() => of([]))).subscribe((ovt) => {
			this.totalOvertimeHours = (ovt || []).reduce((acc, curr) => acc + (curr.hours || 0), 0);
			this.updateKpis();
			this.cdr.markForCheck();
		});

		// 10. Leave Applications
		this.leaveApplicationService.getAll().pipe(catchError(() => of([]))).subscribe((leaves) => {
			this.pendingLeavesCount = (leaves || []).length;
			this.updateKpis();
			this.cdr.markForCheck();
		});
	}

	private updateKpis() {
		this.kpis = [
			{
				id: "employees",
				title: "إجمالي الموظفين",
				value: this.totalEmployees,
				icon: "pi pi-users",
				tone: "emerald",
				route: "/hr/employees",
			},
			{
				id: "present",
				title: "حضور اليوم",
				value: this.presentToday,
				icon: "pi pi-check-circle",
				tone: "green",
				route: "/hr/attendances",
			},
			{
				id: "absent",
				title: "غياب اليوم",
				value: this.absentToday,
				icon: "pi pi-times-circle",
				tone: "rose",
				route: "/hr/attendances",
			},
			{
				id: "onLeave",
				title: "إجازات اليوم",
				value: this.onLeaveToday,
				icon: "pi pi-calendar-plus",
				tone: "blue",
				route: "/leave-applications",
			},
			{
				id: "loans",
				title: "إجمالي السُلف",
				value: this.totalLoansAmount,
				icon: "pi pi-wallet",
				tone: "orange",
				isCurrency: true,
				route: "/hr/monthly-loans",
			},
			{
				id: "overtime",
				title: "ساعات الأوفر تايم",
				value: this.totalOvertimeHours,
				icon: "pi pi-clock",
				tone: "violet",
				route: "/hr/overtime-hours",
			},
			{
				id: "bonuses",
				title: "المكافآت",
				value: this.totalBonusesCount,
				icon: "pi pi-gift",
				tone: "teal",
				route: "/hr/bonuses",
			},
			{
				id: "penalties",
				title: "الجزاءات",
				value: this.totalPenaltiesCount,
				icon: "pi pi-exclamation-triangle",
				tone: "red",
				route: "/hr/penalties",
			},
		];
	}

	navigateToEmployees() {
		this.router.navigate(["/hr/employees"]);
	}

	navigateToAttendances() {
		this.router.navigate(["/hr/attendances"]);
	}

	navigateToLogs() {
		this.router.navigate(["/hr/check-in-logs"]);
	}

	navigateToPaymentCalculator() {
		this.router.navigate(["/hr/payment-calculator"]);
	}

	navigateToLeaves() {
		this.router.navigate(["/leave-applications"]);
	}

	navigateToDevices() {
		this.router.navigate(["/hr/fingerprint-device-settings"]);
	}

	navigateToShifts() {
		this.router.navigate(["/hr/shifts"]);
	}

	navigateToJobTitles() {
		this.router.navigate(["/hr/employment-types"]);
	}

	trackByKpi(index: number, kpi: HrKpi): string {
		return kpi.id;
	}

	trackByIndex(index: number): number {
		return index;
	}
}
