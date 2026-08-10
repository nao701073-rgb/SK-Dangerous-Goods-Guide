# SKDG v1.3.14 原典ジャンプ再検証

## 修正概要

「固縛力参考算出 ― 使用根拠」の各「原典ページへジャンプ」を、実際にその根拠記載を確認できるページへ再割当しました。

### 1. 海上輸送 海域A/B/C

v1.3.13では海域A/B/Cの根拠を CSS Code Annex 13 Table 2–4 に結び付けていましたが、これは不適切でした。

正しくは **CTU Code 第5章 5.3** の海上輸送表です。

- 海域A: Hs ≤ 8 m
- 海域B: 8 m < Hs ≤ 12 m
- 海域C: Hs > 12 m
- 海域Bの加速度係数: cx=0.3、cy=0.7

そのため輸送条件の原典ジャンプは、ローカル原典 `references/originals/ctu-code-ja.pdf#page=17` に変更しました。

なお画面上の「（標準）」は原典の用語ではなく、本システムの初期選択を示す表示です。

### 2. 摩擦係数

摩擦は根拠の種類ごとにジャンプ先を分けました。

- 通常の推奨静止摩擦係数: CTU Code Annex 7 Appendix 2 / PDF page 109
- 汚損・氷雪・油脂等の例外条件: PDF page 110
- 直接固縛で静止摩擦係数の75%を使用: Annex 7 2.2.2.2 / PDF page 81

### 3. MSL・取付点強度

- MSLと破断強度の関係: CTU Code Annex 7 / PDF page 85
- ウェビング等: PDF page 86
- 貨物側取付部、CTU側固縛点、採用MSL: CTU Code Annex 7 4.3.2.1 / PDF page 98
- CSS Code Annex 13 4.4: 固縛構成要素が直列につながる場合は、その直列要素の最小MSLを使用

貨物側取付部MSL、CTU側固縛点MSL、採用MSLでは、CTU Code page 98 と CSS Code Annex 13 §4 / Table 1 の双方を確認できるようにしました。

### 4. 角度・支保

- 直接固縛の鉛直角: CTU Code Annex 7 4.3.2.2 / PDF page 98
- 直接固縛と木製支保等の併用: CTU Code Annex 7 4.1.6 / PDF page 94
- 一般的な固縛原則: PDF page 93

## 原典ジャンプを付けない項目

利用者から不要指定された以下には、原典ジャンプを表示しません。

- CTU構造区分
- コンテナサイズ・種類
- メーカー例示の参考内寸
- 貨物寸法
- 貨物質量・貨物名
- 固縛方法
- 本数
- MSL合計表示

また「原典をまとめて確認」欄は引き続き表示しません。

## CSS Codeのページ対応

Part478で照合した MSC.1/Circ.1623 Annex 13 のページ対応を再確認しました。

- Annex page 2（PDF物理 page 3）: §4 Strength of securing equipment / Table 1 / §4.4
- Annex page 4（PDF物理 page 5）: Table 2
- Annex page 6（PDF物理 page 7）: Table 3
- Annex page 7（PDF物理 page 8）: Table 4
- Annex page 8（PDF物理 page 9）: Table 5
- Annex page 9（PDF物理 page 10）: Table 6

海域A/B/Cの定義はCSS Code Table 2–4ではなく、CTU Code 第5章5.3を使用します。

## 版・DB

- 内部技術版: v1.3.14
- 画面表示: Version 1.0 試作版
- DBマイグレーション: なし
