import {readFileSync} from "node:fs";import{resolve}from"node:path";
const root=resolve(new URL("..",import.meta.url).pathname);
const settings=readFileSync(resolve(root,"pages/system-settings.html"),"utf8");
const role=readFileSync(resolve(root,"assets/js/role-access.js"),"utf8");
const css=readFileSync(resolve(root,"assets/css/references.css"),"utf8");
const server=readFileSync(resolve(root,"server/src/server.js"),"utf8");
const checks=[
["管理者ログイン切替",settings.includes('id="authenticationRequired"')&&settings.includes('ログインを必須にする')],
["閲覧専用範囲説明",settings.includes('未ログイン利用者は危険物検索、詳細、関連法令、関連資料を閲覧専用')],
["公開ポリシーAPI",server.includes("/api/system/access-policy")],
["管理者更新API",server.includes("/api/admin/system/access-policy")&&server.includes("requireRole('safety-environment-admin')")],
["安全側フォールバック",server.includes('authenticationRequired:true')],
["未ログインはゲスト相当",role.includes('authenticationOptional:true')&&role.includes('role:"guest"')],
["全セクションへ適用",css.includes("Part 362: responsive explanatory copy across all related-material sections")&&css.includes(".references-page .section-heading > div:first-child p")],
["広い画面は一行",css.includes('@media (min-width: 1180px)')&&css.includes('white-space: nowrap')&&css.includes("grid-column: 1 / -1")],
["小さい画面は自然改行",css.includes('@media (max-width: 1179px)')&&css.includes('white-space: normal')]
];const failed=checks.filter(([,ok])=>!ok).map(([n])=>n);console.log(JSON.stringify({status:failed.length?"failed":"passed",checkCount:checks.length,failed},null,2));process.exit(failed.length?1:0);
