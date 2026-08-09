window.SK_PUBLICATION_SCOPE_POLICY = Object.freeze({
  version: 'part509',
  defaultMode: 'prototype-review',
  modes: {
    'prototype-review': { label:'試作・権利確認中', enforce:false, audience:'prototype' },
    'internal-authenticated': { label:'社内・認証済み利用者', enforce:true, audience:'internal' },
    'internal-restricted': { label:'社内・権限者限定', enforce:true, audience:'restricted' },
    'public-approved': { label:'外部公開・承認済みのみ', enforce:true, audience:'public' }
  },
  statusLabels: {
    unreviewed:'未確認', prepared:'確認準備済み', submitted:'権利確認待ち', reviewed:'確認済み・承認待ち',
    approved:'利用承認済み', restricted:'社内限定', 'metadata-only':'書誌情報のみ', prohibited:'利用不可', expired:'期限切れ'
  },
  publicTreatmentLabels: {
    full:'全文・ファイル表示', excerpt:'承認済み抜粋のみ', 'metadata-only':'書誌情報のみ', 'external-link-only':'公式外部リンクのみ', blocked:'表示しない'
  },
  patterns: [
    { test:'references/originals/imdg', sourceClass:'licensed-international-code', fallbackTreatment:'metadata-only' },
    { test:'references/excerpts/imdg', sourceClass:'licensed-international-code', fallbackTreatment:'metadata-only' },
    { test:'assets/pdf-page-images/imdg-code', sourceClass:'licensed-international-code', fallbackTreatment:'metadata-only' },
    { test:'database/imdg/', sourceClass:'licensed-international-code', fallbackTreatment:'metadata-only' },
    { test:'references/originals/ctu-code', sourceClass:'international-guidance', fallbackTreatment:'external-link-only' },
    { test:'references/originals/marpol', sourceClass:'international-guidance', fallbackTreatment:'external-link-only' },
    { test:'references/originals/dangerous-goods-', sourceClass:'official-domestic-law', fallbackTreatment:'external-link-only' },
    { test:'references/originals/radioactive-materials-', sourceClass:'official-domestic-law', fallbackTreatment:'external-link-only' },
    { test:'assets/domestic-law-', sourceClass:'official-domestic-law', fallbackTreatment:'external-link-only' },
    { test:'references/excerpts/ai-', sourceClass:'internal-created-source-dependent', fallbackTreatment:'blocked' },
    { test:'database/reference/ai-summaries', sourceClass:'internal-created-source-dependent', fallbackTreatment:'blocked' }
  ]
});
