# SKDG v1.3.43 PART更新履歴ファイル整理

## 変更内容
- リポジトリ直下の `PART*_UPDATE_FILE_LIST*.json` を一括整理するスクリプトを追加。
- 移動先: `docs/update-history/part-file-lists/`
- Windows用: `ORGANIZE_PART_FILE_LISTS.cmd`
- PowerShell本体: `ORGANIZE_PART_FILE_LISTS.ps1`
- 移動後に `PART_FILE_LIST_INDEX.json` を自動生成。

## 安全性
現在の累積Hotfix内を検索し、`PARTxxx_UPDATE_FILE_LIST.json` をシステム本体から直接参照する箇所がないことを確認したうえで整理用ツールを追加しています。
