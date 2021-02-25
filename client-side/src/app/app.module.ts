import { ImportAtdModule } from './import-atd/import-atd.module';
import { ExportAtdModule } from './export-atd/export-atd.module';
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { PepUIModule } from "./modules/pepperi.module";
import { MaterialModule } from "./modules/material.module";

@NgModule({
    declarations: [AppComponent,

    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        PepUIModule,
        MaterialModule,
        ExportAtdModule,
        ImportAtdModule
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
