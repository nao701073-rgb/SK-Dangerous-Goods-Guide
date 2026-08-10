# SKDG v1.3.44 ルート更新履歴整理

## 目的
GitHubリポジトリのルート直下に増えた開発・更新履歴ファイルを、`docs/update-history/` 配下へまとめます。

## 自動整理対象
- `PART*_UPDATE_FILE_LIST*.json`
- `SHA256SUMS_PART*`
- `README_PART*`
- `LEGACY_FILENAME_MAP.txt`
- `SHA256SUMS_v1.3.xx.txt`
- `UPDATE_INSTRUCTIONS_v1.3.xx.txt`

## ルートに残すもの
- `index.html`
- `VERSION.json`
- `release-manifest.json`
- 共通 `SHA256SUMS` / `SHA256SUMS.txt`
- システム本体の主要フォルダ・ファイル

## 実行方法
v1.3.44の内容をリポジトリへ上書き後、`ORGANIZE_UPDATE_HISTORY.cmd` を1回実行します。
その後 `git status` → `git add -A` → `git commit` → `git push` の順で反映します。

システム本体、画面、DB、判定ロジックには変更を加えません。
