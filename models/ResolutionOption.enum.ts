export const ResolutionOption = Object.freeze({
  UseExisting: 0,
  OverwriteExisting: 1,
  CreateNew: 2,

  toString: function (enumValue) {
    switch (enumValue) {
      case this.UseExisting:
        return "UseExisting";
      case this.OverwriteExisting:
        return "OverwriteExisting";
      case this.CreateNew:
        return "CreateNew";
    }
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});

// function getResolutionOptionString(num: number) {
//     switch (num) {
//         case 0:
//             return `UseExisting`;
//         case 1:
//             return `OverwriteExisting`;
//         case 2:
//             return `CreateNew`;
//     }
// }
// eslint-disable-next-line @typescript-eslint/no-namespace
// export namespace ResolutionOption {}

// export default ResolutionOption;
