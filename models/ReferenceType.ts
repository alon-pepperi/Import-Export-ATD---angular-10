export const ReferenceType = Object.freeze({
  None: 0,
  List: 1,
  TypeDefinition: 2,
  Webhook: 3,
  FileStorage: 4,
  Profile: 5,
  Catalog: 6,
  Filter: 7,
  UserDefinedTable: 8,

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
      case this.TypeDefinition:
        return "TypeDefinition";
      case this.Catalog:
        return "Catalog";
      case this.Filter:
        return "Filter";
      case this.UserDefinedTable:
        return "UserDefinedTable";
      case this.Webhook:
        return "Webhook";
      default:
        return "None";
    }
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});
