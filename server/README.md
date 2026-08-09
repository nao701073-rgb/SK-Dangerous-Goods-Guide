# クラウド対応オンラインAPI（試験運用準備版）

## 構成
- クラウドWebサービス: HTTPS終端、Node.js/Express API実行
- Node.js/Express: 認証、権限、申請番号、写真、同期、監査ログ
- PostgreSQL: 中央データベース
- クラウド永続ディスク: 写真保存（将来はオブジェクトストレージも検討）

## 実装済み
- JWTローカル認証と将来のOIDC設定枠
- ログイン失敗回数による一時ロック
- パスワード強度、期限、初回変更制御
- 事業所スコープと安全環境室の全事業所閲覧
- 写真枚数・容量制限のサーバー側強制
- 安全環境室による事業所別写真上限変更API
- バージョン番号による更新競合検出
- 同期IDによる冪等性・二重送信防止
- 監査ログ保存・削除API
- DB・写真バックアップ、復元、整合性確認スクリプト
- TLS期限確認スクリプト

## クラウド初期起動
1. `.env.cloud.example`を参考に、クラウドのSecret機能へ環境変数を登録する。
2. マネージドPostgreSQLの`DATABASE_URL`を設定する。
3. 写真保存用の永続ディスクを`/var/data`へ割り当てる。
4. Node.jsコンテナをデプロイする。
5. `npm run migrate`を実行する。
6. `npm run seed`を実行する。
7. `/api/health`を確認する。

詳細は`docs/本番導入設定手順書.md`、`運用管理手順書.md`、`バックアップ復元手順書.md`を参照してください。

## Part 90追加
- `PUT /api/photos/:id`: コメント、撮影日時、代表写真、状態の更新
- `GET /api/admin/access-summary`: 権限マトリクス、事業所・利用者集計
- `GET /api/admin/preflight`: DB、写真保存先、JWT、CORS、認証、HTTPS、バックアップ設定の診断
- `004_part90_features.sql`: 代表写真列と索引、申請状態の初期値
- ブラウザ側は送信後に中央データを再取得し、他端末・他事業所の最新情報を反映します。


## Login ID and email MFA

Run migrations including `005_login_id_email_mfa_kawasaki_pilot.sql`. Configure the internal SMTP variables in `.env`. Users sign in with a login ID and password, then enter the six-digit code sent to their registered internal email address. Run `npm run seed:kawasaki-pilot` for the Kawasaki pilot accounts and sample records.


## Part 114 migration

写真完全削除計画の承認担当者・承認期限・実行期限を追加する場合は、次を適用してください。

```bash
psql "$DATABASE_URL" -f sql/021_photo_purge_deadlines.sql
```


## Part 192 クラウド運用
社内サーバーを設置せず、クラウドWebサービス、マネージドPostgreSQL、永続ディスクを使用します。詳細は`docs/クラウド運用_構築手順書.md`を参照してください。

## Part 503: 中央保存・承認・訂正履歴・バックアップ

Part 503では添付ファイル保存を `src/storage.js` に集約し、永続ファイルシステムまたはS3互換ストレージを選択できます。申請資料・写真・法令原典は保存時と取得時にSHA-256を照合します。

追加マイグレーション：

```sh
node scripts/migrate.js
```

主な環境変数：

- `STORAGE_PROVIDER=filesystem|s3`
- `ATTACHMENT_STORAGE_DIR`
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_PREFIX`
- `BACKUP_INTERVAL_HOURS`, `BACKUP_RETENTION_DAYS`
- `OFFSITE_BACKUP_COMMAND`, `OFFSITE_BACKUP_LOCATION`

バックアップ検証：

```sh
sh scripts/verify-backup.sh /backups/backup_YYYYMMDD_HHMMSS
```

静的サイトだけを公開しても中央保存やサーバー側権限制御は有効になりません。PostgreSQL、API、永続ストレージ、TLS終端を含む構成で運用してください。

## Part 507: 正式運用準備 第1段階

本番環境では、ブラウザ保存のBearerトークンではなく、PostgreSQLに保存するサーバーセッションを使用します。

- 認証Cookie: `HttpOnly`, `Secure`, `SameSite`
- 更新系API: CSRFトークン必須
- セッション: アイドル期限、絶対期限、利用者単位の最大同時数、強制失効
- 権限: APIごとに役割と所属事業所を再確認
- 保存: PostgreSQLと永続ファイルシステムまたはS3互換ストレージ
- 監査: ログイン成功・失敗、強制ログアウト、更新・削除を記録

追加マイグレーション:

```sh
node scripts/migrate.js
```

本番必須設定:

```env
NODE_ENV=production
SERVER_SESSION_ENABLED=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=Strict
LEGACY_BEARER_AUTH_ENABLED=false
ENFORCE_HTTPS=true
CORS_ORIGINS=https://<正式なWeb画面のURL>
```

Web画面とAPIが異なるサイトに配置される場合のみ、`SESSION_COOKIE_SAME_SITE=None`とし、必ずHTTPSを使用してください。原則は同一サイト配下への配置を推奨します。

管理者は「設定 → セキュリティ・監査管理 → 正式運用準備 第1段階」で、DB、永続ストレージ、Cookie、CSRF、CORS、HTTPS、事業所スコープを診断できます。診断だけでは完了ではなく、導入先環境で次を実施してください。

1. 登録データを保存する。
2. APIとDBを再起動する。
3. 保存内容が保持されることを確認する。
4. 別事業所の利用者が対象データを取得・変更できないことを確認する。
5. ゲストの直接URL・APIアクセスが拒否されることを確認する。

## Part 509：著作権・社内公開範囲

原典PDF、抜粋、ページ画像、整理情報をファイル単位で台帳化し、権利者・利用条件・公開範囲を管理します。

```bash
npm run migrate
npm run rights:scan
npm run rights:catalog
npm run security:phase3
```

外部公開用パッケージは、管理画面から出力した決定台帳JSONを指定して生成します。

```bash
npm run build:public-sanitized -- --scope public-approved --decisions ./publication-rights-decisions.json --output ./data/public-release/public-approved
```

画面上のリンク制御だけでは直接URLを防止できないため、外部公開には必ずサニタイズ済みパッケージを使用してください。

## Part 510：バックアップ・復元・システム全体移行試験

第4段階では、データベース、添付ファイル、アプリケーション本体、全マスター、設定および履歴を一体として保護し、隔離環境で復元・移行を試験します。

```bash
npm run migrate
npm run release:package -- --release part510
npm run release:verify -- /path/to/system-release_part510.tar.gz
npm run restore:drill -- /path/to/backup-directory
npm run migration:drill -- /path/to/system-release_part510.tar.gz
npm run security:phase4
```

本番切替は、事前承認された保守時間帯に限り、次の順で実施してください。

1. 完全バックアップを取得する。
2. 隔離環境で復元訓練を実施し、DB件数・添付ファイル・チェックサムを確認する。
3. システム全体の移行訓練を実施する。
4. リリースをステージングし、整合性・JavaScript構文・ヘルスチェックを確認する。
5. `release:activate`で原子的に切り替える。
6. 異常時は`release:rollback`で直前版へ戻す。

管理画面の「正式運用準備 第4段階」は、設定・結果・証跡を登録する画面です。OSコマンドやデータベース操作をブラウザから直接実行するものではありません。実行権限はサーバー管理者に限定してください。

秘密情報（平文パスワード、MFA秘密鍵、APIトークン、セッション情報、`.env`）は、システムリリースパッケージに含めません。移行先では秘密管理基盤から再設定してください。
