import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../modules/material.module';
import { PepUIModule } from '../modules/pepperi.module';
import { ImportAtdComponent } from './index';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { PepFileService, PepAddonService } from '@pepperi-addons/ngx-lib';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

// export function createTranslateLoader(
//     http: HttpClient,
//     fileService: PepFileService,
//     addonService: PepAddonService
// ) {
//     let addonStaticFolder = addonService.getAddonStaticFolder();
//     addonStaticFolder =
//         window.location.href.includes("localhost") ||
//         addonStaticFolder.includes("localhost")
//             ? ""
//             : addonStaticFolder;
//     const translationsPath: string = fileService.getAssetsTranslationsPath();
//     const translationsSuffix: string = fileService.getAssetsTranslationsSuffix();

//     return new MultiTranslateHttpLoader(http, [
//         {
//             prefix:
//                 addonStaticFolder.length > 0
//                     ? addonStaticFolder
//                     : translationsPath,
//             suffix: translationsSuffix,
//         },
//         {
//             prefix:
//                 addonStaticFolder.length > 0
//                     ? addonStaticFolder
//                     : "/assets/i18n/",
//             suffix: ".json",
//         },
//     ]);
// }

@NgModule({
  declarations: [ImportAtdComponent],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    // TranslateModule.forRoot({
    //     loader: {
    //         provide: TranslateLoader,
    //         useFactory: createTranslateLoader,
    //         deps: [HttpClient, PepFileService, PepAddonService],
    //     },
    // })
    PepUIModule,
    MaterialModule,
  ],
  exports: [ImportAtdComponent]
})
export class ImportAtdModule { }
