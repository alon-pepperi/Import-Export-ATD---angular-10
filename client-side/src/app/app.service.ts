import { Injectable } from "@angular/core";
import { PepDialogData } from "@pepperi-addons/ngx-lib/dialog";
import {
    PepAddonService,
    PepHttpService,
    IPepOption,
    PepSessionService,
} from "@pepperi-addons/ngx-lib";
import {
    PepDialogService,
    PepDialogActionButton,
} from "@pepperi-addons/ngx-lib/dialog";
import { HttpHeaders } from "@angular/common/http";
import { AuditLog, PapiClient } from 'papi-sdk-web';
import jwt from 'jwt-decode';
@Injectable({
    providedIn: "root",
})
export class AppService {
    accessToken = "";
    parsedToken: any;
    papiBaseURL = "";
    pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;

    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.sessionService.getIdpToken(),
            addonUUID: this.pluginUUID,
            suppressLogging:true
        })
    }
    constructor(
        // private httpService: PepHttpService,
        private addonService: PepAddonService,
        private sessionService: PepSessionService,
        private dialogService: PepDialogService
    ) {
        const accessToken = this.sessionService.getIdpToken();
        this.parsedToken = jwt(accessToken);
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"]
        // sessionStorage.setItem("idp_token", this.idpToken);
    }

    async getAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        options: any,
        isAsync: boolean
    ) {

        const exportAtdResult = await  this.papiClient.addons.api
        .uuid(this.pluginUUID)
        .file(fileName)
        .func(functionName)
        .get(options.params)

        return exportAtdResult;

        // return this.addonService.getAddonApiCall(
        //     addonUUID,
        //     fileName,
        //     functionName,
        //     options,
        //     isAsync
        // );
    }

    async postAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        body: any,
        options: any,
        isAsync: boolean
    ) {
        // var headers_object = new HttpHeaders();
        // headers_object.append("Access-Control-Allow-Origin", "*");
        // headers_object.append(
        //     "Access-Control-Allow-Headers",
        //     "Origin, X-Requested-With, Content-Type, Accept"
        // );

        // const httpOptions = {
        //     headers: headers_object,
        // };
        // options = { ...httpOptions, ...options };

        const exportAtdResult = await  this.papiClient.addons.api
        .uuid(this.pluginUUID)
        .file(fileName)
        .func(functionName)
        .post(options.params, body)

        return exportAtdResult;
        // return this.addonService.postAddonApiCall(
        //     addonUUID,
        //     fileName,
        //     functionName,
        //     body,
        //     options,
        //     isAsync
        // );
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
        );
    }

    getFromAPI(apiObject, successFunc, errorFunc) {
        //this.addonService.setShowLoading(true);
        // const endpoint = apiObject.ListType === "all" ? "addons" : "updates";
        // // --- Work live in sandbox upload api.js file to plugin folder
        // const url = `/addons/api/${apiObject.UUID}/api/${endpoint}`;
        // this.addonService.httpGetApiCall(url, successFunc, errorFunc);

        //--- Work localhost
        // const url = `http://localhost:4400/api/${endpoint}`;
        // this.httpService.getHttpCall(url, searchObject, { 'headers': {'Authorization': 'Bearer ' + this.addonService.getUserToken() }}).subscribe(
        //     res => successFunc(res), error => errorFunc(error), () => this.addonService.setShowLoading(false)
        // );
        // this.httpService.getHttpCall("");
    }

    // postToAPI(endpoint) {
    //     const url = `http://localhost:4400/api/${endpoint}`;
    //     this.post(url);
    // }

    // post(url: string) {
    //     this.httpService.postHttpCall(url, null).subscribe((result) => {});
    // }

    getPapiCall(url: string) {
        // return this.httpService.getPapiApiCall(url);
        return this.papiClient.get(url);
    }

    postPapiCall(url: string, body: any) {
        // return this.httpService.postPapiApiCall(url, body);
        return this.papiClient.post(url, body);
    }

    getTypes(successFunc = null) {
        let types: IPepOption[] = [];
        this.getPapiCall("/meta_data/transactions/types").then(
            (activityTypes) => {
                const data = (activityTypes || []).filter((i) => !!i);
                this.getPapiCall("/meta_data/activities/types").then(
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
