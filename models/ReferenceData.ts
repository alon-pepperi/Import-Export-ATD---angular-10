// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import {
  FileStorage,
  UserDefinedTableMetaData,
  Type,
} from "@pepperi-addons/papi-sdk";

export interface ReferenceData {
  Filter: [];
  UserDefinedTable: UserDefinedTableMetaData[];
  FileStorage: FileStorage[];
  AccountType: Type[];
  TransactionType: Type[];
  ActivityType: Type[];
  Profile: [];
  Catalog: [];
  List: [];
}
