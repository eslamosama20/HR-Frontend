import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HotelDialogService {
  private openDialogSubject = new Subject<void>();

  /** HotelsComponent subscribes to this */
  openDialog$ = this.openDialogSubject.asObservable();

  /** Sidebar calls this to trigger the add-hotel modal */
  triggerOpenDialog(): void {
    this.openDialogSubject.next();
  }
}
