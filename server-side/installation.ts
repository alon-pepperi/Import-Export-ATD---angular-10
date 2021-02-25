/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The erroeMessage is importent! it will be written in the audit log and help the user to understand what happen
*/

import MyService from "./my.service";

exports.install = async (Client, Request) => {
  try {
    Client.AddonUUID = "e9029d7f-af32-4b0e-a513-8d9ced6f8186";
    const service = new MyService(Client);
    const hedears = {};
    hedears["X-Pepperi-SecretKey"] = Client.AddonSecretKey;
    hedears["X-Pepperi-OwnerID"] = Client.AddonUUID;

    let tableName: string = `importExportATD`;
    let body = {
      Name: tableName,
    };
    await service.papiClient.post(`/addons/data/schemes`, body, hedears);

    await insertKeyToTable(
      service,
      Client,
      {
        Key: `webhooks`,
        Value: {},
      },
      hedears,
      tableName
    );
    await insertKeyToTable(
      service,
      Client,
      {
        Key: `resolution`,
        Value: {},
      },
      hedears,
      tableName
    );

    return { success: true };
  } catch (e) {
    return {
      success: false,
      erroeMessage: `Failed to create scheme in dynamo, Error: ${JSON.stringify(
        e
      )}`,
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

async function insertKeyToTable(
  service: MyService,
  Client: any,
  body: {},
  hedears: {},
  tableName: string
) {
  const result = await service.papiClient.post(
    `/addons/data/${Client.AddonUUID}/${tableName}`,
    body,
    hedears
  );
}
