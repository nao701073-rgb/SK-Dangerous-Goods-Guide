# 第6回実装仕様：申請番号・写真管理

## 申請番号
主キーは内部IDとし、申請番号は業務上の一意項目として重複を防止する。

保存項目:
- id
- applicationNumber
- shipper
- cargoName
- office
- note
- createdAt
- updatedAt
- status

## 写真
保存項目:
- id
- applicationId
- applicationNumber
- fileName
- mimeType
- dataUrl
- comment
- shootingAt
- registeredAt
- registeredBy
- office
- gps
- status

## GPS
任意。nullを許容する。
GPSが取得できなくても登録処理を中止しない。

## 制約
localStorageは容量制限があるため、この実装は試作・画面確認用。
本番ではIndexedDBまたはサーバー保存へ移行する。
