(function () {
  'use strict';
  var text = 'SKDG P4 \u66ab\u5b9a\u95b2\u89a7\u7248\uff1a\u3053\u306eGitHub Pages\u7248\u3067\u306f\u30e6\u30fc\u30b6\u30fcID\u3067\u306e\u30ed\u30b0\u30a4\u30f3\u3001\u7533\u8acb\u767b\u9332\u3001DB\u4fdd\u5b58\u30fb\u540c\u671f\u306f\u5229\u7528\u3067\u304d\u307e\u305b\u3093\u3002\u30d1\u30b9\u30ef\u30fc\u30c9\u306f\u5165\u529b\u3057\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002\u8a8d\u8a3c\u4ed8\u304d\u6a5f\u80fd\u306f\u30ed\u30fc\u30ab\u30eb\u691c\u8a3c\u74b0\u5883\u306e\u307f\u3067\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
  function apply() {
    if (!document.body) { return; }
    if (!document.getElementById('skdg-public-static-notice')) {
      var bar = document.createElement('div');
      bar.id = 'skdg-public-static-notice';
      bar.setAttribute('role', 'status');
      bar.style.cssText = 'position:relative;z-index:2147483647;box-sizing:border-box;background:#fff5d8;color:#352812;border-bottom:2px solid #b58621;padding:10px 16px;font:600 14px/1.5 system-ui,sans-serif;';
      bar.textContent = text;
      document.body.insertBefore(bar, document.body.firstChild);
    }
    Array.prototype.forEach.call(document.querySelectorAll('input[type="password"]'), function (el) {
      el.value = '';
      el.disabled = true;
      el.setAttribute('title', '\u3053\u306e\u516c\u958b\u95b2\u89a7\u7248\u3067\u306f\u30d1\u30b9\u30ef\u30fc\u30c9\u5165\u529b\u3092\u5229\u7528\u3067\u304d\u307e\u305b\u3093');
    });
  }
  document.addEventListener('submit', function (ev) {
    if (ev.target && ev.target.querySelector && ev.target.querySelector('input[type="password"]')) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    apply();
    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(apply);
      observer.observe(document.body, {childList:true, subtree:true});
    }
  }, {once:true});
})();
