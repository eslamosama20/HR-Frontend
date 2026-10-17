import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HotelService } from 'src/app/services/hotels/hotel.service';
import { RoomTypeService } from 'src/app/services/room-type/room-type.service';

import { CustomDatePipe } from '../../pipes/custom-date.pipe';
@Component({
  selector: 'app-channel-manager',
  standalone: true,
  imports: [CustomDatePipe, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './channel-manager.component.html',
  styleUrl: './channel-manager.component.scss'
})
export class ChannelManagerComponent implements OnInit {
  // Lists
  erpHotels: any[] = [];
  erpRoomTypes: any[] = [];
  erpSeasons: any[] = [];

  // Selection
  selectedHotelId: string = '';
  connection: any = null;

  // Form bindings
  providerName: string = 'Channex';
  apiKey: string = '';
  webhookSecret: string = '';
  channelPropertyId: string = '';
  apiEndpoint: string = 'https://api.channex.io/api/v1';

  // Mappings
  roomMappings: any[] = [];
  rateMappings: any[] = [];

  // Logs & DLQ
  logs: any[] = [];
  deadLetters: any[] = [];

  // UI state
  activeTab: 'settings' | 'rooms' | 'rates' | 'logs' | 'dlq' = 'settings';
  loading = false;
  syncing = false;
  message = '';
  isError = false;

  private apiUrl = 'http://localhost:5001/api/integrations/channel-manager';

  constructor(
    private hotelService: HotelService,
    private roomTypeService: RoomTypeService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading = true;

    // Fetch hotels
    this.hotelService.getAll().subscribe({
      next: (res: any) => {
        this.erpHotels = res?.data || res || [];
        if (this.erpHotels.length > 0) {
          this.selectedHotelId = this.erpHotels[0].id;
          this.onHotelChange();
        }
      },
      error: (err) => console.error('Error loading hotels:', err)
    });

    // Fetch room types
    this.roomTypeService.getAll().subscribe({
      next: (res: any) => {
        this.erpRoomTypes = res?.data || res || [];
      },
      error: (err) => console.error('Error loading room types:', err)
    });

    // Fetch seasons
    this.http.get('http://localhost:5001/api/v1/ReservationSeason').subscribe({
      next: (res: any) => {
        this.erpSeasons = res?.data || res || [];
      },
      error: () => {
        // Fallback: fetch seasons from direct query or use mock list if endpoint varies
        this.http.get('http://localhost:5001/api/integrations/salla/seasons').subscribe({
          next: (res: any) => this.erpSeasons = res?.data || res || [],
          error: () => {
            this.erpSeasons = [
              { id: '6282bf68-981f-4045-e954-08ddaef0098b', englishName: 'Hajj Season', arabicName: 'موسم الحج' },
              { id: 'c970ac1d-33be-4ddd-e955-08ddaef0098b', englishName: 'Ramadan Season', arabicName: 'موسم العمرة' }
            ];
          }
        });
      }
    });
  }

  onHotelChange(): void {
    if (!this.selectedHotelId) return;
    this.loading = true;
    this.connection = null;
    this.roomMappings = [];
    this.rateMappings = [];

    // Fetch connection info for this hotel
    this.http.get(`${this.apiUrl}/connections`).subscribe({
      next: (connections: any) => {
        const conn = connections.find((c: any) => c.hotelId === this.selectedHotelId);
        if (conn) {
          this.connection = conn;
          this.providerName = conn.providerName;
          this.apiKey = conn.apiKey;
          this.webhookSecret = conn.webhookSecret;
          this.channelPropertyId = conn.channelPropertyId;
          this.apiEndpoint = conn.apiEndpoint;
          this.loadMappings(conn.id);
          this.loadLogsAndErrors();
        } else {
          // Reset form fields
          this.apiKey = '';
          this.webhookSecret = '';
          this.channelPropertyId = '';
          this.apiEndpoint = 'https://api.channex.io/api/v1';
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Error loading connections:', err);
        this.loading = false;
      }
    });
  }

  loadMappings(connectionId: string): void {
    // Load Room Mappings
    this.http.get(`${this.apiUrl}/room-mappings?connectionId=${connectionId}`).subscribe({
      next: (mappings: any) => {
        // Map all current room types, populating existing mappings
        this.roomMappings = this.erpRoomTypes.map(rt => {
          const matched = mappings.find((m: any) => m.erpRoomTypeId === rt.id);
          return {
            erpRoomTypeId: rt.id,
            erpRoomName: rt.arabicName || rt.englishName,
            channelRoomId: matched ? matched.channelRoomId : '',
            roomName: matched ? matched.roomName : '',
            maxAllocationOverride: matched ? matched.maxAllocationOverride : null
          };
        });
      }
    });

    // Load Rate Mappings
    this.http.get(`${this.apiUrl}/rate-mappings?connectionId=${connectionId}`).subscribe({
      next: (mappings: any) => {
        this.rateMappings = this.erpSeasons.map(s => {
          const matched = mappings.find((m: any) => m.erpSeasonId === s.id);
          return {
            erpSeasonId: s.id,
            erpSeasonName: s.arabicName || s.englishName,
            channelRateId: matched ? matched.channelRateId : '',
            rateName: matched ? matched.rateName : '',
            markupPercentage: matched ? matched.markupPercentage : 0
          };
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadLogsAndErrors(): void {
    if (!this.selectedHotelId) return;

    this.http.get(`${this.apiUrl}/logs?hotelId=${this.selectedHotelId}`).subscribe({
      next: (res: any) => this.logs = res || []
    });

    this.http.get(`${this.apiUrl}/dead-letters?hotelId=${this.selectedHotelId}`).subscribe({
      next: (res: any) => this.deadLetters = res || []
    });
  }

  saveConnection(): void {
    if (!this.selectedHotelId) return;
    this.loading = true;
    this.showStatus('جاري حفظ الإعدادات...', false);

    const payload = {
      hotelId: this.selectedHotelId,
      providerName: this.providerName,
      apiKey: this.apiKey,
      webhookSecret: this.webhookSecret,
      channelPropertyId: this.channelPropertyId,
      apiEndpoint: this.apiEndpoint
    };

    this.http.post(`${this.apiUrl}/connections`, payload).subscribe({
      next: (res: any) => {
        this.connection = res;
        this.showStatus('تم حفظ إعدادات الاتصال بنجاح.', false);
        this.loadMappings(res.id);
        this.loadLogsAndErrors();
      },
      error: (err) => {
        console.error(err);
        this.showStatus('حدث خطأ أثناء حفظ الإعدادات.', true);
        this.loading = false;
      }
    });
  }

  saveRoomMappings(): void {
    if (!this.connection) return;
    this.loading = true;
    this.showStatus('جاري حفظ ربط الغرف...', false);

    const activeMappings = this.roomMappings
      .filter(m => m.channelRoomId.trim() !== '')
      .map(m => ({
        erpRoomTypeId: m.erpRoomTypeId,
        channelRoomId: m.channelRoomId,
        roomName: m.roomName || m.erpRoomName,
        maxAllocationOverride: m.maxAllocationOverride
      }));

    const payload = {
      channelConnectionId: this.connection.id,
      mappings: activeMappings
    };

    this.http.post(`${this.apiUrl}/room-mappings`, payload).subscribe({
      next: () => {
        this.showStatus('تمت مزامنة وحفظ ربط الغرف بنجاح.', false);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.showStatus('حدث خطأ أثناء حفظ ربط الغرف.', true);
        this.loading = false;
      }
    });
  }

  saveRateMappings(): void {
    if (!this.connection) return;
    this.loading = true;
    this.showStatus('جاري حفظ ربط الأسعار والمواسم...', false);

    const activeMappings = this.rateMappings
      .filter(m => m.channelRateId.trim() !== '')
      .map(m => ({
        erpSeasonId: m.erpSeasonId,
        channelRateId: m.channelRateId,
        rateName: m.rateName || m.erpSeasonName,
        markupPercentage: m.markupPercentage
      }));

    const payload = {
      channelConnectionId: this.connection.id,
      mappings: activeMappings
    };

    this.http.post(`${this.apiUrl}/rate-mappings`, payload).subscribe({
      next: () => {
        this.showStatus('تم حفظ خطط الأسعار والنسب بنجاح.', false);
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.showStatus('حدث خطأ أثناء حفظ ربط الأسعار.', true);
        this.loading = false;
      }
    });
  }

  triggerSyncAvailability(): void {
    if (!this.selectedHotelId) return;
    this.syncing = true;
    this.showStatus('جاري دفع ومزامنة الغرف المتاحة مع مدير القنوات...', false);

    this.http.post(`${this.apiUrl}/sync-availability?hotelId=${this.selectedHotelId}`, {}).subscribe({
      next: (res: any) => {
        this.showStatus(res.message || 'تمت جدولة مزامنة الغرف المتاحة بنجاح.', false);
        this.syncing = false;
        setTimeout(() => this.loadLogsAndErrors(), 3000);
      },
      error: (err) => {
        console.error(err);
        this.showStatus('فشل بدء مزامنة الغرف المتاحة.', true);
        this.syncing = false;
      }
    });
  }

  triggerSyncRates(): void {
    if (!this.selectedHotelId) return;
    this.syncing = true;
    this.showStatus('جاري دفع الأسعار الحالية ونسب الأرباح لمدير القنوات...', false);

    this.http.post(`${this.apiUrl}/sync-rates?hotelId=${this.selectedHotelId}`, {}).subscribe({
      next: (res: any) => {
        this.showStatus(res.message || 'تمت جدولة مزامنة الأسعار بنجاح.', false);
        this.syncing = false;
        setTimeout(() => this.loadLogsAndErrors(), 3000);
      },
      error: (err) => {
        console.error(err);
        this.showStatus('فشل بدء مزامنة الأسعار.', true);
        this.syncing = false;
      }
    });
  }

  private showStatus(msg: string, err: boolean): void {
    this.message = msg;
    this.isError = err;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
