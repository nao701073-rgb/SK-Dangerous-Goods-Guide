# 第9回実装仕様：危険物標札

## 自動選択
- class → 正標札
- subsidiaryRisk → 副標札
- 等級 9かつ品名にlithium／リチウムを含む → リチウム電池用Class 9
- marinePollutantが該当 → 海洋汚染物質標識

## ファイル
- `database/labels/label-master.json`
- `data/label-master.js`
- `assets/js/label-resolver.js`
- `images/labels/*.svg`

## 注意
商品画像の複製は行わない。
標札画像はシステム用の独自SVGとして管理する。
