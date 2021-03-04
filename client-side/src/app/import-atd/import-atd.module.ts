import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../modules/material.module';
import { PepUIModule } from '../modules/pepperi.module';
import { ImportAtdComponent } from './index';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
@NgModule({
  declarations: [
      ImportAtdComponent
    ],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    PepUIModule,
    MaterialModule,
  ],
  exports: [ImportAtdComponent]
})
export class ImportAtdModule { }
