# 第16回実装：国内法令・IMDG Code

## 目的
国内法令・危告示にコードのみが記載され、具体的な詳細が国内法令上で確認できない場合に、
対応するIMDG Codeの章・節まで追えるようにする。

## 対象区分
- P / LP
- IBC
- T / TP
- SP
- SW / ES
- SG / SGG
- BK

## 表示状態
- excerpt-registered: 英語原文の短い抜粋を登録済み
- location-registered: コード固有の参照位置を登録済み
- chapter-identified: 章・節の構造を特定済み
- unclassified: 参照区分確認中

## 方針
英語原文を確認できないコードについて推測した条文を表示せず、
参照位置と登録状態を明示する。
