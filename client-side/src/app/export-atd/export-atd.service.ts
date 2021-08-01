import { Injectable } from "@angular/core";
//@ts-ignore
import { PepAddonService } from "pepperi-addon-service";

import { PepHttpService, PepSessionService } from "@pepperi-addons/ngx-lib";

import { AppService } from "../app.service";
import { Observable } from "rxjs";
import { promises } from "dns";


@Injectable({
    providedIn: "root",
})
export class ExportAtdService {

    pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;



    constructor(
        private appService: AppService
    ) {

    }

    ngOnInit(): void {}

    getTypeOfSubType(subtypeid: string) {
        return this.appService.getPapiCall(`/types/${subtypeid}`);
    }

    callToExportATDAPI(type: string, subtypeid: string): Promise<any> {
        const params = { type: type, subtype: subtypeid };
        return this.appService
            .getAddonServerAPI(
                this.pluginUUID,
                "api",
                "export_type_definition",
                { params: params },
                true
            );
    }
}
