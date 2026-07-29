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
 ['公式SKロゴ',html.includes('sk-brand-logo-square-v348.png')],
 ['SKロゴ縦横比維持',css.includes('aspect-ratio: 1 / 1')&&css.includes('object-fit: contain')&&css.includes('object-position: center')],
 ['SKロゴ正方形ラッパー',html.includes('class="login-brand"')&&css.includes('.login-brand {')&&css.includes('aspect-ratio: 1 / 1')],
 ['SKロゴ縦横比固定',html.includes('width="700" height="700"')&&css.includes('inline-size: 100% !important')&&css.includes('block-size: 100% !important')],
 ['背景・ロゴ事前読込',html.includes("l.rel='preload'")&&html.includes('login-port-${t}.jpg')&&html.includes('rel="preload" href="../assets/images/sk-brand-logo-square-v348.png"')],
 ['認証通信タイムアウト',html.includes('AUTH_TIMEOUT_MS=20000')&&html.includes('withAuthTimeout')],
 ['パスワード再設定の二重送信防止',html.includes("button.textContent='送信中…'")&&html.includes("button.disabled=true")],
 ['時間帯背景の事前読込',html.includes('preloadLoginBackground')&&html.includes('loginBackgroundUrl')],
 ['背景読込失敗時の代替表示',html.includes("loginBackgroundReady=loaded?'true':'fallback'")&&css.includes('data-login-background-ready="fallback"')],
 ['時間帯別の背景位置調整',css.includes('data-login-time="morning"')&&css.includes('background-position: 68% center')],
 ['背景切替の動作抑制対応',css.includes('Part 352: stable background loading')&&css.includes('@media (prefers-reduced-motion: reduce)')],
 ['初回描画前の時間帯判定',html.includes('document.documentElement.dataset.loginTime=t')&&html.includes('login-port-${t}.jpg')],
 ['時間帯別港湾背景4種', ['morning','day','evening','night'].every(name=>css.includes(`login-port-${name}.jpg`))],
 ['ログインCSSキャッシュ更新',html.includes('login-production.css?v=352')],
 ['港湾背景画像',css.includes('login-port-background.jpg')],
 ['ガラス調ログインカード',css.includes('backdrop-filter: blur(20px)')&&css.includes('border-radius: 26px')],
 ['夕方・夜の暗色カード',css.includes('[data-login-time="evening"] .login-card')&&css.includes('[data-login-time="night"] .login-card')],
 ['スマートフォン最適化',css.includes('@media (max-width: 700px)')&&css.includes('background-position: 58% center')],
 ['ロゴ画像の正方形寸法属性',html.includes('width="700" height="700"')&&html.includes('sk-brand-logo-square-v348.png')],
 ['ロゴ縦横比の堅牢化',css.includes('Part 349: robust logo geometry')&&css.includes('aspect-ratio: 1 / 1')&&css.includes('object-fit: contain')],
 ['短い画面高のスクロール対応',css.includes('@media (max-height: 720px)')&&css.includes('overflow-y: auto')],
 ['横向き端末の表示対応',css.includes('@media (orientation: landscape) and (max-height: 560px)')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status:failed.length?'failed':'passed',checked:checks.length,failed},null,2));
process.exit(failed.length?1:0);
