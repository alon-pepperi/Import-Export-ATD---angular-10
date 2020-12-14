export const ConflictStatus = Object.freeze({
  NotFound: 1,
  ExistsWithDifferentContent: 2,

  toString: function (enumValue) {
    switch (enumValue) {
      case this.NotFound:
        return "NotFound";
      case this.ExistsWithDifferentContent:
        return "ExistsWithDifferentContent";
    }
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});
