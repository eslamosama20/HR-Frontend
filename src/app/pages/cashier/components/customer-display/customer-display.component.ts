import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslateModule } from '@ngx-translate/core';

import { CustomDatePipe } from '../../../../pipes/custom-date.pipe';
export interface CustomerDisplayCart {
    items: { name: string; qty: number; price: number; total: number }[];
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paidAmount?: number;
    change?: number;
    isComplete?: boolean;
}

@Component({
    selector: 'app-customer-display',
    standalone: true,
    imports: [CustomDatePipe, CommonModule, FormsModule, RouterModule, ButtonModule, ToastModule, CheckboxModule, TranslateModule],
    providers: [MessageService],
    templateUrl: './customer-display.component.html',
    styleUrls: ['./customer-display.component.scss']
})
export class CustomerDisplayComponent implements OnInit, OnDestroy {
    currentTime = signal<Date>(new Date());
    private clockInterval?: ReturnType<typeof setInterval>;

    // This simulates what the POS screen is broadcasting
    cartData = signal<CustomerDisplayCart>({
        items: [
            { name: 'CUSTOMER_DISPLAY.PRODUCT_HP_LAPTOP', qty: 1, price: 3500, total: 3500 },
            { name: 'CUSTOMER_DISPLAY.PRODUCT_WIRELESS_MOUSE', qty: 2, price: 85, total: 170 },
            { name: 'CUSTOMER_DISPLAY.PRODUCT_MECH_KEYBOARD', qty: 1, price: 250, total: 250 }
        ],
        subtotal: 3920,
        discount: 0,
        tax: 588,
        total: 4508,
        isComplete: false
    });

    storeInfo = {
        name: 'Smart & Pro Store',
        nameAr: 'متجر سمارت آند برو',
        tagline: 'نخدمكم بكل فخر واعتزاز',
        logo: '🛒'
    };

    promotions = [
        { key: 'CUSTOMER_DISPLAY.PROMO_1', color: '#1174cf' },
        { key: 'CUSTOMER_DISPLAY.PROMO_2', color: '#0b9e7a' },
        { key: 'CUSTOMER_DISPLAY.PROMO_3', color: '#d48b11' },
        { key: 'CUSTOMER_DISPLAY.PROMO_4', color: '#9c27b0' }
    ];

    currentPromoIndex = signal<number>(0);
    private promoInterval?: ReturnType<typeof setInterval>;

    ngOnInit(): void {
        this.clockInterval = setInterval(() => {
            this.currentTime.set(new Date());
        }, 1000);

        this.promoInterval = setInterval(() => {
            this.currentPromoIndex.update(i => (i + 1) % this.promotions.length);
        }, 4000);
    }

    ngOnDestroy(): void {
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.promoInterval) clearInterval(this.promoInterval);
    }

    get currentPromotion() {
        return this.promotions[this.currentPromoIndex()];
    }
}
