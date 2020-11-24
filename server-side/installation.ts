
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
        const service = new MyService(Client);
        const hedears = {};
        hedears['X-Pepperi-SecretKey'] = Client.EncryptedAddonUUID;
        hedears['X-Pepperi-OwnerID'] = Client.AddonUUID;

        const body = {
            Name: `importExportATD`,
            Type: `data`,
            Fields: { resolution: { Type: `Object` }, webhooks: { Type: `Object` } },
        };
        await service.papiClient.post(`/addons/data/schemes`, body, hedears);
        return { success: true };
    } catch (e) {
        return {
            success: false,
            erroeMessage: `Failed to create scheme in dynamo, Error: ${JSON.stringify(e)}`,
        };
    }
};
exports.uninstall = async (Client, Request) => {
    return {success:true}
}
exports.upgrade = async (Client, Request) => {
    return {success:true}
}
exports.downgrade = async (Client, Request) => {
    return {success:true}
}