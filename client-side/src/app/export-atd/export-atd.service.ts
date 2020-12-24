import { Injectable } from "@angular/core";
//@ts-ignore
import { PepAddonService } from "pepperi-addon-service";
import { PapiClient } from "@pepperi-addons/papi-sdk";
import { PepHttpService, PepSessionService } from "@pepperi-addons/ngx-lib";

import { KeyValuePair } from "../../../../models/KeyValuePair";
import { AppService } from "../app.service";

@Injectable({
    providedIn: "root",
})
export class ExportAtdService {
    accessToken = "";
    parsedToken: any;
    papiBaseURL = "";
    pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;

    constructor(
        private httpService: PepHttpService,
        private sessionService: PepSessionService,
        private appService: AppService
    ) {}

    ngOnInit(): void {}

    getTypeOfSubType(subtypeid: string) {
        return this.appService.getPapiCall(`/types/${subtypeid}`);
    }

    callToExportATDAPI(type: string, subtypeid: string): any {
        const params = { type: type, subtype: subtypeid };
        const exportAtdResult = this.appService.getAddonServerAPI(
            this.pluginUUID,
            "api",
            "export_type_definition",
            { params: params }
        );
        return exportAtdResult;
    }
}
