import { Injectable } from "@angular/core";
import { PepDialogData } from "@pepperi-addons/ngx-lib/dialog";
import {
    PepAddonService,
    PepHttpService,
    IPepOption,
} from "@pepperi-addons/ngx-lib";
import {
    PepDialogService,
    PepDialogActionButton,
} from "@pepperi-addons/ngx-lib/dialog";
import { HttpHeaders } from "@angular/common/http";
import { AuditLog } from "@pepperi-addons/papi-sdk";
@Injectable({
    providedIn: "root",
})
export class AppService {
    constructor(
        private httpService: PepHttpService,
        private addonService: PepAddonService,
        private dialogService: PepDialogService
    ) {
        // sessionStorage.setItem("idp_token", this.idpToken);
    }

    getAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        options: any,
        isAsync: boolean
    ) {
        return this.addonService.getAddonApiCall(
            addonUUID,
            fileName,
            functionName,
            options,
            isAsync
        );
    }

    postAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        body: any,
        options: any,
        isAsync: boolean
    ) {
        var headers_object = new HttpHeaders();
        headers_object.append("Access-Control-Allow-Origin", "*");
        headers_object.append(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );

        const httpOptions = {
            headers: headers_object,
        };
        options = { ...httpOptions, ...options };
        return this.addonService.postAddonApiCall(
            addonUUID,
            fileName,
            functionName,
            body,
            options,
            isAsync
        );
    }

    openDialog(title: string, content: string, callback?: any) {
        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: callback,
        };

        const dialogData = new PepDialogData({
            title: title,
            content: content,
            actionButtons: [actionButton],
            type: "custom",
            showClose: false,
        });
        this.dialogService.openDefaultDialog(dialogData);
    }

    async getExecutionLog(executionUUID): Promise<AuditLog> {
        return await this.getPapiCall(
            `/audit_logs/${executionUUID}`
        ).toPromise();
    }

    getFromAPI(apiObject, successFunc, errorFunc) {
        //this.addonService.setShowLoading(true);
        const endpoint = apiObject.ListType === "all" ? "addons" : "updates";
        // // --- Work live in sandbox upload api.js file to plugin folder
        // const url = `/addons/api/${apiObject.UUID}/api/${endpoint}`;
        // this.addonService.httpGetApiCall(url, successFunc, errorFunc);

        //--- Work localhost
        const url = `http://localhost:4400/api/${endpoint}`;
        // this.httpService.getHttpCall(url, searchObject, { 'headers': {'Authorization': 'Bearer ' + this.addonService.getUserToken() }}).subscribe(
        //     res => successFunc(res), error => errorFunc(error), () => this.addonService.setShowLoading(false)
        // );
        this.httpService.getHttpCall("");
    }

    postToAPI(endpoint) {
        const url = `http://localhost:4400/api/${endpoint}`;
        this.post(url);
    }

    post(url: string) {
        this.httpService.postHttpCall(url, null).subscribe((result) => {});
    }

    getPapiCall(url: string) {
        return this.httpService.getPapiApiCall(url);
    }

    postPapiCall(url: string, body: any) {
        return this.httpService.postPapiApiCall(url, body);
    }

    getTypes(successFunc = null) {
        let types: IPepOption[] = [];
        this.getPapiCall("/meta_data/transactions/types").subscribe(
            (activityTypes) => {
                const data = (activityTypes || []).filter((i) => !!i);
                this.getPapiCall("/meta_data/activities/types").subscribe(
                    (transactionTypes) => {
                        (transactionTypes || []).concat(data).forEach((type) =>
                            types.push({
                                key: type.InternalID,
                                value: type.ExternalID,
                            })
                        );
                        successFunc(types);
                    }
                );
            }
        );
    }
}
