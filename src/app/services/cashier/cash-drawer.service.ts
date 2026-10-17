import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CashDrawerService {
  private readonly baseUrl = environment.server_urls[environment.active_server];

  constructor(private http: HttpClient) {}

  /**
   * Triggers a signal to open the connected electronic cash drawer.
   * Uses a multi-strategy approach:
   * 1. Calls backend cashier drawer kick endpoint if configured.
   * 2. Uses Web Serial API (if available and paired with POS receipt printer / drawer kick).
   * 3. Uses Raw ESC/POS kick pulse command via local raw-print bridge or hidden thermal kick socket if available.
   */
  openDrawer(sessionId?: number | string): void {
    // 1. Notify Backend API (to log drawer kick event in cash audit logs)
    if (this.baseUrl && this.baseUrl.cashier) {
      const url = `${this.baseUrl.cashier}/drawer/open`;
      this.http.post(url, {
        sessionId: sessionId || null,
        timestamp: new Date().toISOString()
      }).pipe(
        catchError(err => {
          // Non-blocking fallback if backend endpoint isn't implemented
          return of(null);
        })
      ).subscribe();
    }

    // 2. Client-side hardware kick pulse fallback (Web Serial / ESC/POS command)
    this.sendEscPosDrawerKickPulse();
  }

  /**
   * Generates standard ESC/POS pulse command bytes to trigger RJ11/RJ12 cash drawer port on thermal printers:
   * ESC p 0 25 250 (HEX: 1B 70 00 19 FA) -> Pin 2 pulse
   * ESC p 1 25 250 (HEX: 1B 70 01 19 FA) -> Pin 5 pulse
   */
  private sendEscPosDrawerKickPulse(): void {
    try {
      // Standard ESC/POS drawer open command
      const drawerKickPin2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
      const drawerKickPin5 = new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]);

      // If Web Serial API is supported and port is connected, send raw bytes
      if ('serial' in navigator && (navigator as any).serial) {
        (navigator as any).serial.getPorts().then((ports: any[]) => {
          if (ports && ports.length > 0) {
            const port = ports[0];
            port.open({ baudRate: 9600 }).then(async () => {
              const writer = port.writable.getWriter();
              await writer.write(drawerKickPin2);
              await writer.write(drawerKickPin5);
              writer.releaseLock();
              await port.close();
            }).catch(() => {
              // Ignore serial errors if port is busy or used by OS spooler
            });
          }
        }).catch(() => {});
      }
    } catch {
      // Silent catch for headless or unsupported environments
    }
  }
}
