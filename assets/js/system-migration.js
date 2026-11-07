(function () {
  'use strict';
  // SKDG_PUBLIC_STATIC_PREVIEW_ONLY_20261107
  var notice = '縺薙・繝壹・繧ｸ縺ｯ蜈ｬ髢狗畑縺ｮ髱咏噪繝励Ξ繝薙Η繝ｼ縺ｧ縺吶ゅす繧ｹ繝・Β遘ｻ陦後√ョ繝ｼ繧ｿ蜿冶ｾｼ繝ｻ蜃ｺ蜉帙∫ｫｯ譛ｫ蜷梧悄縲√し繝ｼ繝舌・謫堺ｽ懊・蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ縲ゅ％繧後ｉ縺ｮ讖溯・縺ｯ隱崎ｨｼ莉倥″譛ｬ逡ｪ迺ｰ蠅・〒蛻ｩ逕ｨ縺励※縺上□縺輔＞縲・;
  function blockMigration() {
    ['systemMigrationPanel', 'migrationWizard'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel) { return; }
      var banner = document.createElement('div');
      banner.setAttribute('role', 'status');
      banner.setAttribute('data-skdg-public-preview', 'true');
      banner.style.cssText = 'padding:12px;margin:12px 0;border:2px solid #c99b32;border-radius:7px;background:#fff8e8;color:#4b391b;font-weight:600;';
      banner.textContent = notice;
      panel.insertBefore(banner, panel.firstChild);
      panel.setAttribute('aria-disabled', 'true');
      panel.querySelectorAll('button,input,select,textarea').forEach(function (element) {
        element.disabled = true;
      });
      panel.querySelectorAll('a').forEach(function (element) {
        element.removeAttribute('href');
        element.setAttribute('aria-disabled', 'true');
      });
      panel.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    });
  }
  var unavailable = function () {
    throw new Error('GitHub Pages繝励Ξ繝薙Η繝ｼ縺ｧ縺ｯ繧ｷ繧ｹ繝・Β遘ｻ陦後・蜷梧悄讖溯・縺ｯ蛻ｩ逕ｨ縺ｧ縺阪∪縺帙ｓ縲・);
  };
  window.ISSSystemMigration = Object.freeze({
    createPackage: unavailable, encrypt: unavailable, decrypt: unavailable,
    validate: unavailable, apply: unavailable, queueSync: unavailable,
    testEndpoint: unavailable, diagnoseTarget: unavailable, stageFullSystem: unavailable
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', blockMigration, { once: true });
  } else {
    blockMigration();
  }
})();
