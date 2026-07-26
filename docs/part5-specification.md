# 第5回実装仕様：公的原典・関連資料レジストリ

## 公的原典
法令・条約のレコードには、以下を登録可能とする。

- publisher
- url
- lawNumber
- lawId
- officialName
- officialNameEn
- revisionDate
- effectiveDate

## 関連資料レジストリ
`database/references/documents.json`

管理項目:
- documentId
- title
- category
- language
- sourceType
- fileName
- status
- tags

## オフライン表示
ブラウザで直接開けるよう、JSONと同内容のJavaScriptデータファイルも生成する。

- `data/regulation-registry.js`
- `data/reference-documents.js`

## セキュリティ
公的原典リンクは新しいタブで開き、`rel="noopener noreferrer"`を付与する。
