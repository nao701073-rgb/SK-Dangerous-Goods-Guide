# 社内オンラインAPI（本番移行準備版）

## 構成
- Nginx: HTTPS終端、静的ファイル配信、APIリバースプロキシ
- Node.js/Express: 認証、権限、申請番号、写真、同期、監査ログ
- PostgreSQL: 中央データベース
- Docker volume: 写真・バックアップ保存

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

## 初期起動
1. `.env.example`を`.env`へコピーし、すべての秘密情報を変更する。
2. `POSTGRES_PASSWORD`をシェル環境または安全な秘密情報管理から設定する。
3. 証明書を`nginx/certs/`へ配置する。
4. `docker compose up -d --build`
5. `docker compose exec api npm run migrate`
6. `docker compose exec api npm run seed`
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
