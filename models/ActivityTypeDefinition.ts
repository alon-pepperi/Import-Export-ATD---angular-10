import { Owner } from "./owner";
import { AddonOwner } from "./addonOwner";
import {
  ATDSettings,
  ApiFieldObject,
  DataView,
} from "@pepperi-addons/papi-sdk";
import { Reference } from "./reference";

export interface ActivityTypeDefinition {
  UUID: string;
  InternaID: string;
  ExternalID: string;
  Description: string;
  CreationDateTime: string;
  ModificationDateTime: string;
  Hidden: boolean;
  Addons: AddonOwner[];
  Settings: ATDSettings;
  Fields: ApiFieldObject[];
  LineFields: ApiFieldObject[];
  DataViews: DataView[];
  Workflow: any;
  References: Reference[];
}
