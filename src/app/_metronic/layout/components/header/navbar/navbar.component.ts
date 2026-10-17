import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  AfterViewInit,
  NgZone,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../modules/auth';
import { TranslationService } from '../../../../../modules/i18n';
import { UserAccountModel } from 'src/app/models/auth/userAccount.model';
import { LayoutService } from '../../../core/layout.service';
import { ILayout } from '../../../core/configs/config';
import { Subscription } from 'rxjs';
import { ThemeGreenService } from 'src/app/services/themes/theme-green.service';
import { Observable, fromEvent } from 'rxjs';
import { NotificationService } from 'src/app/services/notification.service';
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() appHeaderDefaulMenuDisplay: boolean;
  @Input() isRtl: boolean;
  unreadCount$!: Observable<number>;
  showNotifications = false;
  itemClass: string = 'ms-1 ms-lg-3';
  btnClass: string =
    'btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-35px h-35px w-md-40px h-md-40px';
  userAvatarClass: string = 'symbol-35px symbol-md-40px';
  btnIconClass: string = 'fs-2 fs-md-1';
  twoFactorEnabledCheckedSignal = signal<boolean>(false);
  inputSwitchEnabledSignal = signal<boolean>(true);

  private unsubscribe: Subscription[] = [];
  private themeMenuObserver?: MutationObserver;
  private injectedIntoThemeMenu = false;
  private onAnyClick = this.ensureMenuReady.bind(this);

  get twoFactorEnabledChecked(): boolean {
    return this.twoFactorEnabledCheckedSignal();
  }
  set twoFactorEnabledChecked(value: boolean) {
    this.twoFactorEnabledCheckedSignal.set(value);
  }

  get inputSwitchEnabled(): boolean {
    return this.inputSwitchEnabledSignal();
  }
  set inputSwitchEnabled(value: boolean) {
    this.inputSwitchEnabledSignal.set(value);
  }

  userAccount: UserAccountModel;
  userName: string = '';
  userInitials: string = '';

  // ✅ مصدر الصورة الديناميكي
  avatarUrl: string | null = null;

  constructor(
    private layout: LayoutService,
    private router: Router,
    private authService: AuthService,
    private translationService: TranslationService,
    private themeGreenService: ThemeGreenService,
    private ngZone: NgZone,
    private notif: NotificationService,
    private elementRef: ElementRef
  ) {
    authService.currentUser$.subscribe((u) => {
      this.userName = `${u.firstName} ${u.middleName} ${u.lastName}`;
      this.userInitials = this.getInitials(this.userName);
      this.avatarUrl = this.buildAvatarSrc(u); // <-- تحديث الصورة تلقائيًا
    });
  }

  ngOnInit(): void {
    this.loadUserAccount();
    const subscr = this.layout.layoutConfigSubject
      .asObservable()
      .subscribe((config: ILayout) => {
        this.updateProps(config);
      });
    this.unsubscribe.push(subscr);
    this.unreadCount$ = this.notif.unreadCount$;
  }
  toggleNotificationsPanel() {
    this.showNotifications = !this.showNotifications;
    console.log('showNotifications =', this.showNotifications);
    if (this.showNotifications) {
      // اعتبرهم مقروءين حين الفتح (اختياري)
      // this.notif.markAllAsRead();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Only process if notifications panel is open
    if (!this.showNotifications) {
      return;
    }

    // Get the notification wrapper element
    const notifWrapper = this.elementRef.nativeElement.querySelector('.notif-wrapper');

    // Check if click was outside the notification wrapper
    if (notifWrapper && !notifWrapper.contains(event.target as Node)) {
      this.showNotifications = false;
    }
  }

  ngAfterViewInit(): void {
    document.addEventListener('click', this.onAnyClick, true);
    this.ensureMenuReady();
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
    this.themeMenuObserver?.disconnect();
    document.removeEventListener('click', this.onAnyClick, true);
  }

  logout(): void {
    this.authService.logout();
  }

  getInitials(name: string): string {
    const nameParts = name.split(' ');
    return nameParts
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  loadUserAccount(): void {
    this.authService.getUserByToken().subscribe((res: UserAccountModel) => {
      if (res) {
        this.userAccount = res;
        this.inputSwitchEnabled = !(res.email === 'admin@admin.com');
        this.twoFactorEnabledChecked = res.twoFactorEnabled;
        this.avatarUrl = this.buildAvatarSrc(res); // <-- تحديث الصورة عند التحميل الأولي
      }
    });
  }

  // ✅ يبني رابط الصورة سواء URL جاهز أو Base64 خام مع MIME
  private buildAvatarSrc(
    u: UserAccountModel | null | undefined
  ): string | null {
    if (!u) return null;

    const url =
      (u as any)?.avatarUrl ||
      (u as any)?.profilePictureUrl ||
      (u as any)?.photoUrl;
    if (url) return url;

    const rawBase64: string | null | undefined =
      (u as any)?.profilePicture || (u as any)?.avatarBase64;

    if (rawBase64 && typeof rawBase64 === 'string' && rawBase64.trim()) {
      const mime = (u as any)?.profilePictureMime || 'image/jpeg';
      return `data:${mime};base64,${rawBase64}`;
    }

    return null;
  }

  changeLanguage(lang: string): void {
    this.translationService.setLanguage(lang);
    document.location.reload();
  }

  get currentLang(): string {
    return this.translationService.getSelectedLanguage();
  }

  toggleLanguage(): void {
    const nextLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.changeLanguage(nextLang);
  }

  toggleTwoFactorEnabled(event: any) {
    if (!this.inputSwitchEnabled) {
      this.twoFactorEnabledChecked = !event.checked;
      return;
    }
    if (this.twoFactorEnabledChecked !== this.userAccount.twoFactorEnabled) {
      this.authService.toggleTwoFactorEnabled(this.userAccount.id).subscribe({
        next: () => this.loadUserAccount(),
        error: (err) => console.error('toggleTwoFactorEnabled error:', err),
      });
    }
  }

  showPageTitle() {
    const viewsWithPageTitles = ['classic', 'reports', 'saas'];
    return (
      this.appPageTitleDisplay &&
      viewsWithPageTitles.some((t) => t === this.appToolbarLayout)
    );
  }

  appToolbarLayout = 'classic';
  appPageTitleDisplay: boolean;
  appPageTitleDirection: string = '';
  appPageTitleCSSClass: string = '';
  appPageTitleBreadcrumb: boolean;
  appPageTitleDescription: boolean;

  updateProps(config: ILayout) {
    this.appPageTitleDisplay = this.layout.getProp(
      'app.pageTitle.display',
      config
    ) as boolean;

    this.appPageTitleDirection = this.layout.getProp(
      'app.pageTitle.direction',
      config
    ) as string;
    this.appPageTitleCSSClass = this.layout.getProp(
      'app.pageTitle.class',
      config
    ) as string;
    this.appPageTitleBreadcrumb = this.layout.getProp(
      'app.pageTitle.breadCrumb',
      config
    ) as boolean;
    this.appPageTitleDescription = this.layout.getProp(
      'app.pageTitle.description',
      config
    ) as boolean;

    document.body.setAttribute('data-kt-app-toolbar-enabled', 'true');
    document.body.setAttribute('data-kt-app-header-minimize', 'on');
  }

  // يطبق الثيم الأخضر على الـ Sidebar فقط
  applyLightGreenSidebar(): void {
    const targetSel = '#kt_app_sidebar';
    this.themeGreenService.applyTheme('light-green', targetSel);
    localStorage.setItem('custom-sidebar-theme', 'light-green');
  }

  /** حقن خيار إضافي بالقائمة (إن كنت تستخدم قائمة Metronic الافتراضية) */
  private ensureMenuReady(): void {
    this.ngZone.runOutsideAngular(() => {
      const menu = document.querySelector(
        '[data-kt-element="theme-mode-menu"]'
      ) as HTMLElement | null;
      if (menu) {
        this.injectLightGreenIntoThemeMenu(menu);
        return;
      }
      if (!this.themeMenuObserver) {
        this.themeMenuObserver = new MutationObserver(() => {
          const found = document.querySelector(
            '[data-kt-element="theme-mode-menu"]'
          ) as HTMLElement | null;
          if (found) {
            this.injectLightGreenIntoThemeMenu(found);
          }
        });
        this.themeMenuObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  }

  private injectLightGreenIntoThemeMenu(menu: HTMLElement): void {
    if (this.injectedIntoThemeMenu) return;
    if (!menu) return;

    if (menu.querySelector('[data-kt-value="light-green"]')) {
      this.injectedIntoThemeMenu = true;
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'menu-item px-3';
    wrapper.innerHTML = `
      <a href="#" class="menu-link px-3" data-kt-element="mode" data-kt-value="light-green">
        <span class="menu-icon me-2"><i class="pi pi-palette"></i></span>
        <span class="menu-title">الوضع الأخضر (Sidebar)</span>
      </a>
    `;
    menu.appendChild(wrapper);

    const link = wrapper.querySelector('a');
    link?.addEventListener('click', (e) => {
      e.preventDefault();
      this.ngZone.run(() => this.applyLightGreenSidebar());
    });

    this.injectedIntoThemeMenu = true;
  }

  searchQuery: string = '';
  searchActive: boolean = false;
  filteredPages: any[] = [];

  normalizeArabic(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, ''); // removes tashkeel/diacritics
  }

  pagesList: any[] = [
    { titleAr: 'الرئيسية', titleEn: 'Dashboard', route: '/dashboard', icon: 'pi-home' },
    
    // المبيعات
    { titleAr: 'إضافة فاتورة مبيعات', titleEn: 'Add Sales Invoice', route: '/invoices/new', icon: 'pi-plus-circle' },
    { titleAr: 'فواتير المبيعات', titleEn: 'Sales Invoices', route: '/invoices/list', icon: 'pi-file-invoice' },
    { titleAr: 'فواتير المبيعات فرونتال', titleEn: 'Frontal Sales Invoices', route: '/invoices/frontal-list', icon: 'pi-file' },
    { titleAr: 'عروض الأسعار', titleEn: 'Quotations', route: '/quotations/list', icon: 'pi-percentage' },
    { titleAr: 'الإشعارات الدائنة', aliasesAr: 'إشعار دائن', titleEn: 'Credit Notes', route: '/sales-credit-notes/list', icon: 'pi-minus-circle' },
    { titleAr: 'تقرير فواتير المبيعات', aliasesAr: 'تقرير المبيعات', titleEn: 'Sales Invoice Report', route: '/reports/sales-invoice-report', icon: 'pi-chart-line' },
    { titleAr: 'تقرير ملخص المبيعات', aliasesAr: 'تقرير مبيعات مختصر', titleEn: 'Sales Summary Report', route: '/reports/sales-invoice-summary-report', icon: 'pi-chart-bar' },
    { titleAr: 'شجرة مجموعات المبيعات', aliasesAr: 'شجرة أصناف المبيعات', titleEn: 'Sales Classes Tree', route: '/sales-classes-tree', icon: 'pi-sitemap' },
    
    // نقطة البيع - POS
    { titleAr: 'شاشة الكاشير - POS', titleEn: 'POS Cashier Screen', route: '/cashier/pos', icon: 'pi-desktop' },
    { titleAr: 'إدارة الوردية', titleEn: 'Session Management', route: '/cashier/session', icon: 'pi-clock' },
    { titleAr: 'تقارير الكاشير', titleEn: 'Cashier Reports', route: '/cashier/reports', icon: 'pi-chart-pie' },
    { titleAr: 'بيع سريع', titleEn: 'Quick Sale', route: '/cashier/quick-sale', icon: 'pi-bolt' },
    { titleAr: 'مرتجعات الكاشير', titleEn: 'Cashier Returns', route: '/cashier/returns', icon: 'pi-undo' },
    { titleAr: 'وصفات الصيدلية', titleEn: 'Pharmacy Prescriptions', route: '/cashier/pharmacy-prescriptions', icon: 'pi-file-edit' },
    { titleAr: 'ملفات المرضى', titleEn: 'Pharmacy Patients', route: '/cashier/pharmacy-patients', icon: 'pi-users' },
    { titleAr: 'التشغيلات والصلاحية', aliasesAr: 'تاريخ الصلاحية شحنات دفعات', titleEn: 'Batches & Expiry', route: '/cashier/pharmacy-batches', icon: 'pi-box' },
    { titleAr: 'مطالبات التأمين', titleEn: 'Insurance Claims', route: '/cashier/pharmacy-insurance', icon: 'pi-check-circle' },
    { titleAr: 'الأدوية المقيدة', titleEn: 'Controlled Drugs', route: '/cashier/pharmacy-controlled-drugs', icon: 'pi-shield' },
    { titleAr: 'تنبيهات الصيدلية', titleEn: 'Pharmacy Alerts', route: '/cashier/pharmacy-alerts', icon: 'pi-bell' },
    { titleAr: 'مرتجعات الصيدلية', titleEn: 'Pharmacy Returns', route: '/cashier/pharmacy-returns', icon: 'pi-arrow-left-arrow-right' },
    { titleAr: 'خريطة الطاولات', titleEn: 'Table Map', route: '/cashier/floor', icon: 'pi-map' },
    { titleAr: 'الطلبات المباشرة', titleEn: 'Live Orders', route: '/cashier/live-orders', icon: 'pi-list' },
    { titleAr: 'شاشة المطبخ (KDS)', titleEn: 'Kitchen Display (KDS)', route: '/cashier/kds', icon: 'pi-tablet' },
    { titleAr: 'شاشة العميل', titleEn: 'Customer Display', route: '/cashier/customer-display', icon: 'pi-eye' },
    { titleAr: 'تقرير إغلاق اليوم', aliasesAr: 'Z-Report zreport زد ريبورت', titleEn: 'Z-Report', route: '/cashier/z-report', icon: 'pi-file' },
    { titleAr: 'إدارة فواتير الكاشير', titleEn: 'Invoice Control', route: '/cashier/invoice-control', icon: 'pi-receipt' },
    { titleAr: 'سجل العمليات', aliasesAr: 'سجل العمليات الأمنية', titleEn: 'Audit Log', route: '/cashier/audit-log', icon: 'pi-lock' },
    
    // الحجوزات / العمليات
    { titleAr: 'إضافة حجز جديد', titleEn: 'Add Reservation', route: '/reservations/new', icon: 'pi-calendar-plus' },
    { titleAr: 'الحجوزات', titleEn: 'Reservations', route: '/reservations', icon: 'pi-calendar' },
    { titleAr: 'الحجوزات الفرونتال', aliasesAr: 'الحجوزات فرونتال', titleEn: 'Frontal Reservations', route: '/reservations/frontal', icon: 'pi-calendar-times' },
    { titleAr: 'البحث المتقدم في الحجوزات', aliasesAr: 'بحث الحجوزات المتقدم', titleEn: 'Reservations Advanced Search', route: '/reservations/advanced-search', icon: 'pi-search' },
    { titleAr: 'البحث المتقدم في الحجوزات فرونتال', aliasesAr: 'بحث الحجوزات المتقدم فرونتال', titleEn: 'Frontal Reservations Advanced Search', route: '/reservations/frontal-advanced-search', icon: 'pi-search-plus' },
    { titleAr: 'فواتير الحجوزات', titleEn: 'Reservation Invoices', route: '/invoices/reservation-list', icon: 'pi-wallet' },
    { titleAr: 'إمكانيات الغرف', aliasesAr: 'مخطط الحجوزات', titleEn: 'Room Availability', route: '/room-availability', icon: 'pi-key' },
    { titleAr: 'إمكانيات الفنادق', titleEn: 'Hotel Allotment', route: '/hotel-allotment', icon: 'pi-building' },
    { titleAr: 'مشتريات الحجوزات', titleEn: 'Reservation Purchases', route: '/reservation-purchases', icon: 'pi-shopping-bag' },
    { titleAr: 'تقارير الحجوزات', titleEn: 'Reservation Reports', route: '/reservations/reservation-reports', icon: 'pi-chart-line' },
    
    // إعدادات الحجوزات
    { titleAr: 'الفنادق', titleEn: 'Hotels', route: '/hotels', icon: 'pi-building' },
    { titleAr: 'الفنادق فرونتال', titleEn: 'Frontal Hotels', route: '/frontal-hotels', icon: 'pi-image' },
    { titleAr: 'الغرف', aliasesAr: 'أنواع الغرف', titleEn: 'Room Types', route: '/room-type', icon: 'pi-list' },
    { titleAr: 'الغرف فرونتال', aliasesAr: 'أنواع الغرف فرونتال', titleEn: 'Frontal Room Types', route: '/frontal-room-type', icon: 'pi-sliders-h' },
    { titleAr: 'إطلالات الحجز', aliasesAr: 'الإطلالات', titleEn: 'Reservation Views', route: '/reservation-view', icon: 'pi-eye' },
    { titleAr: 'إطلالات الحجز فرونتال', titleEn: 'Frontal Reservation Views', route: '/frontal-reservation-view', icon: 'pi-eye' },
    { titleAr: 'شركات الحجز', aliasesAr: 'الشركات', titleEn: 'Reservation Companies', route: '/reservation-company', icon: 'pi-id-card' },
    { titleAr: 'شركات الحجز فرونتال', titleEn: 'Frontal Reservation Companies', route: '/frontal-reservation-company', icon: 'pi-id-card' },
    { titleAr: 'مناديب المبيعات', titleEn: 'Sales Representatives', route: '/sales-representative', icon: 'pi-users' },
    { titleAr: 'مناديب المبيعات فرونتال', titleEn: 'Frontal Sales Representatives', route: '/frontal-sales-representative', icon: 'pi-users' },
    { titleAr: 'وجبات الحجز', aliasesAr: 'وجبات الحجوزات', titleEn: 'Reservation Meals', route: '/reservation-meal', icon: 'pi-coffee' },
    { titleAr: 'وجبات الحجز فرونتال', titleEn: 'Frontal Reservation Meals', route: '/frontal-reservation-meal', icon: 'pi-coffee' },
    { titleAr: 'مواسم الحجز', aliasesAr: 'المواسم', titleEn: 'Reservation Seasons', route: '/reservation-season', icon: 'pi-sun' },
    { titleAr: 'مواسم الحجز فرونتال', titleEn: 'Frontal Reservation Seasons', route: '/frontal-reservation-season', icon: 'pi-sun' },
    { titleAr: 'موردين الحجوزات', aliasesAr: 'الموردين', titleEn: 'Reservation Suppliers', route: '/reservation-supplier', icon: 'pi-truck' },
    { titleAr: 'موردين الحجوزات فرونتال', titleEn: 'Frontal Reservation Suppliers', route: '/frontal-reservation-supplier', icon: 'pi-truck' },
    { titleAr: 'خدمات إضافية', aliasesAr: 'خدمات اضافية', titleEn: 'Additional Services', route: '/reservation-service', icon: 'pi-tags' },
    { titleAr: 'خدمات إضافية فرونتال', titleEn: 'Frontal Additional Services', route: '/frontal-reservation-service', icon: 'pi-tags' },
    
    // الموقع الإلكتروني / حجز ذكي
    { titleAr: 'إضافة حجز ذكي', aliasesAr: 'الموقع الالكتروني', titleEn: 'Smart Booking', route: '/booking', icon: 'pi-globe' },
    { titleAr: 'إدارة الحجوزات الذكية', aliasesAr: 'عرض الحجوزات', titleEn: 'Smart Bookings Dashboard', route: '/admin/bookings', icon: 'pi-table' },
    { titleAr: 'إدارة الفنادق الذكية', aliasesAr: 'إدارة الفنادق', titleEn: 'Smart Hotels Management', route: '/admin/hotels-management', icon: 'pi-cog' },
    
    // المشتريات
    { titleAr: 'إضافة فاتورة مشتريات', titleEn: 'Add Purchase Invoice', route: '/purchase-invoices/new', icon: 'pi-plus' },
    { titleAr: 'فواتير المشتريات', titleEn: 'Purchase Invoices', route: '/purchase-invoices/list', icon: 'pi-shopping-cart' },
    { titleAr: 'فواتير المشتريات فرونتال', titleEn: 'Frontal Purchase Invoices', route: '/purchase-invoices/frontal-list', icon: 'pi-cart-plus' },
    { titleAr: 'طلب عرض سعر', aliasesAr: 'طلب عرض سعر مشتريات', titleEn: 'Request Quotation', route: '/purchase-invoices/request-quotation', icon: 'pi-send' },
    { titleAr: 'الإشعارات المدينة', aliasesAr: 'إشعار مدين', titleEn: 'Debit Notes', route: '/notes/debit-notes', icon: 'pi-minus' },
    { titleAr: 'مرتجع مشتريات', aliasesAr: 'مرتجعات المشتريات', titleEn: 'Purchase Returns', route: '/purchase-returns/list', icon: 'pi-reply' },
    { titleAr: 'تقرير بطاقة الصنف', aliasesAr: 'بطاقة الصنف', titleEn: 'Purchasable Card Report', route: '/reports/purchasable-card-report', icon: 'pi-file' },
    { titleAr: 'تقرير المشتريات', aliasesAr: 'تقارير المشتريات', titleEn: 'Purchase Report', route: '/reports/purchasable-invoice-report', icon: 'pi-file-o' },
    { titleAr: 'تقرير مشتريات مختصر', aliasesAr: 'ملخص المشتريات', titleEn: 'Purchase Summary Report', route: '/reports/purchase-invoice-summary-report', icon: 'pi-align-left' },
    { titleAr: 'شجرة مجموعات المشتريات', aliasesAr: 'شجرة أصناف المشتريات', titleEn: 'Purchase Classes Tree', route: '/purchase-classes-tree', icon: 'pi-sitemap' },
    
    // المطاعم والمطابخ
    { titleAr: 'الوصفات', titleEn: 'Recipes', route: '/recipes', icon: 'pi-book' },
    { titleAr: 'حجوزات الوجبات', aliasesAr: 'بيانات حجوزات الوجبات', titleEn: 'Meal Reservations', route: '/meal-reservations', icon: 'pi-ticket' },
    
    // المخازن والمخزون
    { titleAr: 'إدارة الإذون المخزنية', aliasesAr: 'أذون المخزن إذن دخول وخروج', titleEn: 'Inventory Permits', route: '/permits/inventory-permits', icon: 'pi-folder' },
    { titleAr: 'إذن دخول مخزن', aliasesAr: 'إذن دخول', titleEn: 'Entry Permit', route: '/permits/inventory-permits/new/entry', icon: 'pi-sign-in' },
    { titleAr: 'إذن خروج مخزن', aliasesAr: 'إذن خروج', titleEn: 'Exit Permit', route: '/permits/inventory-permits/new/exit', icon: 'pi-sign-out' },
    { titleAr: 'جرد المخزن', aliasesAr: 'جرد المستودعات', titleEn: 'Inventory Stocktaking', route: '/inventory-stocktaking', icon: 'pi-check-square' },
    { titleAr: 'إدارة المخزن', aliasesAr: 'إدارة المستودعات', titleEn: 'Inventory Management', route: '/inventory/management', icon: 'pi-sliders-v' },
    { titleAr: 'المخازن', aliasesAr: 'تفاصيل المخزن', titleEn: 'Store Details', route: '/inventory/store-details', icon: 'pi-building' },
    { titleAr: 'صلاحيات المخزون', titleEn: 'Inventory View', route: '/inventory/view', icon: 'pi-eye' },
    { titleAr: 'عرض المخزون', titleEn: 'Stock View', route: '/inventory/stock-view', icon: 'pi-images' },
    { titleAr: 'إدارة وطباعة الباركود', titleEn: 'Barcode Management', route: '/inventory/barcode-management', icon: 'pi-barcode' },
    { titleAr: 'نقل المخزون', aliasesAr: 'تحويل مخزني', titleEn: 'Store Transfer', route: '/inventory/transfer', icon: 'pi-arrow-h' },
    { titleAr: 'المخزون التالف', titleEn: 'Damaged Inventory', route: '/inventory/damaged', icon: 'pi-trash' },
    { titleAr: 'الرواكد', aliasesAr: 'المخزون الراكد', titleEn: 'Stagnant Inventory', route: '/inventory/stagnant', icon: 'pi-clock' },
    { titleAr: 'المنتجات الأكثر مبيعًا', titleEn: 'Top Selling Products', route: '/reports/top-selling-products', icon: 'pi-star' },
    { titleAr: 'المنتجات الأكثر طلبًا', titleEn: 'Top Ordered Products', route: '/reports/top-ordered-products', icon: 'pi-star-fill' },
    
    // حالات المخازن
    { titleAr: 'حالة وحدة المنتج', titleEn: 'Product Unit Status', route: '/inventory/product-unit-status', icon: 'pi-info' },
    { titleAr: 'حالة الشحنة', aliasesAr: 'التشغيلة حالة الدفعة', titleEn: 'Batch Status', route: '/inventory/batch-status', icon: 'pi-info-circle' },
    { titleAr: 'حالة الوحدة في الشحنة', titleEn: 'Batch Unit Status', route: '/inventory/batch-unit-status', icon: 'pi-question-circle' },
    { titleAr: 'حالة الشركة', titleEn: 'Company Status', route: '/inventory/company-status', icon: 'pi-check' },
    { titleAr: 'حالة الفرع', titleEn: 'Branch Status', route: '/inventory/branch-status', icon: 'pi-check-circle' },
    { titleAr: 'حالة المخزن', titleEn: 'Store Status', route: '/inventory/store-status', icon: 'pi-check-square' },
    
    // العملاء
    { titleAr: 'إضافة عميل جديد', aliasesAr: 'إضافة عميل', titleEn: 'Add Customer', route: '/accounting/customer-profile/new', icon: 'pi-user-plus' },
    { titleAr: 'ملفات العملاء', aliasesAr: 'العملاء', titleEn: 'Customer Profile', route: '/accounting/customer-profile', icon: 'pi-users' },
    { titleAr: 'العملاء فرونتال', titleEn: 'Frontal Customer Profile', route: '/accounting/frontal-customer-profile', icon: 'pi-users' },
    { titleAr: 'كشف حساب العملاء', aliasesAr: 'كشف حساب العميل', titleEn: 'Customer Account Statement', route: '/accounting/customer-account-statement', icon: 'pi-file-pdf' },
    { titleAr: 'كشف حساب مختصر للعملاء', aliasesAr: 'كشف حساب العملاء مختصر', titleEn: 'Customer Summary Account Statement', route: '/accounting/customer-summary-account-statement', icon: 'pi-file-excel' },
    
    // الموردين
    { titleAr: 'إضافة مورد جديد', aliasesAr: 'إضافة مورد', titleEn: 'Add Supplier', route: '/inventory/supplier-details/new', icon: 'pi-user-plus' },
    { titleAr: 'ملفات الموردين', aliasesAr: 'الموردين', titleEn: 'Supplier Details', route: '/inventory/supplier-details', icon: 'pi-users' },
    { titleAr: 'الموردين فرونتال', titleEn: 'Frontal Supplier Details', route: '/inventory/frontal-supplier-details', icon: 'pi-users' },
    { titleAr: 'حالة المورد', titleEn: 'Supplier Status', route: '/inventory/supplier-status', icon: 'pi-info' },
    { titleAr: 'كشف حساب الموردين', aliasesAr: 'كشف حساب المورد', titleEn: 'Supplier Account Statement', route: '/accounting/supplier-account-statement', icon: 'pi-file-pdf' },
    { titleAr: 'كشف حساب مختصر للموردين', aliasesAr: 'كشف حساب الموردين مختصر', titleEn: 'Supplier Summary Account Statement', route: '/accounting/supplier-summary-account-statement', icon: 'pi-file-excel' },
    
    // الحسابات العامة
    { titleAr: 'قيود اليومية', aliasesAr: 'اليومية', titleEn: 'Journal Transactions', route: '/accounting/journal-transactions', icon: 'pi-book' },
    { titleAr: 'قيود اليومية فرونتال', titleEn: 'Frontal Journal Transactions', route: '/accounting/frontal-journal-transactions', icon: 'pi-book' },
    { titleAr: 'مراكز التكلفة', titleEn: 'Expenses Centers', route: '/expensescenters', icon: 'pi-compass' },
    { titleAr: 'شجرة الحسابات', aliasesAr: 'شجرة الحسابات العامة', titleEn: 'Accounts Tree', route: '/accounting/accounts', icon: 'pi-sitemap' },
    
    // المالية
    { titleAr: 'الفترات المالية', titleEn: 'Finance Periods', route: '/finance-periods', icon: 'pi-calendar' },
    { titleAr: 'الخزائن', aliasesAr: 'الخزائن', titleEn: 'Treasuries', route: '/treasuries', icon: 'pi-wallet' },
    { titleAr: 'البنوك', aliasesAr: 'البنوك الحسابات البنكية', titleEn: 'Banks', route: '/bank-accounts', icon: 'pi-building' },
    { titleAr: 'الخزائن فرونتال', titleEn: 'Frontal Treasuries', route: '/frontal-treasuries', icon: 'pi-wallet' },
    { titleAr: 'البنوك فرونتال', titleEn: 'Frontal Banks', route: '/frontal-bank-accounts', icon: 'pi-building' },
    { titleAr: 'إضافة خزينة', titleEn: 'Add Treasury', route: '/treasuries/new', icon: 'pi-plus-circle' },
    { titleAr: 'إضافة حساب بنكي', titleEn: 'Add Bank Account', route: '/bank-accounts/new', icon: 'pi-plus-circle' },
    { titleAr: 'سند صرف', aliasesAr: 'سندات الصرف', titleEn: 'Payment Receipts', route: '/receipts/payment-receipts', icon: 'pi-upload' },
    { titleAr: 'سند صرف فرونتال', titleEn: 'Frontal Payment Receipts', route: '/receipts/frontal-payment-receipts', icon: 'pi-upload' },
    { titleAr: 'سند قبض', aliasesAr: 'سندات القبض', titleEn: 'Paycheck Receipts', route: '/receipts/paycheck-receipts', icon: 'pi-download' },
    { titleAr: 'سند قبض فرونتال', titleEn: 'Frontal Paycheck Receipts', route: '/receipts/frontal-paycheck-receipts', icon: 'pi-download' },
    
    // إدارة المشاريع
    { titleAr: 'إضافة مشروع جديد', aliasesAr: 'إضافة مشروع', titleEn: 'Add Project', route: '/projects/new', icon: 'pi-folder-plus' },
    { titleAr: 'المشاريع', aliasesAr: 'إدارة المشاريع', titleEn: 'Projects', route: '/projects', icon: 'pi-briefcase' },
    { titleAr: 'المشاريع المؤرشفة', aliasesAr: 'المشاريع المؤرشفة', titleEn: 'Archived Projects', route: '/projects/archived', icon: 'pi-briefcase' },
    
    // التقارير العامة
    { titleAr: 'تقرير مخزن اجمالي', titleEn: 'Total Inventory Report', route: '/reports/inventory-report/total', icon: 'pi-chart-line' },
    { titleAr: 'تقرير مخزن تفصيلي', titleEn: 'Detailed Inventory Report', route: '/reports/inventory-report/details', icon: 'pi-list' },
    { titleAr: 'تقرير مورد على حسب الصنف', aliasesAr: 'علي حسب الصنف', titleEn: 'Supplier Report by Category', route: '/reports/supplier-report/1', icon: 'pi-tags' },
    { titleAr: 'تقرير مورد على حسب الفاتورة', aliasesAr: 'علي حسب الفاتورة', titleEn: 'Supplier Report by Receipt', route: '/reports/supplier-report/2', icon: 'pi-receipt' },
    { titleAr: 'تقرير مورد على حسب المخزن', aliasesAr: 'علي حسب المخزن', titleEn: 'Supplier Report by Stock', route: '/reports/supplier-report/3', icon: 'pi-home' },
    
    // تقارير القيمة المضافة - VAT
    { titleAr: 'تقرير القيمة المضافة المستحقة', aliasesAr: 'القيمة المضافة المستحقة', titleEn: 'Net Due VAT Report', route: '/reports/net-due-vat-report', icon: 'pi-percent' },
    { titleAr: 'صافي القيمة المضافة للمبيعات', aliasesAr: 'تقرير القيمة المضافة للمبيعات صافي', titleEn: 'Net Sales VAT Report', route: '/reports/net-sales-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة للمبيعات', aliasesAr: 'تقرير القيمة المضافة للمبيعات', titleEn: 'Sales VAT Report', route: '/reports/sales-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة لأصناف المبيعات', aliasesAr: 'تقرير القيمة المضافة للاصناف', titleEn: 'Sales Items VAT Report', route: '/reports/sales-vat-total-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة لمرتجعات المبيعات', aliasesAr: 'القيمة المضافة للمرتجعات', titleEn: 'Sales Credit Note VAT Report', route: '/reports/sales-credit-note-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة للمبيعات المختصر', aliasesAr: 'القيمة المضافة للمبيعات مختصر', titleEn: 'Sales VAT Summary Report', route: '/reports/sales-vat-summary-report', icon: 'pi-percent' },
    { titleAr: 'صافي القيمة المضافة للمشتريات', aliasesAr: 'تقرير القيمة المضافة للمشتريات صافي', titleEn: 'Net Purchase VAT Report', route: '/reports/net-purchase-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة للمشتريات', aliasesAr: 'تقرير القيمة المضافة للمشتريات', titleEn: 'Purchase VAT Report', route: '/reports/purchase-vat-total-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة لأصناف المشتريات', aliasesAr: 'القيمة المضافة لاصناف المشتريات', titleEn: 'Purchase Items VAT Report', route: '/reports/purchase-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة لمرتجعات المشتريات', aliasesAr: 'القيمة المضافة لمرتجعات المشتريات', titleEn: 'Purchase Return VAT Report', route: '/reports/purchase-return-vat-report', icon: 'pi-percent' },
    { titleAr: 'القيمة المضافة للمشتريات المختصر', aliasesAr: 'القيمة المضافة للمشتريات مختصر', titleEn: 'Purchase VAT Summary Report', route: '/reports/purchase-vat-summary-report', icon: 'pi-percent' },
    
    // تقارير الحسابات / التقارير المالية
    { titleAr: 'ميزان المراجعة', titleEn: 'Trial Balance', route: '/accounting/review-balance', icon: 'pi-chart-bar' },
    { titleAr: 'حساب الارباح والخسائر', aliasesAr: 'الأرباح والخسائر', titleEn: 'Profit & Loss Account', route: '/accounting/profit-loss-account', icon: 'pi-calculator' },
    { titleAr: 'حساب الميزانية', aliasesAr: 'الميزانية العمومية الميزانية', titleEn: 'Budget Assessment', route: '/accounting/budget-assessment', icon: 'pi-money-bill' },
    { titleAr: 'كشف حساب', aliasesAr: 'كشف حساب تفصيلي كشف الحساب', titleEn: 'Account Statement', route: '/accounting/account-statement', icon: 'pi-file-pdf' },
    { titleAr: 'كشف حساب فرونتال', titleEn: 'Frontal Account Statement', route: '/accounting/frontal-account-statement', icon: 'pi-file-pdf' },
    { titleAr: 'كشف حساب مختصر', titleEn: 'Summary Account Statement', route: '/accounting/summary-account-statement', icon: 'pi-file-excel' },
    { titleAr: 'كشف حساب مختصر فرونتال', titleEn: 'Frontal Summary Account Statement', route: '/accounting/frontal-summary-account-statement', icon: 'pi-file-excel' },
    
    // الإعدادات
    { titleAr: 'وحدة القياس', aliasesAr: 'وحدات القياس', titleEn: 'Measurement Unit', route: '/inventory/measurement-unit', icon: 'pi-tag' },
    { titleAr: 'إدارة المستخدمين', titleEn: 'User Management', route: '/user-management', icon: 'pi-users' },
    { titleAr: 'إدارة المستخدمين فرونتال', titleEn: 'Frontal User Management', route: '/frontal-user-management', icon: 'pi-users' },
    { titleAr: 'إدارة الأدوار', aliasesAr: 'إدارة الصلاحيات', titleEn: 'Roles Management', route: '/roles-management', icon: 'pi-key' },
    { titleAr: 'إدارة الأدوار فرونتال', aliasesAr: 'إدارة الصلاحيات فرونتال', titleEn: 'Frontal Roles Management', route: '/frontal-roles-management', icon: 'pi-key' },
    { titleAr: 'تفاصيل الشركة', aliasesAr: 'بيانات الشركة', titleEn: 'Company Details', route: '/company-details', icon: 'pi-info-circle' },
    { titleAr: 'إعدادات النظام', aliasesAr: 'إعدادات النظام العامة', titleEn: 'System Settings', route: '/system-setting', icon: 'pi-cog' },
    { titleAr: 'اشعارات النظام', aliasesAr: 'إشعارات النظام', titleEn: 'System Notifications', route: '/system-notifications', icon: 'pi-bell' },
    { titleAr: 'إعدادات قوالب PDF', titleEn: 'PDF Template Settings', route: '/pdf-template-configurator', icon: 'pi-file' },
    { titleAr: 'إعدادات قوالب طباعة الحجوزات', aliasesAr: 'قوالب طباعة الحجوزات', titleEn: 'Reservation Print Template Settings', route: '/reservation-print-table-template', icon: 'pi-print' }
  ];

  onSearchInput(event: any): void {
    const keyword = this.searchQuery.trim().toLowerCase();
    if (!keyword) {
      this.filteredPages = [];
      return;
    }

    const normalizedKeyword = this.normalizeArabic(keyword);

    this.filteredPages = this.pagesList.filter(page => {
      const normalizedArTitle = this.normalizeArabic(page.titleAr);
      const normalizedArAliases = this.normalizeArabic(page.aliasesAr || '');
      const titleEn = (page.titleEn || '').toLowerCase();
      const route = (page.route || '').toLowerCase();

      return (
        normalizedArTitle.includes(normalizedKeyword) ||
        normalizedArAliases.includes(normalizedKeyword) ||
        titleEn.includes(keyword) ||
        route.includes(keyword)
      );
    });
  }

  navigateToPage(route: string): void {
    this.router.navigate([route]);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredPages = [];
    this.searchActive = false;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.searchActive = false;
    }, 200);
  }
}
