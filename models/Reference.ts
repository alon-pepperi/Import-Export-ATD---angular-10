import { ReferenceType } from "./referenceType";

export interface Reference {
  Type: ReferenceType;
  SubType?: string;
  ID: string;
  Name: string;
  UUID?: string;
  Path?: string;
  Content?: any;
}
