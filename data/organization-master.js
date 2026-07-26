(() => {
  "use strict";

  window.ISSOrganizationMaster = {
    version: "1.1",
    accountPolicy: {
      inspectorAccount: "individual",
      sharedAccountsAllowed: false,
      officeAdministratorAssignee: "office-director",
      officeAdministratorLimitPerOffice: 1,
      officeAdministratorScope: "own-office",
      safetyEnvironmentAdministratorScope: "all-offices"
    },
    headquarters: {
      id: "hq-safety-environment",
      name: "安全環境室",
      type: "headquarters",
      scope: "all-offices"
    },
    blocks: [
      {
        id: "block-01",
        code: "01",
        name: "第一ブロック",
        status: "active",
        offices: [
          { id: "office-metropolitan-survey", code: "MSC", name: "首都圏サーベイセンター", status: "active" },
          { id: "office-kawasaki", code: "KAW", name: "川崎事業所", status: "active" },
          { id: "office-yokohama", code: "YOK", name: "横浜事業所", status: "active" },
          { id: "office-yokohama-daikoku", code: "YDK", name: "横浜大黒事業所", status: "active" }
        ]
      }
    ]
  };
})();
