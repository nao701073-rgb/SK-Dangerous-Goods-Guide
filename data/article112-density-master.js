(function(){
  'use strict';
  // 危規則第112条の収納検査対象として申請される液体・気体向けの概算密度マスター。
  // 申請書又はSDSに密度がある場合は必ずそちらを優先する。
  // N.O.S.、混合物、濃度・組成により密度が大きく変わる品目は自動登録しない。
  window.ARTICLE112_DENSITY_MASTER = {
    version: '2026-07-31-part438',
    note: '概算値。申請書又はSDSを優先。N.O.S.、混合物及び組成依存品は自動登録対象外。気体は記載した状態・条件に基づく概算値。',
    records: {
      // 引火性液体・毒性液体・腐食性液体（おおむね20℃付近）
      'UN1089': {densityKgL:0.783, state:'liquid', source:'概算密度マスター（アセトアルデヒド、20℃付近）', confidence:'medium'},
      'UN1090': {densityKgL:0.791, state:'liquid', source:'概算密度マスター（アセトン、20℃付近）', confidence:'medium'},
      'UN1098': {densityKgL:0.854, state:'liquid', source:'概算密度マスター（アリルアルコール、20℃付近）', confidence:'medium'},
      'UN1114': {densityKgL:0.879, state:'liquid', source:'概算密度マスター（ベンゼン、20℃付近）', confidence:'medium'},
      'UN1155': {densityKgL:0.713, state:'liquid', source:'概算密度マスター（ジエチルエーテル、20℃付近）', confidence:'medium'},
      'UN1170': {densityKgL:0.789, state:'liquid', source:'概算密度マスター（エタノール、20℃付近）', confidence:'medium'},
      'UN1173': {densityKgL:0.902, state:'liquid', source:'概算密度マスター（酢酸エチル、20℃付近）', confidence:'medium'},
      'UN1175': {densityKgL:0.867, state:'liquid', source:'概算密度マスター（エチルベンゼン、20℃付近）', confidence:'medium'},
      'UN1193': {densityKgL:0.805, state:'liquid', source:'概算密度マスター（メチルエチルケトン、20℃付近）', confidence:'medium'},
      'UN1219': {densityKgL:0.785, state:'liquid', source:'概算密度マスター（イソプロパノール、20℃付近）', confidence:'medium'},
      'UN1230': {densityKgL:0.792, state:'liquid', source:'概算密度マスター（メタノール、20℃付近）', confidence:'medium'},
      'UN1274': {densityKgL:0.803, state:'liquid', source:'概算密度マスター（1-プロパノール、20℃付近）', confidence:'medium'},
      'UN1294': {densityKgL:0.867, state:'liquid', source:'概算密度マスター（トルエン、20℃付近）', confidence:'medium'},
      'UN1307': {densityKgL:0.864, state:'liquid', source:'概算密度マスター（キシレン異性体混合物の代表値、20℃付近）', confidence:'low'},
      'UN1547': {densityKgL:1.022, state:'liquid', source:'概算密度マスター（アニリン、20℃付近）', confidence:'medium'},
      'UN1593': {densityKgL:1.326, state:'liquid', source:'概算密度マスター（ジクロロメタン、20℃付近）', confidence:'medium'},
      'UN1710': {densityKgL:1.460, state:'liquid', source:'概算密度マスター（トリクロロエチレン、20℃付近）', confidence:'medium'},
      'UN1738': {densityKgL:1.210, state:'liquid', source:'概算密度マスター（塩化ベンゾイル、20℃付近）', confidence:'medium'},
      'UN1779': {densityKgL:1.220, state:'liquid', source:'概算密度マスター（ぎ酸、代表濃度）', confidence:'low'},
      'UN1789': {densityKgL:1.180, state:'liquid', source:'概算密度マスター（塩酸、代表濃度）', confidence:'low'},
      'UN1791': {densityKgL:1.100, state:'liquid', source:'概算密度マスター（次亜塩素酸塩溶液、代表濃度）', confidence:'low'},
      'UN1824': {densityKgL:1.330, state:'liquid', source:'概算密度マスター（水酸化ナトリウム溶液、代表濃度）', confidence:'low'},
      'UN1830': {densityKgL:1.840, state:'liquid', source:'概算密度マスター（硫酸、濃硫酸代表値）', confidence:'medium'},
      'UN1846': {densityKgL:1.594, state:'liquid', source:'概算密度マスター（四塩化炭素、20℃付近）', confidence:'medium'},
      'UN1888': {densityKgL:1.489, state:'liquid', source:'概算密度マスター（クロロホルム、20℃付近）', confidence:'medium'},
      'UN1915': {densityKgL:0.948, state:'liquid', source:'概算密度マスター（シクロヘキサノン、20℃付近）', confidence:'medium'},
      'UN2055': {densityKgL:0.909, state:'liquid', source:'概算密度マスター（スチレン、20℃付近）', confidence:'medium'},
      'UN2348': {densityKgL:0.898, state:'liquid', source:'概算密度マスター（アクリル酸ブチル、20℃付近）', confidence:'medium'},
      'UN2362': {densityKgL:1.175, state:'liquid', source:'概算密度マスター（1,1-ジクロロエタン、20℃付近）', confidence:'medium'},
      'UN2398': {densityKgL:0.740, state:'liquid', source:'概算密度マスター（メチルtert-ブチルエーテル、20℃付近）', confidence:'medium'},
      'UN2789': {densityKgL:1.049, state:'liquid', source:'概算密度マスター（酢酸、氷酢酸、20℃付近）', confidence:'medium'},
      'UN2874': {densityKgL:1.128, state:'liquid', source:'概算密度マスター（フルフリルアルコール、20℃付近）', confidence:'medium'},

      // 圧縮ガス：標準状態付近の気体密度。算出容量は標準状態換算の概算。
      'UN1001': {densityKgL:0.00117, state:'gas', source:'概算密度マスター（アセチレン気体、標準状態付近）', confidence:'low'},
      'UN1002': {densityKgL:0.001293, state:'gas', source:'概算密度マスター（圧縮空気、標準状態付近）', confidence:'low'},
      'UN1005': {densityKgL:0.00073, state:'gas', source:'概算密度マスター（アンモニア気体、標準状態付近）', confidence:'low'},
      'UN1006': {densityKgL:0.001784, state:'gas', source:'概算密度マスター（アルゴン、標準状態付近）', confidence:'low'},
      'UN1013': {densityKgL:0.001977, state:'gas', source:'概算密度マスター（二酸化炭素気体、標準状態付近）', confidence:'low'},
      'UN1017': {densityKgL:0.00321, state:'gas', source:'概算密度マスター（塩素気体、標準状態付近）', confidence:'low'},
      'UN1045': {densityKgL:0.001696, state:'gas', source:'概算密度マスター（フッ素、標準状態付近）', confidence:'low'},
      'UN1049': {densityKgL:0.0000899, state:'gas', source:'概算密度マスター（水素、標準状態付近）', confidence:'low'},
      'UN1050': {densityKgL:0.00164, state:'gas', source:'概算密度マスター（塩化水素気体、標準状態付近）', confidence:'low'},
      'UN1053': {densityKgL:0.00154, state:'gas', source:'概算密度マスター（硫化水素気体、標準状態付近）', confidence:'low'},
      'UN1066': {densityKgL:0.00125, state:'gas', source:'概算密度マスター（窒素、標準状態付近）', confidence:'low'},
      'UN1072': {densityKgL:0.00143, state:'gas', source:'概算密度マスター（酸素、標準状態付近）', confidence:'low'},
      'UN1076': {densityKgL:0.00442, state:'gas', source:'概算密度マスター（ホスゲン気体、標準状態付近）', confidence:'low'},
      'UN1086': {densityKgL:0.00286, state:'gas', source:'概算密度マスター（塩化ビニル気体、標準状態付近）', confidence:'low'},
      'UN1971': {densityKgL:0.000717, state:'gas', source:'概算密度マスター（メタン、標準状態付近）', confidence:'low'},

      // 液化ガス・深冷液化ガス：液相の代表密度。容器内容積との比較用概算。
      'UN1011': {densityKgL:0.584, state:'gas', source:'概算密度マスター（液化ブタン、液相代表値）', confidence:'low'},
      'UN1012': {densityKgL:0.590, state:'gas', source:'概算密度マスター（液化ブチレン、液相代表値）', confidence:'low'},
      'UN1033': {densityKgL:0.670, state:'gas', source:'概算密度マスター（液化ジメチルエーテル、液相代表値）', confidence:'low'},
      'UN1038': {densityKgL:0.568, state:'gas', source:'概算密度マスター（冷却液化エチレン、液相代表値）', confidence:'low'},
      'UN1040': {densityKgL:0.882, state:'gas', source:'概算密度マスター（液化酸化エチレン、液相代表値）', confidence:'low'},
      'UN1055': {densityKgL:0.587, state:'gas', source:'概算密度マスター（液化イソブチレン、液相代表値）', confidence:'low'},
      'UN1070': {densityKgL:0.750, state:'gas', source:'概算密度マスター（液化亜酸化窒素、液相代表値）', confidence:'low'},
      'UN1077': {densityKgL:0.520, state:'gas', source:'概算密度マスター（液化プロピレン、液相代表値）', confidence:'low'},
      'UN1972': {densityKgL:0.422, state:'gas', source:'概算密度マスター（冷却液化メタン、液相代表値）', confidence:'low'},
      'UN1977': {densityKgL:0.808, state:'gas', source:'概算密度マスター（冷却液化窒素、液相代表値）', confidence:'low'},
      'UN1978': {densityKgL:0.493, state:'gas', source:'概算密度マスター（液化プロパン、液相代表値）', confidence:'low'},
      'UN2187': {densityKgL:1.100, state:'gas', source:'概算密度マスター（冷却液化二酸化炭素、液相代表値）', confidence:'low'},
      'UN2201': {densityKgL:0.750, state:'gas', source:'概算密度マスター（冷却液化亜酸化窒素、液相代表値）', confidence:'low'}
    }
  };
})();
