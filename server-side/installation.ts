/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The erroeMessage is importent! it will be written in the audit log and help the user to understand what happen
*/

import { AddonField } from "@pepperi-addons/papi-sdk";
import MyService from "./my.service";

exports.install = async (Client, Request) => {
  try {
    Client.AddonUUID = "e9029d7f-af32-4b0e-a513-8d9ced6f8186";
    const service = new MyService(Client);
    const headers = {
      "X-Pepperi-OwnerID": Client.AddonUUID,
      "X-Pepperi-SecretKey": Client.AddonSecretKey
  }

    let tableName: string = `importExportATD`;
    let body = {
      Name: tableName,
    };
    await service.papiClient.post(`/addons/data/schemes`, body, headers);
    await insertKeyToTable(service, Client, { Key: `webhooks`, Value: {} }, headers, tableName);
    await insertKeyToTable(service, Client, { Key: `resolution`, Value: {} }, headers, tableName);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      erroeMessage: `Failed to create scheme in dynamo, Error: ${JSON.stringify(e)}`,
    };
  }
};
exports.uninstall = async (Client, Request) => {
  return { success: true };
};
exports.upgrade = async (Client, Request) => {
  return { success: true };
};
exports.downgrade = async (Client, Request) => {
  return { success: true };
};

async function insertKeyToTable(service: MyService, Client: any, body: {}, hedears: {}, tableName: string) {
  await service.papiClient.post(`/addons/data/${Client.AddonUUID}/${tableName}`, body, hedears);
}

async function addImportFieldToUIControl(service: MyService, Client: any) {

  const fields :{[key: string] :{Title: string, FieldID: AddonField}}= {
    import:{
      Title: "Import",
      FieldID: {
        Type: "Component",
        SubType: "NG11",
        ModuleName: "ImportAtdModule",
        ComponentName: "ImportAtdComponent",
        AddonUUID: "e9029d7f-af32-4b0e-a513-8d9ced6f8186",
        RelativeURL: "import_export_atd",
        VisibleEndpoint: "api"
      }
    },
    export:{
      Title: "Export",
      FieldID: {
        Type: "BackgroundJob",
        SubType: "DownloadURL",
        AddonUUID: "e9029d7f-af32-4b0e-a513-8d9ced6f8186",
        RelativeURL: "import_export_atd",
        VisibleEndpoint: "api"
      }
    }
  }

  const dataView = await service.papiClient.metaData.dataViews.find({where : `Context.Name='SettingsEditorTransactionsMenu'`});
  let dataViewToUpsert = dataView[0];

  if (dataViewToUpsert){
    //dataViewToUpsert.Fields?.concat(fields)
    await service.papiClient.metaData.dataViews.upsert(dataViewToUpsert);
  }
}
