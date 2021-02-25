import MyService from "./my.service";
import { Client, Request } from "@pepperi-addons/debug-server";
import {
  DataView,
  ApiFieldObject,
  UserDefinedTableMetaData,
  ATDMetaData,
  Profile,
} from "@pepperi-addons/papi-sdk";
import fetch from "node-fetch";
import jwt_decode from "jwt-decode";
import { ActivityTypeDefinition } from "../models/activityTypeDefinition";
import { References, Mapping } from "../models/referencesMap";
import { Reference } from "../models/reference";
import { AddonOwner } from "../models/addonOwner";
import { ReferenceType } from "../models/referenceType";
import { ReferenceData } from "../models/referenceData";
import { ObjectType } from "../models/objectType.enum";
import { Guid } from "../models/Guid";
import { WorkflowActionsWithRerefences } from "../models/workflowActionsWithRerefences.enum";
import { ATDSettings } from "@pepperi-addons/papi-sdk";

// #region export_atd

export async function export_type_definition(client: Client, request: Request) {
  try {
    const service = new MyService(client);
    const params = request.query;
    const type = params.type;
    const subtypeid = params.subtype;
    console.log(`start export ATD: ${subtypeid}`);

    const url = await doExport(type, subtypeid, service);
    return url;
  } catch (ex) {
    throw new Error(ex);
  }
}

async function doExport(
  type: string,
  subtypeid: string,
  service: MyService
): Promise<any> {
  const references: Reference[] = [];
  let atd = {} as ActivityTypeDefinition;
  let atdMetaData: ATDMetaData;
  let fields: ApiFieldObject[];
  let linesFields: ApiFieldObject[];
  let dataViews: DataView[];
  let settings: ATDSettings;
  let addons: AddonOwner[];
  let workflow;

  const getDataPromises: Promise<any>[] = [
    service.papiClient.metaData.type(type).types.subtype(subtypeid).get(),
    service.papiClient.metaData.dataViews.find({
      where: `Context.Object.Resource='${type}' and Context.Object.InternalID=${subtypeid}`,
    }),
    service.papiClient.get(
      `/meta_data/${type}/types/${subtypeid}/workflow_legacy`
    ),
    service.papiClient.metaData
      .type(type)
      .types.subtype(subtypeid)
      .fields.get({ include_owned: false, include_internal: true }),
    service.papiClient.metaData
      .type(type)
      .types.subtype(subtypeid)
      .settings.get(),
    service.papiClient.get(`/meta_data/${type}/types/${subtypeid}/addons`),
    service.papiClient.get(`/meta_data/user_defined_tables/addons`),
  ];

  if (type === ObjectType.toString(ObjectType.transactions)) {
    getDataPromises.push(
      service.papiClient.get(
        `/meta_data/transaction_lines/types/${subtypeid}/addons`
      )
    );
    getDataPromises.push(
      service.papiClient.metaData
        .type(`transaction_lines`)
        .types.subtype(subtypeid)
        .fields.get({ include_owned: false, include_internal: true })
    );
  }

  await Promise.all(getDataPromises)
    .then(async (dataOfATDObjects) => {
      atdMetaData = dataOfATDObjects[0] as ATDMetaData;
      dataViews = dataOfATDObjects[1] as DataView[];
      workflow = dataOfATDObjects[2];
      fields = dataOfATDObjects[3] as ApiFieldObject[];
      settings = dataOfATDObjects[4] as ATDSettings;

      fields = fields.filter(
        (item) =>
          item.FieldID.startsWith("TSA") || item.FieldID.startsWith("PSA")
      );

      let addonsRederences = dataOfATDObjects[5]
        .concat(dataOfATDObjects[6].concat(dataOfATDObjects[7]))
        .map((a) => a && a["AddonUUID"]);

      addonsRederences = addonsRederences.filter(
        (value, index) => addonsRederences.indexOf(value) === index
      );

      const getReferencesPromises: Promise<void>[] = [];
      getReferencesPromises.push(addDataViewReferences(references, dataViews));
      getReferencesPromises.push(
        addWorkflowReferences(service, references, workflow)
      );
      getReferencesPromises.push(
        addFieldsReferences(service, references, fields)
      );
      getReferencesPromises.push(
        addSettingsReferences(service, references, settings)
      );

      if (type === `transactions`) {
        linesFields = dataOfATDObjects[8] as ApiFieldObject[];
        getReferencesPromises.push(
          addFieldsReferences(service, references, linesFields)
        );
      }

      addonsRederences.forEach((addon) => {
        if (addon)
          getReferencesPromises.push(
            addExportOfAddonResult(addon, service, addon)
          );
      });

      await Promise.all(getReferencesPromises)
        .then(async (result) => {
          atd = {
            UUID: atdMetaData["UUID"]!,
            InternaID: String(atdMetaData.InternalID),
            CreationDateTime: atdMetaData.CreationDateTime!,
            ModificationDateTime: atdMetaData.ModificationDateTime!,
            Hidden: atdMetaData.Hidden!,
            Description: atdMetaData.Description,
            ExternalID: atdMetaData.ExternalID,
            Addons: addons,
            Fields: fields,
            Workflow: workflow,
            References: references,
            DataViews: dataViews,
            Settings: settings,
          };

          if (type === `transactions`) {
            linesFields = linesFields.filter(
              (item) =>
                item.FieldID.startsWith("TSA") || item.FieldID.startsWith("PSA")
            );
            atd.LineFields = linesFields;
          }
        })
        .catch((err) => {
          throw err;
        });
    })
    .catch((err) => {
      throw err;
    });

  const presignedUrl = await service.papiClient.post(`/file_storage/tmp`);

  await fetch(presignedUrl.UploadURL, {
    method: `PUT`,
    body: JSON.stringify(atd),
  });

  return { URL: presignedUrl.DownloadURL };
}

async function addExportOfAddonResult(
  addonUUID: string,
  service: MyService,
  addons: AddonOwner[]
) {
  try {
    service.papiClient.addons.installedAddons
      .addonUUID(addonUUID)
      .export()
      .then((res) => {
        addons.push({ UUID: addonUUID, Data: res });
      })
      .catch((e) => {});
  } catch (e) {
    // do nothing.. not each addon must implement export
  }
}

async function addSettingsReferences(
  service: MyService,
  references: Reference[],
  settings: ATDSettings
) {
  const accontsMetaData = await service.papiClient.metaData
    .type(`accounts`)
    .types.get();
  const catalogs = await service.papiClient.get("/catalogs");

  if (settings.OriginAccountsData.IDs?.length > 0) {
    settings.OriginAccountsData.IDs.forEach((element) => {
      const accountIndex = accontsMetaData.findIndex(
        (x) => x.InternalID == element
      );
      const reference: Reference = {
        ID: String(accontsMetaData[accountIndex].InternalID),
        Name: accontsMetaData[accountIndex].ExternalID,
        Type: "type_definition",
        SubType: ObjectType.toString(ObjectType.accounts),
      };
      const isExist = references.findIndex((x) => x.ID == reference.ID);
      if (isExist === -1) {
        references.push(reference);
      }
    });
  }

  if (settings.DestinationAccountsData?.AllTypes === false) {
    if (settings.DestinationAccountsData.IDs?.length > 0) {
      settings.DestinationAccountsData.IDs.forEach((element) => {
        const accountIndex = accontsMetaData.findIndex(
          (x) => x.InternalID == element
        );
        const reference: Reference = {
          ID: String(accontsMetaData[accountIndex].InternalID),
          Name: accontsMetaData[accountIndex].ExternalID,
          Type: "type_definition",
          SubType: ObjectType.toString(ObjectType.accounts),
        };
        const isExist = references.findIndex((x) => x.ID == reference.ID);
        if (isExist === -1) {
          references.push(reference);
        }
      });
    }
  }

  if (settings.CatalogIDs?.length > 0) {
    settings.CatalogIDs.forEach((CatalogID) => {
      catalogs.forEach((catalog) => {
        if (catalog.InternalID === CatalogID) {
          const reference: Reference = {
            ID: String(catalog.InternalID),
            Name: catalog.ExternalID,
            Type: "catalog",
            UUID: catalog.UUID,
          };
          const index = references.findIndex((x) => x.ID == reference.ID);
          if (index === -1) references.push(reference);
        }
      });
    });
  }

  if (
    settings.TransactionItemsScopeFilterID != null &&
    settings.TransactionItemsScopeFilterID != `0`
  ) {
    const filter = await service.papiClient.get(
      `/meta_data/filters/${settings.TransactionItemsScopeFilterID}`
    );
    const reference: Reference = {
      ID: String(filter.InternalID),
      Name: "Transaction Item Scope",
      Type: "filter",
      UUID: filter.UUID,
      Content: JSON.stringify(filter.Data),
    };
    const isExist = references.findIndex((x) => x.ID == reference.ID);
    if (isExist === -1) {
      references.push(reference);
    }
  }
}

async function addFieldsReferences(
  service: MyService,
  references: Reference[],
  fields: ApiFieldObject[]
) {
  for (const field of fields) {
    if (field.TypeSpecificFields) {
      await addFieldReference(field);
    }
  }

  async function addFieldReference(field: ApiFieldObject) {
    if (field.TypeSpecificFields.ReferenceToResourceType != null) {
      const referenceId = field.TypeSpecificFields.ReferenceToResourceType.ID;
      if (ObjectType.values().indexOf(referenceId) > -1) {
        const res = await service.papiClient.metaData
          .type(ObjectType.toString(referenceId))
          .types.get();
        const index = res.findIndex(
          (x) => x.ExternalID == field.TypeSpecificFields.ReferenceTo.ExternalID
        );
        if (index > -1) {
          const reference: Reference = {
            ID: String(res[index].InternalID),
            Name: res[index].ExternalID,
            Type: "type_definition",
            SubType: ObjectType.toString(referenceId),
            UUID: field.TypeSpecificFields.ReferenceTo.UUID,
          };
          const isExist = references.findIndex((x) => x.ID == reference.ID);
          if (isExist === -1) {
            references.push(reference);
          }
        }
      }
    }
    if (field.UserDefinedTableSource != null) {
      const tableID = field.UserDefinedTableSource.TableID;
      if (tableID) {
        const udts = await service.papiClient.get(
          `/meta_data/user_defined_tables?table_id=${tableID}`
        );
        const udt: UserDefinedTableMetaData = JSON.parse(JSON.stringify(udts));
        if (udt) {
          const reference: Reference = {
            ID: String(udt.InternalID),
            Name: udt.TableID,
            Type: "user_defined_table",
            Content: JSON.stringify(udt),
          };
          const isExist = references.findIndex((x) => x.ID == reference.ID);
          if (isExist === -1) {
            references.push(reference);
          }
        }
      }
    }
  }
}

async function addDataViewReferences(
  references: Reference[],
  data_views: DataView[]
) {
  data_views.forEach((element) => {
    const reference: Reference = {
      ID: String(element.Context?.Profile.InternalID),
      Name: String(element.Context?.Profile.Name),
      Type: "profile",
    };
    const index = references.findIndex((x) => x.ID == reference.ID);
    if (index === -1) references.push(reference);
  });
}

async function addWorkflowReferences(
  service: MyService,
  references: Reference[],
  workflow: any
) {
  const workflowReferences = workflow.WorkflowReferences;
  for (let workflowReference of workflowReferences) {
    const reference: Reference = {
      ID: workflowReference.ID,
      Name: workflowReference.Name,
      Type: workflowReference.Type,
      SubType: workflowReference.SubType,
      UUID: workflowReference.UUID,
      Path: workflowReference.Path,
      Content: workflowReference.Content,
    };
    let index;
    if (reference.ID) {
      index = references.findIndex((x) => x.ID == reference.ID);
    } else {
      index = references.findIndex((x) => x.UUID == reference.UUID);
    }

    if (index === -1) {
      if (reference.Type === "file_storage") {
        const file = await service.papiClient.fileStorage.get(
          Number(reference.ID)
        );

        reference.Path = JSON.parse(JSON.stringify(file)).URL;
      }
      references.push(reference);
    }
  }
}

//#endregion

//#region import_atd

export async function import_type_definition(client: Client, request: Request) {
  const params = request.query;
  const type = params.type;
  let subtypeid = params.subtype;
  const body = request.body;
  const map: References = body.References;
  const url: string = body.URL;
  const service = new MyService(client);
  request.method = "POST";
  let subTypeSent = subtypeid;

  let backupAtd: any = null;

  if (subtypeid) {
    backupAtd = await doExport(type, subtypeid, service);
  }
  body.backupAtdURL = backupAtd;
  let atd: ActivityTypeDefinition = <ActivityTypeDefinition>{};
  try {
    ({ atd, subtypeid } = await convertFilToATD(
      url,
      atd,
      subtypeid,
      service,
      type
    ));

    const succeeded = await doImport(type, subtypeid, map, service, atd);

    if (succeeded) {
      callImportOfAddons(service, atd.Addons);
    } else {
      await HandleFailure(
        subTypeSent,
        subtypeid,
        service,
        type,
        backupAtd,
        atd
      );
      throw new Error(`Failed to import ATD: ${subtypeid}`);
    }
  } catch (ex) {
    await HandleFailure(subTypeSent, subtypeid, service, type, backupAtd, atd);
    throw ex;
  }
}

async function HandleFailure(
  subTypeSent: any,
  subtypeid: any,
  service: MyService,
  type: any,
  backupAtd: any,
  atd: ActivityTypeDefinition
) {
  if (!subTypeSent) {
    await deleteATD(subtypeid, service, type);
  } else if (backupAtd) {
    await doImport(type, subtypeid, null, service, atd);
  }
}

async function deleteATD(subtypeid: any, service: MyService, type: any) {
  const atdToDelete = {
    InternalID: subtypeid,
    Hidden: true,
  };
  await service.papiClient.post(`/meta_data/${type}/types`, atdToDelete);
}

async function callImportOfAddons(service: MyService, addons: AddonOwner[]) {
  try {
    addons?.forEach((addon) => {
      service.papiClient.addons.installedAddons
        .addonUUID(addon.UUID)
        .import(addon.Data)
        .catch((e) => {});
    });
  } catch (e) {
    // do nothing.. not each addon must implement import
  }
}

async function doImport(
  type: string,
  subtypeid: string,
  map: References | null,
  service: MyService,
  atd: ActivityTypeDefinition
): Promise<boolean> {
  let succeeded = false;

  ValidateImportAndExportTypes();

  console.log(`start import ATD: ${subtypeid}`);
  upsertPreparation(atd, subtypeid);

  const fixReferencesPromises: Promise<boolean>[] = [];

  if (map) {
    fixReferencesPromises.push(fixProfilesOfDataViews(atd.DataViews, map));
    fixReferencesPromises.push(fixReferencesOfFields(service, atd.Fields, map));
    fixReferencesPromises.push(fixWorkflowReferences(atd.Workflow, map));
    fixReferencesPromises.push(
      fixSettingsReferences(service, atd.Settings, map)
    );
    if (type === ObjectType.toString(ObjectType.transactions)) {
      if (atd.LineFields && atd.LineFields.length > 0)
        fixReferencesPromises.push(
          fixReferencesOfFields(service, atd.LineFields, map)
        );
    }
  }

  await Promise.all(fixReferencesPromises).then(
    async (fixReferencesResults) => {
      succeeded = fixReferencesResults.every((elem) => elem === true);
      const upsertDataPromises: Promise<boolean>[] = [
        upsertDataViews(service, atd.DataViews, type, subtypeid),
        upsertFields(service, atd.Fields, type, subtypeid),
        upsertWorkflow(service, atd.Workflow, type, subtypeid),
        updateATDDescription(service, atd.Description, type, subtypeid),
        upsertSettings(service, type, subtypeid, atd.Settings),
      ];
      if (atd.LineFields) {
        upsertDataPromises.push(
          upsertFields(service, atd.LineFields, `transaction_lines`, subtypeid)
        );
      }

      await Promise.all(upsertDataPromises).then((upsertDataResults) => {
        succeeded = upsertDataResults.every((elem) => elem === true);
      });
    }
  );
  return succeeded;

  function ValidateImportAndExportTypes() {
    let exportedAtdType;
    if (atd.LineFields) {
      exportedAtdType = ObjectType.transactions;
    } else {
      exportedAtdType = ObjectType.activities;
    }
    if (ObjectType.toString(exportedAtdType) != type) {
      if (exportedAtdType === ObjectType.activities) {
        throw new Error(`An activity cannot be imported into a transaction`);
      } else if (exportedAtdType === ObjectType.transactions) {
        throw new Error(`A transacction cannot be imported into an activity`);
      }
    }
  }
}

async function convertFilToATD(
  url: string,
  atd: ActivityTypeDefinition,
  subtypeid: string,
  service: MyService,
  type: string
) {
  await fetch(url, {
    method: `GET`,
  })
    .then((response) => response.json())
    .then(async (data) => {
      atd = data;
      if (!subtypeid) {
        subtypeid = await CreateATD(data, service, type);
        console.log(`Upsert new ATD: ${subtypeid} succeeded`);
      } else {
        await UpdateDescriptionATD(data, service, type, subtypeid);
      }
    });
  return { atd, subtypeid };
}

function upsertPreparation(atd: ActivityTypeDefinition, subtypeid: string) {
  atd.DataViews.forEach((dataView) => {
    if (dataView.Context?.Object?.InternalID) {
      dataView.Context.Object.InternalID = Number(subtypeid);
    }
    delete dataView.InternalID;
  });

  atd.Fields.forEach((field) => {
    delete field.InternalID;
  });
  atd.LineFields?.forEach((field) => {
    delete field.InternalID;
  });
}

async function CreateATD(
  data: any,
  service: MyService,
  type: string
): Promise<string> {
  const atdToInsert = {
    ExternalID: `${data.ExternalID} (${+new Date()})`,
    Description: `${data.Description}`,
    Icon: `${data.Settings.Icon}`,
  };
  const atd = await service.papiClient.post(
    `/meta_data/${type}/types`,
    atdToInsert
  );
  atdToInsert.ExternalID = `${data.ExternalID} (${atd.InternalID})`;
  atdToInsert["InternalID"] = atd.InternalID;
  await service.papiClient.post(`/meta_data/${type}/types`, atdToInsert);
  return atd.InternalID;
}

async function UpdateDescriptionATD(
  data: any,
  service: MyService,
  type: string,
  subtype: string
): Promise<void> {
  const atdToUpdate = {
    InternalID: `${subtype}`,
    Description: `${data.Description}`,
  };
  const atd = await service.papiClient.post(
    `/meta_data/${type}/types`,
    atdToUpdate
  );
}

async function updateATDDescription(
  service: MyService,
  description: string,
  type: string,
  subtypeid: string
): Promise<boolean> {
  const atdToInsert = {
    InternalID: subtypeid,
    Description: description,
  };
  await service.papiClient.post(`/meta_data/${type}/types`, atdToInsert);
  return true;
}

async function upsertSettings(
  service: MyService,
  type: string,
  subtype: string,
  settings: ATDSettings
): Promise<boolean> {
  try {
    await service.papiClient.metaData
      .type(type)
      .types.subtype(subtype)
      .settings.update(settings);
    console.log(`post settings succeeded`);
    return true;
  } catch (err) {
    console.error(
      `post settings failed. the error: ${err}, the body: ${JSON.stringify(
        settings
      )}`
    );
    throw new Error(
      `Post settings of type definition: ${subtype} failed. Error: ${
        JSON.parse(err.message.substring(err.message.indexOf("{"))).fault
          .faultstring
      }`
    );
  }
}

async function upsertWorkflow(
  service: MyService,
  workflow: any,
  type: string,
  subtype: string
): Promise<boolean> {
  try {
    await service.papiClient.post(
      `/meta_data/${type}/types/${subtype}/workflow_legacy`,
      workflow
    );
    console.log(`post workflow succeeded`);
    return true;
  } catch (err) {
    console.error(
      `post Workflow failed`,
      `type: ${type}`,
      `subtype: ${subtype}`,
      `body: ${JSON.stringify(workflow)}`
    );
    throw new Error(
      `Post workflow of type definition: ${subtype} failed. Error: ${
        JSON.parse(err.message.substring(err.message.indexOf("{"))).fault
          .faultstring
      }`
    );
  }
}

async function upsertDataViews(
  service: MyService,
  dataViews: DataView[],
  type: string,
  subtype: string
): Promise<boolean> {
  const body = dataViews;
  try {
    let currentDataViews = await service.papiClient.metaData.dataViews.find({
      where: `Context.Object.Resource='${type}' and Context.Object.InternalID=${subtype}`,
    });

    // delete data view if the combination of Context.Name & Context.ScreenSize & Context.Profile.Name not exist in the currents
    let dataViewsToDelete: DataView[] = [];
    for (let currentDataView of currentDataViews) {
      let index = dataViews.findIndex(
        (x) =>
          x.Context?.Name === currentDataView.Context?.Name &&
          x.Context?.ScreenSize === currentDataView.Context?.ScreenSize &&
          x.Context?.Profile.Name === currentDataView.Context?.Profile.Name
      );

      if (index == -1) {
        dataViewsToDelete.push(currentDataView);
      }
    }
    dataViewsToDelete.forEach((dv) => (dv.Hidden = true));

    await service.papiClient.post(
      "/meta_data/data_views_batch",
      dataViewsToDelete
    );
    await service.papiClient.post("/meta_data/data_views_batch", body);
    console.log(`upsert data views succeeded`);
    return true;
  } catch (err) {
    console.error(
      `Post of data views failed. Error: ${err}, body: ${JSON.stringify(body)}`
    );
    throw new Error(`Post of data views failed. Error: ${err.message}`);
  }
}

async function upsertFields(
  service: MyService,
  fields: ApiFieldObject[],
  type: string,
  subtype: string
): Promise<boolean> {
  try {
    fields = fields.filter(
      (item) => item.FieldID.startsWith("TSA") || item.FieldID.startsWith("PSA")
    );

    let currentFields = await service.papiClient.metaData
      .type(type)
      .types.subtype(subtype)
      .fields.get({ include_owned: false, include_internal: true });
    currentFields = currentFields.filter(
      (item) => item.FieldID.startsWith("TSA") || item.FieldID.startsWith("PSA")
    );
    const filedsNamesToUpsert = fields.map((f) => f.FieldID);
    const fieldsToDelete = currentFields.filter(
      (x) => filedsNamesToUpsert.indexOf(x.FieldID) === -1
    );
    fieldsToDelete.forEach((ftd) => (ftd.Hidden = true));
    if (fieldsToDelete.length > 0) {
      await upsertHiddenFields(service, type, subtype, fieldsToDelete);
    }
    if (fields.length > 0) {
      await service.papiClient.post(
        `/meta_data/bulk/${type}/types/${subtype}/fields`,
        fields
      );
    }
    console.log(`post fields batch succeeded`);
    return true;
  } catch (err) {
    console.error(
      `Post fields failed. error: ${err}, the body: ${JSON.stringify(fields)}`
    );
    throw new Error(
      `Post fields failed. Error: ${
        JSON.parse(err.message.substring(err.message.indexOf("{"))).fault
          .faultstring
      }`
    );
  }
  // fields.forEach(async (field) => {
  //     try {
  //         if (field.FieldID.startsWith(`TSA`)) {
  //             await service.papiClient.metaData.type(type).types.subtype(subtype).fields.upsert(field);
  //             console.log(`post field: ${field.FieldID} succeeded`);
  //         }
  //     } catch (err) {
  //         console.log(
  //             `post field: ${field.FieldID} failed`,
  //             `type: ${type}`,
  //             `subtype: ${subtype}`,
  //             `body: ${JSON.stringify(field)}`,
  //         );
  //         console.error(`Error: ${err}`);
  //     }
  // });
}

async function upsertHiddenFields(
  service: MyService,
  type: string,
  subtype: string,
  fieldsToDelete: ApiFieldObject[]
) {
  await service.papiClient.post(
    `/meta_data/bulk/${type}/types/${subtype}/fields`,
    fieldsToDelete
  );
}

async function fixSettingsReferences(
  service: MyService,
  settings: ATDSettings,
  map: References
): Promise<boolean> {
  try {
    let accountIds = settings.OriginAccountsData?.IDs.slice();
    if (accountIds) {
      for (let i = 0; i < accountIds.length; i++) {
        const pairIndex = map.Mapping.findIndex(
          (x) => x.Origin.ID === String(accountIds[i])
        );
        if (pairIndex > -1) {
          const index = settings.OriginAccountsData.IDs.indexOf(accountIds[i]);
          settings.OriginAccountsData.IDs.splice(index, 1);
          settings.OriginAccountsData.IDs.push(
            Number(map.Mapping[pairIndex].Destination.ID)
          );
        }
      }
    }

    let destinitionIds = settings.DestinationAccountsData?.IDs.slice();
    if (destinitionIds) {
      for (let i = 0; i < destinitionIds.length; i++) {
        const pairIndex = map.Mapping.findIndex(
          (x) => x.Origin.ID === String(destinitionIds[i])
        );
        if (pairIndex > -1) {
          //delete settings.DestinationAccountsData.IDs[i];
          const index = settings.DestinationAccountsData.IDs.indexOf(
            destinitionIds[i]
          );
          settings.DestinationAccountsData.IDs.splice(index, 1);
          settings.DestinationAccountsData.IDs.push(
            Number(map.Mapping[pairIndex].Destination.ID)
          );
        }
      }
    }
    let catalogIDs = settings.CatalogIDs.slice();
    if (catalogIDs) {
      for (let i = 0; i < catalogIDs.length; i++) {
        const pairIndex = map.Mapping.findIndex(
          (x) => String(x.Origin.ID) === String(catalogIDs[i])
        );
        if (pairIndex > -1) {
          const index = settings.CatalogIDs.indexOf(catalogIDs[i]);
          settings.CatalogIDs.splice(index, 1);
          settings.CatalogIDs.push(
            Number(map.Mapping[pairIndex].Destination.ID)
          );
        }
      }
    }

    const indexItemsScopeFilterID = map.Mapping.findIndex(
      (x) => x.Origin.ID === settings.TransactionItemsScopeFilterID
    );
    if (indexItemsScopeFilterID > -1) {
      if (
        map.Mapping[indexItemsScopeFilterID] &&
        map.Mapping[indexItemsScopeFilterID].Destination &&
        map.Mapping[indexItemsScopeFilterID].Destination.ID
      ) {
        settings.TransactionItemsScopeFilterID =
          map.Mapping[indexItemsScopeFilterID].Destination.ID;
      }
    }
    console.log(`fix settings references succeeded`);
    return true;
  } catch (err) {
    console.error(`fix settings references failed. error: ${err}`);

    return false;
  }
}

async function fixReferencesOfFields(
  service: MyService,
  fields: ApiFieldObject[],
  map: References
): Promise<boolean> {
  try {
    for (const field of fields) {
      await fixFieldReference(field);
    }
    console.log(`fix references Of fields succeeded`);

    return true;
  } catch (err) {
    console.error(`fix references Of fields failed. error: ${err}`);
    return false;
  }

  function fixFieldReference(field: ApiFieldObject) {
    if (field.TypeSpecificFields != null) {
      if (field.TypeSpecificFields != null) {
        if (field.TypeSpecificFields.ReferenceToResourceType != null) {
          const referenceUUID = field.TypeSpecificFields.ReferenceTo.UUID;
          if (referenceUUID != null) {
            const pairIndex = map.Mapping.findIndex(
              (x) => x.Origin.UUID === String(referenceUUID)
            );
            if (pairIndex > -1) {
              field.TypeSpecificFields.ReferenceTo.ExternalID =
                map.Mapping[pairIndex].Destination.Name;
              field.TypeSpecificFields.ReferenceTo.UUID =
                map.Mapping[pairIndex].Destination.UUID;
            }
          }
        }
      }
      //I do not need to fixed the fields that point to UDT because name of sandbox is the same in production

      //   if (field.UserDefinedTableSource != null) {
      //     const pairIndex = map.Mapping.findIndex(
      //       (x) => x.Origin.ID === field.UserDefinedTableSource.TableID
      //     );
      //     if (pairIndex > -1) {
      //       field.UserDefinedTableSource.TableID =
      //         map.Mapping[pairIndex].Destination.ID;
      //     }
      //     if (map.Pairs[pairIndex].destinition === null) {
      //         const upsertUdt: UserDefinedTableMetaData = await service.papiClient.metaData.userDefinedTables.upsert(
      //             JSON.parse(String(map.Pairs[pairIndex].origin.Content)),
      //         );
      //         field.UserDefinedTableSource.TableID = upsertUdt.TableID;
      //         field.UserDefinedTableSource.MainKey.TableID = upsertUdt.MainKeyType.Name;
      //         field.UserDefinedTableSource.SecondaryKey.TableID = upsertUdt.SecondaryKeyType.Name;
      //     }
      //     field.UserDefinedTableSource.TableID = map.Pairs[pairIndex].destinition.
      //   }
    }
  }
}

async function fixWorkflowReferences(
  workflow: any,
  map: References
): Promise<boolean> {
  try {
    const referencesKeys: Array<string> = [
      "DESTINATION_ATD_ID",
      "FILE_ID",
      "HTML_FILE_ID",
      "ACCOUNT_LIST_ID",
      "ACTIVITY_LIST_ID",
      "SECRET_KEY",
      "WEBHOOK_URL",
    ];
    getReferecesObjects(
      workflow.WorkflowObject.WorkflowTransitions,
      workflow,
      referencesKeys,
      map
    );
    getReferecesObjects(
      workflow.WorkflowObject.WorkflowPrograms,
      workflow,
      referencesKeys,
      map
    );
    console.log(`fix workflow references succeeded`);

    return true;
  } catch (err) {
    console.error(`fix workflow references failed. error: ${err}`);

    return false;
  }
}

function getReferecesObjects(
  transitions: any,
  workflow: any,
  referencesKeys: string[],
  map: References
) {
  transitions.forEach((transition) => {
    console.log(`transition: ${transition.TransitionID}`);
    transition.Actions.forEach((action) => {
      const workflowActionsWithRerefences = WorkflowActionsWithRerefences.values();
      if (
        workflowActionsWithRerefences.indexOf(
          WorkflowActionsWithRerefences.toString(action.ActionType)
        ) > -1
      ) {
        Object.keys(action.KeyValue).forEach((element) => {
          if (referencesKeys.indexOf(element) > -1) {
            if (element) {
              switch (element) {
                case "DESTINATION_ATD_ID":
                  findIDAndReplaceKeyValueWorkflow(
                    map,
                    action,
                    "DESTINATION_ATD_ID"
                  );
                  break;
                case "FILE_ID":
                  findIDAndReplaceKeyValueWorkflow(map, action, "FILE_ID");
                  break;
                case "HTML_FILE_ID":
                  findIDAndReplaceKeyValueWorkflow(map, action, "HTML_FILE_ID");
                  break;
                case "EmailBodyID":
                  findIDAndReplaceKeyValueWorkflow(map, action, "EmailBodyID");
                  break;
                case "EmailSubjectFileID":
                  findIDAndReplaceKeyValueWorkflow(
                    map,
                    action,
                    "EmailSubjectFileID"
                  );
                  break;
                case "AttachmentFileIDs":
                  findFilesIDsAndReplace(map, action, "AttachmentFileIDs");
                  break;
                case "ACCOUNT_LIST_ID":
                  replaceListUUID(action, map, "ACCOUNT_LIST_ID");
                  break;
                case "ACTIVITY_LIST_ID":
                  replaceListUUID(action, map, "ACTIVITY_LIST_ID");
                  break;
                case "WEBHOOK_URL":
                  replaceWebhookUrl(action, map, "WEBHOOK_URL");
                  break;
                case "SECRET_KEY":
                  replaceSecretKey(action, map, "SECRET_KEY");
                  break;
              }
            }
          }
        });
      }
    });
  });
}

function findFilesIDsAndReplace(
  map: References,
  action: any,
  fieldName: string
) {
  const filedIDs = action.KeyValue[fieldName].split(",");
  let newFilesIDs: any[] = [];
  if (filedIDs) {
    for (var fileID of filedIDs) {
      var maping = map.Mapping.find((x) => x.Origin.ID === fileID);
      if (maping) {
        newFilesIDs.push(maping.Destination.ID);
      }
    }
  }
  if (newFilesIDs) {
    action.KeyValue["AttachmentFileIDs"] = newFilesIDs;
  }
}

async function fixProfilesOfDataViews(
  dataViews: DataView[],
  map: References
): Promise<boolean> {
  try {
    dataViews.forEach((dataview) => {
      const profileID = dataview.Context?.Profile.InternalID;
      const pairIndex = map.Mapping.findIndex(
        (x) => x.Origin.ID === String(profileID)
      );
      if (dataview?.Context?.Profile?.InternalID && pairIndex > -1) {
        dataview.Context.Profile.InternalID = Number(
          map.Mapping[pairIndex].Destination.ID
        );
      }
    });
    console.log(`fix Profiles references of dataViews succeeded`);
    return true;
  } catch (err) {
    console.error(`fix Profiles references of dataViews failed. error: ${err}`);
    return false;
  }
}

function findIDAndReplaceKeyValueWorkflow(
  map: References,
  action: any,
  key: string
) {
  const pairIndex = map.Mapping.findIndex(
    (x) => x.Origin.ID === String(action.KeyValue[key])
  );
  if (pairIndex > -1) {
    action.KeyValue[key] = map.Mapping[pairIndex].Destination.ID;
  }
}

function replaceListUUID(action: any, map: References, key: string) {
  let genericListUUIDOfActivity = action.KeyValue[key];
  if (genericListUUIDOfActivity.startsWith("GL_")) {
    genericListUUIDOfActivity = genericListUUIDOfActivity.substring(
      3,
      genericListUUIDOfActivity.length
    );
    const pairIndex = map.Mapping.findIndex(
      (x) => x.Origin.UUID === String(genericListUUIDOfActivity)
    );
    if (pairIndex > -1) {
      action.KeyValue[key] = map.Mapping[pairIndex].Destination.UUID;
    }
  }
}

function replaceWebhookUrl(action: any, map: References, key: string) {
  const pairIndex = map.Mapping.findIndex(
    (x) => x.Origin.UUID === String(action.ActionID)
  );
  if (pairIndex > -1) {
    action.KeyValue[key] =
      map.Mapping[pairIndex].Destination.Content.WEBHOOK_URL;
  }
}

function replaceSecretKey(action: any, map: References, key: string) {
  const pairIndex = map.Mapping.findIndex(
    (x) => x.Origin.UUID === String(action.ActionID)
  );
  if (pairIndex > -1) {
    action.KeyValue[key] =
      map.Mapping[pairIndex].Destination.Content.SECRET_KEY;
  }
}
//#endregion

//#region insertDataToDynamo

export async function upsert_to_dynamo(client: Client, request: Request) {
  const params = request.query;
  const table = params.table;
  const body = request.body;
  request.method = "POST";

  const service = new MyService(client);
  const hedears = {};
  hedears["X-Pepperi-SecretKey"] = client.AddonSecretKey;
  hedears["X-Pepperi-OwnerID"] = client.AddonUUID;

  const result = await service.papiClient.post(
    `/addons/data/${client.AddonUUID}/${table}`,
    body,
    hedears
  );
  return result;
}

export async function get_from_dynamo(client: Client, request: Request) {
  const params = request.query;
  const table = params.table;
  const key = params.key;
  request.method = "GET";

  const service = new MyService(client);
  const hedears = {};
  hedears["X-Pepperi-SecretKey"] = client.AddonSecretKey;
  hedears["X-Pepperi-OwnerID"] = client.AddonUUID;

  const result = await service.papiClient.get(
    `/addons/data/${client.AddonUUID}/${table}/${key}`
  );

  return result;
}

//#endregion

//#region build references map
export async function build_references_mapping(
  client: Client,
  request: Request
) {
  const service = new MyService(client);
  const params = request.query;
  const subtype = params.subtype;
  const referencesMap = {} as References;
  referencesMap.Mapping = [];

  const body = request.body;
  const exportReferences: Reference[] = body.References;
  const referencesData: ReferenceData = await GetReferencesData(
    service,
    subtype,
    exportReferences
  );

  searchMappingByID(exportReferences, referencesData, referencesMap);
  searchMappingByName(exportReferences, referencesMap, referencesData);

  referencesMap.Mapping = referencesMap.Mapping.filter(
    (pair) =>
      !pair.Destination ||
      (pair.Destination && pair.Destination.ID !== pair.Origin.ID)
  );

  return referencesMap;
}

function searchMappingByName(
  exportReferences: Reference[],
  referencesMap: References,
  referencesData: ReferenceData
) {
  exportReferences.forEach((ref) => {
    let referencesDataList: any = [];
    const refIndex = referencesMap.Mapping.findIndex(
      (pair) => pair.Destination && pair.Destination.ID === ref.ID
    );
    if (refIndex == -1) {
      referencesDataList = referencesData[ref.Type];
      switch (ref.Type) {
        case "filter":
          //We will always run over if it does not exist with the same ID
          addOriginWithDestNull(ref, referencesMap);
          break;
        case "profile":
        case "list":
          const referenceDataNameIndex = referencesDataList.findIndex(
            (data) => data.Name && data.Name.toString() === ref.Name
          );
          if (referenceDataNameIndex > -1) {
            addReferencesPair(
              referencesDataList[referenceDataNameIndex],
              ref,
              referencesMap
            );
          } else {
            addOriginWithDestNull(ref, referencesMap);
          }
          break;
        case "type_definition":
          const referenceARtdIndex = referencesDataList.findIndex(
            (data) =>
              data.Name &&
              data.Name.toString() === ref.Name &&
              ObjectType.toString(data.Type) === ref.SubType
          );
          if (referenceARtdIndex > -1) {
            addReferencesPair(
              referencesDataList[referenceARtdIndex],
              ref,
              referencesMap
            );
          } else {
            addOriginWithDestNull(ref, referencesMap);
          }
          break;
        case "file_storage":
          const referenceDataFileNameIndex = referencesDataList.findIndex(
            (data) => data.Title && data.Title.toString() === ref.Name
          );
          if (referenceDataFileNameIndex > -1) {
            addReferencesPair(
              referencesDataList[referenceDataFileNameIndex],
              ref,
              referencesMap
            );
          } else {
            addOriginWithDestNull(ref, referencesMap);
          }
          break;
        case "catalog":
          const referenceDataExternalIDIndex = referencesDataList.findIndex(
            (data) => data.ExternalID && data.ExternalID.toString() === ref.Name
          );
          if (referenceDataExternalIDIndex > -1) {
            addReferencesPair(
              referencesDataList[referenceDataExternalIDIndex],
              ref,
              referencesMap
            );
          } else {
            addOriginWithDestNull(ref, referencesMap);
          }
          break;
        case "user_defined_table":
          const referenceDataTableIDIndex = referencesDataList.findIndex(
            (data) => data.TableID && data.TableID.toString() === ref.Name
          );
          if (referenceDataTableIDIndex > -1) {
            addReferencesPair(
              referencesDataList[referenceDataTableIDIndex],
              ref,
              referencesMap
            );
          } else {
            addOriginWithDestNull(ref, referencesMap);
          }
          break;
      }
    }
  });
}

function addOriginWithDestNull(ref: Reference, referencesMap: References) {
  const pair = {} as Mapping;
  pair.Origin = ref;
  referencesMap.Mapping.push(pair);
}

function searchMappingByID(
  exportReferences: Reference[],
  referencesData: ReferenceData,
  referencesMap: References
) {
  exportReferences.forEach((ref) => {
    if (ref.Type !== "webhook") {
      let referencesDataList: any = [];
      referencesDataList = referencesData[ref.Type];
      const referenceDataIdIndex = referencesDataList.findIndex(
        (data) =>
          data.InternalID && data.InternalID.toString() === ref.ID.toString()
      );
      if (referenceDataIdIndex > -1) {
        addReferencesPair(
          referencesDataList[referenceDataIdIndex],
          ref,
          referencesMap
        );
      }
    } else {
      addReferencesPair(ref, ref, referencesMap);
    }
  });
}

function addReferencesPair(
  element: any,
  ref: Reference,
  referencesMap: References
) {
  const destinitionRef = {} as Reference;

  if (element.InternalID !== undefined) {
    destinitionRef.ID = element.InternalID.toString();
  }

  destinitionRef.UUID = element.UUID;
  destinitionRef.Content = ref.Content;
  destinitionRef.Path = element.URL;
  destinitionRef.Type = ref.Type;

  if (element.ExternalID != undefined) {
    destinitionRef.Name = element.ExternalID;
  } else if (element.Title != undefined) {
    destinitionRef.Name = element.Title;
  } else if (element.TableID != undefined) {
    destinitionRef.Name = element.TableID;
  } else {
    destinitionRef.Name = element.Name;
  }

  const pair = {} as Mapping;

  pair.Origin = ref;
  pair.Destination = destinitionRef;
  referencesMap.Mapping.push(pair);
}

async function GetReferencesData(
  service: MyService,
  subtype: string,
  exportReferences: Reference[]
): Promise<any> {
  const profileIndex = exportReferences.findIndex(
    (ref) => ref.Type === "profile"
  );
  const genericListIndex = exportReferences.findIndex(
    (ref) => ref.Type === "list"
  );
  const fileNames = exportReferences
    .filter((ref) => ref.Type === "file_storage")
    ?.map((f) => f.Name);

  const typeDefinitionIndex = exportReferences.findIndex(
    (ref) => ref.Type === "type_definition"
  );

  const catalogIndex = exportReferences.findIndex(
    (ref) => ref.Type === "catalog"
  );
  const filterIndex = exportReferences.findIndex(
    (ref) => ref.Type === "filter"
  );
  const udtIndex = exportReferences.findIndex(
    (ref) => ref.Type === "user_defined_table"
  );

  const referencesData = {} as ReferenceData;
  const promises: any = [];
  const callbaks: ReferenceType[] = [];
  const listPromises: Promise<any>[] = [];

  if (genericListIndex > -1) {
    const uuids: string[] = exportReferences
      .map(function (v) {
        return `${v.UUID}`;
      })
      .filter((x) => x !== "undefined" && x !== `${Guid.empty()}`);
    const names: string[] = exportReferences
      .map(function (v) {
        return `${v.Name}`;
      })
      .filter((x) => x !== "null");
    listPromises.push(
      getReferencesMetaDataGenericListByUUIDS(service, uuids, names, `accounts`)
    );
    listPromises.push(
      getReferencesMetaDataGenericListByUUIDS(
        service,
        uuids,
        names,
        `all_activities`
      )
    );
    await Promise.all(listPromises).then(
      (res) => (referencesData.list = res[0].concat(res[1]))
    );
  }
  if (profileIndex > -1) {
    promises.push(service.papiClient.profiles.iter().toArray());
    callbaks.push("profile");
  }
  if (fileNames && fileNames.length > 0) {
    const whereClauseOfNames = fileNames.join("','");

    promises.push(
      service.papiClient.fileStorage.find({
        where: `Title IN ('${whereClauseOfNames}')`,
        fields: ["InternalID", "Title", "URL"],
      })
    );
    callbaks.push("file_storage");
  }

  if (typeDefinitionIndex > -1) {
    promises.push(
      service.papiClient.types.find({
        fields: ["InternalID", "Name", "UUID", "Type"],
      })
    );
    callbaks.push("type_definition");
  }
  if (catalogIndex > -1) {
    promises.push(
      service.papiClient.get("/Catalogs?fields=InternalID,ExternalID")
    );
    callbaks.push("catalog");
  }
  if (filterIndex > -1) {
    promises.push(
      service.papiClient.get(
        `/meta_data/lists/all_activities?where=Name='Transaction Item Scope'`
      )
    );
    callbaks.push("filter");
  }
  if (udtIndex > -1) {
    promises.push(
      service.papiClient.metaData.userDefinedTables.iter().toArray()
    );
    callbaks.push("user_defined_table");
  }
  await Promise.all(promises).then((res) => {
    for (let i = 0; i < callbaks.length; i++) {
      const key = callbaks[i];
      referencesData[key] = res[i];
    }
  });
  return referencesData;
}

async function getReferencesMetaDataGenericListByUUIDS(
  service: MyService,
  uuids: string[],
  names: string[],
  type: string
) {
  uuids.forEach((x) => x === `'${x}'`);
  names.forEach((x) => x === `'${x}'`);

  const whereClauseOfUUIDs = uuids.join("','");
  const whereClauseOfNames = names.join("','");

  return await service.papiClient.get(
    `/meta_data/lists/${type}?where=UUID IN ('${whereClauseOfUUIDs}') OR Name IN ('${whereClauseOfNames}')`
  );
}

//#endregion
