import { Injectable } from "@angular/core";
import { PepDialogData } from "@pepperi-addons/ngx-lib/dialog";
import {
    AddonService,
    HttpService,
    KeyValuePair,
} from "@pepperi-addons/ngx-lib";
import {
    DialogService,
    PepDialogActionButton,
} from "@pepperi-addons/ngx-lib/dialog";
@Injectable({
    providedIn: "root",
})
export class AppService {
    //idpToken ="eyJhbGciOiJSUzI1NiIsImtpZCI6IjRiYTFjNzJmMTI3NThjYzEzMzg3ZWQ3YTBiZjNlODg3IiwidHlwIjoiSldUIn0.eyJuYmYiOjE2MDU3MTExMjksImV4cCI6MTYwNTcxNDcyOSwiaXNzIjoiaHR0cHM6Ly9pZHAuc2FuZGJveC5wZXBwZXJpLmNvbSIsImF1ZCI6WyJodHRwczovL2lkcC5zYW5kYm94LnBlcHBlcmkuY29tL3Jlc291cmNlcyIsInBlcHBlcmkuYXBpbnQiXSwiY2xpZW50X2lkIjoiaW9zLmNvbS53cm50eS5wZXBwZXJ5Iiwic3ViIjoiN2ZlMzEzN2MtMDFkOC00MWYyLTk4MTEtOWVjMzdkNzhjNzkzIiwiYXV0aF90aW1lIjoxNjA1NzExMTI5LCJpZHAiOiJsb2NhbCIsInBlcHBlcmkuYXBpbnRiYXNldXJsIjoiaHR0cHM6Ly9yZXN0YXBpLnNhbmRib3gucGVwcGVyaS5jb20iLCJlbWFpbCI6ImlkbzFAaWRvLmNvbSIsInBlcHBlcmkuaWQiOjI0OTQ5LCJwZXBwZXJpLnVzZXJ1dWlkIjoiN2ZlMzEzN2MtMDFkOC00MWYyLTk4MTEtOWVjMzdkNzhjNzkzIiwicGVwcGVyaS5kaXN0cmlidXRvcnV1aWQiOiI4NTEzYjgxNS00NDg3LTRmMTYtOTdlZi0yMDYyZDhkYmRlMzQiLCJwZXBwZXJpLmRpc3RyaWJ1dG9yaWQiOjExMTA3MDMsInBlcHBlcmkuZGF0YWNlbnRlciI6InNhbmRib3giLCJwZXBwZXJpLmVtcGxveWVldHlwZSI6MSwicGVwcGVyaS5iYXNldXJsIjoiaHR0cHM6Ly9wYXBpLnN0YWdpbmcucGVwcGVyaS5jb20vVjEuMCIsIm5hbWUiOiJpZG8gdCIsInNjb3BlIjpbInBlcHBlcmkuYXBpbnQiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsicHdkIl19.Ixd6Ao0XM73YkUhGGPqRq3PiToeryL_75i9LmirmpgJoM3cEP04KF2SJ0gZInluIWZ37ajk5uxdvapfKr99RpRYRa_OjmTA1UlN_x4v-UQhxKH0mO6SU-RKB5CHAefsonftHx4ImVGgIe9j4xNbVrzuJWuaG9L-Y3pYI2ek7_1J1zd1b8uQByxocWJJSRCfOe2BpbJP-4q-3tLuvfBHUWkMgnMXlM2PXMmdXy8B7LWPNimxQDNO_-467YAsna6g3wQvJD56Prj2tikiNpE31Ls2xm1NS_Cg_Ka2Q7mrUBQeE72Wjuf0NtOMXwH6EQ98eZciYhq8jtStI2JFewcDIzQ";
    constructor(
        private httpService: HttpService,
        private addonService: AddonService,
        private dialogService: DialogService
    ) {
        // sessionStorage.setItem("idp_token", this.idpToken);
    }

    getAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        options: any
    ) {
        return this.addonService.getAddonApiCall(
            addonUUID,
            fileName,
            functionName,
            options
        );
    }

    postAddonServerAPI(
        addonUUID: string,
        fileName: string,
        functionName: string,
        body: any,
        options: any
    ) {
        return this.addonService.postAddonApiCall(
            addonUUID,
            fileName,
            functionName,
            body,
            options
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
        let types: KeyValuePair<string>[] = [];
        this.getPapiCall("/meta_data/transactions/types").subscribe(
            (activityTypes) => {
                const data = (activityTypes || []).filter((i) => !!i);
                this.getPapiCall("/meta_data/activities/types").subscribe(
                    (transactionTypes) => {
                        (transactionTypes || []).concat(data).forEach((type) =>
                            types.push({
                                Key: type.InternalID,
                                Value: type.ExternalID,
                            })
                        );
                        successFunc(types);
                    }
                );
            }
        );
    }
}
