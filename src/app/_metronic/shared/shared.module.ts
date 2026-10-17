import {NgModule} from '@angular/core';
import {KeeniconComponent} from './keenicon/keenicon.component';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {BarcodeInputComponent} from "./barcode-input/barcode-input.component";

@NgModule({
  declarations: [
    KeeniconComponent,
    BarcodeInputComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [
    KeeniconComponent,
    BarcodeInputComponent
  ]
})
export class SharedModule {
}
