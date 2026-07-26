# 第17回実装

## 検索
全角数字・英数字をUnicode NFKCで正規化して検索する。

例:
- `３０７７`
- `ＵＮ３０７７`
- `UN3077`

を同じ検索値として扱う。

## 表示例
`ENVIRONMENTALLY HAZARDOUS SUBSTANCE, SOLID, N.O.S. (Technical Name)`

## 法令表示
- 危告示: 常時表示・主表示
- IMDG Code参照先: ユーザー設定でON/OFF
- 設定はlocalStorageへ保存
