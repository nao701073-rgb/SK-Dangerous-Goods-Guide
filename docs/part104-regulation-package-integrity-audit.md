# 第104回 法令更新パッケージ整合性監査

## 目的
法令PDF、構造化データ、更新マニフェストを公開後も再検証し、原本差し替え、データ欠落、件数不一致、識別キー重複を検知する。

## 監査対象
- 原本PDFの存在、拡張子、SHA-256
- 構造化データの存在、SHA-256、JSON構文
- レコード件数とexpectedRecordCount
- recordKeyの欠落・重複
- 監査結果自体のSHA-256

## 公開統制
監査結果が attention-required の場合は、該当版を要確認扱いとし、再公開・差し替え・承認を停止する。修正後は旧監査記録を残したまま再監査する。

## サーバー実行
`npm run audit:regulation -- /path/to/regulation-update-manifest.json`
