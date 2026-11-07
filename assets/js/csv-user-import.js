(function () {
  'use strict';
  function disableCsvRegistration() {
    var ids = ['userCsvFile', 'validateUserCsv', 'importUserCsv',
      'clearUserCsv', 'downloadUserCsvTemplate', 'downloadUserCsvResults'];
    ids.forEach(function (id) {
      var control = document.getElementById(id);
      if (control) {
        control.disabled = true;
        control.setAttribute('aria-disabled', 'true');
      }
    });
    var summary = document.getElementById('userCsvSummary');
    if (summary) {
      summary.hidden = false;
      summary.textContent = 'GitHub Pages閲覧版ではユーザー一括登録を利用できません。';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', disableCsvRegistration, {once:true});
  } else {
    disableCsvRegistration();
  }
})();
