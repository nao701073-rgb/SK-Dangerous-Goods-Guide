# SKDG 更新履歴ファイル保管

このフォルダには、システム本体の実行には不要な開発・更新履歴ファイルをまとめて保管します。

- `part-file-lists/` : `PARTxxx_UPDATE_FILE_LIST.json`
- `checksums/` : `SHA256SUMS_PARTxxx...`
- `part-notes/` : `README_PARTxxx...`
- `legacy/` : `LEGACY_FILENAME_MAP.txt`
- `release-checksums/` : 過去バージョンの `SHA256SUMS_v1.3.xx.txt`
- `release-instructions/` : 過去バージョンの `UPDATE_INSTRUCTIONS_v1.3.xx.txt`

既存リポジトリのルート直下を整理する場合は、リポジトリ直下の
`ORGANIZE_UPDATE_HISTORY.cmd` を1回実行してください。

共通 `SHA256SUMS` / `SHA256SUMS.txt`、`release-manifest.json`、`index.html`、`VERSION.json` 等はルートに残します。
