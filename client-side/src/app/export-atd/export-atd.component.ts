import { Component, OnInit, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import {
    PepGroupButtonsViewType,
    PepGroupButton,
} from "@pepperi-addons/ngx-lib/group-buttons";

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

@Component({
    selector: "export-atd",
    templateUrl: "./export-atd.component.html",
    styleUrls: ["./export-atd.component.scss"],
})
export class ExportAtdComponent implements OnInit {
    data: any;

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
        this.exportatdService.getTypes((types) => {
            if (types) {
                types.sort((a, b) => a.Value.localeCompare(b.Value));
                this.activityTypes = [...types];
            }
        });
    }

    elementClicked(event) {
        this.selectedActivity = event.value;
    }

    async exportAtd() {
        //this.addonService.setShowLoading(true);
        let typeString = ``;
        this.exportatdService
            .getTypeOfSubType(this.selectedActivity)
            .subscribe((type) => {
                if (type.Type === 2) {
                    typeString = `transactions`;
                } else {
                    typeString = `activities`;
                }
                this.exportatdService
                    .callToExportATDAPI(typeString, this.selectedActivity)
                    .subscribe((res) => {
                        this.data = res.URL;
                        this.exportatdService.openDialog(
                            "Export ATD",
                            "Export completed successfully",
                            () => this.downloadUrl()
                        );
                    });
            });
    }

    downloadUrl() {
        const data = fetch(this.data, {
            method: `GET`,
        })
            .then((response) => response.json())
            .then((data) => {
                console.log(`data: ${JSON.stringify(data)}`);
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
