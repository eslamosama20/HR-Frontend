import { NgModule } from '@angular/core';
import { CustomDatePipe } from '../../../pipes/custom-date.pipe';

import { SalesCreditNotesRoutingModule } from './sales-credit-notes-routing.module';
import { SalesCreditNoteDetailsComponent } from './sales-credit-note-details/sales-credit-note-details.component';
import {SalesCreditNoteListComponent} from "./sales-credit-note-list/sales-credit-note-list.component";


@NgModule({
  declarations: [],
  imports: [CustomDatePipe, 
    SalesCreditNotesRoutingModule,
    SalesCreditNoteListComponent,
    SalesCreditNoteDetailsComponent,
  ]
})
export class SalesCreditNotesModule { }
