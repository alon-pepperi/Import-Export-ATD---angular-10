import { Reference } from "./reference";

export interface Mapping {
  Origin: Reference;
  Destination: Reference;
}

export interface References {
  Mapping: Mapping[];
}
