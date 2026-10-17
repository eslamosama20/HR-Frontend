import { Component, OnInit, OnDestroy, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RestaurantModeService } from 'src/app/services/cashier/restaurant-mode.service';
import { RestaurantOrder, RestaurantOrderStatus, OrderSource, OrderType } from 'src/app/models/cashier/restaurant-mode.model';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
@Component({
    selector: 'app-kds',
    standalone: true,
    imports: [CustomDatePipe, 
        CommonModule, FormsModule, RouterModule, TranslateModule,
        ButtonModule, TagModule, ToastModule, BadgeModule, TooltipModule
    ],
    providers: [MessageService],
    templateUrl: './kds.component.html',
    styleUrls: ['./kds.component.scss']
})
export class KdsComponent implements OnInit, OnDestroy {
    readonly orderStatus = RestaurantOrderStatus;
    readonly OrderType = OrderType;
    orders = signal<RestaurantOrder[]>([]);
    soundEnabled = signal<boolean>(true);
    screenMode = signal<'all' | 'kitchen' | 'bar'>('all');
    currentTime = signal<string>('');
    isFullscreen = signal<boolean>(false);
    checkedItems: Record<string, boolean> = {};
    private clockTimer?: ReturnType<typeof setInterval>;

    constructor(
        private translateService: TranslateService,
        private messageService: MessageService,
        private restaurantModeService: RestaurantModeService,
        private destroyRef: DestroyRef
    ) {}

    ngOnInit(): void {
        this.updateClock();
        this.clockTimer = setInterval(() => this.updateClock(), 1000);

        this.restaurantModeService.orders$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(orders => {
                this.orders.set(orders);
            });
    }

    ngOnDestroy(): void {
        if (this.clockTimer) {
            clearInterval(this.clockTimer);
        }
    }

    private updateClock(): void {
        const d = new Date();
        this.currentTime.set(d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }

    toggleItemDone(orderId: number, itemIndex: number): void {
        const key = `${orderId}_${itemIndex}`;
        this.checkedItems[key] = !this.checkedItems[key];
    }

    isItemDone(orderId: number, itemIndex: number): boolean {
        return !!this.checkedItems[`${orderId}_${itemIndex}`];
    }

    toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                this.isFullscreen.set(true);
            }).catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    this.isFullscreen.set(false);
                }).catch(() => {});
            }
        }
    }

    get totalActiveOrdersCount(): number {
        return this.newOrders.length + this.preparingOrders.length + this.readyOrders.length;
    }

    get newOrders(): RestaurantOrder[] {
        return this.modeFilteredOrders.filter(o => o.status === RestaurantOrderStatus.New);
    }

    get preparingOrders(): RestaurantOrder[] {
        return this.modeFilteredOrders.filter(o => o.status === RestaurantOrderStatus.Preparing);
    }

    get readyOrders(): RestaurantOrder[] {
        return this.modeFilteredOrders.filter(o => o.status === RestaurantOrderStatus.Ready);
    }

    updateStatus(orderId: number, newStatus: RestaurantOrderStatus): void {
        this.restaurantModeService.updateOrderStatus(orderId, newStatus);
    }

    markServed(orderId: number): void {
        this.restaurantModeService.updateOrderStatus(orderId, RestaurantOrderStatus.Served);
    }

    getElapsedMinutes(order: RestaurantOrder): number {
        const from = order.preparationStartedAt || order.createdAt;
        return Math.floor((Date.now() - from.getTime()) / 60000);
    }

    isOverdue(order: RestaurantOrder): boolean {
        const maxMins = order.preparationMinutes || 15;
        return this.getElapsedMinutes(order) > maxMins;
    }

    getSourceLabel(source: string): string {
        const map: any = {
            [OrderSource.Cashier]: this.translateService.instant('CASHIER_KDS.SOURCE_CASHIER'),
            [OrderSource.SelfService]: this.translateService.instant('CASHIER_KDS.SOURCE_SELF'),
            online: this.translateService.instant('CASHIER_KDS.SOURCE_ONLINE')
        };
        return map[source] || source;
    }

    toggleSound(): void {
        this.soundEnabled.update(v => !v);
    }

    setScreenMode(mode: 'all' | 'kitchen' | 'bar'): void {
        this.screenMode.set(mode);
    }

    clearAllOrders(): void {
        this.restaurantModeService.clearAllOrders();
        this.messageService.add({
            severity: 'info',
            summary: 'تم المسح',
            detail: 'تم مسح وتصفية جميع طلبات المطبخ بنجاح'
        });
    }

    private get modeFilteredOrders(): RestaurantOrder[] {
        const mode = this.screenMode();
        if (mode === 'all') {
            return this.orders();
        }

        if (mode === 'bar') {
            return this.orders().filter(order => this.isBarOrder(order));
        }

        return this.orders().filter(order => !this.isBarOrder(order));
    }

    private isBarOrder(order: RestaurantOrder): boolean {
        const beverageKeywords = [
            'cola', 'juice', 'water', 'tea', 'coffee', 'latte', 'mojito',
            'عصير', 'قهوة', 'شاي', 'كولا', 'ماء', 'مشروب'
        ];

        return order.items.some(item => {
            const itemName = (item.itemName || '').toLowerCase();
            return beverageKeywords.some(keyword => itemName.includes(keyword.toLowerCase()));
        });
    }
}
