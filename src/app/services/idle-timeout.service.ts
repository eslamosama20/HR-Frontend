import { Injectable, NgZone, signal } from '@angular/core';
import { AuthService } from '../modules/auth/services/auth.service';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  // Configured timeout in minutes (min: 1, max: 30, default: 20)
  private timeoutMinutes = 20;
  private readonly warningDurationSeconds = 120; // 120 seconds (2 minutes) warning before logout

  // Reactive state for UI
  readonly isWarningOpen = signal<boolean>(false);
  readonly countdownSeconds = signal<number>(120);
  readonly isExpiredDialogOpen = signal<boolean>(false);
  readonly expiredTimeoutMinutes = signal<number>(20);

  get formattedCountdown(): string {
    const totalSec = this.countdownSeconds();
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const secStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minStr}:${secStr}`;
  }

  private idleTimer: any = null;
  private countdownInterval: any = null;
  private lastActivityTimestamp = Date.now();
  private warningShownTimestamp = 0;
  private isListening = false;
  private unbindEvents: (() => void)[] = [];

  constructor(
    private authService: AuthService,
    private ngZone: NgZone,
    private messageService: MessageService,
    private translate: TranslateService
  ) {
    // Helper to preview and test the warning/expired dialogs anytime from browser console
    (window as any).testIdleDialog = () => this.triggerWarningForTesting();
    (window as any).testExpiredDialog = () => this.triggerExpiredDialogForTesting();
    (window as any).playIdleChime = () => this.playGentleChime();
  }

  /**
   * For testing and previewing the expired dialog immediately
   */
  triggerExpiredDialogForTesting(): void {
    this.expiredTimeoutMinutes.set(this.timeoutMinutes);
    this.isExpiredDialogOpen.set(true);
  }

  dismissExpiredDialog(): void {
    this.isExpiredDialogOpen.set(false);
  }

  /**
   * For testing and previewing the warning dialog immediately
   */
  triggerWarningForTesting(): void {
    this.warningShownTimestamp = Date.now();
    this.playGentleChime();
    this.ngZone.run(() => {
      this.countdownSeconds.set(this.warningDurationSeconds);
      this.isWarningOpen.set(true);

      this.clearCountdown();
      this.countdownInterval = setInterval(() => {
        const remaining = this.countdownSeconds() - 1;
        if (remaining <= 0) {
          this.clearCountdown();
          this.performAutoLogout();
        } else {
          this.countdownSeconds.set(remaining);
        }
      }, 1000);
    });
  }

  /**
   * Plays a soft, elegant two-tone notification chime via Web Audio API
   */
  playGentleChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1 (Warm gentle chime - 739.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, ctx.currentTime);
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      // Note 2 (Harmonic bell chime - 987.77 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.07, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.7);
    } catch {
      // Fail silently if browser audio is restricted
    }
  }

  /**
   * Handles direct mouse / touch interaction on the warning dialog box
   */
  onDialogInteraction(): void {
    const now = Date.now();
    if (this.isWarningOpen() && (now - this.warningShownTimestamp > 300)) {
      this.stayLoggedIn();
    }
  }

  /**
   * Initializes or updates the timeout duration from system settings (1 to 30 minutes, default 30)
   */
  setTimeoutMinutes(minutes: number): void {
    if (!minutes || isNaN(minutes)) {
      minutes = 30;
    }
    // Clamp between 1 and 30 minutes
    this.timeoutMinutes = Math.min(30, Math.max(1, minutes));
    this.expiredTimeoutMinutes.set(this.timeoutMinutes);
    this.resetTimer();
  }

  /**
   * Starts tracking user activity
   */
  startTracking(): void {
    if (this.isListening) {
      return;
    }

    this.bindActivityEvents();
    this.resetTimer();
  }

  /**
   * Stops tracking user activity
   */
  stopTracking(): void {
    this.clearAllTimers();
    this.unbindActivityEvents();
    this.isWarningOpen.set(false);
  }

  /**
   * Resets the idle timer on user activity
   */
  resetTimer(): void {
    this.lastActivityTimestamp = Date.now();

    // If warning was showing, hide it and clear countdown
    if (this.isWarningOpen()) {
      this.ngZone.run(() => {
        this.isWarningOpen.set(false);
        this.clearCountdown();
      });
    }

    this.clearIdleTimer();

    // Only set timer if user is authenticated
    if (!this.authService.getCachedToken()) {
      return;
    }

    const timeoutMs = this.timeoutMinutes * 60 * 1000;
    const warningMs = Math.max(0, timeoutMs - this.warningDurationSeconds * 1000);

    this.ngZone.runOutsideAngular(() => {
      this.idleTimer = setTimeout(() => {
        this.onIdleWarningTriggered();
      }, warningMs);
    });
  }

  /**
   * Called when warning threshold is reached (e.g. 60 seconds before logout)
   */
  private onIdleWarningTriggered(): void {
    // If not logged in anymore, do nothing
    if (!this.authService.getCachedToken()) {
      return;
    }

    this.warningShownTimestamp = Date.now();
    this.playGentleChime();
    this.ngZone.run(() => {
      this.countdownSeconds.set(this.warningDurationSeconds);
      this.isWarningOpen.set(true);

      this.clearCountdown();
      this.countdownInterval = setInterval(() => {
        const remaining = this.countdownSeconds() - 1;
        if (remaining <= 0) {
          this.clearCountdown();
          this.performAutoLogout();
        } else {
          this.countdownSeconds.set(remaining);
        }
      }, 1000);
    });
  }

  /**
   * User explicitly clicked "Stay Logged In"
   */
  stayLoggedIn(): void {
    this.resetTimer();
  }

  /**
   * User explicitly clicked "Log Out Now"
   */
  logoutNow(): void {
    this.clearAllTimers();
    this.isWarningOpen.set(false);
    this.authService.logout();
  }

  /**
   * Performs automatic logout due to inactivity
   */
  private performAutoLogout(): void {
    this.clearAllTimers();
    this.isWarningOpen.set(false);
    this.expiredTimeoutMinutes.set(this.timeoutMinutes);
    this.isExpiredDialogOpen.set(true);
    this.authService.logout();
  }

  private bindActivityEvents(): void {
    if (typeof window === 'undefined') return;

    this.isListening = true;
    const eventNames = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const throttleMs = 2000; // Throttle activity checks to once every 2 seconds

    this.ngZone.runOutsideAngular(() => {
      const handler = (event: Event) => {
        const now = Date.now();
        // When warning dialog is open, any user activity (mouse move, keypress, touch, scroll)
        // after 300ms immediately dismisses the warning and renews the session!
        if (this.isWarningOpen()) {
          if (now - this.warningShownTimestamp > 300) {
            this.ngZone.run(() => {
              this.stayLoggedIn();
            });
          }
          return;
        }

        if (now - this.lastActivityTimestamp >= throttleMs) {
          this.resetTimer();
        }
      };

      eventNames.forEach(evt => {
        window.addEventListener(evt, handler, { passive: true });
        this.unbindEvents.push(() => window.removeEventListener(evt, handler));
      });
    });
  }

  private unbindActivityEvents(): void {
    this.unbindEvents.forEach(unbind => unbind());
    this.unbindEvents = [];
    this.isListening = false;
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private clearAllTimers(): void {
    this.clearIdleTimer();
    this.clearCountdown();
  }
}
