// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import {
  FileStorage,
  UserDefinedTableMetaData,
  Type,
} from "@pepperi-addons/papi-sdk";

export interface ReferenceData {
  filter: [];
  user_defined_table: UserDefinedTableMetaData[];
  file_storage: FileStorage[];
  type_definition: Type[];
  profile: [];
  catalog: [];
  list: [];
}
