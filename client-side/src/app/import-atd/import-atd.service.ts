import { Injectable } from "@angular/core";
//@ts-ignore
import { AddonService } from "pepperi-addon-service";
// @ts-ignore
import { ActivityTypeDefinition } from "./../../../../models/activityTypeDefinition";
import { PapiClient } from "@pepperi-addons/papi-sdk";
import jwt from "jwt-decode";
import { HttpService, KeyValuePair } from "@pepperi-addons/ngx-lib";
import { AppService } from "../app.service";

@Injectable({
    providedIn: "root",
})
export class ImportAtdService {
    [x: string]: any;

    file: File;
    accessToken = "";
    parsedToken: any;
    papiBaseURL = "";
    pluginUUID = `e9029d7f-af32-4b0e-a513-8d9ced6f8186`;
    exportedAtdstring: string;
    exportedAtd: ActivityTypeDefinition;

    constructor(
        private appService: AppService,
        private httpService: HttpService
    ) {}

    //   callToAddonApi(
    //     method: string,
    //     methodName: string,
    //     params: any
    //   ): Promise<any> {
    //     if (method === "GET") {
    //       return this.appService
    //         .getAddonServerAPI(this.pluginUUID, "api", methodName, {
    //           params: params,
    //         })
    //         .toPromise();
    //     } else if (method === "post") {
    //       return this.appService
    //         .getAddonServerAPI(this.pluginUUID, "api", methodName, {
    //           params: params,
    //         })
    //         .toPromise();
    //     }
    //   }

    callToPapi(method: string, url: string, body?: any): Promise<any> {
        if (method === "GET") {
            return this.appService.getPapiCall(url).toPromise();
        } else if (method === "POST") {
            return this.appService.postPapiCall(url, body).toPromise();
        }
    }
    getTypeOfSubType(subtypeid: string) {
        return this.appService.getPapiCall(`/types/${subtypeid}`);
    }

    getTypes(successFunc = null, errorFunc = null) {
        let types: KeyValuePair<string>[] = [];

        this.appService.getPapiCall("/meta_data/transactions/types").subscribe(
            (activityTypes) => {
                if (activityTypes) {
                    activityTypes.forEach((type) =>
                        types.push({
                            Key: type.InternalID,
                            Value: type.ExternalID,
                        })
                    );
                }
                this.appService
                    .getPapiCall("/meta_data/activities/types")
                    .subscribe(
                        (transactionTypes) => {
                            if (transactionTypes) {
                                transactionTypes.forEach((type) =>
                                    types.push({
                                        Key: type.InternalID,
                                        Value: type.ExternalID,
                                    })
                                );
                            }
                            successFunc(types);
                        }
                        //errorFunc
                    );
            }
            //errorFunc
        );
    }

    callToServerAPI(
        methodName: string,
        method: string,
        params: any,
        body?: any
    ): Promise<any> {
        if (method === "GET") {
            return this.appService
                .getAddonServerAPI(this.pluginUUID, "api", methodName, {
                    params: params,
                })
                .toPromise();
        } else if (method === "POST") {
            return this.appService
                .postAddonServerAPI(this.pluginUUID, "api", methodName, body, {
                    params: params,
                })
                .toPromise();
        }
    }

    openDialog(title: string, content: string, callback?: any) {
        this.appService.openDialog(title, content, callback);
    }
}
