# Part 140 再是正後の再評価・案件クローズ

## 目的
再是正処置を完了した直後に案件を終了せず、一定期間後に同種事象が再発していないことを確認してから案件をクローズします。

## 処理フロー
1. 再是正処置の対応完了
2. 別担当者による完了確認
3. 再評価期限・再発確認基準の設定
4. 別担当者による再評価
5. 再発なしの場合はクローズ承認待ち
6. 再評価者とは別の担当者が案件クローズを承認

再発が確認された場合はクローズ不可とし、追加の再是正処置を登録します。

## 権限制御
操作は事業所管理者または管理者のみ実行できます。

次の自己確認を禁止します。
- 再是正担当者による再評価
- 再是正完了者による再評価
- 再是正完了確認者による再評価
- 再評価者による案件クローズ承認

## 主な保存項目
- followUpReevaluationStatus
- followUpReevaluationDueAt
- followUpReevaluationCriteria
- followUpReevaluationScheduledBy / ScheduledAt
- followUpReevaluationReviewedBy / ReviewedAt
- followUpReevaluationNote
- caseClosureStatus
- caseClosedBy / caseClosedAt
- caseClosureNote
- followUpCorrectiveActionHistory
