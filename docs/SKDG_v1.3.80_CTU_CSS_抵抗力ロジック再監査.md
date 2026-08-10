# SKDG v1.3.80 CTU Code／CSS Code 抵抗力ロジック再監査

## 目的
v1.3.79を基準に、「現在の評価抵抗力が大きく見える」事象について、計算順序を CTU Code A/B/C海域 → 方向別慣性力 → 摩擦 → CTU境界 → 支保 → 固縛材 → 最弱MSL の順に再監査した。

## 参照基準
- IMO/ILO/UNECE Code of Practice for Packing of Cargo Transport Units (CTU Code), MSC.1/Circ.1497
  - Chapter 5, 5.3: longitudinal / transverse directions are assessed separately.
  - Sea area A: longitudinal 0.3g with cz 0.5g; transverse 0.5g with cz 1.0g.
  - Sea area B: longitudinal 0.3g with cz 0.3g; transverse 0.7g with cz 1.0g.
  - Sea area C: longitudinal 0.4g with cz 0.2g; transverse 0.8g with cz 1.0g.
  - Annex 7, 2.2.2: friction force FF = μ × cz × m × g.
  - Annex 7, 2.2.2.2: direct securing uses 75% of the applicable static friction factor.
  - Annex 7, 4.1.6: securing devices of substantially different load-deformation behaviour should not simply be placed in parallel unless used for distinguishable purposes.
  - Annex 7, 4.2.3: strong boundary balance uses r(x,y) × P × g + μ × cz × m × g.
  - Annex 7, 4.4: expected external force is m × g × c(x,y), evaluated against the securing arrangement.
- IMO CSS Code / Annex 13: CTU Code sea-area A/B/C is not substituted for the ship-specific CSS acceleration calculation. Cargo Securing Manual takes priority where applicable.

## 監査結果
### 1. A/B/C海域の方向別加速度
v1.3.79の係数自体はCTU Code Chapter 5と一致していた。
- A: 前後 0.3g / 側面 0.5g
- B: 前後 0.3g / 側面 0.7g
- C: 前後 0.4g / 側面 0.8g
対応する最小鉛直下向き係数 cz も A=0.5/1.0, B=0.3/1.0, C=0.2/1.0 で一致。

貨物質量を「前後40% + 側面60%」へ分配する計算は採用していない。各方向を独立した荷重ケースとして評価する。

### 2. 方向別慣性力
CTU Codeでは F = m × 9.81 × c(x,y) を使用する。
10 t貨物の確認例:
- A: 前後 29.43 kN / 側面 49.05 kN
- B: 前後 29.43 kN / 側面 68.67 kN
- C: 前後 39.24 kN / 側面 78.48 kN

### 3. 摩擦
FF = μ × cz × m × g を使用。直接固縛が作用する方向では μ を75%へ低減する既存処理はCTU Code Annex 7 2.2.2.2に整合していた。

### 4. CTU境界抵抗
r(x,y) × P × g の既存式を維持。ただし、CTU最大積載量Pが入力され、かつ貨物が境界へ密着し、隙間・衝撃荷重・局部過負荷を避けて荷重伝達できることを個別確認した場合だけ算入する。

### 5. 支保・CTU受け部
壁／フレームへ支保する場合、支保材側とCTU受け部側の小さい能力を荷重経路の上限とし、同じ経路でCTU境界抵抗を二重加算しない既存処理を維持。

### 6. 支保・直接固縛・CTU境界の併用
再監査で、単純加算を防ぐだけでなく「強い方を採用する」処理にも改善余地があると判断した。CTU Code Annex 7 4.1.6は、荷重変形特性が異なる直接固縛装置を同じ滑動防止目的で並列に扱わないこと、例えば木材ブロッキングと直接ウェブラッシングを並列使用する場合は、より剛な木材ブロッキング側を単独で期待荷重に耐えるよう設計することを求めている。

そのため v1.3.80 では、同一滑動方向について:
- CTU境界／支保の剛性経路が成立する場合は `max(CTU境界, 支保)` を機械的抵抗として採用。
- その場合、伸びを伴う直接固縛は同一滑動抵抗へ加算しない。
- CTU境界／支保がない場合に限り、直接固縛を機械的抵抗として採用。
- トップオーバーは摩擦固縛として別扱いを維持。
- 「承認済み併用」を選択しても、この簡易参考算出では剛性の異なる要素の算術加算を再有効化しない。滑動防止・転倒防止など目的が区別された承認計算は承認資料側で確認する。

これにより、直接固縛の数値が支保経路より大きいだけで、実際には先に作用する剛性支保を無視して大きな合計抵抗力になる経路を防止した。

### 7. 最弱MSL
v1.3.79の「固縛材MSL・貨物側取付部MSL・CTU側固縛点MSLの最小値を採用」は維持。CTU側固縛点を主確認値として表示するが、計算上は常に3要素の最小値を使う。

## 今回発見・修正した重要点
v1.3.79までの直接固縛計算では、固縛材・貨物側・CTU側の3つのMSLのうち1つが未入力でも、入力済み要素だけの最小値を使用して直接固縛抵抗へ算入できる経路が残っていた。

v1.3.80では、3要素がすべて正の確認値でそろわない限り、その直接固縛の抵抗力を0 kNとして扱う。簡単入力では算出自体を停止し、未確認MSLを入力するよう案内する。

これにより、未確認のCTU側固縛点や貨物側取付部を無視して大きな固縛抵抗が表示されることを防止する。

## 表示改善
算出結果に「方向別設計荷重」を追加し、各方向について c, cz, F=m×9.81×c, 摩擦抵抗を表示する。
「貨物質量を40%+60%へ分配しない」ことを画面上でも明示する。
「現在の評価抵抗力」は「評価抵抗力（重複制限後）」へ変更し、二重計上を防止している値であることを明確化した。

## CSS Code
CSS CodeモードはCTU Code A/B/C海域係数を使用せず、MSC.1/Circ.1623で改正されたAnnex 13の船舶条件側計算を独立して使用する。今回、表2・表3・表4・表5・縦方向摩擦のfz・MSL換算係数・CS安全率・有義波高低減係数まで再照合した。

確認結果:
- 表2の基本加速度（積付位置0.1L～0.9L、on deck high/low、'tween deck、lower hold）を原文表と照合し一致。
- 表3の船長／service speed補正式 `0.345×v/√L + (58.62×L−1034.5)/L²` を維持。
- 表4のB/GM補正値を原文表と照合し一致。
- 表5の摩擦係数は timber–timber 0.4、steel–timber/steel–rubber 0.3、steel–steel dry 0.1、wet 0.0 と一致。
- 縦方向滑動の `fz` は μ=0/0.1/0.2/0.3/0.4/0.6 に対して 0.20/0.50/0.70/0.80/0.85/0.90 と一致。
- Advanced method のCSは MSL/1.5、alternative method は MSL/1.35 を維持。
- 貨物頂部を越えるトップオーバーはCSS Annex 13の平衡計算では直接固縛抵抗として算入しない。
- MSLはCSS側でも器具・貨物側・船側固縛点の3要素がそろわない場合は0 kNとして算入しない。

再監査で1点、速力補正の扱いを修正した。従来は入力速力が15kn未満の場合に横加速度だけ15kn相当へ固定する処理があったが、Annex 13 7.1.7の表3は「船舶のservice speed」に対して適用するため、service speed自体が15kn未満の船を15knへ引き上げるのは正確ではない。一方、7.2.6.3に基づく「service speedより低い減速運航速力」は横加速度の低減には使えない。そこでv1.3.80では入力欄を明確にservice speedとして扱い、15knへの固定処理を廃止した。減速運航を根拠とする場合はCargo Securing Manual等の確認値を手動入力する案内とした。

## 検証
`tools/verify-ctu-securing-v1380.mjs` で50項目を自動検証し、50/50 PASS。
DBマイグレーションなし。
