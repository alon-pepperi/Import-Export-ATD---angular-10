import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { ObjectType } from "./../../../../models/ObjectType.enum";

import {
    PepCustomizationService,
    PepHttpService,
    ObjectSingleData,
    PepDataConvertorService,
    PepRowData,
    PepFieldData,
    PepAddonService,
    FIELD_TYPE,
    PepUtilitiesService,
    PepSessionService,
    IPepOption,
} from "@pepperi-addons/ngx-lib";
import { PepColorType } from "@pepperi-addons/ngx-lib/color";

import {
    PepListComponent,
    IPepListSortingChangeEvent,
    PepListViewType,
} from "@pepperi-addons/ngx-lib/list";

import { ExportAtdService } from "./export-atd.service";
import { disableDebugTools } from "@angular/platform-browser";
import { AppService } from "../app.service";

@Component({
    selector: "export-atd",
    templateUrl: "./export-atd.component.html",
    styleUrls: ["./export-atd.component.scss"],
})
export class ExportAtdComponent implements OnInit {
    data: any;
    isCallbackExportFinish = false;
    disableExportButton: boolean = true;
    activityTypes: IPepOption[];
    selectedActivity: any;
    reportInterval = undefined;

    constructor(
        private translate: TranslateService,
        private customizationService: PepCustomizationService,
        private appService: AppService,
        private utilitiesService: PepUtilitiesService,
        private dataConvertorService: PepDataConvertorService,
        private httpService: PepHttpService,
        private addonService: PepAddonService,
        private exportatdService: ExportAtdService,
        private sessionService: PepSessionService
    ) {
        this.getActivityTypes();
    }
    ngOnInit(): void {}

    ngOnDestroy() {
        if (this.reportInterval) {
            window.clearInterval(this.reportInterval);
        }
    }

    getActivityTypes() {
        this.activityTypes = [];
        this.appService.getTypes((types: IPepOption[]) => {
            if (types) {
                types.sort((a, b) => a.value.localeCompare(b.value));
                this.activityTypes = [...types];
            }
        });
    }

    elementClicked(event) {
        this.selectedActivity = event.value;
        if (event.value === "") {
            this.disableExportButton = true;
        } else {
            this.disableExportButton = false;
        }
    }

    exportAtd() {
        this.isCallbackExportFinish = false;
        debugger;
        let typeString = ``;
        this.exportatdService
            .getTypeOfSubType(this.selectedActivity)
            .subscribe(async (type) => {
                if (type.Type === ObjectType.transactions) {
                    typeString = ObjectType.toString(ObjectType.transactions);
                } else {
                    typeString = ObjectType.toString(ObjectType.activities);
                }
                const res = await this.exportatdService.callToExportATDAPI(
                    typeString,
                    this.selectedActivity
                );
                this.reportInterval = window.setInterval(() => {
                    this.appService
                        .getExecutionLog(res.ExecutionUUID)
                        .then((logRes) => {
                            if (
                                logRes &&
                                logRes.Status &&
                                logRes.Status.Name !== "InProgress" &&
                                logRes.Status.Name !== "InRetry"
                            ) {
                                window.clearInterval(this.reportInterval);
                                const resultObj = JSON.parse(
                                    logRes.AuditInfo.ResultObject
                                );
                                if (resultObj.URL) {
                                    this.isCallbackExportFinish = true;
                                    this.data = resultObj.URL;
                                    this.appService.openDialog(
                                        this.translate.instant(
                                            "Export_ATD_Dialog_Title"
                                        ),
                                        this.translate.instant(
                                            "Export_ATD_Dialog_Success_Message"
                                        ),
                                        () => this.downloadUrl()
                                    );
                                } else if (resultObj.success == "Exception") {
                                    this.isCallbackExportFinish = true;
                                    window.clearInterval(this.reportInterval);
                                    let error = JSON.parse(
                                        resultObj.errorMessage.substring(
                                            resultObj.errorMessage.indexOf("{")
                                        )
                                    ).fault.faultstring;
                                    let contentError =
                                        error && error != ""
                                            ? error
                                            : this.translate.instant(
                                                  "Error_Occurred"
                                              );
                                    this.appService.openDialog(
                                        this.translate.instant("Error"),
                                        contentError
                                    );
                                }
                            }
                        });
                }, 1500);
            });
        // .subscribe(
        //     (res) => {
        //         this.isCallbackExportFinish = true;
        //         this.data = res.URL;
        //         this.appService.openDialog(
        //             this.translate.instant(
        //                 "Export_ATD_Dialog_Title"
        //             ),
        //             this.translate.instant(
        //                 "Export_ATD_Dialog_Success_Message"
        //             ),
        //             () => this.downloadUrl()
        //         );
        //     },
        //     (err) => {
        //         this.isCallbackExportFinish = true;

        //         this.appService.openDialog(
        //             this.translate.instant("Error"),
        //             this.translate.instant("Error_Occurred")
        //         );
        //     }
        // );
    }

    downloadUrl() {
        const data = fetch(this.data, { method: `GET` })
            .then((response) => response.json())
            .then((data) => {
                var fileContents = JSON.stringify(data);
                var filename = `${this.selectedActivity}.json`;
                var filetype = "text/plain";

                var a = document.createElement("a");
                const dataURI =
                    "data:" +
                    filetype +
                    ";base64," +
                    btoa(unescape(encodeURIComponent(fileContents)));
                a.href = dataURI;
                a["download"] = filename;
                var e = document.createEvent("MouseEvents");
                // Use of deprecated function to satisfy TypeScript.
                e.initMouseEvent(
                    "click",
                    true,
                    false,
                    document.defaultView,
                    0,
                    0,
                    0,
                    0,
                    0,
                    false,
                    false,
                    false,
                    false,
                    0,
                    null
                );
                a.dispatchEvent(e);
                //a.removeNode()
            });
    }

    isValidHttpUrl(string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }
}
