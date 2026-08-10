# SKDG v1.3.52 CTU進捗連携・追尾修正

- 初期表示値（5t、2本、MSL等）を「入力済み」と判定しない。
- 実際の手入力、登録案件反映、Excel取込、写真反映を入力進捗に連携。
- `sk:ctu-calculated` は実際の算出操作後に発火。
- `sk:ctu-registered` は保存成功後にのみ発火。
- 条件変更後は「再算出必要」とし、登録ボタンを再算出まで無効化。
- 初期表示時の自動 `calc()` を停止。
- 旧 cleanup による登録ボタン強制有効化と監視を停止。
- 追尾は JavaScript の fixed 切替を廃止し、ヘッダー直下の native `position: sticky` に一本化。
