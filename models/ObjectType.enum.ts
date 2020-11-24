export const ObjectType = Object.freeze({
  activities: 99,
  transactions: 2,
  accounts: 35,

  toString: function (enumValue) {
    switch (enumValue) {
      case this.activities:
        return "activities";
      case this.transactions:
        return "transactions";
      case this.accounts:
        return "accounts";
    }
    return "None";
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});
