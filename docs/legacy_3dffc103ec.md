# Part453 更新内容

- 申請書確認で旧形式Excel（.xls）の読み込み処理を強化。
- Uint8Array、ArrayBuffer、binary stringの順に複数方式で自動再試行。
- 日本語旧形式Excel向けにコードページ932を指定。
- 誤解を招く「破損・パスワード保護」の固定エラー表示を廃止し、実際の読み取りエラーを表示。
- 動作確認対象：SKShinsei_z1785503891000.xls、SKShinsei_z1785551414000.xls。
