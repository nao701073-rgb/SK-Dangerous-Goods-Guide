import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const html=readFileSync(resolve(root,'pages/login.html'),'utf8');
const css=readFileSync(resolve(root,'assets/css/login-production.css'),'utf8');
const checks=[
 ['時間帯判定（朝）',html.includes("hour>=6&&hour<10?'morning'")],
 ['時間帯判定（日中）',html.includes("hour>=10&&hour<16?'day'")],
 ['時間帯判定（夕方）',html.includes("hour>=16&&hour<19?'evening':'night'")],
 ['MFAは6桁',html.includes('maxlength="6"')&&html.includes('pattern="[0-9]{6}"')],
 ['MFA期限切れ制御',html.includes('確認コードの有効期限が切れました。再送してください。')],
 ['オフライン認証抑止',html.includes('navigator.onLine===false')],
 ['古い認証応答の無効化',html.includes('challengeVersion')&&html.includes('activeVersion===challengeVersion')],
 ['成功演出は1100ms',html.includes('setTimeout(move,1100)')],
 ['成功演出の控えめな光',css.includes('lightSpreadSubtle')&&css.includes('height:2px')],
 ['著作権表記',html.includes('© 2026 Shin Nihon Kentei Kyokai All rights reserved.')],
 ['公式SKロゴ',html.includes('sk-brand-logo-v82.png')],
 ['認証通信タイムアウト',html.includes('AUTH_TIMEOUT_MS=20000')&&html.includes('withAuthTimeout')],
 ['パスワード再設定の二重送信防止',html.includes("button.textContent='送信中…'")&&html.includes("button.disabled=true")],
 ['港湾背景画像',css.includes('login-port-background.jpg')],
 ['ガラス調ログインカード',css.includes('backdrop-filter: blur(20px)')&&css.includes('border-radius: 26px')],
 ['夕方・夜の暗色カード',css.includes('[data-login-time="evening"] .login-card')&&css.includes('[data-login-time="night"] .login-card')],
 ['スマートフォン最適化',css.includes('@media (max-width: 700px)')&&css.includes('background-position: 58% center')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status:failed.length?'failed':'passed',checked:checks.length,failed},null,2));
process.exit(failed.length?1:0);
