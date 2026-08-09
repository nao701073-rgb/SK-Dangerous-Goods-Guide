import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const checks=[];
const check=(key,ok,detail)=>checks.push({key,ok:Boolean(ok),detail});

const server=read('server/src/server.js');
const auth=read('server/src/auth.js');
const sessions=read('server/src/session-auth.js');
const config=read('server/src/config.js');
const api=read('assets/js/api-client.js');
const sql=read('server/sql/095_part507_server_auth_persistence_authorization.sql');

check('http-only-cookie',/HttpOnly/.test(sessions)&&/Set-Cookie/.test(sessions),'認証CookieにHttpOnly属性を付与');
check('secure-cookie-production',/SESSION_COOKIE_SECURE/.test(config)&&/config\.session\.secure/.test(server),'本番時のSecure属性を必須化');
check('csrf-server',/verifyCsrf/.test(auth)&&/\/api\/auth\/csrf/.test(server),'更新系APIのCSRF検証とトークン取得');
check('csrf-client',/X-CSRF-Token/.test(api)&&/credentials:"include"/.test(api),'ブラウザがCookieとCSRFヘッダーを送信');
check('session-table',/CREATE TABLE IF NOT EXISTS auth_sessions/.test(sql),'PostgreSQLセッションテーブル');
check('session-revocation',/revokeAllUserSessions/.test(server)&&/token_version/.test(auth),'強制失効とトークン版照合');
check('login-rate-limit',/loginLimiter/.test(server)&&/LOGIN_MAX_FAILURES/.test(config),'IP単位制限とアカウントロック');
check('office-scope',/officeScope/.test(auth)&&/requireOperationalRead/.test(server)&&/requireOperationalWrite/.test(server),'所属事業所スコープをAPIで強制');
check('guest-denial',/\['guest',\s*new Set\(\)\]/s.test(read('server/src/permissions.js')),'ゲストに業務データ権限を付与しない');
check('persistent-storage',/objectStorage\.put/.test(server)&&/STORAGE_PROVIDER/.test(read('server/.env.example')),'永続ストレージの保存・読込診断');
check('cors-credentials',/credentials: true/.test(server)&&/CORS_ORIGINS/.test(read('server/.env.example')),'許可Origin限定のCookie送信');
check('https-enforcement',/ENFORCE_HTTPS/.test(config)&&/本番環境ではHTTPS接続が必要/.test(server),'本番HTTPS強制');
check('legacy-token-disabled',/LEGACY_BEARER_AUTH_ENABLED=false/.test(read('server/.env.example')),'本番時のブラウザ保存Bearerを無効化');

const operationalRoutes=[
  ["applications",/app\.get\('\/api\/applications', authenticate, requireOperationalRead/],
  ["photos",/app\.get\('\/api\/photos', authenticate, requireOperationalRead/],
  ["documents",/app\.get\('\/api\/application-documents',authenticate,requireOperationalRead/],
  ["results",/app\.get\('\/api\/application-results', authenticate, requireOperationalRead/]
];
for(const [name,pattern] of operationalRoutes)check(`route-${name}`,pattern.test(server),`${name} APIの認証・閲覧権限`);

const failed=checks.filter(x=>!x.ok);
const report={release:'part507',phase:1,generatedAt:new Date().toISOString(),status:failed.length?'failed':'passed',summary:{total:checks.length,passed:checks.length-failed.length,failed:failed.length},checks};
const output=path.join(root,'docs','part507_第1段階静的検証レポート.json');
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exitCode=1;
