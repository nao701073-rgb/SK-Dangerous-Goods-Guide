(function(global){
  "use strict";
  const catalog={
  "version": "v1.3.103",
  "generatedAt": "2026-08-11",
  "policy": {
    "priority": [
      "manufacturer-documented-msl",
      "marking-or-certificate",
      "approved-test-result",
      "reference-candidate"
    ],
    "note": "候補値は入力補助です。メーカー仕様、刻印、証明書、試験成績または承認資料で確認したMSL/LCを優先してください。CTU Code Annex 7 2.4では、ウェブラッシングは使い捨て75%・再使用50%、ワイヤーロープは使い捨て80%・再使用30%、帯鉄は70%（50%推奨）、チェーンは50%を破断強度へ適用します。繊維ロープは材質と直径、木材支保は材質品質・断面・自由長・荷重経路で能力が変わるため、材質名だけから一律値を確定しません。貨物側取付部とCTU側固縛点は、実際の取付位置・荷重方向・局部強度を確認してください。"
  },
  "factors": {
    "shackle": {
      "label": "シャックル・リング・デッキアイ・ターンバックル",
      "value": 0.5,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "fibre": {
      "label": "繊維ロープ",
      "value": 0.33,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "web": {
      "label": "ウェブラッシング（再使用・互換キー）",
      "value": 0.5,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "wireSingle": {
      "label": "ワイヤーロープ（使い捨て）",
      "value": 0.8,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "wireReusable": {
      "label": "ワイヤーロープ（再使用）",
      "value": 0.3,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "steelBand": {
      "label": "鉄帯・帯鉄（使い捨て）",
      "value": 0.7,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "chain": {
      "label": "チェーン",
      "value": 0.5,
      "basis": "MSC.1/Circ.1623 CSS Code Annex 13 Table 1"
    },
    "marked": {
      "label": "表示・証明済みMSL",
      "value": 1,
      "basis": "刻印・証明済み値を優先（MSC.1/Circ.1623 CSS Code Annex 13／製品証明）"
    },
    "webSingle": {
      "label": "ウェブラッシング（使い捨て）",
      "value": 0.75,
      "basis": "CTU Code Annex 7 2.4.2 / CSS Code Annex 13 整合"
    },
    "webReusable": {
      "label": "ウェブラッシング（再使用）",
      "value": 0.5,
      "basis": "CTU Code Annex 7 2.4.2 / CSS Code Annex 13 整合"
    },
    "steelBandRecommended": {
      "label": "帯鉄（CTU Code推奨50%）",
      "value": 0.5,
      "basis": "CTU Code Annex 7 2.4.2 注記（70%表値に対し50%推奨）"
    }
  },
  "roles": {
    "device": {
      "label": "固縛材（1本当たり）",
      "targetInput": "quickStrength",
      "materials": [
        {
          "value": "aslash",
          "label": "アスラッシュ・ポリエステル系"
        },
        {
          "value": "steel",
          "label": "帯鉄"
        },
        {
          "value": "wire",
          "label": "ワイヤーロープ"
        },
        {
          "value": "chain",
          "label": "チェーン"
        },
        {
          "value": "web",
          "label": "ウェブラッシング"
        },
        {
          "value": "tygard",
          "label": "TY-GARD"
        },
        {
          "value": "ppRope",
          "label": "ポリプロピレンロープ"
        },
        {
          "value": "petBand",
          "label": "PET／ポリエステル帯状バンド"
        },
        {
          "value": "other",
          "label": "その他・製品仕様を入力"
        }
      ],
      "profiles": [
        {
          "id": "aslash-aw200",
          "material": "aslash",
          "size": "AW200",
          "label": "AW200（最大システム強度 8,500 kgf参考）",
          "nominalStrengthKn": 83.36,
          "factorKey": "web",
          "efficiency": 1,
          "candidateMslKn": 41.7,
          "source": "既存の固縛材比較資料",
          "referenceOnly": true
        },
        {
          "id": "aslash-aw300",
          "material": "aslash",
          "size": "AW300",
          "label": "AW300（直線破断強度 6,500 kgf参考）",
          "nominalStrengthKn": 63.74,
          "factorKey": "web",
          "efficiency": 1,
          "candidateMslKn": 31.9,
          "source": "既存の固縛材比較資料",
          "referenceOnly": true
        },
        {
          "id": "steel-31-08-rec50",
          "material": "steel",
          "size": "31.75×0.80 mm",
          "label": "31.75×0.80 mm（CTU Code推奨50%：8.7 kN参考）",
          "nominalStrengthKn": 17.3,
          "factorKey": "steelBandRecommended",
          "efficiency": 1,
          "candidateMslKn": 8.7,
          "source": "CTU Code Annex 7 2.4.2の帯鉄50%推奨＋既存比較資料の破断強度",
          "referenceOnly": true
        },
        {
          "id": "steel-31-08",
          "material": "steel",
          "size": "31.75×0.80 mm",
          "label": "31.75×0.80 mm（表値70%：12.1 kN／50%推奨）",
          "nominalStrengthKn": 17.3,
          "factorKey": "steelBand",
          "efficiency": 1,
          "candidateMslKn": 12.1,
          "source": "CTU Code Annex 7 2.4.2の70%表値＋既存比較資料（CTU Code注記は50%推奨）",
          "referenceOnly": true
        },
        {
          "id": "steel-31-145-rec50",
          "material": "steel",
          "size": "31.75×1.45 mm",
          "label": "31.75×1.45 mm（CTU Code推奨50%：23.0 kN参考）",
          "nominalStrengthKn": 46.09,
          "factorKey": "steelBandRecommended",
          "efficiency": 1,
          "candidateMslKn": 23.0,
          "source": "CTU Code Annex 7 2.4.2の帯鉄50%推奨＋既存比較資料の破断強度",
          "referenceOnly": true
        },
        {
          "id": "steel-31-145",
          "material": "steel",
          "size": "31.75×1.45 mm",
          "label": "31.75×1.45 mm（表値70%：32.3 kN／50%推奨）",
          "nominalStrengthKn": 46.09,
          "factorKey": "steelBand",
          "efficiency": 1,
          "candidateMslKn": 32.3,
          "source": "CTU Code Annex 7 2.4.2の70%表値＋既存比較資料（CTU Code注記は50%推奨）",
          "referenceOnly": true
        },
        {
          "id": "wire-oneway-8",
          "material": "wire",
          "size": "8 mm・一方向使用",
          "label": "8 mm・一方向使用（CTU式 MSL 25.6 kN）",
          "nominalStrengthKn": 32.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 25.6,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-10",
          "material": "wire",
          "size": "10 mm・一方向使用",
          "label": "10 mm・一方向使用（CTU式 MSL 40.0 kN）",
          "nominalStrengthKn": 50.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 40.0,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-12",
          "material": "wire",
          "size": "12 mm・一方向使用",
          "label": "12 mm・一方向使用（CTU式 MSL 57.6 kN）",
          "nominalStrengthKn": 72.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 57.6,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-14",
          "material": "wire",
          "size": "14 mm・一方向使用",
          "label": "14 mm・一方向使用（CTU式 MSL 78.4 kN）",
          "nominalStrengthKn": 98.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 78.4,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-16",
          "material": "wire",
          "size": "16 mm・一方向使用",
          "label": "16 mm・一方向使用（CTU式 MSL 102.4 kN）",
          "nominalStrengthKn": 128.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 102.4,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-18",
          "material": "wire",
          "size": "18 mm・一方向使用",
          "label": "18 mm・一方向使用（CTU式 MSL 129.6 kN）",
          "nominalStrengthKn": 161.99999999999997,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 129.6,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-oneway-20",
          "material": "wire",
          "size": "20 mm・一方向使用",
          "label": "20 mm・一方向使用（CTU式 MSL 160.0 kN）",
          "nominalStrengthKn": 200.0,
          "factorKey": "wireSingle",
          "efficiency": 1,
          "candidateMslKn": 160.0,
          "source": "CTU Code Annex 7 2.4.9：一方向使用ワイヤ MSL = 40 d² [kN]（d: cm）。曲げ・クリップ・接続条件は別途確認。",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "wire-16-2clip",
          "material": "wire",
          "size": "16 mm・クリップ2個",
          "label": "16 mm・クリップ2個（システム強度 8,500 kgf参考）",
          "nominalStrengthKn": 83.36,
          "factorKey": "wireReusable",
          "efficiency": 1,
          "candidateMslKn": 25,
          "source": "既存の固縛材比較資料",
          "referenceOnly": true
        },
        {
          "id": "wire-16-4clip",
          "material": "wire",
          "size": "16 mm・クリップ4個",
          "label": "16 mm・クリップ4個（システム強度 17,000 kgf参考）",
          "nominalStrengthKn": 166.71,
          "factorKey": "wireReusable",
          "efficiency": 1,
          "candidateMslKn": 50,
          "source": "既存の固縛材比較資料",
          "referenceOnly": true
        },
        {
          "id": "wire-manual",
          "material": "wire",
          "size": "任意",
          "label": "その他のワイヤーロープ（メーカーMSL/LCを入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "メーカー仕様・刻印・証明書・組立条件"
        },
        {
          "id": "chain-g8-13",
          "material": "chain",
          "size": "Grade 8・13 mm",
          "label": "Grade 8チェーン 13 mm（MSL 100 kN）",
          "nominalStrengthKn": 200,
          "factorKey": "chain",
          "efficiency": 1,
          "candidateMslKn": 100,
          "source": "CTU Code Annex 7 2.4.14：Grade 8・13 mmチェーン MSL 100 kN",
          "referenceOnly": true
        },
        {
          "id": "chain-marked-20",
          "material": "chain",
          "size": "表示20 kN",
          "label": "チェーン・表示／証明済みMSL 20 kN",
          "nominalStrengthKn": 20,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 20,
          "source": "表示・証明値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "chain-manual",
          "material": "chain",
          "size": "その他",
          "label": "その他のチェーン（メーカーMSL/LCを入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "メーカー仕様・刻印・証明書"
        },
        {
          "id": "web-marked-5",
          "material": "web",
          "size": "表示MSL/LC 5 kN",
          "label": "製品表示 MSL/LC 5 kN",
          "nominalStrengthKn": 5,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 5,
          "source": "製品ラベル・証明書の表示値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-marked-10",
          "material": "web",
          "size": "表示MSL/LC 10 kN",
          "label": "製品表示 MSL/LC 10 kN",
          "nominalStrengthKn": 10,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 10,
          "source": "製品ラベル・証明書の表示値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-marked-20",
          "material": "web",
          "size": "表示20 kN",
          "label": "ウェブラッシング・表示／証明済みMSL 20 kN",
          "nominalStrengthKn": 20,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 20,
          "source": "表示・証明値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-marked-25",
          "material": "web",
          "size": "表示MSL/LC 25 kN",
          "label": "製品表示 MSL/LC 25 kN",
          "nominalStrengthKn": 25,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 25,
          "source": "製品ラベル・証明書の表示値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-marked-40",
          "material": "web",
          "size": "表示MSL/LC 40 kN",
          "label": "製品表示 MSL/LC 40 kN",
          "nominalStrengthKn": 40,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 40,
          "source": "製品ラベル・証明書の表示値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-marked-50",
          "material": "web",
          "size": "表示MSL/LC 50 kN",
          "label": "製品表示 MSL/LC 50 kN",
          "nominalStrengthKn": 50,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 50,
          "source": "製品ラベル・証明書の表示値テンプレート",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "web-manual",
          "material": "web",
          "size": "任意",
          "label": "その他のウェビング（ラベルMSL/LCを入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "製品ラベル・メーカー仕様・証明書"
        },
        {
          "id": "tygard-ds-rail-60",
          "material": "tygard",
          "size": "TY-GARD DS 60 cm幅・鉄道輸送",
          "label": "TY-GARD DS 60 cm幅（鉄道輸送時の耐荷重8 ton参考）",
          "nominalStrengthKn": 78.45,
          "factorKey": "marked",
          "efficiency": 1,
          "candidateMslKn": 78.5,
          "source": "TY-GARD日本総代理店の商品資料（鉄道輸送時の耐荷重8 ton）",
          "referenceOnly": true,
          "railOnly": true,
          "requiresConfirmedEvidence": true,
          "sourceUrl": "https://webciss.sankyu.co.jp/portal/ty-gard/asp/newsitem.asp?nw_id=1076"
        },
        {
          "id": "tygard-approved-manual",
          "material": "tygard",
          "size": "メーカー承認配置・任意",
          "label": "TY-GARD（承認された型式・幅・貼付長さの確認値を入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "対象輸送モードに適用されるメーカー仕様・承認資料・施工要領",
          "requiresConfirmedEvidence": true
        },
        {
          "id": "pp-rope-10",
          "material": "ppRope",
          "size": "直径 10 mm",
          "label": "PPロープ 10 mm（CTU式 MSL 4.0 kN/単索）",
          "nominalStrengthKn": 12.121212121212121,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 4.0,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-12",
          "material": "ppRope",
          "size": "直径 12 mm",
          "label": "PPロープ 12 mm（CTU式 MSL 5.8 kN/単索）",
          "nominalStrengthKn": 17.575757575757574,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 5.8,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-14",
          "material": "ppRope",
          "size": "直径 14 mm",
          "label": "PPロープ 14 mm（CTU式 MSL 7.8 kN/単索）",
          "nominalStrengthKn": 23.636363636363633,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 7.8,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-16",
          "material": "ppRope",
          "size": "直径 16 mm",
          "label": "PPロープ 16 mm（CTU式 MSL 10.2 kN/単索）",
          "nominalStrengthKn": 30.909090909090907,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 10.2,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-18",
          "material": "ppRope",
          "size": "直径 18 mm",
          "label": "PPロープ 18 mm（CTU式 MSL 13.0 kN/単索）",
          "nominalStrengthKn": 39.39393939393939,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 13.0,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-20",
          "material": "ppRope",
          "size": "直径 20 mm",
          "label": "PPロープ 20 mm（CTU式 MSL 16.0 kN/単索）",
          "nominalStrengthKn": 48.484848484848484,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 16.0,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-24",
          "material": "ppRope",
          "size": "直径 24 mm",
          "label": "PPロープ 24 mm（CTU式 MSL 23.0 kN/単索）",
          "nominalStrengthKn": 69.69696969696969,
          "factorKey": "fibre",
          "efficiency": 1,
          "candidateMslKn": 23.0,
          "source": "CTU Code Annex 7 2.4.5：Polypropylene rope MSL = 4 d² [kN]（d: cm）",
          "referenceOnly": true,
          "requiresConditionReview": true
        },
        {
          "id": "pp-rope-manual",
          "material": "ppRope",
          "size": "任意",
          "label": "その他のPPロープ（メーカーMSLを入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "メーカー仕様・証明値"
        },
        {
          "id": "pet-band-manual",
          "material": "petBand",
          "size": "任意",
          "label": "PET／ポリエステル帯状バンド（メーカーMSL/LCを入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "製品仕様・刻印・証明書（材質名だけではMSLを確定しない）"
        },
        {
          "id": "device-manual",
          "material": "other",
          "size": "任意",
          "label": "その他（公称強度と係数を手入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "手入力"
        }
      ]
    },
    "cargo": {
      "label": "貨物側取付部",
      "targetInput": "quickCargoMsl",
      "materials": [
        {
          "value": "steelEye",
          "label": "鋼製アイ・ラグ・ブラケット"
        },
        {
          "value": "castPoint",
          "label": "鋳造取付部"
        },
        {
          "value": "machinePoint",
          "label": "機械・貨物メーカー指定取付点"
        },
        {
          "value": "other",
          "label": "その他・図面／試験値を入力"
        }
      ],
      "profiles": [
        {
          "id": "cargo-steel-10",
          "material": "steelEye",
          "size": "図面・試験定格10 kN",
          "label": "鋼製取付部・図面／試験定格 10 kN",
          "nominalStrengthKn": 10,
          "factorKey": "marked",
          "candidateMslKn": 10,
          "source": "確認値テンプレート"
        },
        {
          "id": "cargo-steel-20",
          "material": "steelEye",
          "size": "図面・試験定格20 kN",
          "label": "鋼製取付部・図面／試験定格 20 kN",
          "nominalStrengthKn": 20,
          "factorKey": "marked",
          "candidateMslKn": 20,
          "source": "確認値テンプレート"
        },
        {
          "id": "cargo-steel-30",
          "material": "steelEye",
          "size": "図面・試験定格30 kN",
          "label": "鋼製取付部・図面／試験定格 30 kN",
          "nominalStrengthKn": 30,
          "factorKey": "marked",
          "candidateMslKn": 30,
          "source": "確認値テンプレート"
        },
        {
          "id": "cargo-machine-50",
          "material": "machinePoint",
          "size": "メーカー指定50 kN",
          "label": "メーカー指定取付点・確認済み 50 kN",
          "nominalStrengthKn": 50,
          "factorKey": "marked",
          "candidateMslKn": 50,
          "source": "確認値テンプレート"
        },
        {
          "id": "cargo-manual",
          "material": "other",
          "size": "任意",
          "label": "その他（図面・試験・メーカー値を手入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "手入力"
        }
      ]
    },
    "ctu": {
      "label": "CTU側固縛点",
      "targetInput": "quickCtuMsl",
      "materials": [
        {
          "value": "ctuSteelPoint",
          "label": "鋼製CTU固縛点"
        },
        {
          "value": "deckEye",
          "label": "デッキアイ・リング"
        },
        {
          "value": "railPoint",
          "label": "レール・専用金具"
        },
        {
          "value": "other",
          "label": "その他・CTU表示／証明値を入力"
        }
      ],
      "profiles": [
        {
          "id": "ctu-top-5",
          "material": "ctuSteelPoint",
          "size": "上部サイドレール固縛点・最低5 kN",
          "label": "上部サイドレール固縛点（CTU Code最低 5 kN）",
          "nominalStrengthKn": 5,
          "factorKey": "marked",
          "candidateMslKn": 5,
          "source": "CTU Code 6.2.5：上部サイドレール固縛点 MSL 少なくとも5 kN",
          "referenceOnly": true
        },
        {
          "id": "ctu-steel-10",
          "material": "ctuSteelPoint",
          "size": "表示10 kN",
          "label": "下部アンカーポイント（CTU Code最低 10 kN）",
          "nominalStrengthKn": 10,
          "factorKey": "marked",
          "candidateMslKn": 10,
          "source": "CTU Code 6.2.5：下部アンカーポイント MSL 少なくとも10 kN",
          "referenceOnly": true
        },
        {
          "id": "ctu-steel-20",
          "material": "ctuSteelPoint",
          "size": "表示20 kN",
          "label": "下部アンカーポイント（近年例 20 kN・表示確認）",
          "nominalStrengthKn": 20,
          "factorKey": "marked",
          "candidateMslKn": 20,
          "source": "CTU Code 6.2.5：近年製コンテナでは20 kNの例。実機表示・仕様を確認",
          "referenceOnly": true
        },
        {
          "id": "ctu-deck-50",
          "material": "deckEye",
          "size": "表示50 kN",
          "label": "デッキアイ・表示／証明済み 50 kN",
          "nominalStrengthKn": 50,
          "factorKey": "marked",
          "candidateMslKn": 50,
          "source": "確認値テンプレート"
        },
        {
          "id": "ctu-manual",
          "material": "other",
          "size": "任意",
          "label": "その他（CTU表示・証明値を手入力）",
          "manual": true,
          "factorKey": "marked",
          "source": "手入力"
        }
      ]
    }
  },
  "supportReference": {
    "label": "支保・あて材（1個当たり参考支保力）",
    "policy": "木材はCTU Code Annex 7 2.3およびAppendix 4に基づく参考値。FRPその他は製品・施工条件で能力が変わるためメーカー・試験・設計確認値を入力する。",
    "materials": [
      {
        "value": "timber",
        "label": "木材"
      },
      {
        "value": "frp",
        "label": "強化プラスチック（FRP等）"
      },
      {
        "value": "otherSupport",
        "label": "その他の支保・当て材"
      }
    ],
    "profiles": [
      {
        "id": "timber-batten-50x100-l22",
        "material": "timber",
        "label": "横木 50×100 mm（厚さw=50／高さh=100）・自由長2.2 m（1本）",
        "size": "w=5 cm, h=10 cm, L=2.2 m",
        "dimensions": {"widthMm": 50, "heightMm": 100, "freeLengthM": 2.2},
        "candidateStrengthKn": 4.06,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-batten-50x100-l24",
        "material": "timber",
        "label": "横木 50×100 mm（厚さw=50／高さh=100）・自由長2.4 m（1本）",
        "size": "w=5 cm, h=10 cm, L=2.4 m",
        "dimensions": {"widthMm": 50, "heightMm": 100, "freeLengthM": 2.4},
        "candidateStrengthKn": 3.72,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-batten-50x150-l22",
        "material": "timber",
        "label": "横木 50×150 mm（厚さw=50／高さh=150）・自由長2.2 m（1本）",
        "size": "w=5 cm, h=15 cm, L=2.2 m",
        "dimensions": {"widthMm": 50, "heightMm": 150, "freeLengthM": 2.2},
        "candidateStrengthKn": 6.09,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-batten-75x100-l22",
        "material": "timber",
        "label": "横木 75×100 mm（厚さw=75／高さh=100）・自由長2.2 m（1本）",
        "size": "w=7.5 cm, h=10 cm, L=2.2 m",
        "dimensions": {"widthMm": 75, "heightMm": 100, "freeLengthM": 2.2},
        "candidateStrengthKn": 9.13,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-batten-75x150-l22",
        "material": "timber",
        "label": "横木 75×150 mm（厚さw=75／高さh=150）・自由長2.2 m（1本）",
        "size": "w=7.5 cm, h=15 cm, L=2.2 m",
        "dimensions": {"widthMm": 75, "heightMm": 150, "freeLengthM": 2.2},
        "candidateStrengthKn": 13.7,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-batten-100x100-l22",
        "material": "timber",
        "label": "横木 100×100 mm（厚さw=100／高さh=100）・自由長2.2 m（1本）",
        "size": "w=10 cm, h=10 cm, L=2.2 m",
        "dimensions": {"widthMm": 100, "heightMm": 100, "freeLengthM": 2.2},
        "candidateStrengthKn": 16.23,
        "source": "CTU Code Annex 7 Appendix 4：F = n·w²·h/(28L)。n=1として1本当たりを算出。",
        "referenceOnly": true
      },
      {
        "id": "timber-manual",
        "material": "timber",
        "label": "その他の木材支保（寸法・材質・荷重経路を手入力）",
        "manual": true,
        "source": "CTU Code Annex 7 2.3：材質品質、圧縮/曲げ、接触面、支保構造を確認"
      },
      {
        "id": "frp-manual",
        "material": "frp",
        "label": "FRP等（メーカー許容荷重／試験値を入力）",
        "manual": true,
        "source": "メーカー仕様・試験成績・施工図。FRPという材質名だけでは支保力を確定しない。"
      },
      {
        "id": "support-manual",
        "material": "otherSupport",
        "label": "その他（確認済み支保力を入力）",
        "manual": true,
        "source": "メーカー仕様・試験成績・施工図・設計計算"
      }
    ]
  }
};
  global.ISS_SECURING_MSL_REFERENCE=Object.freeze(catalog);
})(window);
