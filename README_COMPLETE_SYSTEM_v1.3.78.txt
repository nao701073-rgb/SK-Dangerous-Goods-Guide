SKDG / 検査・検品業務サポートシステム
v1.3.78 COMPLETE SYSTEM PACKAGE

このフォルダーは、v1.3.78 時点の「更新差分」ではなく、システム構築一式を単独で保管・再配置するための完全統合パッケージです。

【含まれる主な構成】
- index.html / 各業務画面
- assets/ : CSS、JavaScript、共通UI・業務ロジック
- data/ : 危険物・判定・固縛等の静的データ、ビルド情報
- database/ : 国内法令、IMDG関連、標札、参照・規則データ
- images/ : システムで使用する画像資産
- references/ : 原文・参照資料、抜粋資料
- pages/ : 申請書確認、申請番号管理、固縛力参考算出、危険物詳細、法令・資料、設定・管理画面等
- server/ : APIサーバー、SQL、migration/seed、運用・バックアップ・検証スクリプト、nginx設定等
- schemas/ : データスキーマ
- templates/ : テンプレート
- tools/ : 検証・構築補助ツール
- docs/ : 仕様、更新履歴、検証レポート、運用資料
- Part / Version 系の更新履歴・ファイルリスト・チェックサム

【再構築履歴】
Part 534 完全スナップショット（23分割）を基礎に、回収済みの Part 534以降の更新を順次適用し、Part 590、その後の v1.0～v1.3.28 系更新を適用後、v1.3.78 累積版を最終適用しています。
詳細は RECONSTRUCTION_CHAIN_v1.3.78.txt を参照してください。

【完全パッケージ作成時の確認】
- HTML内のローカル参照確認
- CSS url() のローカル参照確認
- JSON構文確認
- JavaScript / CJS / MJS の Node.js 構文確認
- HTML script/style タグバランス確認
- フォントファイルは含まれていません

詳細結果は docs/complete-package/ と COMPLETE_PACKAGE_MANIFEST_v1.3.78.json を参照してください。

【重要】
このパッケージは「システム構築ファイル一式」です。外部DB、ブラウザlocalStorage、クラウドストレージ等にだけ存在する実運用中の個別案件データは、元の回収済みシステムファイルに含まれているものを除き、このZIPだけから新たに取得するものではありません。
