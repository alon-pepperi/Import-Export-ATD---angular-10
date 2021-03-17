import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepUIModule } from "../modules/pepperi.module";
import { MaterialModule } from "../modules/material.module";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExportAtdComponent } from './export-atd.component';
@NgModule({
  declarations: [ExportAtdComponent],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    PepUIModule,
    MaterialModule,
  ],
  exports: [ExportAtdComponent]
})
export class ExportAtdModule { }
