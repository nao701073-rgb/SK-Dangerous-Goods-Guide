/* SKDG R65 v43: authenticated system announcement reader. No HTML injection. */
(() => {
  'use strict';
  const title = document.querySelector('[data-system-announcement-title]');
  const body = document.querySelector('[data-system-announcement-body]');
  const date = document.querySelector('[data-system-announcement-date]');
  const error = document.querySelector('[data-system-announcement-error]');
  if (!title || !body) return;

  function clearDetails() {
    body.textContent = '';
    if (date) { date.hidden = true; date.textContent = ''; }
    if (error) { error.hidden = true; error.textContent = ''; }
  }
  function showNotice(message, detail) {
    title.textContent = message;
    clearDetails();
    if (detail && error) { error.textContent = detail; error.hidden = false; }
  }
  async function load() {
    try {
      const response = await fetch('/api/system/announcement', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (response.status === 401 || response.status === 403) {
        showNotice('お知らせを表示するにはログインが必要です。');
        return;
      }
      if (!response.ok) throw new Error('announcement unavailable');
      const payload = await response.json();
      const announcement = payload && payload.announcement;
      if (!announcement || announcement.enabled !== true) {
        showNotice('現在掲載中のお知らせはありません。');
        return;
      }
      clearDetails();
      title.textContent = String(announcement.title || 'お知らせ');
      body.textContent = String(announcement.body || '');
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(announcement.displayDate || ''))) {
        date.textContent = String(announcement.displayDate);
        date.hidden = false;
      }
    } catch (_) {
      showNotice('お知らせを取得できませんでした。', '接続状況を確認し、再読み込みしてください。');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
