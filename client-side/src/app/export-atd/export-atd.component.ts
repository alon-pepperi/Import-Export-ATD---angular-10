import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { ObjectType } from "./../../../../models/ObjectType.enum";

import {
    CustomizationService,
    HttpService,
    ObjectSingleData,
    DataConvertorService,
    PepRowData,
    PepFieldData,
    AddonService,
    FIELD_TYPE,
    UtilitiesService,
    KeyValuePair,
    SessionService,
} from "@pepperi-addons/ngx-lib";
import { PepColorType } from "@pepperi-addons/ngx-lib/color";

import {
    PepListComponent,
    ChangeSortingEvent,
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
    activityTypes: KeyValuePair<string>[];
    selectedActivity: any;
    title = "pepperi web app test";
    color = "hsl(100, 100%, 25%)";
    value = "";
    richTextValue =
        '<iframe width="500px" src="https://rerroevi.sirv.com/Website/Fashion/Pinkpurse/Pinkpurse.spin"/>';

    constructor(
        private translate: TranslateService,
        private customizationService: CustomizationService,
        private appService: AppService,
        private utilitiesService: UtilitiesService,
        private dataConvertorService: DataConvertorService,
        private httpService: HttpService,
        private addonService: AddonService,
        private exportatdService: ExportAtdService,
        private sessionService: SessionService
    ) {
        this.getActivityTypes();
    }
    ngOnInit(): void {}

    getActivityTypes() {
        this.activityTypes = [];
        this.appService.getTypes((types) => {
            if (types) {
                types.sort((a, b) => a.Value.localeCompare(b.Value));
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
            .subscribe((type) => {
                if (type.Type === ObjectType.transactions) {
                    typeString = ObjectType.toString(ObjectType.transactions);
                } else {
                    typeString = ObjectType.toString(ObjectType.activities);
                }
                this.exportatdService
                    .callToExportATDAPI(typeString, this.selectedActivity)
                    .subscribe((res) => {
                        this.isCallbackExportFinish = true;
                        this.data = res.URL;
                        this.appService.openDialog(
                            this.translate.instant("Export_ATD_Dialog_Title"),
                            this.translate.instant(
                                "Export_ATD_Dialog_Success_Message"
                            ),
                            () => this.downloadUrl()
                        );
                    });
            });
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
}
