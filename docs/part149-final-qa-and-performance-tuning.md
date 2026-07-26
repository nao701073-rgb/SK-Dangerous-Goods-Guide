# Part 149 総合試験・不具合修正・軽量化

## 実施内容
- 全26 HTMLのローカル参照、重複IDを自動検査
- JavaScript/MJS 75ファイルの構文検査
- JSON/JSON Schema 56ファイルの構文検査
- HTMLのキャッシュバスターを Part 149 に統一
- アプリ設定を試験運用候補版 `1.0.0-rc1` に更新
- 1MB以上の大型資産を診断レポートへ記録
- PNG画像192件の読込整合性を確認
- 再実行可能な静的QAスクリプト `tools/qa-static.mjs` を追加

## QA実行
```bash
cd server
npm run qa:static
```

結果は `docs/part149-static-qa-report.json` に保存されます。

## 容量方針
法令原本PDFは監査証跡として保持し、単純削除や画質低下を行いません。検索画面で必要なデータのみを読み込み、PDFや参照画像は該当画面から開く構成を維持します。
