# 第7回実装仕様：EmS連携

## 目的
危険物のUN番号に対応するEmSコードを自動取得し、
Fire ScheduleとSpillage Scheduleを分離して表示する。

## 収録件数
2,294件

## データ
- `database/imdg/ems/un-ems-assignments.json`
- `database/imdg/ems/schedule-master.json`
- `data/ems-assignments.js`
- `data/ems-schedule-master.js`

## 解決順序
1. UNデータ内の `ems`
2. UN番号別EmS索引
3. 未解決

## 表示
- Fire Schedule
- Spillage Schedule
- 出典Circular
- IMDG Amendment
- 取得状態

## 安全設計
EmSコードが確認できない場合、Classなどから推測しない。
