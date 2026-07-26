# 第99回 データ構造標準化・整合性検証

## 目的
危険物データ、組織情報、申請番号、写真、利用者情報が増加した場合でも、画面・静的データ・社内API・PostgreSQL間で項目名や型がずれないよう、Version 1.0のデータ契約を明文化する。

## 1. データ層の区分

| 層 | 主なデータ | 正本 | 更新方法 |
|---|---|---|---|
| 法令・危険物マスタ | UN別表、包装、積載方法、隔離、EmS、標札 | 配布版の静的データ | 管理された版更新 |
| 組織・権限マスタ | ブロック、事業所、役割、権限 | PostgreSQL | 安全環境室管理者 |
| 業務データ | 申請番号、進捗、荷送人、品名、備考 | PostgreSQL | 権限を持つ利用者 |
| 写真メタデータ | 申請番号紐付け、ファイル名、容量、ハッシュ | PostgreSQL | 写真登録時 |
| 写真実体 | 原本画像・表示用画像 | 管理ストレージ | API経由 |
| 監査データ | ログイン、登録、変更、削除、管理操作 | PostgreSQL | システム自動記録 |

## 2. 画面別の主要データ項目

### 危険物検索・詳細
`unNumber`、`properShippingNameJa`、`properShippingName`、`classification`、`class`、`subsidiaryRisk`、`packingGroup`、包装コード、`specialProvisions`、`stowage`、`segregation`、`labels`、`marinePollutant`、`ems`、`sourcePage`、`sourceRow`を使用する。

### 申請番号管理
`id`、`clientId`、`applicationNumber`、`shipper`、`cargoName`、`note`、`status`、`blockId`、`officeId`、`createdBy`、`updatedBy`、`version`、作成・更新日時を使用する。

### 写真管理
`id`、`clientId`、`applicationId`、`blockId`、`officeId`、`originalName`、`storedName`、`mimeType`、`fileSize`、`sha256`、`shootingAt`、`registeredByName`、`comment`、`version`を使用する。

### 利用者・権限管理
個人単位の`loginId`、表示名、任意メールアドレス、役割、所属事業所、状態、ロック状態、最終ログイン日時を使用する。共通アカウントは使用しない。事業所管理者は所属事業所内、安全環境室管理者は全事業所を操作範囲とする。

## 3. IDと命名規則
- ブロックID、事業所IDは変更されにくい英小文字の固定IDとする。
- 画面・APIはcamelCase、PostgreSQLはsnake_caseを使用する。
- API境界で明示的に相互変換し、画面側でDB列名を直接扱わない。
- 業務データの主キーはUUID、監査ログは連番、静的UNレコードは`sourcePage + sourceRow`を版内識別子として扱う。
- 同じUN番号には複数の品名・容器等級・条件が存在し得るため、UN番号だけを一意キーにしない。

## 4. JSON Schema
`schemas/`に次の契約を追加した。
- `un-record.schema.json`
- `organization-master.schema.json`

Schemaは項目仕様の基準として使用し、既存ブラウザ用JavaScriptを直ちにJSONへ全面移行させるものではない。

## 5. 自動整合性検証
`server`ディレクトリで次を実行する。

```bash
npm run validate:data
```

検証対象:
- UN番号が4桁であること
- 必須品名・分類・等級・出典が存在すること
- 配列・真偽値の型が正しいこと
- 出典ページ・行の重複がないこと
- 組織ID・事業所コードが重複しないこと
- ブロック・事業所の必須項目が存在すること

特別規定の重複など、原データ抽出上の確認候補はエラーではなく警告として報告する。法令原文に基づく意図的な重複を自動削除しない。

## 6. テーブル関係
- `blocks 1 ─ N offices`
- `offices 1 ─ N users`
- `offices 1 ─ N applications`
- `applications 1 ─ N photos`
- `users 1 ─ N applications/photos/audit_logs`
- 論理削除対象は`deleted_at`で管理し、同期競合判定には`version`を使用する。

## 7. 今後の移行順序
1. 静的データ検証を更新作業の必須手順にする。
2. APIレスポンスの共通形式とエラーコードを固定する。
3. 申請番号・写真・利用者の画面モデルとAPIモデルを統一する。
4. UNデータ更新時に件数、ハッシュ、出典版を記録する。
5. 必要になった段階でUNデータを分割JSONまたはAPI検索へ移行する。

## 変更ファイル
- `schemas/un-record.schema.json`
- `schemas/organization-master.schema.json`
- `server/scripts/validate-static-data.js`
- `server/package.json`
- `data/app-config.json`
- `README.md`
