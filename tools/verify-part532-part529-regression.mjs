import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[];
const check=(name,condition,detail='')=>checks.push({name,status:condition?'passed':'failed',detail:condition?'':detail});
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));

const commonCode=read('assets/js/application-case-common.js');
const context={window:{},console,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},document:{getElementById:()=>null}};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(commonCode,context,{filename:'application-case-common.js'});
const api=context.window.ISSApplicationCase;
check('共通案件APIを公開',Boolean(api));
check('複数危険物正規化API',typeof api?.normalizeCargoItems==='function');
check('申請書確認結果変換API',typeof api?.fromVerificationPayload==='function');
check('固縛力反映API',typeof api?.applyApplicationToCtu==='function');

const sample={goods:[
 {un:'UN1077',source:'プロピレン [プロペン]',properShippingNameJa:'プロピレン',properShippingName:'PROPYLENE',hazardClass:'2.1',container:'継目なし容器',count:16,packingInstruction:'P200',quantity:{massPerPackage:18,grossPerPackage:73,totalMass:288,grossTotal:1168}},
 {un:'1953',source:'その他の圧縮ガス（毒性かつ引火性のもの）',properShippingName:'DIBORANE & NITROGEN MIXTURE',hazardClass:'2.3',container:'継目なし容器',count:20,packingInstruction:'P200',quantity:{massPerPackage:4.4,grossPerPackage:59.4,totalMass:88,grossTotal:1188}}
]};
const cargo=api.fromVerificationPayload(sample);
check('申請書確認結果を2行へ変換',cargo.length===2,JSON.stringify(cargo));
check('UN1077正規化',cargo[0]?.unNumber==='1077');
check('UN1953正規化',cargo[1]?.unNumber==='1953');
check('個数を保持',cargo[0]?.packageCount===16 && cargo[1]?.packageCount===20);
check('1容器正味質量を保持',cargo[0]?.netMassPerPackageKg===18 && cargo[1]?.netMassPerPackageKg===4.4);
check('総質量を保持',cargo[0]?.totalGrossMassKg===1168 && cargo[1]?.totalGrossMassKg===1188);
check('P200原文ページを保持',cargo.every(row=>row.sourcePageStart===298&&row.sourcePageEnd===307));
check('UN1953許可確認を自動設定',cargo[1]?.permissionRequired===true);
check('UN1077は一般P200案内',cargo[0]?.permissionRequired===false);
const agg=api.aggregateCargoItems(cargo);
check('個数合計',agg.packageCount===36,String(agg.packageCount));
check('正味質量合計',agg.totalNetMassKg===376,String(agg.totalNetMassKg));
check('総質量合計',agg.totalGrossMassKg===2356,String(agg.totalGrossMassKg));
check('固縛力計算質量は総質量優先',agg.calculationMassKg===2356,String(agg.calculationMassKg));
const compat=api.compatibilityFromCargo(cargo);
check('旧単一危険物項目への互換値',compat.unNumber==='1077'&&compat.cargoName.includes('プロピレン'));
const extracted=api.extractCaseData({case_data:{applicantName:'申請者',shipper:'荷主',loadingPort:'YOKOHAMA',dischargePort:'SINGAPORE',containerType:'20FT DRY',cargoItems:cargo}});
check('DB snake_case case_data対応',extracted.applicantName==='申請者'&&extracted.cargoItems.length===2);

const appsHtml=read('pages/applications.html');
check('申請番号管理に共通案件欄',appsHtml.includes('id="applicationCommonCaseSection"'));
check('申請番号管理に複数危険物編集欄',appsHtml.includes('id="applicationCargoEditor"'));
check('申請番号管理で共通CSS使用',appsHtml.includes('application-case-common.css?v=529'));
check('申請番号管理で共通JS使用',appsHtml.includes('application-case-common.js?v=529'));
check('申請番号管理の現行版識別',appsHtml.includes('content="part532"'));
const appsJs=read('assets/js/applications.js');
check('案件カードから固縛力参考算出へ遷移',appsJs.includes('ctu-securing-calculator.html?applicationId='));
check('CSVへ危険物明細を行単位出力',appsJs.includes('許容容量・許容質量')&&appsJs.includes('goods.forEach'));
check('申請登録payloadにcaseData',appsJs.includes('caseData,applicationDate'));

const ctuHtml=read('pages/ctu-securing-calculator.html');
check('固縛力画面に共通案件パネル',ctuHtml.includes('id="ctuCommonCasePanel"'));
check('固縛力画面に危険物編集欄',ctuHtml.includes('id="ctuCargoEditor"'));
check('申請番号URL引継ぎ',ctuHtml.includes("get('applicationId')"));
check('共通案件を算出へ反映',ctuHtml.includes('applyCtuCaseInformation'));
check('固縛力画面から申請番号へ保存',ctuHtml.includes('persistCtuCaseInformation'));
check('固縛力画面の現行版識別',ctuHtml.includes('content="part532"'));

const verifyHtml=read('pages/application-verification.html');
const verifyJs=read('assets/js/application-verification.js');
check('申請書確認画面で共通モジュール読込',verifyHtml.includes('application-case-common.js?v=529'));
check('確認結果から既存案件へ自動反映',verifyJs.includes('updateApplicationFromVerification'));
check('確認結果から新規案件へ危険物明細保存',verifyJs.includes('fromVerificationPayload'));

const storage=read('assets/js/storage.js');
check('ローカル保存にcaseData',storage.includes('caseData:')&&storage.includes('cargoItems:'));
check('サーバーcase_data取込',storage.includes('row.case_data || row.caseData'));
const sync=read('assets/js/sync-manager.js');
check('同期createにcaseData',sync.includes('createApplication')&&sync.includes('caseData:'));
check('同期updateにcaseData',sync.includes('updateApplication')&&sync.match(/caseData:/g)?.length>=2);

const server=read('server/src/server.js');
check('APIスキーマにcaseData',server.includes('caseData: z.record(z.any()).optional()'));
check('DB登録でcase_data保存',server.includes('INSERT INTO applications(client_id,application_number,shipper,cargo_name,note,status,case_data'));
check('DB更新でcase_data保存',server.includes('case_data=COALESCE($6::jsonb,case_data)'));
check('同期APIでcase_data更新',server.includes('case_data=COALESCE($5::jsonb,case_data)'));
check('監査スナップショットにcaseData',server.includes('caseData:row.case_data || {}'));
check('DBマイグレーション存在',exists('server/sql/112_part529_common_application_case_data.sql'));
const migration=read('server/sql/112_part529_common_application_case_data.sql');
check('case_data jsonb追加',migration.includes("ADD COLUMN IF NOT EXISTS case_data jsonb"));
check('case_data object制約',migration.includes("jsonb_typeof(case_data) = 'object'"));
check('case_data GIN索引',migration.includes('USING gin (case_data jsonb_path_ops)'));

const css=read('assets/css/application-case-common.css');
check('公開画面基準のネイビー色',css.includes('--case-navy'));
check('申請番号管理用外観統一',css.includes('body[data-page="applications"]'));
check('固縛力画面用外観統一',css.includes('body[data-page="ctu-securing-calculator"]'));
check('スマホ用レスポンシブ',/@media\s*\(max-width:/.test(css));

const version=JSON.parse(read('VERSION.json'));
check('VERSION part532',version.version==='part532'&&version.part===532);
const config=JSON.parse(read('data/app-config.json'));
check('固縛力参考算出をactive化',config.modules.some(m=>m.id==='securing-calculation'&&m.status==='active'));
check('画面統一基準を設定へ記録',config.applicationCaseData?.build==='part529');
check('共通案件スキーマ存在',exists('schemas/application-common-case.schema.json'));

const failed=checks.filter(row=>row.status==='failed');
const report={generatedAt:new Date().toISOString(),release:'part532',status:failed.length?'failed':'passed',total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks};
const out=path.join(root,'docs','part532_Part529共通案件情報回帰検証レポート.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,total:report.total,passed:report.passed,failed:report.failed},null,2));
if(failed.length){console.error(failed);process.exit(1);}
