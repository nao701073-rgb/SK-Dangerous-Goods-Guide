(() => {
  'use strict';

  const BUILD = 'v1.3.103-material-strength-visible-linkage';
  const DEVICE_MAP = {
    web: 'web',
    aslash: 'aslash',
    steel: 'steel',
    wire: 'wire',
    chain: 'chain',
    tygard: 'tygard',
    pet: 'petBand',
    pp: 'ppRope',
    other: 'other'
  };

  const $ = (id) => document.getElementById(id);
  const catalog = () => window.ISS_SECURING_MSL_REFERENCE || null;

  function isTargetPage() {
    return /ctu-securing-calculator\.html(?:$|[?#])/.test(location.href) || !!$('quickMaterial');
  }

  function emit(el, type = 'change') {
    if (!el) return;
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function setStatus(el, text, state = '') {
    if (!el) return;
    el.textContent = text;
    if (state) el.dataset.state = state;
    else delete el.dataset.state;
  }

  function option(text, value = '') {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  }

  function numericProfileLabel(p) {
    const pieces = [p.label || p.id];
    if (Number.isFinite(Number(p.candidateMslKn))) pieces.push(`${Number(p.candidateMslKn).toFixed(1)} kN`);
    return pieces.join(' — ');
  }

  function supportProfileLabel(p) {
    const pieces = [p.label || p.id];
    if (Number.isFinite(Number(p.candidateStrengthKn))) pieces.push(`${Number(p.candidateStrengthKn).toFixed(1)} kN/個`);
    return pieces.join(' — ');
  }

  function transportAllows(profile) {
    if (!profile || !profile.railOnly) return true;
    const transport = $('quickTransport')?.value || $('transportMode')?.value || '';
    return /rail|鉄道/i.test(transport);
  }

  function getDeviceProfiles(material) {
    const c = catalog();
    if (!c?.roles?.device?.profiles) return [];
    return c.roles.device.profiles.filter((p) => p.material === material && transportAllows(p));
  }

  function getSupportProfiles(material) {
    const c = catalog();
    if (!c?.supportReference?.profiles) return [];
    return c.supportReference.profiles.filter((p) => p.material === material);
  }

  function markReference(el) {
    if (!el) return;
    el.dataset.v13103ReferenceCandidate = '1';
    document.dispatchEvent(new CustomEvent('sk:ctu-reference-candidate-applied', {
      detail: { fields: [el.id], source: BUILD }
    }));
  }

  function markConfirmed(el) {
    if (!el) return;
    delete el.dataset.v13103ReferenceCandidate;
  }

  function setInputValue(el, value, { reference = false } = {}) {
    if (!el) return;
    el.value = value;
    if (reference) markReference(el);
    else markConfirmed(el);
    emit(el, 'input');
    emit(el, 'change');
  }

  function clearInputValue(el) {
    if (!el) return;
    el.value = '';
    markConfirmed(el);
    emit(el, 'input');
    emit(el, 'change');
  }

  function syncHiddenDeviceEstimator(materialKey, profileId) {
    const hiddenMaterial = $('quickDeviceMslMaterial');
    const hiddenProfile = $('quickDeviceMslProfile');
    if (!hiddenMaterial || !hiddenProfile) return;

    if (hiddenMaterial.value !== materialKey) {
      hiddenMaterial.value = materialKey;
      emit(hiddenMaterial, 'change');
    }
    window.setTimeout(() => {
      if (!profileId) return;
      const exists = Array.from(hiddenProfile.options).some((o) => o.value === profileId);
      if (!exists) return;
      hiddenProfile.value = profileId;
      emit(hiddenProfile, 'change');
    }, 0);
  }

  function populateDeviceProfiles({ preserve = false } = {}) {
    const mainMaterial = $('quickMaterial');
    const select = $('quickMaterialProfile');
    const status = $('quickMaterialProfileStatus');
    if (!mainMaterial || !select) return;

    const previous = preserve ? select.value : '';
    const mapped = DEVICE_MAP[mainMaterial.value] || '';
    select.replaceChildren();

    if (!mapped) {
      select.append(option('固縛材質を選択してください'));
      select.disabled = true;
      setStatus(status, '材質だけではMSLを確定しません。まず固縛材質を選択してください。');
      return;
    }

    const profiles = getDeviceProfiles(mapped);
    select.append(option('規格・サイズ／表示を選択してください'));
    for (const p of profiles) select.append(option(numericProfileLabel(p), p.id));
    select.disabled = false;

    if (preserve && profiles.some((p) => p.id === previous)) select.value = previous;

    if (!select.value) {
      setStatus(status, '材質名だけではMSLを確定しません。実物の規格・径・表示LC/MSLに一致する項目を選択してください。', 'attention');
    }
  }

  function populateSupportProfiles({ preserve = false } = {}) {
    const material = $('quickSupportMaterial');
    const select = $('quickSupportProfile');
    const status = $('quickSupportProfileStatus');
    if (!material || !select) return;

    const previous = preserve ? select.value : '';
    select.replaceChildren();
    if (!material.value) {
      select.append(option('支保材質を選択してください'));
      select.disabled = true;
      setStatus(status, '支保材質を選択してください。木材は寸法・自由長、FRP等は確認値が必要です。');
      return;
    }

    const profiles = getSupportProfiles(material.value);
    select.append(option('支保仕様／寸法を選択してください'));
    for (const p of profiles) select.append(option(supportProfileLabel(p), p.id));
    select.disabled = false;

    if (preserve && profiles.some((p) => p.id === previous)) select.value = previous;
    if (!select.value) {
      const msg = material.value === 'timber'
        ? '木材は断面寸法と自由長に一致する参考候補を選択してください。'
        : '材質名だけでは支保力を確定しません。メーカー資料・試験値・設計値に基づく確認値を使用してください。';
      setStatus(status, msg, 'attention');
    }
  }

  function describeDeviceProfile(p) {
    if (!p) return '';
    const source = p.source ? `根拠: ${p.source}` : '';
    const caveat = p.note || p.warning || '';
    const candidate = Number.isFinite(Number(p.candidateMslKn)) ? `参考MSL ${Number(p.candidateMslKn).toFixed(1)} kN` : '';
    return [candidate, source, caveat].filter(Boolean).join(' / ');
  }

  function applyDeviceProfile() {
    const mainMaterial = $('quickMaterial');
    const select = $('quickMaterialProfile');
    const strength = $('quickStrength');
    const status = $('quickMaterialProfileStatus');
    if (!mainMaterial || !select || !strength) return;

    const mapped = DEVICE_MAP[mainMaterial.value] || '';
    const profiles = getDeviceProfiles(mapped);
    const p = profiles.find((x) => x.id === select.value);

    if (!p) {
      syncHiddenDeviceEstimator(mapped, '');
      clearInputValue(strength);
      setStatus(status, '規格・サイズ／表示を選択すると、対応するMSL候補を反映します。', 'attention');
      return;
    }

    if (p.manual || !Number.isFinite(Number(p.candidateMslKn))) {
      syncHiddenDeviceEstimator(mapped, p.id);
      clearInputValue(strength);
      setStatus(status, `${p.label}: 実物の表示LC/MSL・証明書等を確認してMSLを入力してください。${p.source ? ` 根拠: ${p.source}` : ''}`, 'manual');
      strength.focus({ preventScroll: true });
      return;
    }

    // Hidden estimator is kept synchronized for the detailed panel, but we also write
    // the visible value directly so the behavior is deterministic even if that panel is closed.
    syncHiddenDeviceEstimator(mapped, p.id);
    const reference = !!(p.referenceOnly || p.requiresConditionReview || p.requiresConfirmedEvidence || p.evidence === 'reference');
    setInputValue(strength, Number(p.candidateMslKn).toFixed(1), { reference });

    setStatus(
      status,
      `${describeDeviceProfile(p)}${reference ? '。実物の規格・表示・使用条件を確認後、「すべて確認しました」または該当欄の確認を行ってください。' : ''}`,
      reference ? 'reference' : 'confirmed'
    );
  }

  function applySupportProfile() {
    const material = $('quickSupportMaterial');
    const select = $('quickSupportProfile');
    const strength = $('quickSupportStrength');
    const basis = $('quickSupportBasis');
    const status = $('quickSupportProfileStatus');
    if (!material || !select || !strength) return;

    const profiles = getSupportProfiles(material.value);
    const p = profiles.find((x) => x.id === select.value);

    if (!p) {
      clearInputValue(strength);
      if (basis?.dataset.v13103AutoBasis === '1') {
        basis.value = '';
        delete basis.dataset.v13103AutoBasis;
        emit(basis, 'input'); emit(basis, 'change');
      }
      setStatus(status, '支保仕様／寸法を選択すると、参考支保力を反映します。', 'attention');
      return;
    }

    if (p.manual || !Number.isFinite(Number(p.candidateStrengthKn))) {
      clearInputValue(strength);
      if (basis && !basis.value.trim()) {
        basis.value = p.source || '';
        basis.dataset.v13103AutoBasis = '1';
        emit(basis, 'input'); emit(basis, 'change');
      }
      setStatus(status, `${p.label}: メーカー資料・試験値・設計値等で確認した支保力を入力してください。`, 'manual');
      strength.focus({ preventScroll: true });
      return;
    }

    setInputValue(strength, Number(p.candidateStrengthKn).toFixed(1), { reference: true });
    if (basis) {
      basis.value = [p.label, p.source].filter(Boolean).join(' / ');
      basis.dataset.v13103AutoBasis = '1';
      markReference(basis);
      emit(basis, 'input'); emit(basis, 'change');
    }

    const dims = p.dimensions || {};
    const detail = [
      dims.widthMm ? `幅${dims.widthMm}mm` : '',
      dims.heightMm ? `高さ${dims.heightMm}mm` : '',
      dims.freeLengthM ? `自由長${dims.freeLengthM}m` : ''
    ].filter(Boolean).join('・');
    setStatus(
      status,
      `参考支保力 ${Number(p.candidateStrengthKn).toFixed(1)} kN/個${detail ? `（${detail}）` : ''}。実際の寸法・自由長・受け部・施工状態を確認してください。`,
      'reference'
    );
  }


  function applyRestoredSelections() {
    const materialSelect = $('quickMaterialProfile');
    const supportSelect = $('quickSupportProfile');
    const materialRestore = materialSelect?.dataset.v13103RestoreValue || '';
    const supportRestore = supportSelect?.dataset.v13103RestoreValue || '';

    if (materialRestore) {
      populateDeviceProfiles();
      if (Array.from(materialSelect.options).some((o) => o.value === materialRestore)) {
        materialSelect.value = materialRestore;
        const mapped = DEVICE_MAP[$('quickMaterial')?.value || ''] || '';
        const p = getDeviceProfiles(mapped).find((x) => x.id === materialRestore);
        setStatus($('quickMaterialProfileStatus'), p ? `${p.label} を登録済み条件から復元しました。MSL値と実物の規格・表示を再確認してください。` : '登録済みの固縛材仕様を復元しました。', 'reference');
      }
      delete materialSelect.dataset.v13103RestoreValue;
    }
    if (supportRestore) {
      populateSupportProfiles();
      if (Array.from(supportSelect.options).some((o) => o.value === supportRestore)) {
        supportSelect.value = supportRestore;
        const p = getSupportProfiles($('quickSupportMaterial')?.value || '').find((x) => x.id === supportRestore);
        setStatus($('quickSupportProfileStatus'), p ? `${p.label} を登録済み条件から復元しました。支保力と実際の寸法・施工条件を再確認してください。` : '登録済みの支保仕様を復元しました。', 'reference');
      }
      delete supportSelect.dataset.v13103RestoreValue;
    }
  }

  function bindTrustedManual(el, status, manualText) {
    if (!el) return;
    el.addEventListener('input', (ev) => {
      if (!ev.isTrusted) return;
      markConfirmed(el);
      if (status) setStatus(status, manualText, 'manual');
    });
  }

  function init() {
    if (!isTargetPage()) return;
    const mainMaterial = $('quickMaterial');
    const materialProfile = $('quickMaterialProfile');
    const supportMaterial = $('quickSupportMaterial');
    const supportProfile = $('quickSupportProfile');
    if (!mainMaterial || !materialProfile || !supportMaterial || !supportProfile) return;

    document.documentElement.dataset.v13103MaterialStrengthLinkage = 'ready';

    populateDeviceProfiles();
    populateSupportProfiles();
    applyRestoredSelections();

    mainMaterial.addEventListener('change', () => {
      populateDeviceProfiles();
      clearInputValue($('quickStrength'));
    });
    materialProfile.addEventListener('change', applyDeviceProfile);

    supportMaterial.addEventListener('change', () => {
      populateSupportProfiles();
      clearInputValue($('quickSupportStrength'));
      const basis = $('quickSupportBasis');
      if (basis?.dataset.v13103AutoBasis === '1') {
        basis.value = '';
        delete basis.dataset.v13103AutoBasis;
        emit(basis, 'input'); emit(basis, 'change');
      }
    });
    supportProfile.addEventListener('change', applySupportProfile);

    const transport = $('quickTransport') || $('transportMode');
    transport?.addEventListener('change', () => populateDeviceProfiles({ preserve: true }));

    bindTrustedManual($('quickStrength'), $('quickMaterialProfileStatus'), '手入力値を使用中です。実物の表示・証明書等との一致を確認してください。');
    bindTrustedManual($('quickSupportStrength'), $('quickSupportProfileStatus'), '手入力値を使用中です。実際の支保条件・根拠との一致を確認してください。');

    window.addEventListener('sk:ctu-restored', () => window.setTimeout(applyRestoredSelections, 20));

    document.addEventListener('sk:ctu-system-applied', (ev) => {
      const fields = ev.detail?.fields || [];
      if (fields.includes('quickStrength')) markConfirmed($('quickStrength'));
      if (fields.includes('quickSupportStrength')) markConfirmed($('quickSupportStrength'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(init, 80), { once: true });
  } else {
    window.setTimeout(init, 80);
  }
})();
