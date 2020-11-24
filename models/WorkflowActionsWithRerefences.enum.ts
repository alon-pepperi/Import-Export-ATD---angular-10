export const WorkflowActionsWithRerefences = Object.freeze({
  Webhook: 2,
  BranchWebhook: 7,
  StopConditionWebhook: 10,
  DistributeActivity: 12,
  NavigateTo: 17,
  StopConditionCustomForm: 18,
  CustomClientForm: 20,
  ExportFile: 23,
  CopyOrder: 36,
  DistributeActivityWithRef: 38,

  toString: function (enumValue) {
    switch (enumValue) {
      case this.DistributeActivity:
        return "DistributeActivity";
      case this.NavigateTo:
        return "NavigateTo";
      case this.StopConditionCustomForm:
        return "StopConditionCustomForm";
      case this.CustomClientForm:
        return "CustomClientForm";
      case this.ExportFile:
        return "ExportFile";
      case this.CopyOrder:
        return "CopyOrder";
      case this.DistributeActivityWithRef:
        return "DistributeActivityWithRef";
      case this.Webhook:
        return "Webhook";
      case this.BranchWebhook:
        return "BranchWebhook";
      case this.StopConditionWebhook:
        return "StopConditionWebhook";
    }
    return "none";
  },

  values: function () {
    return Object.keys(this).filter((k) => {
      return typeof this[k] !== "function";
    });
  },
});
