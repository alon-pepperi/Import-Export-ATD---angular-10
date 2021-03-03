import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImportAtdModule } from './import-atd/index';
import { ExportAtdModule } from './export-atd/index';
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { PepUIModule } from "./modules/pepperi.module";
import { MaterialModule } from "./modules/material.module";
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, 'http://localhost:3010/assets/i18n/', '.json');
}
@NgModule({
    declarations: [AppComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        ExportAtdModule,
        ImportAtdModule,
        PepUIModule,
        MaterialModule,
        TranslateModule.forRoot({
            loader: {
              provide: TranslateLoader,
              useFactory: (createTranslateLoader),
              deps: [HttpClient]
            }
          })
    ],
    providers: [TranslateService],
    bootstrap: [AppComponent],
})
export class AppModule {}
