export const ReferenceType = Object.freeze({
  None: 0,
  List: 1,
  AccountType: 2,
  TransactionType: 3,
  ActivityType: 4,
  Webhook: 5,
  FileStorage: 6,
  Profile: 7,
  Catalog: 8,
  Filter: 9,
  UserDefinedTable: 10,

  toString: function (enumValue) {
    switch (enumValue) {
      case this.None:
        return "None";
      case this.Profile:
        return "Profile";
      case this.List:
        return "List";
      case this.FileStorage:
        return "FileStorage";
      case this.Catalog:
        return "Catalog";
      case this.Filter:
        return "Filter";
      case this.UserDefinedTable:
        return "UserDefinedTable";
      case this.Webhook:
        return "Webhook";
      case this.TransactionType:
        return "TransactionType";
      case this.ActivityType:
        return "ActivityType";
      case this.AccountType:
        return "AccountType";
      default:
        return "None";
    }
  },

  typeToRefernceType: function (type) {
    switch (type) {
      case 35:
        return "AccountType";
      case 2:
        return "TransactionType";
      case 99:
        return "ActivityType";

      default:
        return "None";
    }
  },

  isTypeDefinition: function (type) {
    if (
      type === "TransactionType" ||
      type === "ActivityType" ||
      type === "AccountType"
    ) {
      return true;
    } else {
      return false;
    }
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});
