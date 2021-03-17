import { ChangeDetectorRef, Component, OnInit, Type, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
// @ts-ignore
import { UserService } from "pepperi-user-service";
import { ImportAtdService } from "./index";
import { Reference } from "./../../../../models/reference";
import { Conflict } from "./../../../../models/conflict";
import { ObjectType } from "./../../../../models/ObjectType.enum";
import { ConflictStatus } from "../../../../models/ConflictStatus.enum";

import { Guid } from "./../../../../models/guid";
import { References, Mapping } from "./../../../../models/referencesMap";
import { __param } from "tslib";
import { FileStorage } from "@pepperi-addons/papi-sdk";
import { ReferenceType } from "./../../../../models/referenceType";
import { Webhook } from "./../../../../models/Webhook";
import { ResolutionOptionType } from "../../../../models/ResolutionOption";
import { pairs } from "rxjs";
import {
    PepAddonService,
    PepCustomizationService,
    PepDataConvertorService,
    FIELD_TYPE,
    // PepHttpService,
    ObjectSingleData,
    PepFieldData,
    PepRowData,
    PepUtilitiesService,
    X_ALIGNMENT_TYPE,
    IPepOption,
} from "@pepperi-addons/ngx-lib";
import {
    PepListComponent,
    PepListViewType,
} from "@pepperi-addons/ngx-lib/list";

import { PepColorType } from "@pepperi-addons/ngx-lib/color";
import { AppService } from "../app.service";
import { rejects } from "assert";
import { resolve } from "@angular/compiler-cli/src/ngtsc/file_system";
import { Observable } from "rxjs/internal/Observable";
import { JsonpInterceptor } from "@angular/common/http";
import { PepSelectComponent } from "@pepperi-addons/ngx-lib/select";

@Component({
    selector: "app-import-atd",
    templateUrl: "./import-atd.component.html",
    styleUrls: ["./import-atd.component.scss"],
})
export class ImportAtdComponent implements OnInit {
    file: File | null = null;
    data: any;
    apiEndpoint: string;
    installing: boolean = false;
    addonData: any = {};
    activityTypes: IPepOption[];
    selectedActivity: any;
    selectedFile: File;
    showConflictResolution: boolean = false;
    showWebhooksResolution: boolean = false;
    disableConflictButton: boolean = false;
    disableImportButton: boolean = true;
    disableCancelConflictButton: boolean = false;
    disableCancelWebhooksButton: boolean = false;
    value = "";
    viewType: PepListViewType = "table";
    colorType: PepColorType = "any";
    conflictsList: Conflict[] = [];
    webhooks: Webhook[] = [];
    typeString = ``;
    typeUUID = ``;
    referenceMap: References;
    isCallbackWebhokksFinish = false;
    isCallbackConflictsFinish = false;
    isCallbackImportFinish = false;
    reportInterval = undefined;

    @ViewChild("conflictslist") customConflictList: PepListComponent;
    @ViewChild("webhookslist") customWebhookList: PepListComponent;
    @ViewChild('pepSelect') pepSelect: PepSelectComponent;

    constructor(
        private dataConvertorService: PepDataConvertorService,
        private utilitiesService: PepUtilitiesService,
        private appService: AppService,
        private translate: TranslateService,
        private customizationService: PepCustomizationService,
        // private httpService: PepHttpService,
        private addonService: PepAddonService,
        private importService: ImportAtdService,
        private cd: ChangeDetectorRef

    ) {
        this.getActivityTypes();
        const browserCultureLang = translate.getBrowserCultureLang();
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

    ngOnInit() {}

    ngOnDestroy() {
        // if (this.reportInterval) {
            window.clearTimeout();
        // }
    }

    async onOkConflictsClicked() {
        this.disableCancelConflictButton = true;
        this.isCallbackConflictsFinish = false;
        if (this.webhooks.length > 0) {
            this.showWebhooks();
            this.isCallbackConflictsFinish = false;
        } else {
            await this.callToImportATD();
            this.isCallbackConflictsFinish = true;
        }
    }

    private async hanleConflictsResolution() {
        let Resolution = {};
        for (const conflict of this.conflictsList) {
            await this.handleConflict(conflict, Resolution);
        }
        if (Resolution && Resolution != {})
            this.importService.callToServerAPI(
                "upsert_to_dynamo",
                "POST",
                { table: `importExportATD` },
                {
                    Key: "resolution",
                    Value: Resolution,
                },
                false
            );
    }

    private async handleConflict(conflict: Conflict, Resolution: {}) {
        let referenceIndex = this.referenceMap.Mapping.findIndex(
            (pair) => pair.Origin.Name === conflict.Name
        );
        if (conflict.Resolution === "CreateNew") {
            await this.postNewObjectByType(conflict, referenceIndex);
        } else if (conflict.Resolution === "OverwriteExisting") {
            if (conflict.Object === "file_storage") {
                let key = `${this.referenceMap.Mapping[referenceIndex].Destination.ID}`;
                Resolution[key] = "OverwriteExisting";
                let file: FileStorage = {
                    InternalID: Number(
                        this.referenceMap.Mapping[referenceIndex].Destination.ID
                    ),
                    FileName: this.referenceMap.Mapping[referenceIndex]
                        .Destination.Name,
                    URL: this.referenceMap.Mapping[referenceIndex].Origin.Path,
                    Title: this.referenceMap.Mapping[referenceIndex].Destination
                        .Name,
                };
                let res = await this.importService.callToPapi(
                    "POST",
                    "/file_storage",
                    file
                );
                this.referenceMap.Mapping[
                    referenceIndex
                ].Destination.ID = res.InternalID.toString();
            }
        } else if (conflict.Resolution === "UseExisting") {
            let key = `${this.referenceMap.Mapping[referenceIndex].Destination.ID}`;
            Resolution[key] = "UseExisting";
        }
    }

    private async postNewObjectByType(
        conflict: Conflict,
        referenceIndex: number
    ) {
        if (conflict.Object === "file_storage") {
            let res = await this.upsertFileStorage(referenceIndex);
            let destinitionRef = {} as Reference;
            destinitionRef.ID = res.InternalID.toString();
            destinitionRef.Name = res.FileName;
            destinitionRef.Type = "file_storage";
            this.referenceMap.Mapping[
                referenceIndex
            ].Destination = destinitionRef;
        } else if (conflict.Object === "filter") {
            // let transactionItemScope = await this.getTransactionItemScope(
            //     this.selectedActivity
            // );
            let res = await this.upsertTransactionItemScope(referenceIndex);
            let destinitionRef = {} as Reference;
            destinitionRef.ID = res.InternalID.toString();
            destinitionRef.Name = res.FileName;
            destinitionRef.Type = "filter";
            this.referenceMap.Mapping[
                referenceIndex
            ].Destination = destinitionRef;
        } else if (conflict.Object === "user_defined_table") {
            let res = await this.upsertUDT(referenceIndex);
            let destinitionRef = {} as Reference;
            destinitionRef.ID = res.InternalID.toString();
            destinitionRef.Name = res.TableID;
            destinitionRef.Type = "user_defined_table";

            this.referenceMap.Mapping[
                referenceIndex
            ].Destination = destinitionRef;
        }
    }

    private showWebhooks() {
        this.fillWebhooksFromDynamo().then(() => {
            this.showConflictResolution = false;
            this.showWebhooksResolution = true;
            setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
            }, 5);

            this.loadWebhookslist();
        });
    }

    private async upsertUDT(referenceIndex: number) {
        let udt = JSON.parse(
            this.referenceMap.Mapping[referenceIndex].Origin.Content
        );
        delete udt.InternalID;
        udt.Hidden = false;
        let res = await this.importService.callToPapi(
            "POST",
            "\\meta_data\\user_defined_tables",
            udt
        );
        return res;
    }

    private async upsertTransactionItemScope(referenceIndex: number) {
        const settings = await this.importService.callToPapi(
            "GET",
            `/meta_data/transactions/types/${this.selectedActivity}/settings`
        );
        let filter = {
            Name: ``,
            Data: JSON.parse(
                this.referenceMap.Mapping[referenceIndex].Origin.Content
            ),
            DataType: {
                ID: 10,
            },
            ContextObject: {
                UUID: this.typeUUID,
                Type: {
                    ID: 98,
                    Name: "ActivityTypeDefinition",
                },
            },
        };
        if (settings.TransactionItemsScopeFilterID) {
            filter[`internalID`] = settings.TransactionItemsScopeFilterID;
        }
        let res = await this.importService.callToPapi(
            "POST",
            "/meta_data/filters",
            filter
        );
        return res;
    }

    private async upsertFileStorage(referenceIndex: number) {
        const url = this.referenceMap.Mapping[referenceIndex].Origin.Path;
        var ext = url.substr(url.lastIndexOf(".") + 1);
        let file: FileStorage = {
            FileName: `${this.referenceMap.Mapping[referenceIndex].Origin.Name}.${ext}`,
            URL: this.referenceMap.Mapping[referenceIndex].Origin.Path,
            Title: this.referenceMap.Mapping[referenceIndex].Origin.Name,
            Hidden: false,
            Configuration: {
                ObjectType: "Order",
                Type: "CustomClientForm",
                RequiredOperation: "NoOperation",
            },
        };
        let res = await this.importService.callToPapi(
            "POST",
            "/file_storage",
            file
        );

        return res;
    }

    async getTransactionItemScope(subtype: string) {
        return await this.importService.callToPapi(
            "GET",
            "/meta_data/lists/all_activities?where=Name='Transaction Item Scope'"
        );
    }

    async onOkWebhooksClicked() {
        this.disableCancelWebhooksButton = true;
        this.isCallbackWebhokksFinish = false;
        // debugger;
        let dynamoWebhooks = {};
        this.webhooks.forEach((webhook) => {
            let referenceIndex = this.referenceMap.Mapping.findIndex(
                (pair) => pair.Origin.UUID === webhook.UUID
            );
            const key = this.referenceMap.Mapping[referenceIndex].Origin.UUID;
            dynamoWebhooks[key] = {};
            if (
                webhook.Url !==
                this.referenceMap.Mapping[referenceIndex].Origin.Content
                    .WEBHOOK_URL
            ) {
                dynamoWebhooks[key].url = webhook.Url;
                this.referenceMap.Mapping[
                    referenceIndex
                ].Destination.Content.WEBHOOK_URL = webhook.Url;
            }
            if (
                webhook.SecretKey !==
                this.referenceMap.Mapping[referenceIndex].Origin.Content
                    .SECRET_KEY
            ) {
                this.referenceMap.Mapping[
                    referenceIndex
                ].Destination.Content.SECRET_KEY = webhook.SecretKey;
                dynamoWebhooks[key].secretKey = webhook.SecretKey;
            }
        });

        await this.importService.callToServerAPI(
            "upsert_to_dynamo",
            "POST",
            { table: `importExportATD` },
            {
                Key: "webhooks",
                Value: dynamoWebhooks,
            },
            false
        );
        await this.callToImportATD();
        //this.isCallbackWebhokksFinish = true;
    }

    private async callToImportATD() {
        await this.hanleConflictsResolution();
        const presignedUrl = await this.importService.callToPapi("POST",`/file_storage/tmp`);
        await fetch(presignedUrl.UploadURL, {method: `PUT`, body: this.importService.exportedAtdstring});
        let url = presignedUrl.DownloadURL;
        this.deleteContentFromMap();
        const importTypeResult = await this.importService.callToServerAPI(
            "import_type_definition",
            "POST",
            { type: this.typeString, subtype: this.selectedActivity },
            { URL: url, References: this.referenceMap },
        true);
        const condition = (logRes) => {
            return logRes &&
            logRes.Status &&
            logRes.Status.Name !== "InProgress" &&
            logRes.Status.Name !== "InRetry" ?
            false: true;
        };
        this.poll(() => this.appService.getExecutionLog(importTypeResult.ExecutionUUID),condition,  1500)
            .then(logRes => {
                this.pollCallback(logRes, importTypeResult);
        });

    }

    pollCallback(logRes, importTypeResult){
        const resultObj = JSON.parse(
            logRes.AuditInfo.ResultObject
        );
        if (!this.isCallbackWebhokksFinish) {
            this.isCallbackWebhokksFinish = true;
        }
        if (!this.isCallbackConflictsFinish) {
            this.isCallbackConflictsFinish = true;
        }
        if (!this.isCallbackImportFinish) {
            this.isCallbackImportFinish = true;
        }

        if (Object.keys(resultObj).length === 0) {
            const title = this.translate.instant(
                "Import_Export_Success"
            );
            const content = this.translate.instant(
                "Import_Finished_Succefully"
            );
            this.appService.openDialog(title, content, () => {
                window.location.reload();
            });
            window.clearTimeout();

            //window.clearInterval();
            this.data = importTypeResult;
        } else if (resultObj.success == "Exception") {
            const title = this.translate.instant(
                "Import_Export_Error"
            );
            window.clearTimeout();
            this.isCallbackImportFinish = true;
            this.appService.openDialog(
                title,
                resultObj.errorMessage,
                () => {
                    window.location.reload();
                }
            );
        }

    }

    async poll(fn, fnCondition, ms) {
        let result = await fn();
        while (fnCondition(result)) {
          await this.wait(ms);
          result = await fn();
        }
        return result;
    }

    wait(ms = 1000) {
        return new Promise(resolve => {
          console.log(`waiting ${ms} ms...`);
          setTimeout(resolve, ms);
        });
    }

    private deleteContentFromMap() {
        this.referenceMap.Mapping.forEach((pair) => {
            // The content of the webhook reference should be sent in order to fix the workflow's actions
            if (pair.Destination && pair.Destination.Type !== "webhook") {
                delete pair.Destination.Content;
                delete pair.Origin.Content;
            }
        });
        this.referenceMap.Mapping.forEach((pair) => {
            if (pair.Destination && pair.Destination.Type !== "webhook") {
                delete pair.Destination.Path;
                delete pair.Origin.Path;
            }
        });
    }

    async onCancelClicked() {
        this.showConflictResolution = false;
        this.showWebhooksResolution = false;
    }

    selectedRowsChanged(selectedRowsCount) {
        const selectData = selectedRowsCount.componentRef.instance.getSelectedItemsData(
            true
        );
        let rowData = "";
        if (
            selectData &&
            selectData.rows &&
            selectData.rows[0] !== "" &&
            selectData.rows.length == 1
        ) {
            const uid = selectData.rows[0];
            rowData = selectedRowsCount.componentRef.instance.getItemDataByID(
                uid
            );
        }
        // this.listActions =
        //   this.topBarComp && selectedRowsCount > 0
        //     ? this.getListActions(rowData, translates)
        //     : null;
        // this.topBarComp.componentRef.instance.listActionsData = this.listActions;
        // this.topBarComp.componentRef.instance.showListActions =
        //   this.listActions && this.listActions.length ? true : false;

        //this.cd.detectChanges();
    }

    async importAtd() {
        this.isCallbackImportFinish = false;
        this.webhooks = [];
        try {
            await this.importService
                .getTypeOfSubType(this.selectedActivity)
                .then((typeDefinition) => {
                    let exportedAtdType;
                    if (this.importService.exportedAtd.LineFields) {
                        exportedAtdType = ObjectType.transactions;
                    } else {
                        exportedAtdType = ObjectType.activities;
                    }
                    if (typeDefinition.Type != exportedAtdType) {
                        if (
                            typeDefinition.Type === ObjectType.activities &&
                            exportedAtdType === ObjectType.transactions
                        ) {
                            this.isCallbackImportFinish = true;

                            this.appService.openDialog(
                                this.translate.instant("Import_Export_Error"),
                                this.translate.instant(
                                    "Transaction_Cannot_Imported_To_Activity"
                                )
                            );
                        } else if (
                            typeDefinition.Type === ObjectType.transactions &&
                            exportedAtdType === ObjectType.activities
                        ) {
                            this.isCallbackImportFinish = true;

                            this.appService.openDialog(
                                this.translate.instant("Import_Export_Error"),
                                this.translate.instant(
                                    "Activity_Cannot_Imported_To_Transaction"
                                )
                            );
                        }

                        return;
                    }
                    this.getTypeString(typeDefinition);
                    this.typeUUID = typeDefinition.UUID;
                    this.importService
                        .callToServerAPI(
                            "build_references_mapping",
                            "POST",
                            { subtype: this.selectedActivity },
                            {
                                References: this.importService.exportedAtd
                                    .References,
                            },
                            false
                        )
                        .then(async (res) => {
                            this.referenceMap = res;
                            if (
                                this.referenceMap &&
                                this.referenceMap.Mapping.length > 0
                            ) {
                                this.getConflictsResolution(this.referenceMap)
                                    .then(async (res) => {
                                        if (!res) {
                                            return;
                                        }
                                        this.conflictsList = res;
                                        // according to Eyal's request to not showing transactionItemScope

                                        let conflictNum = this.conflictsList.filter(
                                            (x) => x.Object != "filter"
                                        ).length;
                                        if (
                                            this.conflictsList &&
                                            conflictNum > 0
                                        ) {
                                            this.fillResolutionFromDynamo().then(
                                                () => {
                                                    this.isCallbackImportFinish = true;

                                                    this.showWebhooksResolution = false;
                                                    this.showConflictResolution = true;
                                                    setTimeout(() => {
                                                        window.dispatchEvent(
                                                            new Event("resize")
                                                        );
                                                    }, 1);
                                                    this.loadConflictlist();
                                                }
                                            );
                                        } else if (this.webhooks.length > 0) {
                                            this.showWebhooks();
                                            this.isCallbackImportFinish = true;
                                        } else {
                                            await this.callToImportATD();
                                        }
                                    })
                                    .catch((err) => {
                                        this.isCallbackImportFinish = true;

                                        const title = this.translate.instant(
                                            "Import_Export_Error"
                                        );
                                        const content = this.translate.instant(
                                            "Error_While_Importing"
                                        );
                                        this.appService.openDialog(
                                            title,
                                            `${content}\n ${err}`
                                        );
                                        return;
                                    });
                            } else {
                                await this.callToImportATD();
                            }
                        })
                        .catch((err) => {
                            throw err;
                        });
                })
                .catch((err) => {
                    this.isCallbackImportFinish = true;

                    const title = this.translate.instant("Import_Export_Error");
                    const content = this.translate.instant(
                        "Error_While_Importing"
                    );
                    this.appService.openDialog(title, `${content}\n ${err}`);
                });
            //this.isCallbackImportFinish = true;
        } catch {}
    }

    private async fillWebhooksFromDynamo() {
        let webhooksFromDynmo = await this.importService.callToServerAPI(
            "get_from_dynamo",
            "GET",
            { table: `importExportATD`, key: `webhooks` },
            false
        );
        this.webhooks.forEach((w) => {
            const value = webhooksFromDynmo?.Value;
            if (value) {
                const val = value[w.UUID];
                if (val && val != {}) {
                    w.Url = val.url ? val.url : w.Url;
                    w.SecretKey = val.secretKey ? val.secretKey : w.SecretKey;
                }
            }
        });
    }

    private async fillResolutionFromDynamo() {
        let resolutionFromDynmo = await this.importService.callToServerAPI(
            "get_from_dynamo",
            "GET",
            { table: `importExportATD`, key: `resolution` },
            false
        );

        this.conflictsList.forEach((c) => {
            const value = resolutionFromDynmo?.Value;
            if (value) {
                const val = value[c.ID];
                if (val) {
                    c.Resolution = val;
                }
            }
        });
    }

    private getTypeString(type: any) {
        if (type.Type === ObjectType.transactions) {
            this.typeString = ObjectType.toString(ObjectType.transactions);
        } else {
            this.typeString = ObjectType.toString(ObjectType.activities);
        }
    }

    async getConflictsResolution(referenceMap: References) {
        try {
            let conflicts: Conflict[] = [];

            const refMaps = this.importService.exportedAtd.References;
            let unresolvedConflicts: Reference[] = [];
            for (let i = 0; i < refMaps.length; i++) {
                await this.handleReference(
                    refMaps[i],
                    conflicts,
                    referenceMap,
                    unresolvedConflicts
                );
            }
            if (unresolvedConflicts.length > 0) {
                this.isCallbackImportFinish = true;
                let content = `${this.translate.instant(
                    "Objects_Not_Found_Message"
                )}<br/><ul>`;
                unresolvedConflicts.forEach((c) => {
                    if (c.Type === "type_definition") {
                        const type = this.getStringTypeFromObjectType(
                            c.SubType
                        );
                        content +=
                            `<li>${this.translate.instant(type)}: '${
                                c.Name
                            }' ${this.translate.instant("Not_Found")}` +
                            "</li>";
                    } else {
                        content += `<li>'${c.Name}' ${
                            c.Type
                        } ${this.translate.instant("Not_Found")}</li>`;
                    }
                });
                content += `</ul>`;
                const title = this.translate.instant("Import_Export_Error");
                this.appService.openDialog(title, content);
                return null;
            }
            return conflicts;
        } catch (err) {
            throw err;
        }
    }

    async handleReference(
        ref: Reference,
        conflicts: Conflict[],
        referenceMap: References,
        unresolvedConflicts: Reference[]
    ) {
        try {
            if (ref.Type !== "webhook") {
                let referencedPair: Mapping = referenceMap.Mapping.find(
                    (pair) => pair.Origin.Name === ref.Name
                );
                if (referencedPair) {
                    if (!referencedPair.Destination) {
                        // For objects with a path (such as custom form),
                        // if a matching object does not exist, then continue (create this object in the Execution step).
                        if (
                            ref.Type === "file_storage" ||
                            ref.Type === "user_defined_table" ||
                            ref.Type === "filter"
                        ) {
                            const conflict: Conflict = {
                                Name: ref.Name,
                                Object: referencedPair.Origin.Type,
                                Status: "NotFound",
                                Resolution: "CreateNew",
                                UUID: Guid.newGuid(),
                                ID: ref.ID,
                                // this.resolutionOptions,
                            };
                            conflicts.push(conflict);
                        } else {
                            unresolvedConflicts.push(ref);
                            //throw new Error(content);
                        }
                    } else if (
                        referencedPair.Origin.ID ===
                        referencedPair.Destination.ID
                    ) {
                        return;
                    } else if (
                        referencedPair.Origin.Name ===
                        referencedPair.Destination.Name
                    ) {
                        if (ref.Type === "file_storage") {
                            const filesAreSame = await this.compareFileContentOfOriginAndDest(
                                referencedPair.Origin,
                                referencedPair.Destination
                            );
                            if (filesAreSame == false) {
                                const conflict: Conflict = {
                                    Name: referencedPair.Destination.Name,
                                    Object: referencedPair.Destination.Type,
                                    Status: "ExistsWithDifferentContent",
                                    Resolution: "UseExisting",
                                    UUID: Guid.newGuid(),
                                    ID: referencedPair.Destination.ID,
                                    // this.resolutionOptions,
                                };
                                conflicts.push(conflict);
                            }
                        }
                    }
                }
            } else {
                const webhook: Webhook = {
                    Url: ref.Content.WEBHOOK_URL,
                    SecretKey: ref.Content.SECRET_KEY,
                    UUID: ref.UUID,
                };

                this.webhooks.push(webhook);
            }
        } catch (err) {
            throw err;
        }
    }

    getStringTypeFromObjectType(type: string) {
        if (type === ObjectType.toString(ObjectType.accounts)) {
            return "AccountType";
        } else if (type === ObjectType.toString(ObjectType.transactions)) {
            return "TransactionType";
        } else if (type === ObjectType.toString(ObjectType.activities)) {
            return "ActivityType";
        }
    }

    async compareFileContentOfOriginAndDest(
        origin: Reference,
        destinition: Reference
    ): Promise<boolean> {
        try {
            let contentOrigin = await this.fileToBase64(
                origin.Name,
                origin.Path
            );

            let contentDestinition = await this.fileToBase64(
                destinition.Name,
                destinition.Path
            );
            return contentOrigin === contentDestinition;
        } catch (err) {
            throw err;
        }
    }

    onFileSelect(event) {
        this.cd.detectChanges();
        let fileObj = event.value;
        if (fileObj.length > 0) {
            const file = JSON.parse(fileObj);
            const blob = new Blob([file.fileStr], { type: file.fileExt });
            var fileReader = new FileReader();
            fileReader.readAsDataURL(blob);
            fileReader.onload = (e) => {
                if (this.selectedActivity) {
                    this.disableImportButton = false;
                }
                this.importService.exportedAtdstring = decodeURIComponent(
                    escape(
                        window.atob(file.fileStr.split(";")[1].split(",")[1])
                    )
                );

                this.importService.exportedAtd = JSON.parse(
                    this.importService.exportedAtdstring
                );
            };
        } else {
            this.disableImportButton = true;
        }
    }

    async fileToBase64(filename, filepath) {
        const response = await fetch(filepath);
        if (response.status != 200) {
            throw new Error(
                `Failed to read file: ${filename}\n Path: ${filepath}`
            );
        }
        const text = await response.text();
        return btoa(unescape(encodeURIComponent(text)));

        // return await fetch(filepath).then(async (r) => {
        //     if (r.status != 200) {
        //         throw new Error(
        //             `Failed to read file: ${filename}\n Path: ${filepath}`
        //         );
        //     }
        //     return await btoa(unescape(encodeURIComponent(await r.text())));
        // });
    }
    //return btoa(responseText);

    uploadFile(event) {
        let files = event.target.files;
        if (files.length > 0) {
            this.importService.uploadFile(files[0]);
        }
    }

    //#region conflicts list
    ngAfterViewInit() {
        // if (this.conflictsList.length > 0) {
        //     this.loadConflictlist();
        // }
        // if (this.webhooks.length > 0) {
        //     this.loadWebhookslist();
        // }
    }

    elementClicked(event) {
        this.pepSelect.select.overlayDir.backdropClick.subscribe( ev => {
            this.pepSelect.select.close();
            this.cd.detectChanges();
        });
          this.pepSelect.select.close();
          this.cd.detectChanges();
        this.selectedActivity = event.value;
        if (event.value === "") {
            this.disableImportButton = true;
        } else if (this.importService.exportedAtdstring) {
            this.disableImportButton = false;
        }
    }

    notifyValueChanged(event) {
        // debugger;
        if (this.showConflictResolution) {
            let objectOndex = this.conflictsList.findIndex(
                (x) => x.UUID === event.id
            );
            this.conflictsList[objectOndex].Resolution = event.value;
            this.validateConflictButtonEnabled();
        } else if (this.showWebhooksResolution) {
            let objectOndex = this.webhooks.findIndex(
                (x) => x.UUID === event.id
            );
            if (event.key === "Object_WebhookSecretKeyColumn") {
                this.webhooks[objectOndex].SecretKey = event.value;
            } else if (event.key === "Object_WebhookUrlColumn") {
                this.webhooks[objectOndex].Url = event.value;
            }
        }
    }

    private validateConflictButtonEnabled() {
        console.log(`in validateConflictButtonEnabled, this.conflictsList:
        ${JSON.stringify(this.conflictsList)}`);
        if (
            this.conflictsList.filter(
                (x) =>
                    x.Resolution !== "OverwriteExisting" &&
                    x.Resolution !== "UseExisting" &&
                    x.Resolution !== "CreateNew"
            ).length > 0
        ) {
            this.disableConflictButton = true;
        } else {
            this.disableConflictButton = false;
        }
    }

    loadConflictlist() {
        console.log(
            `in loadConflictlist. this.conflictsList.length: ${this.conflictsList.length}`
        );
        this.validateConflictButtonEnabled();
        this.loadConflictList(this.conflictsList);
    }

    loadConflictList(conflicts) {
        if (this.customConflictList && conflicts) {
            const tableData = new Array<PepRowData>();
            conflicts.forEach((conflict: Conflict) => {
                if (conflict.Object == "filter") {
                    return;
                }
                const userKeys = ["Object", "Name", "Status"];
                const supportUserKeys = ["Resolution"];
                const allKeys = [...userKeys, ...supportUserKeys];
                tableData.push(
                    this.convertConflictToPepRowData(conflict, allKeys)
                );
            });

            if (tableData.length > 0) {
                const uiControl = this.dataConvertorService.getUiControl(
                    tableData[0]
                );
                const rows = this.dataConvertorService.convertListData(
                    tableData
                );

                // const buffer = [];

                console.log(`Rows number: ${rows.length}`);
                rows.map((row, i) => {
                    row.UID = conflicts[i].UUID || row.UID;
                    // const osd = new ObjectSingleData(
                    //     pepperiListObj.UIControl,
                    //     row
                    // );
                    // osd.IsEditable = true;
                    // buffer.push(osd);
                });

                this.customConflictList.initListData(
                    uiControl,
                    rows.length,
                    rows,
                    this.viewType,
                    "",
                    true
                );
            }
        }
    }

    convertConflictToPepRowData(conflict: any, customKeys = null) {
        const row = new PepRowData();
        row.Fields = [];
        const keys = customKeys ? customKeys : Object.keys(conflict);
        keys.forEach((key) =>
            row.Fields.push(this.initDataRowFieldOfConflicts(conflict, key))
        );
        return row;
    }

    initDataRowFieldOfConflicts(conflict: Conflict, key: any): PepFieldData {
        const dataRowField: PepFieldData = {
            ApiName: key,
            Title: this.translate.instant(key),
            XAlignment: X_ALIGNMENT_TYPE.Left,
            FormattedValue: conflict[key] ? conflict[key] : "",
            Value: conflict[key] ? conflict[key] : "",
            ColumnWidth: 10,
            AdditionalValue: "",
            OptionalValues: [],
            FieldType: FIELD_TYPE.TextBox,
            Enabled:
                key === `Resolution` && conflict.Resolution != "CreateNew"
                    ? true
                    : false,
        };
        switch (key) {
            case "Object":
                dataRowField.ColumnWidth = 20;

                let keyName = this.getKeyStringFromObjectName(conflict);

                dataRowField.FormattedValue = dataRowField.Value = this.translate.instant(
                    keyName
                );

                break;
            case "Name":
                dataRowField.ColumnWidth = 15;
                dataRowField.AdditionalValue = conflict.Name;
                dataRowField.FormattedValue = conflict.Name
                    ? conflict.Name
                    : "";
                dataRowField.Value = conflict.Name ? conflict.Name : "";
                break;
            case "Status":
                dataRowField.ColumnWidth = 25;
                dataRowField.AdditionalValue = conflict.Status;
                const status = this.getStatusValue(conflict);

                dataRowField.FormattedValue = status;
                dataRowField.Value = status;
                break;

            case "Resolution":
                dataRowField.ColumnWidth = 15;
                dataRowField.FieldType = FIELD_TYPE.ComboBox;
                if (conflict.Resolution === "CreateNew") {
                    dataRowField.FormattedValue = dataRowField.Value = this.translate.instant(
                        conflict.Resolution
                    );
                }

                dataRowField.OptionalValues = [
                    {
                        Key: "UseExisting",
                        Value: "Use Existing", //this.translate.instant("UseExisting"),
                    },
                    {
                        Key: "OverwriteExisting",
                        Value: this.translate.instant("OverwriteExisting"),
                    },
                ];
                break;

            default:
                dataRowField.FormattedValue = conflict[key]
                    ? conflict[key].toString()
                    : "";
                break;
        }
        return dataRowField;
    }

    private getKeyStringFromObjectName(conflict: Conflict) {
        let keyName;
        if (conflict.Object === "file_storage") {
            keyName = "FileStorage";
        } else if (conflict.Object === "user_defined_table") {
            keyName = "UserDefinedTable";
        }
        return keyName;
    }

    private getStatusValue(conflict: Conflict) {
        let resValue = "";
        switch (conflict.Status) {
            case "NotFound":
                resValue = this.translate.instant("Object_Not_Found");

                break;
            case "ExistsWithDifferentContent":
                resValue = `${this.translate.instant("File_Named")} ${
                    conflict.Name
                } ${this.translate.instant("Exists_With_Different_Content")}`;
                break;
        }
        return resValue;
    }

    //#endregion

    //#region webhooks list

    loadWebhookslist() {
        this.loadWebhooksList(this.webhooks);
    }

    loadWebhooksList(webhooks) {
        if (this.customWebhookList && webhooks) {
            const tableData = new Array<PepRowData>();
            webhooks.forEach((webhook: any) => {
                const allKeys = [
                    "Object_WebhookUrlColumn",
                    "Object_WebhookSecretKeyColumn",
                ];
                tableData.push(
                    this.convertWebhookToPepRowData(webhook, allKeys)
                );
            });
            if (tableData.length > 0) {
                const uiControl = this.dataConvertorService.getUiControl(
                    tableData[0]
                );
                const rows = this.dataConvertorService.convertListData(
                    tableData
                );

                // const buffer = [];

                console.log(`Rows number: ${rows.length}`);
                rows.map((row, i) => {
                    row.UID = webhooks[i].UUID || row.UID;
                    // const osd = new ObjectSingleData(
                    //     pepperiListObj.UIControl,
                    //     row
                    // );
                    // osd.IsEditable = true;
                    // buffer.push(osd);
                });

                this.customWebhookList.initListData(
                    uiControl,
                    rows.length,
                    rows,
                    this.viewType,
                    "",
                    true
                );
            }
        }
    }

    convertWebhookToPepRowData(webhook: any, customKeys = null) {
        const row = new PepRowData();
        row.Fields = [];
        const keys = customKeys ? customKeys : Object.keys(webhook);
        keys.forEach((key) =>
            row.Fields.push(this.initDataRowFieldOfWebhooks(webhook, key))
        );
        return row;
    }

    initDataRowFieldOfWebhooks(webhook: any, key: any): PepFieldData {
        const dataRowField: PepFieldData = {
            ApiName: key,
            Title: this.translate.instant(key),
            XAlignment: X_ALIGNMENT_TYPE.Left,
            FormattedValue: webhook[key] ? webhook[key].toString() : "",
            Value: webhook[key] ? webhook[key].toString() : "",
            ColumnWidth: 10,
            AdditionalValue: "",
            OptionalValues: [],
            FieldType: FIELD_TYPE.TextBox,
            Enabled: true,
        };
        switch (key) {
            case "Object_WebhookUrlColumn":
                dataRowField.ColumnWidth = 30;
                dataRowField.FormattedValue = webhook.Url ? webhook.Url : "";
                dataRowField.Value = webhook.Url ? webhook.Url : "";

                break;
            case "Object_WebhookSecretKeyColumn":
                dataRowField.ColumnWidth = 20;
                dataRowField.FormattedValue = webhook.SecretKey
                    ? webhook.SecretKey
                    : "";
                dataRowField.Value = webhook.SecretKey ? webhook.SecretKey : "";
                break;

            default:
                dataRowField.FormattedValue = webhook[key]
                    ? webhook[key].toString()
                    : "";
                break;
        }
        return dataRowField;
    }

    //#endregion
}
