# 第4回実装仕様：法令・国際規則拡張基盤

## 目的
特定の法令に依存せず、国内法令・国際条約・国際コードを後から追加可能にする。

## 共通レジストリ
`database/regulations/registry.json`

管理項目:
- regulationId
- category
- officialName
- shortName
- documentType
- jurisdiction
- status
- dataPath

## 条文データ
法令ごとに独立したJSONを配置する。
法律・省令・告示・条約・コードで階層が異なるため、各ノードは任意階層に対応する。

想定階層:
- Part
- Annex
- Chapter
- Section
- Article
- Regulation
- Paragraph
- Item

## 対照データ
`database/regulations/references/cross-reference.json`

- source: 国内法令側
- primaryTarget: 主たる国際規則側
- additionalTargets: 補足参照先
- relatedUnNumbers
- keywords
- status

## 注意
サンプル対照レコードは実運用データではない。
