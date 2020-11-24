import { ReferenceType } from "./referenceType";

export interface Reference {
    Type: string; //typeof ReferenceType[keyof typeof ReferenceType];
    ID: string;
    Name: string;
    UUID?: string;
    Path?: string;
    Content?: any;
}

// export enum ReferenceType {
//     None = 0,
//     Profile = 1,
//     GenericList = 2,
//     CustomizationFile = 3,
//     ActivityTypeDefinition = 4,
//     Catalog = 5,
//     Filter = 6,
//     UserDefinedTable = 7,
// }
