import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from './config.js';
import { query, transaction } from './db.js';
import { authenticate, requireRole, requireOperationalRead, requireOperationalWrite, requireOperationalDelete, requireAdministrator, canManageUser, signToken, officeScope, validatePassword } from './auth.js';
import { createServerSession, rotateSessionCsrf, revokeSession, revokeAllUserSessions, clearSessionCookie, cleanupExpiredSessions } from './session-auth.js';
import { rolePermissionSnapshot } from './permissions.js';
import { audit } from './audit.js';
import { sendMail, maskEmail } from './mailer.js';
import { objectStorage, createStorageKey } from './storage.js';
import { syncRegulationVerificationCatalog } from './regulation-catalog.js';
import { syncPublicationRightsCatalog } from './publication-rights-catalog.js';
import { calculateAlertDeadlines, validateShift, validateEscalationSteps, deriveAlertState, calculateSlo, validateCapacityForecast, evaluateReportGate } from './operations-command-center-policy.js';
import { calculateRetentionDue, calculateVulnerabilityDue, validateRetentionPolicy, validateDisposalActors, validateEvidenceMetadata, validateVulnerability, validateVulnerabilityClosure, validateAuditActors, evaluateAssuranceGate } from './assurance-security-audit-policy.js';
import { calculateDriftDue, evaluateHealthSnapshot, validateConfigurationBaseline, validateDrift, validateDriftActors, validateActionActors, validateReviewActors, evaluateReliabilityGate } from './platform-reliability-policy.js';
import { calculateIssueDue, evaluateDatabaseSearchSnapshot, evaluateAttachmentIntegritySnapshot, evaluateCrossDataIntegritySnapshot, validateIntegrityIssue, validateIssueActors, validateDataReviewActors, evaluateDataAssuranceGate } from './data-integrity-performance-policy.js';
import { evaluateQualityRuleRun, validateCorrectionCandidate, validateCorrectionActors, deriveRegressionTargets, evaluateChangeImpact, validateImpactActors, calculateDefectDue, validateReleaseDefect, validateReleaseCandidate, validateReleaseActors, evaluateReleaseGate } from './quality-release-governance-policy.js';
import { evaluateDistributionPackage, validateDistributionActors, evaluateClientCompatibility, validateContinuityExercise, validateContinuityActors, evaluateDistributionContinuityGate, validateReviewActors as validateDistributionReviewActors } from './distribution-continuity-policy.js';
import { evaluateIntakeRecord, validateIntakeActors, intakeSnapshotSha } from './application-intake-workflow-policy.js';

const configurationErrors = [];
if (config.nodeEnv === 'production') {
  if (!config.corsOrigins.length) configurationErrors.push('CORS_ORIGINS is required in production');
  if (!config.session.enabled) configurationErrors.push('SERVER_SESSION_ENABLED must be true in production');
  if (!config.session.secure) configurationErrors.push('SESSION_COOKIE_SECURE must be true in production');
  if (config.session.cookieName.startsWith('__Host-') && config.session.domain) configurationErrors.push('__Host- cookie cannot use SESSION_COOKIE_DOMAIN');
  if (String(config.session.sameSite).toLowerCase() === 'none' && !config.session.secure) configurationErrors.push('SameSite=None requires Secure cookie');
  if (config.session.legacyBearerEnabled) configurationErrors.push('LEGACY_BEARER_AUTH_ENABLED must be false in production');
  if (config.jwtSecret === 'development-only-change-this-secret-immediately' || config.jwtSecret.length < 64) configurationErrors.push('JWT_SECRET must be a random value of at least 64 characters');
  if (!config.session.csrfSecret || config.session.csrfSecret.length < 64 || config.session.csrfSecret === 'development-csrf-secret') configurationErrors.push('CSRF_SECRET must be a random value of at least 64 characters');
}
if (configurationErrors.length) throw new Error(`Production configuration is invalid: ${configurationErrors.join('; ')}`);

fs.mkdirSync(config.photoStorageDir, { recursive: true });
const app = express();
app.set('trust proxy', config.trustProxy);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
}));
if (config.enforceHttps) {
  app.use((req,res,next) => {
    const forwarded = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
    if (req.secure || forwarded === 'https') return next();
    return res.status(426).json({ error:'本番環境ではHTTPS接続が必要です。' });
  });
}
app.use(cors({ origin(origin, cb) {
  if (!origin) return cb(null, true);
  if (config.corsOrigins.includes(origin)) return cb(null, true);
  if (config.nodeEnv !== 'production' && !config.corsOrigins.length) return cb(null, true);
  cb(new Error('CORS origin is not allowed'));
}, credentials: true }));
app.use(express.json({ limit: '5mb' }));
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/mfa/verify', loginLimiter);
// 添付ファイルは認証済みAPI経由で配信します。公開静的URLは使用しません。


const hashText = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomDigits = length => Array.from({ length }, () => crypto.randomInt(0, 10)).join('');
const publicUser = user => ({ id:user.id, loginId:user.login_id, email:user.email, displayName:user.display_name, role:user.role, officeId:user.office_id, accountCategory:user.account_category });

const signAssetAccess = (type,id,user,minutes=60) => {
  const payload=Buffer.from(JSON.stringify({type,id,sub:user.id,role:user.role,officeId:user.office_id||null,exp:Date.now()+minutes*60_000})).toString('base64url');
  const sig=crypto.createHmac('sha256',config.jwtSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};
const authenticateAsset = async (req,res,next) => {
  if(String(req.headers.authorization||'').startsWith('Bearer ')) return authenticate(req,res,next);
  try{
    const [payload,sig]=String(req.query.access||'').split('.');
    const expected=crypto.createHmac('sha256',config.jwtSecret).update(payload||'').digest('base64url');
    if(!payload||!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new Error();
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    const expectedType=String(req.path||'').includes('application-documents')?'document':'photo';
    if(data.exp<Date.now()||data.id!==req.params.id||data.type!==expectedType)throw new Error();
    req.user={id:data.sub,role:data.role,office_id:data.officeId,active:true};req.assetAccess=data;next();
  }catch{res.status(401).json({error:'添付ファイルの閲覧期限が切れています。画面を再読み込みしてください。'});}
};

const detectImageType = buffer => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0]===0xFF && buffer[1]===0xD8 && buffer[2]===0xFF) return { ext:'.jpg', mime:'image/jpeg' };
  if (buffer.slice(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) return { ext:'.png', mime:'image/png' };
  if (buffer.slice(0,4).toString()==='RIFF' && buffer.slice(8,12).toString()==='WEBP') return { ext:'.webp', mime:'image/webp' };
  return null;
};

const applicationSnapshot = row => row ? {
  id:row.id, applicationNumber:row.application_number, shipper:row.shipper,
  cargoName:row.cargo_name, note:row.note, status:row.status,
  caseData:row.case_data || {},
  officeId:row.office_id, blockId:row.block_id, version:row.version,
  deletedAt:row.deleted_at || null, updatedAt:row.updated_at || null
} : null;

const changedFieldNames = (before, after) => {
  const keys = new Set([...(before ? Object.keys(before) : []), ...(after ? Object.keys(after) : [])]);
  return [...keys].filter(key => JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null));
};

async function recordApplicationRevision(client, { applicationId, officeId, action, reason, before, after, userId }) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(applicationId)]);
  const count = await client.query('SELECT COALESCE(max(revision_number),0)+1 revision_number FROM application_revisions WHERE application_id=$1', [applicationId]);
  const revisionNumber = Number(count.rows[0]?.revision_number || 1);
  await client.query(`INSERT INTO application_revisions(application_id,office_id,revision_number,action,reason,before_data,after_data,changed_fields,changed_by)
    VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9)`, [applicationId,officeId,revisionNumber,action,reason,JSON.stringify(before),JSON.stringify(after),JSON.stringify(changedFieldNames(before,after)),userId]);
}

const requireDistinctRegulationActors = (row, userId, stage) => {
  const actor = String(userId);
  if (stage === 'review' && String(row.created_by || '') === actor) throw Object.assign(new Error('作成者本人は原典照合者になれません。'), { status:409 });
  if (stage === 'approve' && [row.created_by,row.reviewed_by].some(value => String(value || '') === actor)) throw Object.assign(new Error('作成者または照合者本人は承認できません。'), { status:409 });
};

const requireDistinctPublicationActors = (row, userId, stage) => {
  const actor=String(userId);
  if(stage==='review' && [row.prepared_by,row.submitted_by].some(value=>String(value||'')===actor)) throw Object.assign(new Error('登録・提出者本人は権利確認者になれません。'),{status:409});
  if(stage==='approve' && [row.prepared_by,row.submitted_by,row.reviewed_by].some(value=>String(value||'')===actor)) throw Object.assign(new Error('登録・提出者または権利確認者本人は公開範囲を承認できません。'),{status:409});
};

async function issueMfaChallenge(user, purpose='login') {
  const code = randomDigits(6);
  const { rows } = await query(`INSERT INTO mfa_challenges(user_id,purpose,code_hash,expires_at,max_attempts)
    VALUES($1,$2,$3,now()+($4 || ' minutes')::interval,$5) RETURNING id,expires_at`,
    [user.id,purpose,hashText(code),String(config.mfa.codeMinutes),config.mfa.maxAttempts]);
  await sendMail({
    to:user.email,
    subject:'【検査・検品業務サポートシステム】認証コード',
    text:`認証コードは ${code} です。有効期限は${config.mfa.codeMinutes}分です。心当たりがない場合は安全環境室へ連絡してください。`,
    html:`<p>認証コードは <strong style="font-size:24px;letter-spacing:4px">${code}</strong> です。</p><p>有効期限は${config.mfa.codeMinutes}分です。</p>`
  });
  return { challengeId:rows[0].id, expiresAt:rows[0].expires_at, maskedEmail:maskEmail(user.email) };
}

async function issueAccountToken(user, type) {
  const raw = crypto.randomBytes(32).toString('base64url');
  await query(`INSERT INTO account_tokens(user_id,token_hash,token_type,expires_at)
    VALUES($1,$2,$3,now()+($4 || ' minutes')::interval)`, [user.id,hashText(raw),type,String(config.accountTokenMinutes)]);
  return raw;
}

app.get('/api/health', async (_req, res) => {
  const { rows } = await query('SELECT now() AS server_time');
  res.json({ status: 'ok', serverTime: rows[0].server_time });
});

app.get('/api/runtime', (_req, res) => {
  res.json({
    environment: config.nodeEnv,
    localAuth: config.allowLocalAuth,
    mfaEnabled: config.mfa.enabled,
    expectedUsersPilot: 50,
    expectedUsersFuture: 150,
    photoStorage: objectStorage.provider,
    systemVersion: 'Part 535',
    publicationScope: config.publication.defaultScope,
    authenticationMode: config.session.enabled ? 'server-session' : (config.session.legacyBearerEnabled ? 'legacy-bearer' : 'disabled'),
    persistentStorage: objectStorage.provider
  });
});


async function readAccessPolicy() {
  try {
    const { rows } = await query(`SELECT setting_value FROM system_runtime_settings WHERE setting_key='access_policy'`);
    return { authenticationRequired: rows[0]?.setting_value?.authenticationRequired !== false };
  } catch {
    return { authenticationRequired:true };
  }
}

app.get('/api/system/access-policy', async (_req,res) => {
  res.json(await readAccessPolicy());
});

app.put('/api/admin/system/access-policy', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({authenticationRequired:z.boolean()});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'ログイン設定を確認してください。'});
  const value={authenticationRequired:parsed.data.authenticationRequired};
  await query(`INSERT INTO system_runtime_settings(setting_key,setting_value,updated_by,updated_at) VALUES('access_policy',$1::jsonb,$2,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=now()`,[JSON.stringify(value),req.user.id]);
  await audit(req,'update','system-access-policy','access_policy',value);
  res.json(value);
});

app.post('/api/auth/login', async (req, res) => {
  if (!config.allowLocalAuth) return res.status(403).json({ error: 'ローカル認証は無効です。社内認証を利用してください。' });
  const schema = z.object({ loginId: z.string().min(1).max(100), password: z.string().min(1).max(300), remember:z.boolean().optional().default(false) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'ログインIDとパスワードを確認してください。' });
  const { rows } = await query('SELECT * FROM users WHERE lower(login_id)=lower($1) AND active=true', [parsed.data.loginId.trim()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'ログイン情報が正しくありません。' });
  if (user.account_expires_at && new Date(user.account_expires_at) <= new Date()) return res.status(403).json({ error: 'アカウントの有効期限が終了しています。管理者へ連絡してください。' });
  if (user.locked_until && new Date(user.locked_until) > new Date()) return res.status(423).json({ error: 'アカウントが一時ロックされています。時間をおいて再試行してください。' });
  const valid = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!valid) {
    const nextCount = Number(user.failed_login_count || 0) + 1;
    const lock = nextCount >= config.loginMaxFailures;
    await query(`UPDATE users SET failed_login_count=$1,locked_until=CASE WHEN $2 THEN now()+($3 || ' minutes')::interval ELSE NULL END WHERE id=$4`, [lock ? 0 : nextCount, lock, String(config.loginLockMinutes), user.id]);
    await query(`INSERT INTO account_security_events(user_id,event_type,ip_address,user_agent,details) VALUES($1,'login-failed',$2,$3,$4::jsonb)`,[user.id,req.ip||null,req.get('user-agent')||null,JSON.stringify({locked:lock})]).catch(()=>{});
    return res.status(401).json({ error: lock ? 'ログイン失敗回数が上限に達したため、一時ロックしました。' : 'ログイン情報が正しくありません。' });
  }
  await query('UPDATE users SET failed_login_count=0,locked_until=NULL WHERE id=$1', [user.id]);
  if (config.mfa.enabled && user.mfa_required) {
    const challenge = await issueMfaChallenge(user, 'login');
    await audit({ ...req, user }, 'mfa-issued', 'user', user.id, { purpose:'login' });
    return res.json({ mfaRequired:true, remember:parsed.data.remember, ...challenge, resendAfterSeconds:config.mfa.resendSeconds });
  }
  await query('UPDATE users SET last_login_at=now(),first_login_at=COALESCE(first_login_at,now()) WHERE id=$1', [user.id]);
  await query(`INSERT INTO account_security_events(user_id,event_type,ip_address,user_agent,details) VALUES($1,'login-success',$2,$3,$4::jsonb)`,[user.id,req.ip||null,req.get('user-agent')||null,JSON.stringify({mfa:false,mode:config.session.enabled?'server-session':'legacy-bearer'})]).catch(()=>{});
  if (config.session.enabled) {
    const created = await createServerSession(user, req, res, { remember:parsed.data.remember });
    return res.json({ authMode:'server-session', csrfToken:created.csrfToken, mfaRequired:false, passwordChangeRequired:Boolean(user.must_change_password), user:publicUser(user) });
  }
  if (!config.session.legacyBearerEnabled) return res.status(503).json({ error:'利用可能な認証方式が設定されていません。' });
  const token = signToken(user);
  res.json({ authMode:'legacy-bearer', token, mfaRequired:false, passwordChangeRequired:Boolean(user.must_change_password), user:publicUser(user) });
});

app.post('/api/auth/mfa/verify', async (req,res) => {
  const schema=z.object({ challengeId:z.string().uuid(), code:z.string().regex(/^\d{6}$/), remember:z.boolean().optional().default(false) });
  const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'6桁の認証コードを確認してください。'});
  const {rows}=await query(`SELECT c.id challenge_id,c.user_id,c.code_hash,c.attempt_count,c.max_attempts,u.* FROM mfa_challenges c JOIN users u ON u.id=c.user_id
    WHERE c.id=$1 AND c.consumed_at IS NULL AND c.expires_at>now() AND u.active=true`,[parsed.data.challengeId]);
  const row=rows[0];
  if(!row) return res.status(401).json({error:'認証コードの有効期限が切れているか、使用済みです。'});
  if(Number(row.attempt_count)>=Number(row.max_attempts)) return res.status(423).json({error:'認証コードの試行回数が上限に達しました。再度ログインしてください。'});
  if(hashText(parsed.data.code)!==row.code_hash){
    await query('UPDATE mfa_challenges SET attempt_count=attempt_count+1 WHERE id=$1',[row.challenge_id]);
    return res.status(401).json({error:'認証コードが正しくありません。'});
  }
  await query('UPDATE mfa_challenges SET consumed_at=now() WHERE id=$1',[row.challenge_id]);
  await query('UPDATE users SET last_login_at=now(),first_login_at=COALESCE(first_login_at,now()),email_verified=true,mfa_last_verified_at=now() WHERE id=$1',[row.user_id]);
  await query(`INSERT INTO account_security_events(user_id,event_type,ip_address,user_agent,details) VALUES($1,'mfa-verified',$2,$3,$4::jsonb)`,[row.user_id,req.ip||null,req.get('user-agent')||null,JSON.stringify({purpose:'login'})]).catch(()=>{});
  const user={ id:row.user_id, login_id:row.login_id, email:row.email, display_name:row.display_name, role:row.role, office_id:row.office_id, account_category:row.account_category, must_change_password:row.must_change_password, token_version:row.token_version };
  if (config.session.enabled) {
    const created=await createServerSession(user,req,res,{remember:parsed.data.remember});
    return res.json({authMode:'server-session',csrfToken:created.csrfToken,passwordChangeRequired:Boolean(user.must_change_password),user:publicUser(user)});
  }
  if (!config.session.legacyBearerEnabled) return res.status(503).json({error:'利用可能な認証方式が設定されていません。'});
  const token=signToken(user);
  res.json({authMode:'legacy-bearer',token,passwordChangeRequired:Boolean(user.must_change_password),user:publicUser(user)});
});

app.post('/api/auth/mfa/resend', async (req,res) => {
  const schema=z.object({challengeId:z.string().uuid()});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'認証情報を確認してください。'});
  const {rows}=await query(`SELECT u.* FROM mfa_challenges c JOIN users u ON u.id=c.user_id
    WHERE c.id=$1 AND c.created_at < now()-($2 || ' seconds')::interval AND u.active=true`,[parsed.data.challengeId,String(config.mfa.resendSeconds)]);
  if(!rows[0]) return res.status(429).json({error:'再送できるまで少しお待ちください。'});
  await query('UPDATE mfa_challenges SET consumed_at=now() WHERE id=$1',[parsed.data.challengeId]);
  const challenge=await issueMfaChallenge(rows[0],'login');
  res.json({...challenge,resendAfterSeconds:config.mfa.resendSeconds});
});

app.post('/api/auth/activate', async (req,res) => {
  const schema=z.object({token:z.string().min(20),newPassword:z.string().min(1).max(300)});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'アカウント有効化情報を確認してください。'});
  const errors=validatePassword(parsed.data.newPassword);
  if(errors.length) return res.status(400).json({error:`パスワードには${errors.join('・')}が必要です。`});
  const {rows}=await query(`SELECT t.id token_id,u.* FROM account_tokens t JOIN users u ON u.id=t.user_id
    WHERE t.token_hash=$1 AND t.token_type='activation' AND t.consumed_at IS NULL AND t.expires_at>now()`,[hashText(parsed.data.token)]);
  const user=rows[0]; if(!user) return res.status(400).json({error:'有効化リンクが無効または期限切れです。'});
  const hash=await bcrypt.hash(parsed.data.newPassword,12);
  await transaction(async client=>{await client.query('UPDATE users SET password_hash=$1,must_change_password=false,activated_at=now(),password_changed_at=now(),updated_at=now() WHERE id=$2',[hash,user.id]);await client.query('UPDATE account_tokens SET consumed_at=now() WHERE id=$1',[user.token_id]);});
  res.status(204).end();
});

app.post('/api/auth/request-password-reset', async (req,res) => {
  const schema=z.object({loginId:z.string().min(1).max(100)});const parsed=schema.safeParse(req.body);
  if(parsed.success){const {rows}=await query('SELECT * FROM users WHERE lower(login_id)=lower($1) AND active=true',[parsed.data.loginId]);if(rows[0]){const token=await issueAccountToken(rows[0],'password-reset');const url=`${config.publicAppUrl}/pages/reset-password.html?token=${encodeURIComponent(token)}`;await sendMail({to:rows[0].email,subject:'【検査・検品業務サポートシステム】パスワード再設定',text:`次のURLからパスワードを再設定してください。 ${url}`,html:`<p><a href="${url}">パスワードを再設定する</a></p>`});}}
  res.status(204).end();
});

app.post('/api/auth/reset-password', async (req,res) => {
  const schema=z.object({token:z.string().min(20),newPassword:z.string().min(1).max(300)});const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'再設定情報を確認してください。'});const errors=validatePassword(parsed.data.newPassword);if(errors.length)return res.status(400).json({error:`パスワードには${errors.join('・')}が必要です。`});
  const {rows}=await query(`SELECT t.id token_id,u.id user_id FROM account_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.token_type='password-reset' AND t.consumed_at IS NULL AND t.expires_at>now()`,[hashText(parsed.data.token)]);if(!rows[0])return res.status(400).json({error:'再設定リンクが無効または期限切れです。'});const hash=await bcrypt.hash(parsed.data.newPassword,12);await transaction(async client=>{await client.query('UPDATE users SET password_hash=$1,password_changed_at=now(),must_change_password=false,failed_login_count=0,locked_until=NULL,token_version=COALESCE(token_version,1)+1 WHERE id=$2',[hash,rows[0].user_id]);await client.query('UPDATE account_tokens SET consumed_at=now() WHERE id=$1',[rows[0].token_id]);});res.status(204).end();
});

app.get('/api/auth/csrf', authenticate, async (req,res) => {
  if (req.authContext?.mode !== 'server-session') return res.json({ authMode:req.authContext?.mode || 'unknown', csrfToken:null });
  const csrfToken=await rotateSessionCsrf(req.authContext.sessionId);
  if (!csrfToken) return res.status(401).json({ error:'セッションが無効です。再度ログインしてください。' });
  res.json({ authMode:'server-session', csrfToken });
});

app.post('/api/auth/logout', authenticate, async (req,res) => {
  if (req.authContext?.sessionId) await revokeSession(req.authContext.sessionId,'logout');
  clearSessionCookie(res);
  await audit(req,'logout','user',req.user.id,{mode:req.authContext?.mode || 'unknown'});
  res.status(204).end();
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user), authMode:req.authContext?.mode || 'unknown' }));

app.get('/api/auth/security-events', authenticate, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  const { rows } = await query(`SELECT id,event_type,ip_address::text ip_address,user_agent,details,created_at
    FROM account_security_events WHERE user_id=$1
    ORDER BY created_at DESC LIMIT $2`, [req.user.id, limit]);
  const { rows: users } = await query(`SELECT login_id,display_name,email,role,office_id,last_login_at,password_changed_at,mfa_required,mfa_last_verified_at,token_version
    FROM users WHERE id=$1`, [req.user.id]);
  res.json({ account: users[0] || null, events: rows });
});

app.post('/api/auth/logout-all', authenticate, async (req, res) => {
  await query('UPDATE users SET token_version=COALESCE(token_version,1)+1,last_forced_logout_at=now(),updated_at=now() WHERE id=$1', [req.user.id]);
  await revokeAllUserSessions(req.user.id,'logout-all');
  clearSessionCookie(res);
  await query(`INSERT INTO account_security_events(user_id,event_type,actor_user_id,ip_address,user_agent,details)
    VALUES($1,'force-logout',$1,$2,$3,$4::jsonb)`, [req.user.id, req.ip || null, req.get('user-agent') || null, JSON.stringify({ scope:'all-sessions', requestedBy:'self' })]).catch(()=>{});
  await audit(req, 'self-force-logout', 'user', req.user.id, { scope:'all-sessions' });
  res.status(204).end();
});

app.post('/api/auth/change-password' , authenticate, async (req, res) => {
  const schema = z.object({ currentPassword: z.string().min(1).max(300), newPassword: z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'パスワード入力を確認してください。' });
  const errors = validatePassword(parsed.data.newPassword);
  if (errors.length) return res.status(400).json({ error: `新しいパスワードには${errors.join('・')}が必要です。` });
  const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(parsed.data.currentPassword, rows[0].password_hash))) return res.status(401).json({ error: '現在のパスワードが正しくありません。' });
  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  await query('UPDATE users SET password_hash=$1,password_changed_at=now(),must_change_password=false,updated_at=now(),token_version=COALESCE(token_version,1)+1 WHERE id=$2', [hash, req.user.id]);
  await query(`INSERT INTO account_security_events(user_id,event_type,actor_user_id,ip_address,user_agent,details)
    VALUES($1,'password-changed',$1,$2,$3,$4::jsonb)`, [req.user.id, req.ip || null, req.get('user-agent') || null, JSON.stringify({ source:'authenticated-change' })]).catch(()=>{});
  await revokeAllUserSessions(req.user.id,'password-changed');
  clearSessionCookie(res);
  await audit(req, 'change-password', 'user', req.user.id);
  res.status(204).end();
});

app.get('/api/organizations', authenticate, async (_req, res) => {
  const { rows } = await query(`SELECT b.id block_id,b.name block_name,o.id office_id,o.name office_name,o.active,
    o.photo_limit_per_application,o.photo_limit_total,o.photo_max_file_mb,o.photo_storage_limit_mb
    FROM blocks b JOIN offices o ON o.block_id=b.id WHERE b.active=true ORDER BY b.sort_order,o.name`);
  res.json({ offices: rows });
});

app.get('/api/applications', authenticate, requireOperationalRead, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const values = [];
  let where = 'a.deleted_at IS NULL';
  if (officeId) { values.push(officeId); where += ` AND a.office_id=$${values.length}`; }
  if (req.query.since) { values.push(req.query.since); where += ` AND a.updated_at>$${values.length}`; }
  const { rows } = await query(`SELECT a.*,o.name office_name,b.name block_name,
    (SELECT count(*)::int FROM photos p WHERE p.application_id=a.id AND p.deleted_at IS NULL) photo_count
    FROM applications a JOIN offices o ON o.id=a.office_id JOIN blocks b ON b.id=a.block_id
    WHERE ${where} ORDER BY a.updated_at DESC LIMIT 5000`, values);
  res.json({ applications: rows });
});

const applicationSchema = z.object({ clientId: z.string().max(100).optional(), applicationNumber: z.string().min(1).max(100), shipper: z.string().max(300).default(''), cargoName: z.string().max(500).default(''), note: z.string().max(5000).default(''), status: z.string().max(50).default('active'), officeId: z.string().min(1), caseData: z.record(z.any()).optional().default({}) });
app.post('/api/applications', authenticate, requireOperationalWrite, async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '申請番号の入力内容を確認してください。' });
  const officeId = officeScope(req.user, parsed.data.officeId);
  if (!officeId || officeId === '__NO_OPERATIONAL_SCOPE__') return res.status(403).json({ error: 'このアカウントでは申請番号を登録できません。' });
  try {
    const application = await transaction(async client => {
      const { rows } = await client.query(`INSERT INTO applications(client_id,application_number,shipper,cargo_name,note,status,case_data,office_id,block_id,created_by,updated_by)
        SELECT $1,$2,$3,$4,$5,$6,$7::jsonb,o.id,o.block_id,$8,$8 FROM offices o WHERE o.id=$9 RETURNING *`,
        [parsed.data.clientId || null, parsed.data.applicationNumber.trim(), parsed.data.shipper, parsed.data.cargoName, parsed.data.note, parsed.data.status, JSON.stringify(parsed.data.caseData || {}), req.user.id, officeId]);
      if (!rows[0]) throw Object.assign(new Error('事業所が見つかりません。'), { status:404 });
      const snapshot=applicationSnapshot(rows[0]);
      await recordApplicationRevision(client,{applicationId:rows[0].id,officeId:rows[0].office_id,action:'create',reason:'新規登録',before:null,after:snapshot,userId:req.user.id});
      return rows[0];
    });
    await audit(req, 'create', 'application', application.id, { applicationNumber: application.application_number });
    res.status(201).json({ application });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: '同じ事業所に同一の申請番号が登録されています。' });
    throw error;
  }
});

app.put('/api/applications/:id', authenticate, requireOperationalWrite, async (req, res) => {
  const schema = z.object({ applicationNumber: z.string().min(1).max(100).optional(), shipper: z.string().max(300).optional(), cargoName: z.string().max(500).optional(), note: z.string().max(5000).optional(), status: z.string().max(50).optional(), caseData: z.record(z.any()).optional(), version: z.number().int().positive(), changeReason:z.string().min(1).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '更新内容と訂正理由を確認してください。' });
  const officeId = officeScope(req.user, req.query.officeId);
  const application = await transaction(async client => {
    const current=await client.query(`SELECT * FROM applications WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2) FOR UPDATE`,[req.params.id,officeId]);
    if(!current.rows[0]) throw Object.assign(new Error('対象が見つかりません。'),{status:404});
    if(Number(current.rows[0].version)!==Number(parsed.data.version)) throw Object.assign(new Error('他の利用者が更新しました。再読み込みしてください。'),{status:409});
    const before=applicationSnapshot(current.rows[0]);
    const { rows } = await client.query(`UPDATE applications SET application_number=COALESCE($1,application_number),shipper=COALESCE($2,shipper),cargo_name=COALESCE($3,cargo_name),note=COALESCE($4,note),status=COALESCE($5,status),case_data=COALESCE($6::jsonb,case_data),updated_by=$7,version=version+1,updated_at=now() WHERE id=$8 RETURNING *`, [parsed.data.applicationNumber, parsed.data.shipper, parsed.data.cargoName, parsed.data.note, parsed.data.status, parsed.data.caseData === undefined ? null : JSON.stringify(parsed.data.caseData), req.user.id, req.params.id]);
    const after=applicationSnapshot(rows[0]);
    await recordApplicationRevision(client,{applicationId:rows[0].id,officeId:rows[0].office_id,action:'correct',reason:parsed.data.changeReason,before,after,userId:req.user.id});
    return rows[0];
  });
  await audit(req, 'correct', 'application', application.id,{reason:parsed.data.changeReason,version:application.version});
  res.json({ application });
});

app.delete('/api/applications/:id', authenticate, requireOperationalDelete, async (req, res) => {
  const schema=z.object({reason:z.string().min(1).max(1000)});const parsed=schema.safeParse(req.body||{});
  if(!parsed.success)return res.status(400).json({error:'削除理由を入力してください。'});
  const officeId = officeScope(req.user, req.query.officeId);
  await transaction(async client=>{
    const current=await client.query(`SELECT * FROM applications WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2) FOR UPDATE`,[req.params.id,officeId]);
    if(!current.rows[0])throw Object.assign(new Error('対象が見つかりません。'),{status:404});
    const before=applicationSnapshot(current.rows[0]);
    const {rows}=await client.query('UPDATE applications SET deleted_at=now(),updated_by=$1,updated_at=now(),version=version+1 WHERE id=$2 RETURNING *',[req.user.id,req.params.id]);
    await recordApplicationRevision(client,{applicationId:rows[0].id,officeId:rows[0].office_id,action:'delete',reason:parsed.data.reason,before,after:applicationSnapshot(rows[0]),userId:req.user.id});
  });
  await audit(req, 'delete', 'application', req.params.id,{reason:parsed.data.reason});
  res.status(204).end();
});

app.get('/api/applications/:id/history',authenticate,requireOperationalRead,async(req,res)=>{
  const officeId=officeScope(req.user,req.query.officeId);
  const application=await query(`SELECT id FROM applications WHERE id=$1 AND ($2::text IS NULL OR office_id=$2)`,[req.params.id,officeId]);
  if(!application.rows[0])return res.status(404).json({error:'対象が見つかりません。'});
  const {rows}=await query(`SELECT r.*,u.display_name changed_by_name,u.login_id changed_by_login FROM application_revisions r LEFT JOIN users u ON u.id=r.changed_by WHERE r.application_id=$1 ORDER BY r.revision_number DESC`,[req.params.id]);
  res.json({history:rows});
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
const documentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });

const photoApiUrl = (id,user) => `/api/photos/${id}/content?access=${encodeURIComponent(signAssetAccess('photo',id,user))}`;
const documentApiUrl = (id,user) => `/api/application-documents/${id}/content?access=${encodeURIComponent(signAssetAccess('document',id,user))}`;

app.get('/api/photos', authenticate, requireOperationalRead, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const values = [];
  let where = 'p.deleted_at IS NULL';
  if (officeId) { values.push(officeId); where += ` AND p.office_id=$${values.length}`; }
  if (req.query.applicationId) { values.push(req.query.applicationId); where += ` AND p.application_id=$${values.length}`; }
  const { rows } = await query(`SELECT p.*,a.application_number,o.name office_name,b.name block_name FROM photos p
    JOIN applications a ON a.id=p.application_id JOIN offices o ON o.id=p.office_id JOIN blocks b ON b.id=p.block_id
    WHERE ${where} ORDER BY p.created_at DESC LIMIT 5000`, values);
  res.json({ photos: rows.map(row => ({ ...row, url: photoApiUrl(row.id,req.user) })) });
});

app.get('/api/photos/:id/content', authenticateAsset, requireOperationalRead, async (req,res)=>{
  const officeId=officeScope(req.user,req.query.officeId);
  const {rows}=await query(`SELECT id,office_id,storage_key,stored_name,mime_type,original_name,sha256 FROM photos WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2)`,[req.params.id,officeId]);
  const photo=rows[0];if(!photo)return res.status(404).json({error:'写真が見つかりません。'});
  const key=photo.storage_key||photo.stored_name;
  const body=await objectStorage.get(key);
  const actual=crypto.createHash('sha256').update(body).digest('hex');
  if(actual!==photo.sha256)return res.status(409).json({error:'写真ファイルの整合性を確認できません。管理者へ連絡してください。'});
  res.setHeader('Content-Type',photo.mime_type);
  res.setHeader('Content-Length',String(body.length));
  res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(photo.original_name)}`);
  res.setHeader('Cache-Control','private, max-age=300');
  res.send(body);
});

app.post('/api/photos', authenticate, requireOperationalWrite, upload.single('photo'), async (req, res) => {
  const schema = z.object({ applicationId: z.string().uuid(), clientId: z.string().max(100).optional(), shootingAt: z.string().optional(), registeredBy: z.string().max(100).default(''), comment: z.string().max(2000).default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !req.file) return res.status(400).json({ error: '写真と申請番号を確認してください。' });
  const detectedImage = detectImageType(req.file.buffer);
  if (!detectedImage) return res.status(400).json({ error: 'JPEG・PNG・WebP形式の画像のみ登録できます。拡張子だけを変更したファイルは登録できません。' });
  const ext = detectedImage.ext;
  const storageKey = createStorageKey(`photos/${parsed.data.applicationId}`, ext);
  const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  await objectStorage.put(storageKey,req.file.buffer,{contentType:detectedImage.mime,sha256});
  try {
    const result = await transaction(async client => {
      const appResult = await client.query(`SELECT a.*,o.photo_limit_per_application,o.photo_limit_total,o.photo_max_file_mb,o.photo_storage_limit_mb
        FROM applications a JOIN offices o ON o.id=a.office_id WHERE a.id=$1 AND a.deleted_at IS NULL`, [parsed.data.applicationId]);
      const application = appResult.rows[0];
      if (!application) throw Object.assign(new Error('申請番号が見つかりません。'), { status: 404 });
      if (!['safety-environment-director','safety-environment-admin'].includes(req.user.role) && application.office_id !== req.user.office_id) throw Object.assign(new Error('この事業所の写真は登録できません。'), { status: 403 });
      if (req.file.size > application.photo_max_file_mb * 1024 * 1024) throw Object.assign(new Error(`写真1枚の上限は${application.photo_max_file_mb}MBです。`), { status: 413 });
      const countResult = await client.query(`SELECT
        count(*) FILTER (WHERE application_id=$1 AND deleted_at IS NULL)::int app_count,
        count(*) FILTER (WHERE office_id=$2 AND deleted_at IS NULL)::int office_count,
        COALESCE(sum(file_size) FILTER (WHERE office_id=$2 AND deleted_at IS NULL),0)::bigint office_bytes
        FROM photos`, [application.id, application.office_id]);
      const usage = countResult.rows[0];
      if (usage.app_count >= application.photo_limit_per_application) throw Object.assign(new Error(`1申請番号あたりの写真上限${application.photo_limit_per_application}枚に達しています。`), { status: 409 });
      if (usage.office_count >= application.photo_limit_total) throw Object.assign(new Error(`事業所の写真上限${application.photo_limit_total}枚に達しています。`), { status: 409 });
      if (Number(usage.office_bytes) + req.file.size > application.photo_storage_limit_mb * 1024 * 1024) throw Object.assign(new Error(`事業所の保存容量上限${application.photo_storage_limit_mb}MBを超えます。`), { status: 409 });
      const storedName=storageKey.split('/').pop();
      const photoResult = await client.query(`INSERT INTO photos(client_id,application_id,block_id,office_id,original_name,stored_name,storage_key,storage_provider,mime_type,file_size,sha256,shooting_at,registered_by_name,comment,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`, [parsed.data.clientId || null, application.id, application.block_id, application.office_id, req.file.originalname, storedName, storageKey, objectStorage.provider, detectedImage.mime, req.file.size, sha256, parsed.data.shootingAt || null, parsed.data.registeredBy, parsed.data.comment, req.user.id]);
      return photoResult.rows[0];
    });
    await audit(req, 'create', 'photo', result.id, { applicationId: result.application_id, fileSize: result.file_size,storageProvider:objectStorage.provider });
    res.status(201).json({ photo: { ...result, url: photoApiUrl(result.id,req.user) } });
  } catch(error) {
    await objectStorage.delete(storageKey).catch(()=>{});
    throw error;
  }
});

app.delete('/api/photos/:id', authenticate, requireOperationalDelete, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const { rows } = await query('UPDATE photos SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2) RETURNING id,storage_key,stored_name', [req.params.id, officeId]);
  if (!rows[0]) return res.status(404).json({ error: '対象が見つかりません。' });
  await audit(req, 'delete', 'photo', req.params.id,{storageKey:rows[0].storage_key||rows[0].stored_name});
  res.status(204).end();
});

app.get('/api/application-documents',authenticate,requireOperationalRead,async(req,res)=>{
  const officeId=officeScope(req.user,req.query.officeId);const values=[];let where='1=1';
  if(officeId){values.push(officeId);where+=` AND a.office_id=$${values.length}`;}
  if(req.query.applicationId){values.push(String(req.query.applicationId));where+=` AND d.application_id=$${values.length}`;}
  if(req.query.includeCancelled!=='true')where+=' AND d.cancelled_at IS NULL';
  const {rows}=await query(`SELECT d.*,a.application_number,a.office_id,o.name office_name,u.display_name created_by_name,
    NOT EXISTS(SELECT 1 FROM application_documents newer WHERE newer.root_document_id=COALESCE(d.root_document_id,d.id) AND newer.version_number>d.version_number AND newer.cancelled_at IS NULL) is_latest_version
    FROM application_documents d JOIN applications a ON a.id=d.application_id JOIN offices o ON o.id=a.office_id LEFT JOIN users u ON u.id=d.created_by
    WHERE ${where} ORDER BY d.created_at DESC LIMIT 5000`,values);
  res.json({documents:rows.map(row=>({...row,url:documentApiUrl(row.id,req.user)}))});
});

app.get('/api/application-documents/:id/content',authenticateAsset,requireOperationalRead,async(req,res)=>{
  const officeId=officeScope(req.user,req.query.officeId);
  const {rows}=await query(`SELECT d.*,a.office_id FROM application_documents d JOIN applications a ON a.id=d.application_id WHERE d.id=$1 AND ($2::text IS NULL OR a.office_id=$2)`,[req.params.id,officeId]);
  const doc=rows[0];if(!doc)return res.status(404).json({error:'添付資料が見つかりません。'});
  const body=await objectStorage.get(doc.storage_key);const actual=crypto.createHash('sha256').update(body).digest('hex');
  if(actual!==doc.sha256)return res.status(409).json({error:'添付資料の整合性を確認できません。管理者へ連絡してください。'});
  res.setHeader('Content-Type',doc.mime_type||'application/octet-stream');res.setHeader('Content-Length',String(body.length));
  res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`);res.setHeader('Cache-Control','private, no-store');res.send(body);
});

app.post('/api/application-documents',authenticate,requireOperationalWrite,documentUpload.single('document'),async(req,res)=>{
  const schema=z.object({applicationId:z.string().uuid(),category:z.string().min(1).max(100),description:z.string().max(3000).default(''),changeReason:z.string().max(2000).default(''),uploadedBy:z.string().max(100).default(''),parentDocumentId:z.string().uuid().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success||!req.file)return res.status(400).json({error:'添付資料と登録内容を確認してください。'});
  if(parsed.data.parentDocumentId&&!parsed.data.changeReason.trim())return res.status(400).json({error:'更新版を登録する場合は変更理由が必要です。'});
  const ext=path.extname(req.file.originalname).slice(0,12);const storageKey=createStorageKey(`documents/${parsed.data.applicationId}`,ext);const sha256=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  await objectStorage.put(storageKey,req.file.buffer,{contentType:req.file.mimetype||'application/octet-stream',sha256});
  try{
    const document=await transaction(async client=>{
      const appResult=await client.query('SELECT * FROM applications WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[parsed.data.applicationId]);const application=appResult.rows[0];if(!application)throw Object.assign(new Error('申請番号が見つかりません。'),{status:404});
      if(!['safety-environment-director','safety-environment-admin'].includes(req.user.role)&&application.office_id!==req.user.office_id)throw Object.assign(new Error('この事業所の添付資料は登録できません。'),{status:403});
      let parent=null,rootId=null,version=1;
      if(parsed.data.parentDocumentId){const pr=await client.query('SELECT * FROM application_documents WHERE id=$1 AND application_id=$2 FOR UPDATE',[parsed.data.parentDocumentId,application.id]);parent=pr.rows[0];if(!parent)throw Object.assign(new Error('更新元の資料が見つかりません。'),{status:404});rootId=parent.root_document_id||parent.id;const vr=await client.query('SELECT COALESCE(max(version_number),0)+1 version FROM application_documents WHERE root_document_id=$1 OR id=$1',[rootId]);version=Number(vr.rows[0].version||2);}
      const {rows}=await client.query(`INSERT INTO application_documents(application_id,parent_document_id,root_document_id,version_number,category,original_name,storage_key,storage_provider,mime_type,file_size,sha256,description,change_reason,uploaded_by_name,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[application.id,parent?.id||null,rootId,version,parsed.data.category,req.file.originalname,storageKey,objectStorage.provider,req.file.mimetype||'application/octet-stream',req.file.size,sha256,parsed.data.description,parsed.data.changeReason,parsed.data.uploadedBy,req.user.id]);
      if(!rootId)await client.query('UPDATE application_documents SET root_document_id=id WHERE id=$1',[rows[0].id]);
      return rows[0];
    });
    await audit(req,parsed.data.parentDocumentId?'new-version':'create','application-document',document.id,{applicationId:document.application_id,version:document.version_number,storageProvider:objectStorage.provider});
    res.status(201).json({document:{...document,url:documentApiUrl(document.id,req.user)}});
  }catch(error){await objectStorage.delete(storageKey).catch(()=>{});throw error;}
});

app.patch('/api/application-documents/:id/status',authenticate,requireOperationalWrite,async(req,res)=>{
  const schema=z.object({action:z.enum(['cancel','restore']),reason:z.string().max(2000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'更新内容を確認してください。'});
  if(parsed.data.action==='cancel'&&!parsed.data.reason.trim())return res.status(400).json({error:'取消理由を入力してください。'});
  const officeId=officeScope(req.user,req.query.officeId);
  const sql=parsed.data.action==='cancel'
    ? `UPDATE application_documents d SET cancelled_at=now(),cancelled_by=$1,cancellation_reason=$2,updated_at=now() FROM applications a WHERE d.id=$3 AND a.id=d.application_id AND d.cancelled_at IS NULL AND ($4::text IS NULL OR a.office_id=$4) RETURNING d.*`
    : `UPDATE application_documents d SET cancelled_at=NULL,cancelled_by=NULL,cancellation_reason=NULL,restored_at=now(),restored_by=$1,updated_at=now() FROM applications a WHERE d.id=$3 AND a.id=d.application_id AND d.cancelled_at IS NOT NULL AND ($4::text IS NULL OR a.office_id=$4) RETURNING d.*`;
  const {rows}=await query(sql,[req.user.id,parsed.data.reason,req.params.id,officeId]);if(!rows[0])return res.status(404).json({error:'対象の添付資料が見つかりません。'});
  await audit(req,parsed.data.action,'application-document',req.params.id,{reason:parsed.data.reason});res.json({document:{...rows[0],url:documentApiUrl(rows[0].id,req.user)}});
});

app.get('/api/admin/office-summary', authenticate, requireRole('safety-environment-admin'), async (_req, res) => {
  const { rows } = await query(`SELECT b.name block_name,o.id office_id,o.name office_name,
    count(DISTINCT a.id) FILTER (WHERE a.deleted_at IS NULL)::int application_count,
    count(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL)::int photo_count,
    COALESCE(sum(p.file_size) FILTER (WHERE p.deleted_at IS NULL),0)::bigint photo_bytes
    FROM offices o JOIN blocks b ON b.id=o.block_id
    LEFT JOIN applications a ON a.office_id=o.id LEFT JOIN photos p ON p.office_id=o.id
    GROUP BY b.name,o.id,o.name ORDER BY b.name,o.name`);
  res.json({ offices: rows });
});

app.put('/api/admin/offices/:id/limits', authenticate, requireRole('safety-environment-admin'), async (req, res) => {
  const schema = z.object({ perApplication: z.number().int().min(1).max(500), perOffice: z.number().int().min(1).max(100000), maxFileMb: z.number().int().min(1).max(100), storageMb: z.number().int().min(10).max(1000000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '写真上限の設定値を確認してください。' });
  const { rows } = await query(`UPDATE offices SET photo_limit_per_application=$1,photo_limit_total=$2,photo_max_file_mb=$3,photo_storage_limit_mb=$4,updated_at=now() WHERE id=$5 RETURNING *`, [parsed.data.perApplication, parsed.data.perOffice, parsed.data.maxFileMb, parsed.data.storageMb, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '事業所が見つかりません。' });
  await audit(req, 'update-limits', 'office', req.params.id, parsed.data);
  res.json({ office: rows[0] });
});

app.post('/api/admin/audit-logs/purge', authenticate, requireRole('safety-environment-admin'), async (req, res) => {
  const days = Math.max(30, Math.min(3650, Number(req.body?.retentionDays || config.auditRetentionDays)));
  const { rowCount } = await query(`DELETE FROM audit_logs WHERE created_at < now()-($1 || ' days')::interval`, [String(days)]);
  await audit(req, 'purge', 'audit-log', null, { retentionDays: days, deleted: rowCount });
  res.json({ deleted: rowCount, retentionDays: days });
});

app.get('/api/admin/audit-logs', authenticate, requireAdministrator, async (req, res) => {
  const limit = Math.min(5000, Math.max(1, Number(req.query.limit || 200)));
  const values=[]; const where=[];
  const officeId = req.user.role==='office-admin' ? req.user.office_id : String(req.query.officeId||'').trim();
  if (officeId) { values.push(officeId); where.push(`a.office_id=$${values.length}`); }
  if (req.query.action) { values.push(String(req.query.action)); where.push(`a.action=$${values.length}`); }
  if (req.query.userId) { values.push(String(req.query.userId)); where.push(`a.user_id=$${values.length}`); }
  if (req.query.from) { values.push(String(req.query.from)); where.push(`a.created_at >= $${values.length}::timestamptz`); }
  if (req.query.to) { values.push(String(req.query.to)); where.push(`a.created_at < ($${values.length}::date + interval '1 day')`); }
  values.push(limit);
  const { rows } = await query(`SELECT a.*,u.display_name,u.login_id,o.name office_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN offices o ON o.id=a.office_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY a.created_at DESC LIMIT $${values.length}`, values);
  res.json({ logs: rows });
});

app.post('/api/admin/users/:id/force-logout', authenticate, requireAdministrator, async (req,res) => {
  const { rows } = await query('SELECT id,role,office_id,display_name FROM users WHERE id=$1',[req.params.id]);
  const target=rows[0]; if(!target) return res.status(404).json({error:'利用者が見つかりません。'});
  if(!canManageUser(req.user,target) && req.user.role!=='safety-environment-admin') return res.status(403).json({error:'この利用者を操作できません。'});
  await query('UPDATE users SET token_version=token_version+1,last_forced_logout_at=now(),updated_at=now() WHERE id=$1',[target.id]);
  await audit(req,'force-logout','user',target.id,{displayName:target.display_name});
  res.json({message:'対象利用者のログイン状態を終了しました。'});
});

app.post('/api/sync/batch', authenticate, requireOperationalWrite, async (req, res) => {
  const schema = z.object({ items: z.array(z.object({ id: z.string().min(1).max(150), entity: z.enum(['application','photo']), action: z.enum(['create','update','delete']), clientVersion: z.number().int().positive().optional(), payload: z.record(z.string(), z.any()) })).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '同期データの形式が正しくありません。' });
  const results = [];
  for (const item of parsed.data.items) {
    const receipt = await query('SELECT status,result FROM sync_receipts WHERE id=$1', [item.id]);
    if (receipt.rows[0]) { results.push({ id: item.id, status: receipt.rows[0].status, ...receipt.rows[0].result, idempotent: true }); continue; }
    let result = { status: 'accepted' };
    try {
      if (item.entity === 'photo' && item.action === 'create') result = { status: 'requires-upload', error: '写真本体は /api/photos へmultipart/form-dataで送信してください。' };
      else if (item.entity === 'application' && item.action === 'update') {
        const id = item.payload.id;
        const version = item.clientVersion || item.payload.version;
        const officeId = officeScope(req.user, item.payload.officeId);
        const updated = await query(`UPDATE applications SET shipper=COALESCE($1,shipper),cargo_name=COALESCE($2,cargo_name),note=COALESCE($3,note),status=COALESCE($4,status),case_data=COALESCE($5::jsonb,case_data),updated_by=$6,version=version+1,updated_at=now() WHERE id=$7 AND version=$8 AND deleted_at IS NULL AND ($9::text IS NULL OR office_id=$9) RETURNING id,version,updated_at`, [item.payload.shipper, item.payload.cargoName, item.payload.note, item.payload.status, item.payload.caseData === undefined ? null : JSON.stringify(item.payload.caseData), req.user.id, id, version, officeId]);
        result = updated.rows[0] ? { status: 'updated', server: updated.rows[0] } : { status: 'conflict', error: 'サーバー側のデータが更新されています。再取得して統合してください。' };
      }
    } catch (error) {
      result = { status: 'error', error: error.message };
    }
    await query('INSERT INTO sync_receipts(id,user_id,entity_type,action,client_version,status,result) VALUES($1,$2,$3,$4,$5,$6,$7)', [item.id, req.user.id, item.entity, item.action, item.clientVersion || null, result.status, result]);
    results.push({ id: item.id, ...result });
  }
  res.json({ results, serverTime: new Date().toISOString() });
});



const adminUserSchema = z.object({
  loginId: z.string().regex(/^[A-Za-z0-9._-]{3,100}$/),
  email: z.string().email().nullable().optional(),
  displayName: z.string().min(1).max(100),
  role: z.enum(['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator','revision-validator']),
  officeId: z.string().nullable().optional(),
  initialPassword: z.string().min(8).max(300)
});

app.get('/api/admin/users', authenticate, requireAdministrator, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize) || 25));
  const search = String(req.query.search || '').trim();
  const role = String(req.query.role || '').trim();
  const status = String(req.query.status || '').trim();
  const requestedOfficeId = String(req.query.officeId || '').trim();
  const values=[];
  const where=[];
  const push = value => { values.push(value); return `$${values.length}`; };
  if(req.user.role==='office-admin'){
    where.push(`u.office_id=${push(req.user.office_id)}`);
    where.push(`u.role='office-user'`);
  } else if(requestedOfficeId){
    where.push(`u.office_id=${push(requestedOfficeId)}`);
  }
  if(search){
    const p=push(`%${search.toLowerCase()}%`);
    where.push(`(lower(u.login_id) LIKE ${p} OR lower(u.display_name) LIKE ${p} OR lower(COALESCE(u.email,'')) LIKE ${p})`);
  }
  if(role && ['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator','revision-validator'].includes(role)) where.push(`u.role=${push(role)}`);
  if(status==='active') where.push('u.active=true');
  if(status==='inactive') where.push('u.active=false');
  if(status==='locked') where.push('u.locked_until>now()');
  const clause=where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countResult=await query(`SELECT count(*)::int total FROM users u ${clause}`,values);
  const limitRef=push(pageSize); const offsetRef=push((page-1)*pageSize);
  const { rows } = await query(`SELECT u.id,u.login_id,u.email,u.display_name,u.role,u.account_category,u.office_id,u.active,u.mfa_required,u.email_verified,u.must_change_password,u.last_login_at,u.created_at,u.locked_until,
    o.name office_name,b.name block_name FROM users u
    LEFT JOIN offices o ON o.id=u.office_id LEFT JOIN blocks b ON b.id=o.block_id
    ${clause} ORDER BY u.role,u.display_name LIMIT ${limitRef} OFFSET ${offsetRef}`, values);
  const total=countResult.rows[0]?.total || 0;
  res.json({ users: rows, total, page, pageSize, pageCount:Math.max(1,Math.ceil(total/pageSize)), managerRole:req.user.role, officeId:req.user.office_id });
});

app.post('/api/admin/users', authenticate, requireAdministrator, async (req, res) => {
  const parsed = adminUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '利用者の入力内容を確認してください。' });
  const data = parsed.data;
  if(req.user.role==='office-admin'){
    data.role='office-user';
    data.officeId=req.user.office_id;
  }
  if (['office-user','office-admin'].includes(data.role) && !data.officeId) return res.status(400).json({ error: '検査員・事業所管理者には所属事業所が必要です。' });
  if (data.role === 'office-admin') {
    const { rows: existingManagers } = await query(`SELECT id,display_name,login_id FROM users WHERE office_id=$1 AND role='office-admin' AND active=true LIMIT 1`, [data.officeId]);
    if (existingManagers[0]) return res.status(409).json({ error: `この事業所には有効な事業所管理者（事業所長）アカウント「${existingManagers[0].display_name}」が既に登録されています。交代時は旧アカウントを無効化してから登録してください。` });
  }
  const accountCategory = data.role === 'guest' ? 'staff-guest' : data.role === 'validator' ? 'staff-validator' : data.role === 'revision-validator' ? 'staff-validator' : data.role === 'safety-environment-admin' ? 'safety-environment-admin' : data.role === 'safety-environment-director' ? 'safety-environment-director' : data.role === 'safety-environment-staff' ? 'safety-environment-staff' : data.role === 'office-admin' ? 'office-director' : 'inspector';
  const passwordErrors = validatePassword(data.initialPassword);
  if (passwordErrors.length) return res.status(400).json({ error: `初期パスワードには${passwordErrors.join('・')}が必要です。` });
  const hash = await bcrypt.hash(data.initialPassword, 12);
  try {
    const { rows } = await query(`INSERT INTO users(login_id,email,display_name,password_hash,role,account_category,office_id,must_change_password,mfa_required,activated_at)
      VALUES(lower($1),NULLIF(lower($2),''),$3,$4,$5,$6,$7,true,$8,now()) RETURNING id,login_id,email,display_name,role,account_category,office_id,active,mfa_required,created_at`,
      [data.loginId, data.email || '', data.displayName, hash, data.role, accountCategory, ['office-user','office-admin'].includes(data.role) ? data.officeId : null, Boolean(data.email && ['office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin'].includes(data.role))]);
    const user=rows[0];
    await audit(req, 'create', 'user', user.id, { loginId:user.login_id,role:user.role,officeId:user.office_id,authentication:'admin-assigned-password' });
    res.status(201).json({ user, authenticationMode:'login-id-password', mfaEnabled:false });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: '同じログインID、または同じメールアドレスの利用者が登録されています。' });
    throw error;
  }
});

async function managedTarget(req,res){
  const {rows}=await query('SELECT id,login_id,display_name,role,office_id,active,password_hash FROM users WHERE id=$1',[req.params.id]);
  const target=rows[0];
  if(!target){res.status(404).json({error:'利用者が見つかりません。'});return null;}
  if(!canManageUser(req.user,target)){res.status(403).json({error:'この利用者を管理する権限がありません。'});return null;}
  return target;
}

app.put('/api/admin/users/:id', authenticate, requireAdministrator, async (req,res)=>{
  const schema=z.object({
    loginId:z.string().regex(/^[A-Za-z0-9._-]{3,100}$/),
    displayName:z.string().min(1).max(100),
    role:z.enum(['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator','revision-validator']),
    officeId:z.string().nullable().optional()
  });
  const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'ログインID・表示名・権限・所属を確認してください。'});
  const target=await managedTarget(req,res); if(!target)return;
  const data=parsed.data;
  if(req.user.role==='office-admin'){
    data.role='office-user'; data.officeId=req.user.office_id;
  }
  if(target.id===req.user.id && data.role!==target.role) return res.status(400).json({error:'自分自身の権限はこの画面では変更できません。'});
  if(['office-user','office-admin'].includes(data.role) && !data.officeId) return res.status(400).json({error:'検査員・事業所管理者には所属事業所が必要です。'});
  if(data.role==='office-admin'){
    const {rows:existing}=await query(`SELECT id,display_name FROM users WHERE office_id=$1 AND role='office-admin' AND active=true AND id<>$2 LIMIT 1`,[data.officeId,target.id]);
    if(existing[0]) return res.status(409).json({error:`この事業所には有効な事業所管理者「${existing[0].display_name}」が既に登録されています。`});
  }
  const accountCategory=data.role==='guest'?'staff-guest':data.role==='validator'?'staff-validator':data.role==='revision-validator'?'staff-validator':data.role==='safety-environment-admin'?'safety-environment-admin':data.role==='safety-environment-director'?'safety-environment-director':data.role==='safety-environment-staff'?'safety-environment-staff':data.role==='office-admin'?'office-director':'inspector';
  try{
    const {rows}=await query(`UPDATE users SET login_id=lower($1),display_name=$2,role=$3,account_category=$4,office_id=$5,token_version=CASE WHEN role<>$3 THEN token_version+1 ELSE token_version END,updated_at=now() WHERE id=$6 RETURNING id,login_id,display_name,role,office_id,active`,[data.loginId,data.displayName,data.role,accountCategory,['office-user','office-admin'].includes(data.role)?data.officeId:null,target.id]);
    await audit(req,'update','user',target.id,{loginId:data.loginId,displayName:data.displayName,role:data.role,officeId:data.officeId||null});
    res.json({user:rows[0]});
  }catch(error){
    if(error.code==='23505') return res.status(409).json({error:'同じログインIDの利用者が登録されています。'});
    throw error;
  }
});

app.put('/api/admin/users/:id/password', authenticate, requireAdministrator, async (req, res) => {
  const schema = z.object({ newPassword: z.string().min(8).max(300), administratorPassword:z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '新しいパスワードと管理者確認用パスワードを入力してください。' });
  const target=await managedTarget(req,res); if(!target)return;
  if(target.id===req.user.id) return res.status(400).json({error:'自分自身のパスワードはこの画面では変更できません。'});
  const {rows:managerRows}=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if(!await bcrypt.compare(parsed.data.administratorPassword,managerRows[0].password_hash)) return res.status(401).json({error:'管理者確認用パスワードが正しくありません。'});
  const errors = validatePassword(parsed.data.newPassword);
  if (errors.length) return res.status(400).json({ error: `パスワードには${errors.join('・')}が必要です。` });
  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  const { rows } = await query(`UPDATE users SET password_hash=$1,must_change_password=false,failed_login_count=0,locked_until=NULL,password_changed_at=now(),updated_at=now() WHERE id=$2 RETURNING id,login_id,display_name`, [hash, req.params.id]);
  await audit(req, 'reset-password', 'user', req.params.id, { method:'administrator-console',managerRole:req.user.role });
  res.json({ user: rows[0] });
});

app.put('/api/admin/users/:id/status', authenticate, requireAdministrator, async (req, res) => {
  const schema = z.object({ active: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '状態を確認してください。' });
  const target=await managedTarget(req,res); if(!target)return;
  if(target.id===req.user.id) return res.status(400).json({error:'自分自身のアカウントは無効化できません。'});
  const { rows } = await query('UPDATE users SET active=$1,updated_at=now() WHERE id=$2 RETURNING id,email,display_name,active', [parsed.data.active, req.params.id]);
  await audit(req, parsed.data.active ? 'enable' : 'disable', 'user', req.params.id,{managerRole:req.user.role});
  res.json({ user: rows[0] });
});

app.put('/api/admin/users/:id/unlock', authenticate, requireAdministrator, async (req,res)=>{
  const target=await managedTarget(req,res); if(!target)return;
  const {rows}=await query('UPDATE users SET failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$1 RETURNING id,login_id,display_name',[req.params.id]);
  await audit(req,'unlock','user',req.params.id,{managerRole:req.user.role});
  res.json({user:rows[0]});
});

app.post('/api/admin/offices', authenticate, requireRole('safety-environment-admin'), async (req, res) => {
  const schema = z.object({ id: z.string().regex(/^[a-z0-9-]{3,60}$/), blockId: z.string().min(1), name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '事業所情報を確認してください。IDは半角英小文字・数字・ハイフンを使用してください。' });
  try {
    const { rows } = await query(`INSERT INTO offices(id,block_id,name) VALUES($1,$2,$3)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,block_id=excluded.block_id,active=true,updated_at=now() RETURNING *`,
      [parsed.data.id, parsed.data.blockId, parsed.data.name]);
    await audit(req, 'upsert', 'office', rows[0].id, { blockId: rows[0].block_id, name: rows[0].name });
    res.status(201).json({ office: rows[0] });
  } catch (error) {
    if (error.code === '23503') return res.status(400).json({ error: '指定されたブロックが存在しません。' });
    throw error;
  }
});

const validationTemplate = [
  ['connect-health','接続','APIヘルスチェック','社内APIがHTTPSで応答し、サーバー時刻を返す'],
  ['login-safety','認証','安全環境室ログイン','管理者が設定したログインIDとパスワードで安全環境室管理者がログインできる'],
  ['login-kawasaki','認証','川崎事業所検査員ログイン','川崎事業所の検査員が管理者発行のログインIDとパスワードでログインできる'],
  ['login-guest','認証','ゲストログイン','検査員以外の社内職員がゲストIDで閲覧専用ログインできる'],
  ['login-validator','認証','検証者ログイン','検査員以外の社内職員が検証者IDで閲覧および検証記録を利用できる'],
  ['login-office','認証','事業所利用者ログイン','所属事業所の利用者がログインできる'],
  ['scope-office','権限','事業所閲覧範囲','事業所利用者は所属事業所のみ閲覧できる'],
  ['scope-safety','権限','安全環境室横断閲覧','安全環境室は全事業所を閲覧できる'],
  ['scope-guest','権限','ゲスト閲覧制限','ゲストは危険物情報・関連法令・関連資料のみ閲覧でき、申請番号・写真は閲覧できない'],
  ['scope-validator','権限','検証者閲覧制限','検証者は危険物情報等の閲覧と検証記録のみ可能で、申請番号・写真の更新はできない'],
  ['application-create','申請番号','申請番号登録','申請番号を登録し、別端末から閲覧できる'],
  ['application-conflict','申請番号','同時更新競合','古い版の更新が競合として拒否される'],
  ['photo-upload','写真','写真登録','上限内の写真を登録できる'],
  ['photo-limit','写真','写真上限','枚数・容量上限超過時に登録が拒否される'],
  ['offline-sync','同期','オフライン後の同期','再接続時に同期待ちデータを送信できる'],
  ['duplicate-sync','同期','二重送信防止','同じ同期IDを再送しても二重登録されない'],
  ['audit-log','監査','監査ログ','登録・更新・削除・認証操作が記録される'],
  ['backup','復旧','バックアップ','DBと写真のバックアップが作成される'],
  ['restore','復旧','復元試験','検証環境へ復元し整合性確認に合格する'],
  ['tls-expiry','セキュリティ','TLS期限確認','証明書期限を監視できる']
];


app.post('/api/admin/validation/sample-data', authenticate, requireRole('safety-environment-admin'), async (req, res) => {
  const samples = [
    ['office-kawasaki','VAL-KW-001','検証荷主A','UN1017 塩素'],
    ['office-kawasaki','VAL-KW-002','検証荷主B','UN1203 ガソリン']
  ];
  let created = 0;
  for (const [officeId, number, shipper, cargo] of samples) {
    const { rowCount } = await query(`INSERT INTO applications(application_number,shipper,cargo_name,note,office_id,block_id,created_by,updated_by,status)
      SELECT $1,$2,$3,'社内検証管理画面から登録したサンプル',o.id,o.block_id,$4,$4,'検証用' FROM offices o WHERE o.id=$5
      ON CONFLICT(office_id,application_number) DO NOTHING`, [number, shipper, cargo, req.user.id, officeId]);
    created += rowCount;
  }
  await audit(req, 'seed-sample-data', 'validation', null, { created });
  res.json({ created, total: samples.length });
});

app.get('/api/admin/validation/template', authenticate, requireRole('safety-environment-admin','validator'), (_req, res) => {
  res.json({ tests: validationTemplate.map((t, index) => ({ key:t[0], category:t[1], name:t[2], expectedResult:t[3], sortOrder:index + 1 })) });
});

app.post('/api/admin/validation/runs', authenticate, requireRole('safety-environment-admin','validator'), async (req, res) => {
  const schema = z.object({ title: z.string().min(1).max(200), environmentName: z.string().min(1).max(100).default('社内検証環境') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '検証名を入力してください。' });
  const run = await transaction(async client => {
    const result = await client.query(`INSERT INTO validation_runs(title,environment_name,executed_by) VALUES($1,$2,$3) RETURNING *`, [parsed.data.title, parsed.data.environmentName, req.user.id]);
    for (let i=0; i<validationTemplate.length; i++) {
      const t = validationTemplate[i];
      await client.query(`INSERT INTO validation_results(run_id,test_key,category,test_name,expected_result,sort_order) VALUES($1,$2,$3,$4,$5,$6)`, [result.rows[0].id,t[0],t[1],t[2],t[3],i+1]);
    }
    return result.rows[0];
  });
  await audit(req, 'create', 'validation-run', run.id, { title: run.title });
  res.status(201).json({ run });
});

app.get('/api/admin/validation/runs', authenticate, requireRole('safety-environment-admin','validator'), async (_req, res) => {
  const { rows } = await query(`SELECT vr.*,u.display_name executed_by_name,
    count(v.id)::int test_count,
    count(v.id) FILTER (WHERE v.result='合格')::int passed_count,
    count(v.id) FILTER (WHERE v.result='不合格')::int failed_count
    FROM validation_runs vr LEFT JOIN users u ON u.id=vr.executed_by LEFT JOIN validation_results v ON v.run_id=vr.id
    GROUP BY vr.id,u.display_name ORDER BY vr.created_at DESC LIMIT 100`);
  res.json({ runs: rows });
});

app.get('/api/admin/validation/runs/:id', authenticate, requireRole('safety-environment-admin','validator'), async (req, res) => {
  const runResult = await query('SELECT * FROM validation_runs WHERE id=$1', [req.params.id]);
  if (!runResult.rows[0]) return res.status(404).json({ error: '検証実施記録が見つかりません。' });
  const results = await query('SELECT * FROM validation_results WHERE run_id=$1 ORDER BY sort_order', [req.params.id]);
  res.json({ run: runResult.rows[0], results: results.rows });
});

app.put('/api/admin/validation/results/:id', authenticate, requireRole('safety-environment-admin','validator'), async (req, res) => {
  const schema = z.object({ result: z.enum(['未実施','合格','不合格','対象外']), actualResult: z.string().max(3000).default(''), note: z.string().max(3000).default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '検証結果を確認してください。' });
  const { rows } = await query(`UPDATE validation_results SET result=$1,actual_result=$2,note=$3,updated_by=$4,updated_at=now() WHERE id=$5 RETURNING *`, [parsed.data.result, parsed.data.actualResult, parsed.data.note, req.user.id, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '検証項目が見つかりません。' });
  res.json({ result: rows[0] });
});

app.put('/api/admin/validation/runs/:id/complete', authenticate, requireRole('safety-environment-admin','validator'), async (req, res) => {
  const schema = z.object({ status: z.enum(['合格','要改善','中止']), summary: z.string().max(5000).default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '完了状態を確認してください。' });
  const { rows } = await query(`UPDATE validation_runs SET status=$1,summary=$2,completed_at=now(),updated_at=now() WHERE id=$3 RETURNING *`, [parsed.data.status, parsed.data.summary, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '検証実施記録が見つかりません。' });
  await audit(req, 'complete', 'validation-run', req.params.id, { status: parsed.data.status });
  res.json({ run: rows[0] });
});


app.put('/api/photos/:id', authenticate, requireOperationalWrite, async (req, res) => {
  const schema = z.object({
    comment: z.string().max(2000).optional(),
    shootingAt: z.string().nullable().optional(),
    status: z.string().max(50).optional(),
    representative: z.boolean().optional(),
    version: z.number().int().positive().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '写真の更新内容を確認してください。' });
  const officeId = officeScope(req.user, req.query.officeId);
  const result = await transaction(async client => {
    const current = await client.query('SELECT * FROM photos WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2)', [req.params.id, officeId]);
    const photo = current.rows[0];
    if (!photo) return null;
    if (parsed.data.version && photo.version !== parsed.data.version) throw Object.assign(new Error('他の利用者が写真情報を更新しています。再読み込みしてください。'), { status: 409 });
    if (parsed.data.representative === true) {
      await client.query('UPDATE photos SET representative=false,updated_at=now(),version=version+1 WHERE application_id=$1 AND id<>$2 AND deleted_at IS NULL AND representative=true', [photo.application_id, photo.id]);
    }
    const updated = await client.query(`UPDATE photos SET
      comment=COALESCE($1,comment),shooting_at=COALESCE($2,shooting_at),status=COALESCE($3,status),
      representative=COALESCE($4,representative),updated_at=now(),version=version+1
      WHERE id=$5 RETURNING *`, [parsed.data.comment, parsed.data.shootingAt, parsed.data.status, parsed.data.representative, photo.id]);
    return updated.rows[0];
  });
  if (!result) return res.status(404).json({ error: '対象の写真が見つかりません。' });
  await audit(req, 'update', 'photo', result.id, { representative: result.representative });
  res.json({ photo: { ...result, url: photoApiUrl(result.id,req.user) } });
});

app.get('/api/admin/access-summary', authenticate, requireRole('safety-environment-admin'), async (_req, res) => {
  const users = await query(`SELECT u.role,u.active,u.office_id,o.name office_name,b.name block_name,count(*)::int user_count
    FROM users u LEFT JOIN offices o ON o.id=u.office_id LEFT JOIN blocks b ON b.id=o.block_id
    GROUP BY u.role,u.active,u.office_id,o.name,b.name ORDER BY b.name,o.name,u.role`);
  const offices = await query(`SELECT b.name block_name,o.id office_id,o.name office_name,o.active,
    count(DISTINCT u.id) FILTER (WHERE u.active=true)::int active_users,
    count(DISTINCT a.id) FILTER (WHERE a.deleted_at IS NULL)::int applications,
    count(DISTINCT p.id) FILTER (WHERE p.deleted_at IS NULL)::int photos
    FROM offices o JOIN blocks b ON b.id=o.block_id
    LEFT JOIN users u ON u.office_id=o.id
    LEFT JOIN applications a ON a.office_id=o.id
    LEFT JOIN photos p ON p.office_id=o.id
    GROUP BY b.name,o.id,o.name,o.active ORDER BY b.name,o.name`);
  res.json({
    roles: [
      { role: 'office-user', label: '検査員', applications: '所属事業所の閲覧・登録・更新', photos: '所属事業所の登録・閲覧', administration: '不可' },
      { role: 'office-admin', label: '事業所管理者（事業所長）', applications: '所属事業所の閲覧・登録・更新', photos: '所属事業所の登録・閲覧・削除', administration: '所属事業所の運用管理' },
      { role: 'safety-environment-director', label: '安全環境室長', applications: '全ブロック・全事業所の登録・編集（削除不可）', photos: '全ブロック・全事業所の登録・編集（削除不可）', administration: '限定システム設定' },
      { role: 'safety-environment-staff', label: '安全環境室職員', applications: '全ブロック・全事業所の閲覧', photos: '全ブロック・全事業所の閲覧', administration: '閲覧専用' },
      { role: 'safety-environment-admin', label: 'システム管理者', applications: '全ブロック・全事業所の閲覧・登録・更新', photos: '全ブロック・全事業所の管理', administration: '利用者・事業所・上限・監査・検証管理' },
      { role: 'guest', label: 'ゲスト', applications: '利用不可', photos: '利用不可', administration: '危険物検索・関連法令・関連資料・ユーザー設定' },
      { role: 'validator', label: '検証者（社内職員）', applications: '閲覧不可', photos: '閲覧不可', administration: '危険物・法令・資料の閲覧と検証記録' }
    ],
    users: users.rows,
    offices: offices.rows
  });
});

app.get('/api/admin/preflight', authenticate, requireRole('safety-environment-admin'), async (req, res) => {
  const checks = [];
  const push = (key, label, ok, detail, severity='required') => checks.push({ key, label, ok: Boolean(ok), detail, severity });
  try {
    const db = await query('SELECT current_database() database,now() server_time');
    push('database', '中央データベース接続', true, `PostgreSQL: ${db.rows[0].database}`);
  } catch (error) {
    push('database', '中央データベース接続', false, error.message);
  }
  let storageOk = false;
  const storageProbeKey = createStorageKey('preflight', '.txt');
  try {
    const payload = Buffer.from(`preflight:${Date.now()}`,'utf8');
    const checksum = crypto.createHash('sha256').update(payload).digest('hex');
    await objectStorage.put(storageProbeKey,payload,{contentType:'text/plain',sha256:checksum});
    const restored = await objectStorage.get(storageProbeKey);
    if (!restored.equals(payload)) throw new Error('保存後の読込み内容が一致しません。');
    await objectStorage.delete(storageProbeKey);
    storageOk = true;
  } catch (error) {
    await objectStorage.delete(storageProbeKey).catch(()=>{});
    push('persistent-storage', '永続ストレージの保存・読込・削除', false, `${objectStorage.provider}: ${error.message}`);
  }
  if (storageOk) push('persistent-storage', '永続ストレージの保存・読込・削除', true, `provider=${objectStorage.provider}`);
  const defaultSecret = 'development-only-change-this-secret-immediately';
  push('jwt-secret', 'JWT秘密鍵', config.jwtSecret.length >= 32 && config.jwtSecret !== defaultSecret, config.jwtSecret === defaultSecret ? '開発用既定値のため変更が必要です。' : `${config.jwtSecret.length}文字で設定済み`);
  push('production-mode', '本番実行モード', config.nodeEnv === 'production', `NODE_ENV=${config.nodeEnv}`, 'recommended');
  push('cors', 'CORS許可元', config.corsOrigins.length > 0, config.corsOrigins.length ? config.corsOrigins.join(', ') : '未設定（全Originを許可する開発設定）');
  push('auth', '認証方式', config.oidc.enabled || config.allowLocalAuth, config.oidc.enabled ? `OIDC: ${config.oidc.issuer}` : config.allowLocalAuth ? 'ローカル認証' : '認証方式未設定');
  push('server-session', 'サーバーセッション', config.session.enabled, config.session.enabled ? `${config.session.cookieName} / HttpOnly / SameSite=${config.session.sameSite}` : '無効');
  push('csrf', 'CSRF対策', config.session.enabled, config.session.enabled ? `ヘッダー: ${config.session.csrfHeader}` : 'サーバーセッションが無効です。');
  push('cookie-secure', '認証CookieのSecure属性', config.nodeEnv !== 'production' || config.session.secure, config.session.secure ? 'Secure有効' : '開発環境のみ許容', 'required');
  push('legacy-bearer', 'ブラウザ保存トークンの無効化', config.nodeEnv !== 'production' || !config.session.legacyBearerEnabled, config.session.legacyBearerEnabled ? '互換Bearer認証が有効です。' : '本番では無効', 'required');
  push('office-scope', '所属事業所スコープ', true, '申請番号・写真・添付資料APIでサーバー側検証を実施');
  push('persistent-storage-provider', '永続ストレージ方式', ['filesystem','s3'].includes(objectStorage.provider), `provider=${objectStorage.provider}`);
  const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || '');
  push('https', 'HTTPS経由', forwardedProto.split(',')[0].trim() === 'https', `検出プロトコル: ${forwardedProto}`, 'recommended');
  push('backup-config', 'バックアップ先', Boolean(process.env.BACKUP_DIR), process.env.BACKUP_DIR || 'BACKUP_DIR未設定', 'recommended');
  const requiredFailed = checks.filter(item => item.severity === 'required' && !item.ok).length;
  const recommendedFailed = checks.filter(item => item.severity === 'recommended' && !item.ok).length;
  res.json({ status: requiredFailed ? 'blocked' : recommendedFailed ? 'warning' : 'ready', requiredFailed, recommendedFailed, checkedAt: new Date().toISOString(), checks });
});


app.get('/api/admin/import-history', authenticate, requireAdministrator, async (req,res) => {
  const officeFilter = req.user.role === 'office-admin' ? req.user.office_id : null;
  const { rows } = await query(`SELECT r.*,u.display_name executed_by_name FROM import_runs r LEFT JOIN users u ON u.id=r.executed_by
    WHERE ($1::text IS NULL OR r.errors @> jsonb_build_array(jsonb_build_object('officeId',$1::text)) OR r.import_type IN ('users','applications'))
    ORDER BY r.created_at DESC LIMIT 100`, [officeFilter]);
  res.json({ history: rows });
});

app.post('/api/admin/import', authenticate, requireAdministrator, async (req,res) => {
  const schema=z.object({importType:z.enum(['applications','users','offices']),source:z.string().max(50).default('csv'),rows:z.array(z.record(z.any())).max(5000)});
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'移行データを確認してください。'});
  const errors=[]; let successCount=0;
  await transaction(async client=>{
    for(let i=0;i<parsed.data.rows.length;i++){
      const row=parsed.data.rows[i];
      try{
        if(parsed.data.importType==='applications'){
          const officeId=officeScope(req.user,row.officeId); if(!officeId) throw new Error('事業所を指定してください。');
          await client.query(`INSERT INTO applications(application_number,shipper,cargo_name,note,status,case_data,office_id,block_id,created_by,updated_by)
            SELECT $1,$2,$3,$4,$5,$6::jsonb,o.id,o.block_id,$7,$7 FROM offices o WHERE o.id=$8
            ON CONFLICT(office_id,application_number) WHERE deleted_at IS NULL DO NOTHING`,[String(row.applicationNumber||'').trim(),row.shipper||'',row.cargoName||'',row.note||'',row.status||'受付',JSON.stringify(row.caseData||{}),req.user.id,officeId]);
        } else if(parsed.data.importType==='users'){
          if(req.user.role==='office-admin' && row.officeId!==req.user.office_id) throw new Error('所属事業所以外は登録できません。');
          if(req.user.role==='office-admin' && row.role!=='office-user') throw new Error('事業所管理者は検査員のみ登録できます。');
          const passwordErrors=validatePassword(String(row.initialPassword||'')); if(passwordErrors.length) throw new Error(`パスワード要件: ${passwordErrors.join('・')}`);
          const hash=await bcrypt.hash(String(row.initialPassword),12);
          await client.query(`INSERT INTO users(login_id,email,password_hash,display_name,role,office_id,account_category,must_change_password,active)
            VALUES($1,NULLIF($2,''),$3,$4,$5,NULLIF($6,''),CASE WHEN $5 IN ('guest','validator','revision-validator') THEN 'internal-viewer' ELSE 'inspector' END,true,true)`,[String(row.loginId).trim(),row.email||'',hash,row.displayName,row.role,row.officeId||null]);
        } else {
          if(req.user.role!=='safety-environment-admin') throw new Error('事業所追加は安全環境室管理者のみ実行できます。');
          await client.query(`INSERT INTO blocks(id,name,active) VALUES($1,$2,true) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,[row.blockId,row.blockName]);
          await client.query(`INSERT INTO offices(id,block_id,name,active) VALUES($1,$2,$3,true) ON CONFLICT(id) DO UPDATE SET block_id=EXCLUDED.block_id,name=EXCLUDED.name`,[row.officeId,row.blockId,row.officeName]);
        }
        successCount++;
      }catch(error){errors.push({row:i+2,message:error.message,officeId:row.officeId||null});}
    }
    await client.query(`INSERT INTO import_runs(import_type,source,status,total_count,success_count,error_count,errors,executed_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[parsed.data.importType,parsed.data.source,errors.length?'completed-with-errors':'completed',parsed.data.rows.length,successCount,errors.length,JSON.stringify(errors),req.user.id]);
  });
  await audit(req,'bulk-import',parsed.data.importType,null,{total:parsed.data.rows.length,successCount,errorCount:errors.length,source:parsed.data.source});
  res.json({successCount,errorCount:errors.length,errors});
});


const successionChecksSchema = z.object({
  directorRegistered:z.literal(true), trainingCompleted:z.literal(true), parallelOperation:z.literal(true),
  backupVerified:z.literal(true), approvalRecorded:z.literal(true), auditConfirmed:z.literal(true)
});

app.get('/api/admin/succession/candidates', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const {rows}=await query(`SELECT id,login_id,display_name,email,role,active,mfa_required,email_verified,last_login_at
    FROM users WHERE role='safety-environment-director' AND active=true ORDER BY display_name`);
  res.json({candidates:rows,requiredRole:'safety-environment-director',targetLabel:'安全環境室長'});
});

app.get('/api/admin/succession/requests', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const {rows}=await query(`SELECT r.*,t.display_name target_name,t.login_id target_login_id,
    u.display_name requested_by_name,e.display_name executed_by_name,
    (SELECT count(*)::int FROM admin_succession_reviews sr WHERE sr.succession_request_id=r.id) review_count
    FROM admin_succession_requests r JOIN users t ON t.id=r.target_user_id
    LEFT JOIN users u ON u.id=r.requested_by LEFT JOIN users e ON e.id=r.executed_by
    ORDER BY r.created_at DESC LIMIT 20`);
  res.json({requests:rows,executionEnabled:config.adminSuccessionEnabled});
});

app.post('/api/admin/succession/requests', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({
    targetUserId:z.string().uuid(), checks:successionChecksSchema,
    approverName:z.string().min(1).max(100), approverTitle:z.string().min(1).max(100),
    approvalDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/), scheduledAt:z.string().datetime().nullable().optional(),
    note:z.string().max(1000).optional().default(''), administratorPassword:z.string().min(1).max(300)
  });
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'移行申請の入力内容と全確認項目を確認してください。'});
  const {rows:managerRows}=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if(!await bcrypt.compare(parsed.data.administratorPassword,managerRows[0]?.password_hash||'')) return res.status(401).json({error:'管理者確認用パスワードが正しくありません。'});
  const {rows:candidates}=await query(`SELECT id,display_name,login_id,role,active,mfa_required,email_verified FROM users WHERE id=$1`,[parsed.data.targetUserId]);
  const target=candidates[0];
  if(!target || !target.active || target.role!=='safety-environment-director') return res.status(400).json({error:'移行先には有効な安全環境室長アカウントだけを指定できます。'});
  if(!target.mfa_required || !target.email_verified) return res.status(400).json({error:'安全環境室長のMFAとメール確認を完了してから申請してください。'});
  try {
    const status=parsed.data.scheduledAt?'scheduled':'approved';
    const {rows}=await query(`INSERT INTO admin_succession_requests(requested_by,target_user_id,status,checks,approver_name,approver_title,approval_date,scheduled_at,note)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.user.id,target.id,status,parsed.data.checks,parsed.data.approverName,parsed.data.approverTitle,parsed.data.approvalDate,parsed.data.scheduledAt||null,parsed.data.note]);
    await audit(req,'create','admin-succession',rows[0].id,{targetUserId:target.id,targetName:target.display_name,status,scheduledAt:parsed.data.scheduledAt||null});
    res.status(201).json({request:rows[0]});
  } catch(error) {
    if(error.code==='23505') return res.status(409).json({error:'処理中の管理者権限移行申請が既に存在します。完了または取消後に再申請してください。'});
    throw error;
  }
});

app.post('/api/admin/succession/requests/:id/execute', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  if(!config.adminSuccessionEnabled) return res.status(403).json({error:'正式移行処理は無効です。クラウド環境でADMIN_SUCCESSION_ENABLED=trueを設定し、バックアップ後に実行してください。'});
  const schema=z.object({administratorPassword:z.string().min(1).max(300),confirmationText:z.literal('安全環境室長へ移行'),supportDays:z.number().int().min(1).max(90).default(30)});
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'確認文、管理者パスワード、移行支援期間を確認してください。'});
  const {rows:managerRows}=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if(!await bcrypt.compare(parsed.data.administratorPassword,managerRows[0]?.password_hash||'')) return res.status(401).json({error:'管理者確認用パスワードが正しくありません。'});
  const result=await transaction(async client=>{
    const {rows:reqRows}=await client.query(`SELECT * FROM admin_succession_requests WHERE id=$1 FOR UPDATE`,[req.params.id]);
    const request=reqRows[0]; if(!request) return {error:'移行申請が見つかりません。',status:404};
    if(!['approved','scheduled'].includes(request.status)) return {error:'この移行申請は実行できる状態ではありません。',status:409};
    if(request.scheduled_at && new Date(request.scheduled_at)>new Date()) return {error:'予約した移行日時より前には実行できません。',status:409};
    const {rows:targetRows}=await client.query(`SELECT * FROM users WHERE id=$1 FOR UPDATE`,[request.target_user_id]);
    const target=targetRows[0];
    if(!target || !target.active || target.role!=='safety-environment-director' || !target.mfa_required || !target.email_verified) return {error:'安全環境室長のアカウント状態、MFA、メール確認を再確認してください。',status:400};
    const supportUntil=new Date(Date.now()+parsed.data.supportDays*86400000);
    const rollbackUntil=new Date(Date.now()+7*86400000);
    await client.query(`UPDATE users SET role='safety-environment-admin',account_category='safety-environment-admin',token_version=token_version+1,updated_at=now() WHERE id=$1`,[target.id]);
    const {rows:updated}=await client.query(`UPDATE admin_succession_requests SET status='executed',executed_at=now(),executed_by=$1,former_admin_id=$1,support_until=$2,rollback_until=$3,updated_at=now() WHERE id=$4 RETURNING *`,[req.user.id,supportUntil,rollbackUntil,request.id]);
    return {request:updated[0],target};
  });
  if(result.error) return res.status(result.status).json({error:result.error});
  await audit(req,'execute','admin-succession',req.params.id,{targetUserId:result.target.id,targetName:result.target.display_name,supportUntil:result.request.support_until,rollbackUntil:result.request.rollback_until});
  res.json({request:result.request,message:'安全環境室長へシステム管理者権限を付与しました。旧管理者権限は移行支援期間中維持されます。'});
});

app.post('/api/admin/succession/requests/:id/rollback', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({administratorPassword:z.string().min(1).max(300),reason:z.string().min(5).max(1000)});
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'管理者パスワードとロールバック理由を入力してください。'});
  const {rows:managerRows}=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if(!await bcrypt.compare(parsed.data.administratorPassword,managerRows[0]?.password_hash||'')) return res.status(401).json({error:'管理者確認用パスワードが正しくありません。'});
  const result=await transaction(async client=>{
    const {rows:reqRows}=await client.query(`SELECT * FROM admin_succession_requests WHERE id=$1 FOR UPDATE`,[req.params.id]);
    const request=reqRows[0]; if(!request) return {error:'移行申請が見つかりません。',status:404};
    if(request.status!=='executed') return {error:'実行済みの移行だけをロールバックできます。',status:409};
    if(request.rollback_until && new Date(request.rollback_until)<new Date()) return {error:'自動ロールバック可能期間を過ぎています。手動復旧手順を使用してください。',status:409};
    await client.query(`UPDATE users SET role='safety-environment-director',account_category='safety-environment-director',token_version=token_version+1,updated_at=now() WHERE id=$1`,[request.target_user_id]);
    const {rows:updated}=await client.query(`UPDATE admin_succession_requests SET status='rolled-back',rolled_back_at=now(),rolled_back_by=$1,note=concat_ws(E'\n',note,$2),updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,`ロールバック理由: ${parsed.data.reason}`,request.id]);
    return {request:updated[0]};
  });
  if(result.error) return res.status(result.status).json({error:result.error});
  await audit(req,'rollback','admin-succession',req.params.id,{reason:parsed.data.reason});
  res.json({request:result.request,message:'安全環境室長への管理者権限付与をロールバックしました。'});
});


const successionReviewChecksSchema = z.object({
  loginVerified:z.literal(true), permissionsVerified:z.literal(true), auditVerified:z.literal(true),
  backupVerified:z.literal(true), regulationUpdateVerified:z.literal(true), incidentResponseVerified:z.literal(true)
});

app.post('/api/admin/succession/requests/:id/reviews', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({
    reviewType:z.enum(['stabilization','periodic','incident']).default('stabilization'),
    checks:successionReviewChecksSchema, incidentCount:z.number().int().min(0).max(999).default(0),
    note:z.string().max(2000).optional().default('')
  });
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'安定稼働確認の入力内容と全確認項目を確認してください。'});
  const {rows:requests}=await query(`SELECT * FROM admin_succession_requests WHERE id=$1`,[req.params.id]);
  const request= requests[0]; if(!request) return res.status(404).json({error:'移行申請が見つかりません。'});
  if(!['executed','completed'].includes(request.status)) return res.status(409).json({error:'正式切替後の移行申請だけを点検できます。'});
  const {rows}=await query(`INSERT INTO admin_succession_reviews(succession_request_id,reviewed_by,review_type,checks,incident_count,note)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[request.id,req.user.id,parsed.data.reviewType,parsed.data.checks,parsed.data.incidentCount,parsed.data.note]);
  await audit(req,'review','admin-succession',request.id,{reviewId:rows[0].id,reviewType:parsed.data.reviewType,incidentCount:parsed.data.incidentCount});
  res.status(201).json({review:rows[0],message:'移行後の安定稼働確認を記録しました。'});
});

app.post('/api/admin/succession/requests/:id/finalize', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({administratorPassword:z.string().min(1).max(300),confirmationText:z.literal('管理者権限移行を完了'),note:z.string().min(5).max(2000)});
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'確認文、管理者パスワード、完了記録を確認してください。'});
  const {rows:managerRows}=await query('SELECT password_hash FROM users WHERE id=$1',[req.user.id]);
  if(!await bcrypt.compare(parsed.data.administratorPassword,managerRows[0]?.password_hash||'')) return res.status(401).json({error:'管理者確認用パスワードが正しくありません。'});
  const result=await transaction(async client=>{
    const {rows:reqRows}=await client.query(`SELECT * FROM admin_succession_requests WHERE id=$1 FOR UPDATE`,[req.params.id]);
    const request=reqRows[0]; if(!request) return {error:'移行申請が見つかりません。',status:404};
    if(request.status!=='executed') return {error:'実行済みで未完了の移行だけを完了できます。',status:409};
    if(request.target_user_id!==req.user.id) return {error:'移行完了は、移行先となった安全環境室長本人だけが実行できます。',status:403};
    if(request.support_until && new Date(request.support_until)>new Date()) return {error:'旧管理者の移行支援期間が終了していません。',status:409};
    const {rows:reviewRows}=await client.query(`SELECT count(*)::int count FROM admin_succession_reviews WHERE succession_request_id=$1 AND review_type='stabilization'`,[request.id]);
    if((reviewRows[0]?.count||0)<1) return {error:'移行後の安定稼働確認を1回以上記録してください。',status:409};
    const reductionDue=new Date(Date.now()+7*86400000);
    const {rows:updated}=await client.query(`UPDATE admin_succession_requests SET status='completed',finalized_at=now(),finalized_by=$1,
      finalization_note=$2,former_admin_reduction_due=$3,updated_at=now() WHERE id=$4 RETURNING *`,[req.user.id,parsed.data.note,reductionDue,request.id]);
    return {request:updated[0]};
  });
  if(result.error) return res.status(result.status).json({error:result.error});
  await audit(req,'finalize','admin-succession',req.params.id,{formerAdminReductionDue:result.request.former_admin_reduction_due});
  res.json({request:result.request,message:'安全環境室長への管理者権限移行を完了として記録しました。旧管理者の権限縮小は利用者管理で別途確認してください。'});
});

app.post('/api/admin/succession/requests/:id/former-admin-reduction-confirmation', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({note:z.string().min(5).max(1000)}); const parsed=schema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'旧管理者の権限縮小確認内容を入力してください。'});
  const {rows}=await query(`UPDATE admin_succession_requests SET former_admin_reduction_confirmed_at=now(),former_admin_reduction_confirmed_by=$1,
    finalization_note=concat_ws(E'\n',finalization_note,$2),updated_at=now() WHERE id=$3 AND status='completed' RETURNING *`,[req.user.id,`旧管理者権限縮小確認: ${parsed.data.note}`,req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'完了済みの移行申請が見つかりません。'});
  await audit(req,'confirm-former-admin-reduction','admin-succession',req.params.id,{note:parsed.data.note});
  res.json({request:rows[0],message:'旧管理者の権限縮小確認を記録しました。'});
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'サーバー内部でエラーが発生しました。' });
});


const adminAccessReviewSchema = z.object({
  reviewDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewScope:z.enum(['all-admins','succession-related','emergency-accounts']),
  activeAdminCount:z.number().int().min(0).max(999),
  inactiveAccountCount:z.number().int().min(0).max(999),
  excessivePermissionCount:z.number().int().min(0).max(999),
  findings:z.string().max(2000).default(''), correctiveAction:z.string().max(2000).default(''),
  nextReviewDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

app.get('/api/admin/governance/access-reviews', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const {rows}=await query(`SELECT r.*,u.display_name reviewed_by_name FROM admin_access_reviews r LEFT JOIN users u ON u.id=r.reviewed_by ORDER BY r.review_date DESC,r.created_at DESC LIMIT 24`);
  res.json({reviews:rows});
});

app.post('/api/admin/governance/access-reviews', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const parsed=adminAccessReviewSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'定期権限点検の入力内容を確認してください。'});
  const d=parsed.data;
  const {rows}=await query(`INSERT INTO admin_access_reviews(review_date,review_scope,active_admin_count,inactive_account_count,excessive_permission_count,findings,corrective_action,next_review_date,reviewed_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[d.reviewDate,d.reviewScope,d.activeAdminCount,d.inactiveAccountCount,d.excessivePermissionCount,d.findings,d.correctiveAction,d.nextReviewDate||null,req.user.id]);
  await audit(req,'create','admin-access-review',rows[0].id,{reviewScope:d.reviewScope,activeAdminCount:d.activeAdminCount,excessivePermissionCount:d.excessivePermissionCount});
  res.status(201).json({review:rows[0],message:'定期権限点検を記録しました。'});
});

const emergencyRecoveryDrillSchema = z.object({
  drillDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/), drillType:z.enum(['credential-check','login-drill','full-recovery']),
  emergencyAccountVerified:z.boolean(), mfaVerified:z.boolean(), auditLogVerified:z.boolean(), backupContactVerified:z.boolean(),
  result:z.enum(['passed','conditional','failed']), issueSummary:z.string().max(2000).default(''), correctiveAction:z.string().max(2000).default(''),
  nextDrillDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

app.get('/api/admin/governance/emergency-recovery-drills', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const {rows}=await query(`SELECT d.*,u.display_name performed_by_name FROM emergency_admin_recovery_drills d LEFT JOIN users u ON u.id=d.performed_by ORDER BY d.drill_date DESC,d.created_at DESC LIMIT 24`);
  res.json({drills:rows});
});

app.post('/api/admin/governance/emergency-recovery-drills', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const parsed=emergencyRecoveryDrillSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'緊急復旧点検の入力内容を確認してください。'});
  const d=parsed.data;
  const {rows}=await query(`INSERT INTO emergency_admin_recovery_drills(drill_date,drill_type,emergency_account_verified,mfa_verified,audit_log_verified,backup_contact_verified,result,issue_summary,corrective_action,next_drill_date,performed_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[d.drillDate,d.drillType,d.emergencyAccountVerified,d.mfaVerified,d.auditLogVerified,d.backupContactVerified,d.result,d.issueSummary,d.correctiveAction,d.nextDrillDate||null,req.user.id]);
  await audit(req,'create','emergency-admin-recovery-drill',rows[0].id,{drillType:d.drillType,result:d.result});
  res.status(201).json({drill:rows[0],message:'緊急復旧点検を記録しました。'});
});


const governanceCorrectiveActionSchema = z.object({
  sourceType:z.enum(['access-review','recovery-drill','audit','incident','other']),
  sourceId:z.string().uuid().nullable().optional(), title:z.string().min(3).max(200), description:z.string().max(3000).default(''),
  priority:z.enum(['low','medium','high','critical']).default('medium'), ownerUserId:z.string().uuid().nullable().optional(),
  dueDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
});

app.get('/api/admin/governance/dashboard', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const [users,actions,reviews,drills,succession] = await Promise.all([
    query(`SELECT count(*)::int total, count(*) FILTER (WHERE active)::int active, count(*) FILTER (WHERE role='safety-environment-admin')::int administrators FROM users`),
    query(`SELECT count(*)::int total, count(*) FILTER (WHERE status IN ('open','in-progress'))::int unresolved, count(*) FILTER (WHERE status IN ('open','in-progress') AND due_date < current_date)::int overdue, count(*) FILTER (WHERE priority='critical' AND status IN ('open','in-progress'))::int critical FROM admin_governance_corrective_actions`),
    query(`SELECT review_date,next_review_date,excessive_permission_count FROM admin_access_reviews ORDER BY review_date DESC,created_at DESC LIMIT 1`),
    query(`SELECT drill_date,next_drill_date,result FROM emergency_admin_recovery_drills ORDER BY drill_date DESC,created_at DESC LIMIT 1`),
    query(`SELECT status,scheduled_at,finalized_at,former_admin_reduction_confirmed_at FROM admin_succession_requests ORDER BY created_at DESC LIMIT 1`)
  ]);
  res.json({users:users.rows[0],actions:actions.rows[0],latestAccessReview:reviews.rows[0]||null,latestRecoveryDrill:drills.rows[0]||null,latestSuccession:succession.rows[0]||null,generatedAt:new Date().toISOString()});
});

app.get('/api/admin/governance/corrective-actions', authenticate, requireRole('safety-environment-admin'), async (_req,res) => {
  const {rows}=await query(`SELECT a.*,owner.display_name owner_name,creator.display_name created_by_name,completer.display_name completed_by_name
    FROM admin_governance_corrective_actions a LEFT JOIN users owner ON owner.id=a.owner_user_id LEFT JOIN users creator ON creator.id=a.created_by LEFT JOIN users completer ON completer.id=a.completed_by
    ORDER BY CASE a.status WHEN 'open' THEN 1 WHEN 'in-progress' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END, CASE a.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, a.due_date NULLS LAST,a.created_at DESC LIMIT 200`);
  res.json({actions:rows});
});

app.post('/api/admin/governance/corrective-actions', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const parsed=governanceCorrectiveActionSchema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'是正対応の入力内容を確認してください。'});
  const d=parsed.data; const {rows}=await query(`INSERT INTO admin_governance_corrective_actions(source_type,source_id,title,description,priority,owner_user_id,due_date,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[d.sourceType,d.sourceId||null,d.title,d.description,d.priority,d.ownerUserId||null,d.dueDate||null,req.user.id]);
  await audit(req,'create','admin-governance-corrective-action',rows[0].id,{priority:d.priority,dueDate:d.dueDate||null});
  res.status(201).json({action:rows[0],message:'是正対応を登録しました。'});
});

app.put('/api/admin/governance/corrective-actions/:id', authenticate, requireRole('safety-environment-admin'), async (req,res) => {
  const schema=z.object({status:z.enum(['open','in-progress','completed','cancelled']),completionNote:z.string().max(3000).default('')});
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'是正対応の更新内容を確認してください。'});
  const d=parsed.data; const completed=d.status==='completed';
  const {rows}=await query(`UPDATE admin_governance_corrective_actions SET status=$1,completion_note=$2,completed_at=CASE WHEN $3 THEN now() ELSE NULL END,completed_by=CASE WHEN $3 THEN $4 ELSE NULL END,updated_at=now() WHERE id=$5 RETURNING *`,[d.status,d.completionNote,completed,req.user.id,req.params.id]);
  if(!rows[0]) return res.status(404).json({error:'是正対応が見つかりません。'});
  await audit(req,'update','admin-governance-corrective-action',req.params.id,{status:d.status});
  res.json({action:rows[0],message:'是正対応を更新しました。'});
});


const governanceNoticeSchema=z.object({title:z.string().min(1).max(200),message:z.string().max(3000).default(''),severity:z.enum(['info','warning','critical']).default('info'),audience:z.enum(['all-users','office-admins','safety-environment','administrators']).default('administrators'),startsAt:z.string().datetime().optional().nullable(),endsAt:z.string().datetime().optional().nullable(),active:z.boolean().default(true)});
app.get('/api/admin/governance/notices',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query(`SELECT n.*,u.display_name created_by_name FROM admin_operation_notices n LEFT JOIN users u ON u.id=n.created_by ORDER BY n.active DESC,n.severity DESC,n.created_at DESC LIMIT 100`);res.json({notices:rows});});
app.post('/api/admin/governance/notices',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const parsed=governanceNoticeSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'運用通知の入力内容を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO admin_operation_notices(title,message,severity,audience,starts_at,ends_at,active,created_by) VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,now()),$6,$7,$8) RETURNING *`,[d.title,d.message,d.severity,d.audience,d.startsAt||null,d.endsAt||null,d.active,req.user.id]);await audit(req,'create','admin-operation-notice',rows[0].id,{severity:d.severity,audience:d.audience});res.status(201).json({notice:rows[0]});});
app.put('/api/admin/governance/notices/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({active:z.boolean()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'通知状態を確認してください。'});const {rows}=await query(`UPDATE admin_operation_notices SET active=$1,updated_at=now() WHERE id=$2 RETURNING *`,[parsed.data.active,req.params.id]);if(!rows[0])return res.status(404).json({error:'通知が見つかりません。'});await audit(req,'update','admin-operation-notice',req.params.id,{active:parsed.data.active});res.json({notice:rows[0]});});

const governanceTaskSchema=z.object({taskType:z.enum(['access-review','recovery-drill','backup-check','user-review','regulation-review','other']),title:z.string().min(1).max(200),dueDate:z.string().date(),recurrence:z.enum(['none','monthly','quarterly','semiannual','annual']).default('none')});
app.get('/api/admin/governance/tasks',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query(`SELECT t.*,c.display_name completed_by_name FROM admin_recurring_tasks t LEFT JOIN users c ON c.id=t.completed_by ORDER BY CASE t.status WHEN 'open' THEN 1 ELSE 2 END,t.due_date ASC,t.created_at DESC LIMIT 200`);res.json({tasks:rows});});
app.post('/api/admin/governance/tasks',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const parsed=governanceTaskSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'定期タスクの入力内容を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO admin_recurring_tasks(task_type,title,due_date,recurrence,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,[d.taskType,d.title,d.dueDate,d.recurrence,req.user.id]);await audit(req,'create','admin-recurring-task',rows[0].id,{taskType:d.taskType,dueDate:d.dueDate});res.status(201).json({task:rows[0]});});
app.post('/api/admin/governance/tasks/:id/complete',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({note:z.string().min(1).max(2000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'完了内容を入力してください。'});const {rows}=await query(`UPDATE admin_recurring_tasks SET status='completed',completion_note=$1,completed_at=now(),completed_by=$2,updated_at=now() WHERE id=$3 RETURNING *`,[parsed.data.note,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'定期タスクが見つかりません。'});await audit(req,'complete','admin-recurring-task',req.params.id,{});res.json({task:rows[0]});});

app.get('/api/admin/governance/report',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const period=String(req.query.period||new Date().toISOString().slice(0,7));const [users,actions,tasks,notices,reviews,drills,succession]=await Promise.all([query(`SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE NOT active)::int inactive,count(*) FILTER(WHERE locked_until>now())::int locked,count(*) FILTER(WHERE activated_at IS NULL)::int pending_activation FROM users`),query(`SELECT count(*)::int total,count(*) FILTER(WHERE status IN ('open','in-progress'))::int unresolved,count(*) FILTER(WHERE status IN ('open','in-progress') AND due_date<current_date)::int overdue,count(*) FILTER(WHERE status='completed')::int completed FROM admin_governance_corrective_actions`),query(`SELECT count(*)::int total,count(*) FILTER(WHERE status='open')::int open,count(*) FILTER(WHERE status='open' AND due_date<current_date)::int overdue FROM admin_recurring_tasks`),query(`SELECT count(*)::int active FROM admin_operation_notices WHERE active AND starts_at<=now() AND (ends_at IS NULL OR ends_at>=now())`),query(`SELECT * FROM admin_access_reviews ORDER BY review_date DESC,created_at DESC LIMIT 1`),query(`SELECT * FROM emergency_admin_recovery_drills ORDER BY drill_date DESC,created_at DESC LIMIT 1`),query(`SELECT status,scheduled_at,finalized_at,former_admin_reduction_confirmed_at FROM admin_succession_requests ORDER BY created_at DESC LIMIT 1`)]);res.json({period,generatedAt:new Date().toISOString(),users:users.rows[0],correctiveActions:actions.rows[0],recurringTasks:tasks.rows[0],activeNotices:notices.rows[0]?.active||0,latestAccessReview:reviews.rows[0]||null,latestRecoveryDrill:drills.rows[0]||null,latestSuccession:succession.rows[0]||null});});
app.post('/api/admin/governance/report-snapshots',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({reportPeriod:z.string().min(4).max(20),reportData:z.record(z.any())});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'監査レポートの保存内容を確認してください。'});const {rows}=await query(`INSERT INTO admin_governance_report_snapshots(report_period,report_data,generated_by) VALUES($1,$2::jsonb,$3) RETURNING id,report_period,created_at`,[parsed.data.reportPeriod,JSON.stringify(parsed.data.reportData),req.user.id]);await audit(req,'create','admin-governance-report-snapshot',rows[0].id,{reportPeriod:parsed.data.reportPeriod});res.status(201).json({snapshot:rows[0]});});


const MFA_BASELINE_ROLES=['office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin'];
const securityRiskWhere=(risk,values)=>{const push=v=>{values.push(v);return `$${values.length}`};switch(risk){case'never-login':return'u.last_login_at IS NULL';case'locked':return'u.locked_until>now()';case'password-change':return'u.must_change_password=true';case'mfa-missing':return`u.role=ANY(${push(MFA_BASELINE_ROLES)}::text[]) AND u.email IS NOT NULL AND u.mfa_required=false`;case'inactive-90':return`u.last_login_at<now()-interval '90 days'`;case'expired':return'u.account_expires_at IS NOT NULL AND u.account_expires_at<=now()';default:return''}};

app.get('/api/admin/account-security',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const risk=String(req.query.risk||'');const search=String(req.query.search||'').trim().toLowerCase();const values=[];const where=[];const rw=securityRiskWhere(risk,values);if(rw)where.push(rw);if(search){values.push(`%${search}%`);where.push(`(lower(u.login_id) LIKE $${values.length} OR lower(u.display_name) LIKE $${values.length})`)}
  const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
  const [summaryResult,userResult,eventResult]=await Promise.all([
    query(`SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE last_login_at IS NULL)::int never_login,count(*) FILTER(WHERE locked_until>now())::int locked,count(*) FILTER(WHERE must_change_password)::int password_change,count(*) FILTER(WHERE role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_missing,count(*) FILTER(WHERE last_login_at<now()-interval '90 days')::int inactive_90,count(*) FILTER(WHERE account_expires_at IS NOT NULL AND account_expires_at<=now())::int expired FROM users`,[MFA_BASELINE_ROLES]),
    query(`SELECT u.id,u.login_id,u.display_name,u.role,u.email,u.active,u.office_id,u.last_login_at,u.locked_until,u.must_change_password,u.mfa_required,u.account_expires_at,u.security_reviewed_at,o.name office_name,(u.role=ANY($${values.length+1}::text[]) AND u.email IS NOT NULL) mfa_expected,(u.last_login_at<now()-interval '90 days') inactive_90,(u.account_expires_at IS NOT NULL AND u.account_expires_at<=now()) account_expired FROM users u LEFT JOIN offices o ON o.id=u.office_id ${clause} ORDER BY u.active DESC,u.role,u.display_name LIMIT 200`,[...values,MFA_BASELINE_ROLES]),
    query(`SELECT e.event_type,e.created_at,u.display_name,u.login_id,a.display_name actor_name FROM account_security_events e JOIN users u ON u.id=e.user_id LEFT JOIN users a ON a.id=e.actor_user_id ORDER BY e.created_at DESC LIMIT 50`)
  ]);
  const s=summaryResult.rows[0];res.json({summary:{total:s.total,active:s.active,neverLogin:s.never_login,locked:s.locked,passwordChange:s.password_change,mfaMissing:s.mfa_missing,inactive90:s.inactive_90,expired:s.expired},users:userResult.rows,events:eventResult.rows,generatedAt:new Date().toISOString()});
});
app.get('/api/admin/account-security/baseline',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query(`SELECT count(*) FILTER(WHERE active)::int targets,count(*) FILTER(WHERE active AND NOT must_change_password AND first_login_at IS NULL)::int password_change_targets,count(*) FILTER(WHERE active AND role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_targets FROM users`,[MFA_BASELINE_ROLES]);res.json({targets:rows[0].targets,passwordChangeTargets:rows[0].password_change_targets,mfaTargets:rows[0].mfa_targets});});
app.post('/api/admin/account-security/baseline',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const result=await transaction(async client=>{const changed=await client.query(`UPDATE users SET must_change_password=CASE WHEN first_login_at IS NULL THEN true ELSE must_change_password END,mfa_required=CASE WHEN role=ANY($1::text[]) AND email IS NOT NULL THEN true ELSE mfa_required END,security_reviewed_at=now(),security_reviewed_by=$2,updated_at=now() WHERE active RETURNING id`,[MFA_BASELINE_ROLES,req.user.id]);await client.query(`INSERT INTO account_security_events(user_id,event_type,actor_user_id,details) SELECT id,'security-review',$1,$2::jsonb FROM users WHERE active`,[req.user.id,JSON.stringify({type:'bulk-baseline'})]);return changed.rowCount;});await audit(req,'apply-baseline','account-security',null,{users:result});res.json({message:`${result}名にセキュリティ基準を適用しました。`,updated:result});});
app.put('/api/admin/users/:id/security-policy',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const target=await managedTarget(req,res);if(!target)return;const {rows}=await query(`UPDATE users SET must_change_password=CASE WHEN first_login_at IS NULL THEN true ELSE must_change_password END,mfa_required=CASE WHEN role=ANY($1::text[]) AND email IS NOT NULL THEN true ELSE mfa_required END,security_reviewed_at=now(),security_reviewed_by=$2,updated_at=now() WHERE id=$3 RETURNING id,login_id,display_name,mfa_required,must_change_password`,[MFA_BASELINE_ROLES,req.user.id,target.id]);await query(`INSERT INTO account_security_events(user_id,event_type,actor_user_id,details) VALUES($1,'security-review',$2,$3::jsonb)`,[target.id,req.user.id,JSON.stringify({type:'individual-baseline'})]);await audit(req,'apply-policy','user',target.id,{});res.json({user:rows[0]});});
app.post('/api/admin/users/:id/security-review',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const target=await managedTarget(req,res);if(!target)return;await query(`UPDATE users SET security_reviewed_at=now(),security_reviewed_by=$1,updated_at=now() WHERE id=$2`,[req.user.id,target.id]);await query(`INSERT INTO account_security_events(user_id,event_type,actor_user_id,details) VALUES($1,'security-review',$2,$3::jsonb)`,[target.id,req.user.id,JSON.stringify({type:'manual-review'})]);await audit(req,'security-review','user',target.id,{});res.json({message:'セキュリティ点検を記録しました。'});});



// Part 205: identity operations and trial-readiness administration
app.get('/api/admin/identity-operations',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [summaryResult,userResult,checkResult,reviewResult]=await Promise.all([
    query(`SELECT count(*)::int total,
      count(*) FILTER(WHERE active)::int active,
      count(*) FILTER(WHERE active AND first_login_at IS NULL)::int pending_initial,
      count(*) FILTER(WHERE locked_until>now())::int locked,
      count(*) FILTER(WHERE active AND role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_missing,
      count(*) FILTER(WHERE active AND last_login_at<now()-interval '90 days')::int dormant,
      count(*) FILTER(WHERE account_expires_at IS NOT NULL AND account_expires_at<=now())::int expired,
      (SELECT count(*)::int FROM operation_readiness_checks WHERE status NOT IN ('passed','not-applicable')) readiness_open
      FROM users`,[MFA_BASELINE_ROLES]),
    query(`SELECT u.id,u.login_id,u.display_name,u.email,u.role,u.office_id,u.active,u.last_login_at,u.locked_until,u.must_change_password,u.mfa_required,u.account_expires_at,o.name office_name,
      (u.role=ANY($1::text[]) AND u.email IS NOT NULL) mfa_expected,
      (u.last_login_at IS NOT NULL AND u.last_login_at<now()-interval '90 days') dormant,
      (u.account_expires_at IS NOT NULL AND u.account_expires_at<=now()) account_expired
      FROM users u LEFT JOIN offices o ON o.id=u.office_id
      WHERE u.active AND (u.first_login_at IS NULL OR u.locked_until>now() OR u.must_change_password OR (u.role=ANY($1::text[]) AND u.email IS NOT NULL AND NOT u.mfa_required) OR u.last_login_at<now()-interval '90 days' OR (u.account_expires_at IS NOT NULL AND u.account_expires_at<=now()))
      ORDER BY u.role,u.display_name LIMIT 200`,[MFA_BASELINE_ROLES]),
    query(`SELECT * FROM operation_readiness_checks ORDER BY category,check_code`),
    query(`SELECT r.*,u.display_name reviewed_by_name FROM account_access_reviews r LEFT JOIN users u ON u.id=r.reviewed_by ORDER BY reviewed_at DESC LIMIT 24`)
  ]);
  const s=summaryResult.rows[0];
  res.json({summary:{total:s.total,active:s.active,pendingInitial:s.pending_initial,locked:s.locked,mfaMissing:s.mfa_missing,dormant:s.dormant,expired:s.expired,readinessOpen:s.readiness_open},users:userResult.rows,checks:checkResult.rows,reviews:reviewResult.rows});
});

app.put('/api/admin/identity-operations/readiness',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({checks:z.array(z.object({checkCode:z.string().min(1).max(100),status:z.enum(['pending','passed','failed','not-applicable']),evidenceNote:z.string().max(2000).optional().default('')})).min(1).max(100)});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'運用開始チェックの入力内容を確認してください。'});
  await transaction(async client=>{for(const item of parsed.data.checks){await client.query(`UPDATE operation_readiness_checks SET status=$1,evidence_note=NULLIF($2,''),checked_by=$3,checked_at=CASE WHEN $1='pending' THEN NULL ELSE now() END,updated_at=now() WHERE check_code=$4`,[item.status,item.evidenceNote,req.user.id,item.checkCode]);}});
  await audit(req,'update','operation-readiness',null,{count:parsed.data.checks.length});res.json({message:'運用開始チェックを保存しました。'});
});

app.post('/api/admin/identity-operations/reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reviewPeriod:z.string().regex(/^\d{4}-\d{2}$/),findings:z.string().max(5000).optional().default(''),correctiveAction:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'棚卸し記録の入力内容を確認してください。'});
  const {rows:counts}=await query(`SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE locked_until>now())::int locked,count(*) FILTER(WHERE active AND last_login_at<now()-interval '90 days')::int dormant,count(*) FILTER(WHERE active AND role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_missing,count(*) FILTER(WHERE active AND first_login_at IS NULL)::int pending_initial FROM users`,[MFA_BASELINE_ROLES]);
  const c=counts[0];const {rows}=await query(`INSERT INTO account_access_reviews(review_period,total_users,active_users,locked_users,dormant_users,mfa_missing_users,pending_initial_login,findings,corrective_action,reviewed_by) VALUES($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),NULLIF($9,''),$10) RETURNING *`,[parsed.data.reviewPeriod,c.total,c.active,c.locked,c.dormant,c.mfa_missing,c.pending_initial,parsed.data.findings,parsed.data.correctiveAction,req.user.id]);
  await audit(req,'create','account-access-review',rows[0].id,{period:parsed.data.reviewPeriod});res.status(201).json({review:rows[0]});
});


// Part 206: consolidated production identity, audit and data-protection administration
app.get('/api/admin/production-identity',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [summaryResult,userResult,inviteUserResult,inviteResult,readinessResult,backupResult,decisionResult]=await Promise.all([
    query(`SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE active AND first_login_at IS NULL)::int pending_initial,count(*) FILTER(WHERE locked_until>now())::int locked,count(*) FILTER(WHERE active AND role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_missing,(SELECT count(*)::int FROM operation_readiness_checks WHERE status NOT IN ('passed','not-applicable')) readiness_open FROM users`,[MFA_BASELINE_ROLES]),
    query(`SELECT u.id,u.login_id,u.display_name,u.email,u.role,u.office_id,u.active,u.first_login_at,u.last_login_at,u.locked_until,u.must_change_password,u.mfa_required,u.token_version,o.name office_name,(u.role=ANY($1::text[]) AND u.email IS NOT NULL) mfa_expected FROM users u LEFT JOIN offices o ON o.id=u.office_id WHERE u.active ORDER BY u.role,u.display_name LIMIT 250`,[MFA_BASELINE_ROLES]),
    query(`SELECT id,login_id,display_name,email FROM users WHERE active AND email IS NOT NULL ORDER BY display_name LIMIT 250`),
    query(`SELECT i.*,u.display_name,u.login_id FROM account_invitations i JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC LIMIT 100`),
    query(`SELECT count(*)::int total,count(*) FILTER(WHERE status='passed')::int passed,count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE status='failed')::int failed,count(*) FILTER(WHERE status='not-applicable')::int not_applicable FROM operation_readiness_checks`),
    query(`SELECT b.*,u.display_name verified_by_name FROM backup_verification_records b LEFT JOIN users u ON u.id=b.verified_by ORDER BY verification_date DESC,created_at DESC LIMIT 24`),
    query(`SELECT d.*,u.display_name decided_by_name FROM production_operation_decisions d LEFT JOIN users u ON u.id=d.decided_by ORDER BY decided_at DESC LIMIT 24`)
  ]);const s=summaryResult.rows[0],r=readinessResult.rows[0];res.json({summary:{total:s.total,active:s.active,pendingInitial:s.pending_initial,locked:s.locked,mfaMissing:s.mfa_missing,readinessOpen:s.readiness_open},users:userResult.rows,invitableUsers:inviteUserResult.rows,invitations:inviteResult.rows,readiness:{total:r.total,passed:r.passed,pending:r.pending,failed:r.failed,notApplicable:r.not_applicable},backups:backupResult.rows,decisions:decisionResult.rows});
});
app.post('/api/admin/production-identity/invitations',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({userId:z.string().uuid(),validDays:z.number().int().min(1).max(30).default(7),notes:z.string().max(500).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'招待内容を確認してください。'});const {rows:users}=await query(`SELECT id,email,display_name,active FROM users WHERE id=$1`,[parsed.data.userId]);const user=users[0];if(!user?.active||!user.email)return res.status(400).json({error:'有効なメールアドレスを持つ利用者を選択してください。'});const raw=crypto.randomBytes(32).toString('hex');const hash=hashText(raw);const expires=new Date(Date.now()+parsed.data.validDays*86400000);const {rows}=await query(`INSERT INTO account_invitations(user_id,email,status,expires_at,sent_at,created_by,notes,invitation_token_hash) VALUES($1,$2,'sent',$3,now(),$4,NULLIF($5,''),$6) RETURNING *`,[user.id,user.email,expires,req.user.id,parsed.data.notes,hash]);const url=`${config.publicAppUrl}/pages/activate-account.html?token=${encodeURIComponent(raw)}`;try{await sendMail({to:user.email,subject:'【検査・検品業務サポートシステム】利用開始のご案内',text:`次のURLから利用開始手続きを行ってください。 ${url}`,html:`<p><a href="${url}">利用開始手続きを行う</a></p>`});}catch(err){await query(`UPDATE account_invitations SET status='failed',last_error=$1 WHERE id=$2`,[String(err.message||err),rows[0].id]);return res.status(502).json({error:'招待メールの送信に失敗しました。設定を確認してください。'});}await audit(req,'invite','user',user.id,{invitationId:rows[0].id,expiresAt:expires.toISOString()});res.status(201).json({invitation:rows[0]});});
app.post('/api/admin/production-identity/invitations/:id/cancel',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const {rows}=await query(`UPDATE account_invitations SET status='cancelled',cancelled_at=now() WHERE id=$1 AND status IN ('pending','sent') RETURNING id,user_id`,[req.params.id]);if(!rows[0])return res.status(404).json({error:'取消可能な招待がありません。'});await audit(req,'cancel-invitation','user',rows[0].user_id,{invitationId:rows[0].id});res.json({message:'招待を取り消しました。'});});
app.get('/api/admin/production-identity/audit',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({action:z.string().max(100).optional(),entityType:z.string().max(100).optional(),from:z.string().date().optional(),to:z.string().date().optional()});const parsed=schema.safeParse(req.query);if(!parsed.success)return res.status(400).json({error:'検索条件を確認してください。'});const values=[],where=[];const add=v=>{values.push(v);return `$${values.length}`};if(parsed.data.action)where.push(`lower(a.action) LIKE lower(${add('%'+parsed.data.action+'%')})`);if(parsed.data.entityType)where.push(`lower(a.entity_type) LIKE lower(${add('%'+parsed.data.entityType+'%')})`);if(parsed.data.from)where.push(`a.created_at>=${add(parsed.data.from)}::date`);if(parsed.data.to)where.push(`a.created_at<(${add(parsed.data.to)}::date+interval '1 day')`);const {rows}=await query(`SELECT a.*,u.display_name actor_name,u.login_id FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY a.created_at DESC LIMIT 500`,values);res.json({logs:rows});});
app.post('/api/admin/production-identity/backups',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({databaseBackupOk:z.boolean(),photoBackupOk:z.boolean(),restoreTestOk:z.boolean(),retentionOk:z.boolean(),evidenceNote:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認内容を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO backup_verification_records(verification_date,database_backup_ok,photo_backup_ok,restore_test_ok,retention_ok,evidence_note,verified_by) VALUES(current_date,$1,$2,$3,$4,NULLIF($5,''),$6) RETURNING *`,[d.databaseBackupOk,d.photoBackupOk,d.restoreTestOk,d.retentionOk,d.evidenceNote,req.user.id]);await audit(req,'verify','backup',rows[0].id,{database:d.databaseBackupOk,photos:d.photoBackupOk,restore:d.restoreTestOk,retention:d.retentionOk});res.status(201).json({record:rows[0]});});
app.post('/api/admin/production-identity/decisions',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({decision:z.enum(['hold','pilot-ready','production-ready']),targetUserCount:z.number().int().min(1).max(500),decisionNote:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'判定内容を確認してください。'});const {rows:checks}=await query(`SELECT count(*)::int total,count(*) FILTER(WHERE status='passed')::int passed,count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE status='failed')::int failed,count(*) FILTER(WHERE status='not-applicable')::int not_applicable FROM operation_readiness_checks`);const r=checks[0];if(parsed.data.decision==='production-ready'&&(r.pending>0||r.failed>0))return res.status(409).json({error:'未確認または不合格の運用開始チェックがあるため、正式運用開始可にはできません。'});const {rows}=await query(`INSERT INTO production_operation_decisions(decision,target_user_count,readiness_summary,decision_note,decided_by) VALUES($1,$2,$3::jsonb,NULLIF($4,''),$5) RETURNING *`,[parsed.data.decision,parsed.data.targetUserCount,JSON.stringify(r),parsed.data.decisionNote,req.user.id]);await audit(req,'decide','production-operation',rows[0].id,{decision:parsed.data.decision,targetUserCount:parsed.data.targetUserCount});res.status(201).json({decision:rows[0]});});


// Part 207: operations assurance and continuity administration
app.get('/api/admin/operations-assurance',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [summary,users,lifecycle,incidents,restores,metrics]=await Promise.all([
    query(`SELECT (SELECT count(*) FROM users WHERE active)::int active_users,(SELECT count(*) FROM user_lifecycle_actions WHERE status='planned')::int planned_lifecycle,(SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed'))::int open_incidents,(SELECT count(*) FROM operational_incidents WHERE severity='critical' AND status NOT IN ('resolved','closed'))::int critical_incidents,(SELECT count(*) FROM admin_recurring_tasks WHERE active AND next_due_date<current_date)::int overdue_tasks,(SELECT result FROM restore_exercises ORDER BY exercise_date DESC,created_at DESC LIMIT 1) last_restore_result`),
    query(`SELECT id,login_id,display_name,role,active FROM users ORDER BY active DESC,display_name LIMIT 250`),
    query(`SELECT l.*,u.display_name,u.login_id FROM user_lifecycle_actions l JOIN users u ON u.id=l.user_id ORDER BY l.effective_date DESC,l.created_at DESC LIMIT 100`),
    query(`SELECT * FROM operational_incidents ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,occurred_at DESC LIMIT 100`),
    query(`SELECT r.*,u.display_name conducted_by_name FROM restore_exercises r LEFT JOIN users u ON u.id=r.conducted_by ORDER BY exercise_date DESC,created_at DESC LIMIT 36`),
    query(`SELECT * FROM service_metric_snapshots ORDER BY snapshot_date DESC LIMIT 36`)
  ]);res.json({summary:summary.rows[0],users:users.rows,lifecycle:lifecycle.rows,incidents:incidents.rows,restores:restores.rows,metrics:metrics.rows});
});
app.post('/api/admin/operations-assurance/lifecycle',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({userId:z.string().uuid(),actionType:z.enum(['join','transfer','role-change','suspend','reactivate','retire']),effectiveDate:z.string().date(),newRole:z.enum(['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin']).nullable().optional(),reason:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'利用者処理の内容を確認してください。'});const {rows:u}=await query(`SELECT role,office_id FROM users WHERE id=$1`,[parsed.data.userId]);if(!u[0])return res.status(404).json({error:'利用者が見つかりません。'});if(parsed.data.newRole==='safety-environment-admin'&&u[0].role!=='safety-environment-director')return res.status(409).json({error:'将来の管理者権限移行先は安全環境室長に限定されています。'});const {rows}=await query(`INSERT INTO user_lifecycle_actions(user_id,action_type,effective_date,old_role,new_role,old_office_id,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8) RETURNING *`,[parsed.data.userId,parsed.data.actionType,parsed.data.effectiveDate,u[0].role,parsed.data.newRole||null,u[0].office_id,parsed.data.reason,req.user.id]);await audit(req,'plan','user-lifecycle',rows[0].id,{userId:parsed.data.userId,actionType:parsed.data.actionType,effectiveDate:parsed.data.effectiveDate});res.status(201).json({action:rows[0]});});
app.post('/api/admin/operations-assurance/incidents',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({severity:z.enum(['low','medium','high','critical']),category:z.string().min(1).max(100),title:z.string().min(1).max(300),occurredAt:z.string().min(1),affectedScope:z.string().max(1000).optional().default(''),description:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'障害内容を確認してください。'});const no=`INC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;const {rows}=await query(`INSERT INTO operational_incidents(incident_no,severity,category,title,description,affected_scope,occurred_at,created_by) VALUES($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7,$8) RETURNING *`,[no,parsed.data.severity,parsed.data.category,parsed.data.title,parsed.data.description,parsed.data.affectedScope,new Date(parsed.data.occurredAt),req.user.id]);await audit(req,'create','operational-incident',rows[0].id,{incidentNo:no,severity:parsed.data.severity});res.status(201).json({incident:rows[0]});});
app.post('/api/admin/operations-assurance/restores',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({exerciseDate:z.string().date(),targetType:z.enum(['database','photos','full-system']),result:z.enum(['passed','partial','failed']),recoveryTimeMinutes:z.number().int().min(0).max(100000),evidence:z.string().max(5000).optional().default(''),issues:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'復元訓練の内容を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO restore_exercises(exercise_date,target_type,result,recovery_time_minutes,evidence,issues,conducted_by) VALUES($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),$7) RETURNING *`,[d.exerciseDate,d.targetType,d.result,d.recoveryTimeMinutes,d.evidence,d.issues,req.user.id]);await audit(req,'record','restore-exercise',rows[0].id,{target:d.targetType,result:d.result});res.status(201).json({exercise:rows[0]});});
app.post('/api/admin/operations-assurance/metrics',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({notes:z.string().max(2000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'入力内容を確認してください。'});const {rows:c}=await query(`SELECT (SELECT count(*) FROM users WHERE active)::int active_users,(SELECT count(*) FROM audit_logs WHERE action='login' AND created_at>=current_date)::int login_success_count,(SELECT count(*) FROM audit_logs WHERE action LIKE '%login%' AND details->>'success'='false' AND created_at>=current_date)::int login_failure_count,(SELECT count(*) FROM users WHERE locked_until>now())::int locked_user_count,(SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed'))::int open_incident_count,(SELECT count(*) FROM admin_recurring_tasks WHERE active AND next_due_date<current_date)::int overdue_task_count,(SELECT coalesce(bool_and(database_backup_ok AND photo_backup_ok),false) FROM backup_verification_records WHERE verification_date>=current_date-30)::boolean backup_verified`);const x=c[0];const {rows}=await query(`INSERT INTO service_metric_snapshots(snapshot_date,active_users,login_success_count,login_failure_count,locked_user_count,open_incident_count,overdue_task_count,backup_verified,notes,created_by) VALUES(current_date,$1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9) ON CONFLICT(snapshot_date) DO UPDATE SET active_users=excluded.active_users,login_success_count=excluded.login_success_count,login_failure_count=excluded.login_failure_count,locked_user_count=excluded.locked_user_count,open_incident_count=excluded.open_incident_count,overdue_task_count=excluded.overdue_task_count,backup_verified=excluded.backup_verified,notes=excluded.notes,created_by=excluded.created_by,created_at=now() RETURNING *`,[x.active_users,x.login_success_count,x.login_failure_count,x.locked_user_count,x.open_incident_count,x.overdue_task_count,x.backup_verified,parsed.data.notes,req.user.id]);await audit(req,'capture','service-metrics',rows[0].id,{snapshotDate:rows[0].snapshot_date});res.status(201).json({snapshot:rows[0]});});


// Part 208: integrated operations center
app.get('/api/admin/operations-center',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [summaryResult,incidentsResult,regulationResult,backupResult,reviewsResult]=await Promise.all([
    query(`SELECT
      (SELECT count(*) FROM users WHERE active)::int active_users,
      (SELECT count(*) FROM users WHERE active AND first_login_at IS NULL)::int pending_initial,
      (SELECT count(*) FROM users WHERE locked_until>now())::int locked_users,
      (SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed'))::int open_incidents,
      (SELECT count(*) FROM admin_governance_corrective_actions WHERE status<>'completed' AND due_date<current_date)::int overdue_actions,
      (SELECT count(*) FROM regulation_sources WHERE status IN ('draft','source-registered','data-prepared','reviewed','approved'))::int pending_regulation_updates,
      (SELECT count(*) FROM admin_recurring_tasks WHERE active AND next_due_date<current_date)::int overdue_tasks,
      (SELECT count(*) FROM users WHERE active AND role=ANY($1::text[]) AND email IS NOT NULL AND NOT mfa_required)::int mfa_missing,
      (SELECT count(*) FROM operational_incidents WHERE severity='critical' AND status NOT IN ('resolved','closed'))::int critical_incidents,
      (SELECT count(*) FROM regulation_datasets WHERE validation_status='invalid')::int invalid_regulation_datasets,
      (SELECT count(*) FROM backup_verification_records WHERE verification_date>=current_date-30 AND database_backup_ok AND photo_backup_ok AND restore_test_ok)::int recent_good_backups,
      (SELECT status FROM admin_succession_requests ORDER BY created_at DESC LIMIT 1) succession_status`,[MFA_BASELINE_ROLES]),
    query(`SELECT incident_no,title,severity,status,occurred_at FROM operational_incidents ORDER BY occurred_at DESC LIMIT 10`),
    query(`SELECT regulation_id title,status,created_at FROM regulation_sources ORDER BY created_at DESC LIMIT 8`),
    query(`SELECT verification_date,database_backup_ok,photo_backup_ok,restore_test_ok,retention_ok,created_at FROM backup_verification_records ORDER BY verification_date DESC,created_at DESC LIMIT 8`),
    query(`SELECT r.*,u.display_name reviewed_by_name FROM integrated_operations_reviews r LEFT JOIN users u ON u.id=r.reviewed_by ORDER BY review_month DESC LIMIT 24`)
  ]);
  const s=summaryResult.rows[0];
  const domains=[
    {key:'users',label:'利用者・権限',status:(s.locked_users>0||s.pending_initial>10)?'attention':'normal',message:`初回ログイン待ち ${s.pending_initial}名、ロック中 ${s.locked_users}名`,note:'異動・退職・権限変更予定も定期的に確認してください。'},
    {key:'security',label:'認証・セキュリティ',status:s.mfa_missing>0?'attention':'normal',message:`MFA未設定 ${s.mfa_missing}名`,note:'管理権限者と安全環境室はMFAを必須とします。'},
    {key:'regulations',label:'法令・データ更新',status:s.invalid_regulation_datasets>0?'critical':(s.pending_regulation_updates>0?'attention':'normal'),message:`更新候補 ${s.pending_regulation_updates}件、検証不合格 ${s.invalid_regulation_datasets}件`,note:'公開前に原典照合と承認を実施してください。'},
    {key:'incidents',label:'障害・是正対応',status:s.critical_incidents>0?'critical':((s.open_incidents+s.overdue_actions)>0?'attention':'normal'),message:`未解決障害 ${s.open_incidents}件、期限超過 ${s.overdue_actions}件`,note:'重大障害は利用停止やロールバックを検討します。'},
    {key:'backup',label:'バックアップ・復元',status:s.recent_good_backups>0?'normal':'attention',message:s.recent_good_backups>0?'直近30日以内に正常確認あり':'直近30日以内の正常確認なし',note:'DB、写真、復元テストをまとめて確認します。'},
    {key:'succession',label:'管理者権限移行',status:s.succession_status==='executed'?'normal':'attention',message:`最新状態：${s.succession_status||'未申請'}`,note:'移行先は安全環境室長に限定されています。'}
  ];
  const priorities=[];
  if(s.critical_incidents>0)priorities.push({level:'critical',title:'重大障害が未解決です',detail:`重大障害 ${s.critical_incidents}件を確認してください。`,href:'operations-assurance-admin.html'});
  if(s.invalid_regulation_datasets>0)priorities.push({level:'critical',title:'法令更新データの検証不合格があります',detail:`不合格データ ${s.invalid_regulation_datasets}件を原典と照合してください。`,href:'regulation-update-admin.html'});
  if(s.overdue_actions>0)priorities.push({level:'attention',title:'期限超過の是正対応があります',detail:`期限超過 ${s.overdue_actions}件を処理してください。`,href:'admin-governance-dashboard.html'});
  if(s.recent_good_backups===0)priorities.push({level:'attention',title:'バックアップ確認が必要です',detail:'直近30日以内に、DB・写真・復元テストがすべて正常な記録がありません。',href:'production-identity-admin.html'});
  if(s.mfa_missing>0)priorities.push({level:'attention',title:'MFA未設定者がいます',detail:`MFA必須対象の未設定者 ${s.mfa_missing}名を確認してください。`,href:'account-security-admin.html'});
  let overallStatus='normal';
  if(domains.some(x=>x.status==='critical'))overallStatus='critical';else if(domains.some(x=>x.status==='attention'))overallStatus='attention';
  const overallMessage=overallStatus==='critical'?'重大な未処理事項があります。優先対応事項を確認してください。':overallStatus==='attention'?'確認または対応が必要な項目があります。':'主要な運用項目は正常です。';
  res.json({summary:{activeUsers:s.active_users,pendingInitial:s.pending_initial,lockedUsers:s.locked_users,openIncidents:s.open_incidents,overdueActions:s.overdue_actions,pendingRegulationUpdates:s.pending_regulation_updates},overallStatus,overallMessage,domains,priorities,incidents:incidentsResult.rows,regulationUpdates:regulationResult.rows,backups:backupResult.rows,reviews:reviewsResult.rows});
});
app.post('/api/admin/operations-center/reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const status=z.enum(['normal','attention','critical']);
  const schema=z.object({reviewMonth:z.string().date(),overallStatus:status,userManagementStatus:status,regulationUpdateStatus:status,securityStatus:status,backupStatus:status,incidentStatus:status,summary:z.string().max(5000).optional().default(''),nextActions:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'月次レビューの内容を確認してください。'});
  const d=parsed.data;
  const {rows:snapshotRows}=await query(`SELECT (SELECT count(*) FROM users WHERE active)::int active_users,(SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed'))::int open_incidents,(SELECT count(*) FROM admin_governance_corrective_actions WHERE status<>'completed' AND due_date<current_date)::int overdue_actions,(SELECT count(*) FROM regulation_sources WHERE status IN ('draft','source-registered','data-prepared','reviewed','approved'))::int pending_regulation_updates`);
  const {rows}=await query(`INSERT INTO integrated_operations_reviews(review_month,overall_status,user_management_status,regulation_update_status,security_status,backup_status,incident_status,summary,next_actions,snapshot,reviewed_by) VALUES($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),NULLIF($9,''),$10::jsonb,$11) ON CONFLICT(review_month) DO UPDATE SET overall_status=excluded.overall_status,user_management_status=excluded.user_management_status,regulation_update_status=excluded.regulation_update_status,security_status=excluded.security_status,backup_status=excluded.backup_status,incident_status=excluded.incident_status,summary=excluded.summary,next_actions=excluded.next_actions,snapshot=excluded.snapshot,reviewed_by=excluded.reviewed_by,reviewed_at=now() RETURNING *`,[d.reviewMonth,d.overallStatus,d.userManagementStatus,d.regulationUpdateStatus,d.securityStatus,d.backupStatus,d.incidentStatus,d.summary,d.nextActions,JSON.stringify(snapshotRows[0]),req.user.id]);
  await audit(req,'review','integrated-operations',rows[0].id,{reviewMonth:d.reviewMonth,overallStatus:d.overallStatus});
  res.status(201).json({review:rows[0]});
});


app.get('/api/admin/final-readiness',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [summaryResult,signoffResult]=await Promise.all([
    query(`SELECT
      (SELECT count(*) FROM users WHERE active)::int active_users,
      (SELECT count(*) FROM users WHERE locked_until>now())::int locked_users,
      (SELECT count(*) FROM users WHERE active AND role IN ('office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin') AND (mfa_enabled IS NOT TRUE))::int mfa_missing,
      (SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed'))::int open_incidents,
      (SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed') AND severity='critical')::int critical_incidents,
      (SELECT count(*) FROM admin_governance_corrective_actions WHERE status<>'completed' AND due_date<current_date)::int overdue_actions,
      (SELECT count(*) FROM regulation_sources WHERE status IN ('draft','source-registered','data-prepared','reviewed','approved'))::int pending_regulation_updates,
      (SELECT count(*) FROM regulation_datasets WHERE validation_status='failed')::int invalid_regulation_datasets,
      (SELECT count(*) FROM backup_verification_records WHERE verification_date>=current_date-30 AND database_backup_ok AND photo_backup_ok AND restore_test_ok)::int recent_good_backups`),
    query(`SELECT s.*,u.display_name approved_by_name FROM production_release_signoffs s LEFT JOIN users u ON u.id=s.approved_by ORDER BY s.approved_at DESC LIMIT 20`)
  ]);
  const s=summaryResult.rows[0];
  const domains=[
    {label:'利用者・認証',status:(s.locked_users>0||s.mfa_missing>0)?'attention':'normal',message:`ロック中 ${s.locked_users}名、MFA未設定 ${s.mfa_missing}名`},
    {label:'権限・閲覧範囲',status:'normal',message:'事業所利用者・事業所管理者・安全環境室・管理者の役割分離を実装済み'},
    {label:'法令・データ品質',status:s.invalid_regulation_datasets>0?'critical':(s.pending_regulation_updates>0?'attention':'normal'),message:`更新候補 ${s.pending_regulation_updates}件、検証不合格 ${s.invalid_regulation_datasets}件`},
    {label:'障害・是正対応',status:s.critical_incidents>0?'critical':((s.open_incidents+s.overdue_actions)>0?'attention':'normal'),message:`未解決障害 ${s.open_incidents}件、期限超過 ${s.overdue_actions}件`},
    {label:'バックアップ・復元',status:s.recent_good_backups>0?'normal':'attention',message:s.recent_good_backups>0?'直近30日以内に正常確認あり':'直近30日以内の正常確認なし'},
    {label:'監査・管理者移行',status:'normal',message:'監査ログ、定期点検、安全環境室長への移行ワークフローを実装済み'}
  ];
  let overallStatus='normal';if(domains.some(x=>x.status==='critical'))overallStatus='critical';else if(domains.some(x=>x.status==='attention'))overallStatus='attention';
  const overallMessage=overallStatus==='critical'?'正式運用前に解消すべき重大事項があります。':overallStatus==='attention'?'確認または証跡登録が必要な項目があります。':'自動判定上の重大な未処理事項はありません。';
  res.json({summary:{activeUsers:s.active_users,lockedUsers:s.locked_users,mfaMissing:s.mfa_missing,openIncidents:s.open_incidents,overdueActions:s.overdue_actions,pendingRegulationUpdates:s.pending_regulation_updates,recentGoodBackups:s.recent_good_backups>0,dataQuality:s.invalid_regulation_datasets>0?'公開不可':'合格'},domains,overallStatus,overallMessage,signoffs:signoffResult.rows});
});

app.post('/api/admin/final-readiness/signoffs',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({targetVersion:z.string().min(1).max(100),targetUserCount:z.number().int().min(1).max(500),decision:z.enum(['hold','pilot-approved','production-approved']),checklist:z.record(z.boolean()),decisionNote:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'判定内容を確認してください。'});
  const d=parsed.data;const complete=Object.keys(d.checklist).length>=12&&Object.values(d.checklist).every(Boolean);
  if(d.decision==='production-approved'&&!complete)return res.status(409).json({error:'正式運用開始可には、すべての確認項目の完了が必要です。'});
  const {rows:health}=await query(`SELECT (SELECT count(*) FROM operational_incidents WHERE status NOT IN ('resolved','closed') AND severity='critical')::int critical_incidents,(SELECT count(*) FROM regulation_datasets WHERE validation_status='failed')::int invalid_datasets`);
  if(d.decision==='production-approved'&&(health[0].critical_incidents>0||health[0].invalid_datasets>0))return res.status(409).json({error:'重大障害または検証不合格データがあるため、正式運用開始可にはできません。'});
  const {rows}=await query(`INSERT INTO production_release_signoffs(target_version,target_user_count,decision,checklist,summary,decision_note,approved_by) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,NULLIF($6,''),$7) RETURNING *`,[d.targetVersion,d.targetUserCount,d.decision,JSON.stringify(d.checklist),JSON.stringify(health[0]),d.decisionNote,req.user.id]);
  await audit(req,'signoff','production-release',rows[0].id,{decision:d.decision,targetVersion:d.targetVersion,targetUserCount:d.targetUserCount});
  res.status(201).json({message:'運用開始判定を保存しました。',signoff:rows[0]});
});


// Part 214: cloud pilot launch package
app.get('/api/admin/pilot-launch/summary', authenticate, requireRole('safety-environment-admin'), async (_req,res)=>{
  const [usersResult,batchesResult,testsResult,invitationsResult,progressResult,decisionsResult]=await Promise.all([
    query(`SELECT count(*)::int total,
      count(*) FILTER(WHERE active)::int active,
      count(*) FILTER(WHERE role='safety-environment-director')::int safety_directors,
      count(*) FILTER(WHERE role='safety-environment-staff')::int safety_staff,
      count(*) FILTER(WHERE active AND first_login_at IS NOT NULL)::int login_verified,
      count(*) FILTER(WHERE active AND role IN ('office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin') AND mfa_enabled IS NOT TRUE)::int mfa_missing
      FROM users`),
    query(`SELECT b.*,u.display_name created_by_name FROM pilot_launch_batches b LEFT JOIN users u ON u.id=b.created_by ORDER BY b.created_at DESC LIMIT 20`),
    query(`SELECT t.*,u.display_name executed_by_name FROM pilot_verification_results t LEFT JOIN users u ON u.id=t.executed_by ORDER BY t.executed_at DESC LIMIT 100`),
    query(`SELECT r.*,u.display_name executed_by_name FROM pilot_invitation_runs r LEFT JOIN users u ON u.id=r.executed_by ORDER BY r.executed_at DESC LIMIT 50`),
    query(`SELECT s.*,u.display_name captured_by_name FROM pilot_user_progress_snapshots s LEFT JOIN users u ON u.id=s.captured_by ORDER BY s.captured_at DESC LIMIT 50`),
    query(`SELECT d.*,u.display_name decided_by_name FROM pilot_acceptance_decisions d LEFT JOIN users u ON u.id=d.decided_by ORDER BY d.decided_at DESC LIMIT 50`)
  ]);
  const u=usersResult.rows[0],tests=testsResult.rows,latestInvitation=invitationsResult.rows[0]||{},latestDecision=decisionsResult.rows[0]||{};
  const checks=[
    {key:'user-count',label:'初期利用者を登録済み',passed:u.active>=50,detail:`有効利用者 ${u.active}名`},
    {key:'safety-director',label:'安全環境室長を1名登録',passed:u.safety_directors===1,detail:`登録 ${u.safety_directors}名`},
    {key:'safety-staff',label:'安全環境室職員を5名登録',passed:u.safety_staff===5,detail:`登録 ${u.safety_staff}名`},
    {key:'mfa',label:'MFA必須対象者の設定完了',passed:u.mfa_missing===0,detail:`未設定 ${u.mfa_missing}名`},
    {key:'invitation',label:'利用者招待の到達状況を確認',passed:Number(latestInvitation.delivered_count||0)>=50&&Number(latestInvitation.failed_count||0)===0,detail:`到達 ${latestInvitation.delivered_count||0}名、失敗 ${latestInvitation.failed_count||0}名`},
    {key:'permission-test',label:'権限マトリクス試験に合格',passed:tests.some(x=>x.test_type==='permission-matrix'&&x.status==='passed'),detail:'事業所・安全環境室・管理者の閲覧範囲を確認'},
    {key:'login-test',label:'初回ログイン試験に合格',passed:tests.some(x=>x.test_type==='login'&&x.status==='passed'),detail:'パスワード変更・ロック・ログアウトを確認'},
    {key:'load-50',label:'50名想定の性能試験に合格',passed:tests.some(x=>x.test_type==='load-50'&&x.status==='passed'),detail:'API応答・エラー率を確認'},
    {key:'load-150',label:'150名想定の性能確認を実施',passed:tests.some(x=>x.test_type==='load-150'&&['passed','warning'].includes(x.status)),detail:'将来拡張の参考試験'},
    {key:'mail',label:'招待・再設定メール試験に合格',passed:tests.some(x=>x.test_type==='mail'&&x.status==='passed'),detail:'送信・受信・期限切れを確認'},
    {key:'photo',label:'写真保存試験に合格',passed:tests.some(x=>x.test_type==='photo-storage'&&x.status==='passed'),detail:'登録・閲覧・権限・容量を確認'},
    {key:'backup',label:'バックアップ・復元試験に合格',passed:tests.some(x=>x.test_type==='backup-restore'&&x.status==='passed'),detail:'DBと写真保存領域を確認'}
  ];
  res.json({summary:{total:u.total,active:u.active,loginVerified:u.login_verified,safetyDirectors:u.safety_directors,safetyStaff:u.safety_staff,mfaMissing:u.mfa_missing,invitationDelivered:Number(latestInvitation.delivered_count||0),openIssueCount:Number(latestDecision.open_issue_count||0)},checks,batches:batchesResult.rows,tests,invitationRuns:invitationsResult.rows,progressSnapshots:progressResult.rows,decisions:decisionsResult.rows});
});
app.post('/api/admin/pilot-launch/batches', authenticate, requireRole('safety-environment-admin'), async (req,res)=>{
  const schema=z.object({name:z.string().min(1).max(200),targetUserCount:z.number().int().min(1).max(150),startDate:z.string().date().optional().nullable(),notes:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'試験運用バッチの内容を確認してください。'});
  const d=parsed.data;const {rows}=await query(`INSERT INTO pilot_launch_batches(name,target_user_count,start_date,notes,created_by) VALUES($1,$2,$3,NULLIF($4,''),$5) RETURNING *`,[d.name,d.targetUserCount,d.startDate||null,d.notes,req.user.id]);
  await audit(req,'create','pilot-launch-batch',rows[0].id,{targetUserCount:d.targetUserCount});res.status(201).json({batch:rows[0]});
});
app.post('/api/admin/pilot-launch/tests', authenticate, requireRole('safety-environment-admin'), async (req,res)=>{
  const schema=z.object({batchId:z.string().uuid().optional().nullable(),testType:z.enum(['permission-matrix','load-50','load-150','mail','backup-restore','login','photo-storage']),status:z.enum(['passed','warning','failed']),executedAt:z.string().datetime().optional(),evidence:z.string().max(5000).optional().default(''),metrics:z.record(z.any()).optional().default({})});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'試験結果を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO pilot_verification_results(batch_id,test_type,status,executed_at,evidence,metrics,executed_by) VALUES($1,$2,$3,COALESCE($4::timestamptz,now()),NULLIF($5,''),$6::jsonb,$7) RETURNING *`,[d.batchId||null,d.testType,d.status,d.executedAt||null,d.evidence,JSON.stringify(d.metrics),req.user.id]);
  await audit(req,'record','pilot-verification',rows[0].id,{testType:d.testType,status:d.status});res.status(201).json({test:rows[0]});
});



// Part 215: pilot invitation, progress and acceptance
app.post('/api/admin/pilot-launch/invitations', authenticate, requireRole('safety-environment-admin'), async (req,res)=>{
  const schema=z.object({batchId:z.string().uuid().optional().nullable(),targetRole:z.string().max(100).optional().default('all'),targetCount:z.number().int().min(0).max(150),sentCount:z.number().int().min(0).max(150),deliveredCount:z.number().int().min(0).max(150),failedCount:z.number().int().min(0).max(150),expiredCount:z.number().int().min(0).max(150),evidence:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'招待実行結果を確認してください。'});const d=parsed.data;
  if(d.deliveredCount+d.failedCount>d.sentCount)return res.status(409).json({error:'到達数と失敗数の合計は送信数以下にしてください。'});
  const {rows}=await query(`INSERT INTO pilot_invitation_runs(batch_id,target_role,target_count,sent_count,delivered_count,failed_count,expired_count,evidence,executed_by) VALUES($1,NULLIF($2,''),$3,$4,$5,$6,$7,NULLIF($8,''),$9) RETURNING *`,[d.batchId||null,d.targetRole,d.targetCount,d.sentCount,d.deliveredCount,d.failedCount,d.expiredCount,d.evidence,req.user.id]);
  await audit(req,'record','pilot-invitation-run',rows[0].id,{sentCount:d.sentCount,deliveredCount:d.deliveredCount,failedCount:d.failedCount});res.status(201).json({record:rows[0]});
});

app.post('/api/admin/pilot-launch/progress', authenticate, requireRole('safety-environment-admin'), async (req,res)=>{
  const schema=z.object({batchId:z.string().uuid().optional().nullable(),totalUsers:z.number().int().min(0).max(150),invitedUsers:z.number().int().min(0).max(150),firstLoginCompleted:z.number().int().min(0).max(150),passwordChanged:z.number().int().min(0).max(150),mfaCompleted:z.number().int().min(0).max(150),permissionVerified:z.number().int().min(0).max(150),lockedUsers:z.number().int().min(0).max(150),supportRequired:z.number().int().min(0).max(150),notes:z.string().max(5000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'利用者進捗を確認してください。'});const d=parsed.data;
  const counts=[d.invitedUsers,d.firstLoginCompleted,d.passwordChanged,d.mfaCompleted,d.permissionVerified,d.lockedUsers,d.supportRequired];if(counts.some(x=>x>d.totalUsers))return res.status(409).json({error:'各人数は対象人数以下にしてください。'});
  const {rows}=await query(`INSERT INTO pilot_user_progress_snapshots(batch_id,total_users,invited_users,first_login_completed,password_changed,mfa_completed,permission_verified,locked_users,support_required,notes,captured_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULLIF($10,''),$11) RETURNING *`,[d.batchId||null,d.totalUsers,d.invitedUsers,d.firstLoginCompleted,d.passwordChanged,d.mfaCompleted,d.permissionVerified,d.lockedUsers,d.supportRequired,d.notes,req.user.id]);
  await audit(req,'snapshot','pilot-user-progress',rows[0].id,{totalUsers:d.totalUsers,firstLoginCompleted:d.firstLoginCompleted});res.status(201).json({snapshot:rows[0]});
});

app.post('/api/admin/pilot-launch/decisions', authenticate, requireRole('safety-environment-admin'), async (req,res)=>{
  const schema=z.object({batchId:z.string().uuid().optional().nullable(),decision:z.enum(['hold','continue-pilot','expand-150','ready-for-production']),checklist:z.record(z.boolean()),openIssueCount:z.number().int().min(0).max(999),decisionReason:z.string().max(5000).optional().default(''),nextReviewDate:z.string().date().optional().nullable()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'受入判定を確認してください。'});const d=parsed.data;
  const checklistComplete=Object.keys(d.checklist).length>=11&&Object.values(d.checklist).every(Boolean);
  const {rows:failedRows}=await query(`SELECT count(*)::int failed_count FROM pilot_verification_results WHERE ($1::uuid IS NULL OR batch_id=$1) AND status='failed'`,[d.batchId||null]);
  if(d.decision==='ready-for-production'&&(!checklistComplete||d.openIssueCount>0||failedRows[0].failed_count>0))return res.status(409).json({error:'正式運用準備可には、全チェック完了、未解決課題0件、不合格試験0件が必要です。'});
  const {rows}=await query(`INSERT INTO pilot_acceptance_decisions(batch_id,decision,checklist,open_issue_count,decision_reason,next_review_date,decided_by) VALUES($1,$2,$3::jsonb,$4,NULLIF($5,''),$6,$7) RETURNING *`,[d.batchId||null,d.decision,JSON.stringify(d.checklist),d.openIssueCount,d.decisionReason,d.nextReviewDate||null,req.user.id]);
  if(d.batchId&&['continue-pilot','expand-150','ready-for-production'].includes(d.decision))await query(`UPDATE pilot_launch_batches SET status=CASE WHEN $2='ready-for-production' THEN 'completed' ELSE 'running' END,updated_at=now() WHERE id=$1`,[d.batchId,d.decision]);
  await audit(req,'decide','pilot-acceptance',rows[0].id,{decision:d.decision,openIssueCount:d.openIssueCount});res.status(201).json({decision:rows[0]});
});



// Part 220: access governance, deletion approval and role review
app.get('/api/admin/access-governance',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [d,r,v]=await Promise.all([
    query(`SELECT x.*,u.display_name requester_name FROM deletion_requests x LEFT JOIN users u ON u.id=x.requested_by ORDER BY x.created_at DESC LIMIT 200`),
    query(`SELECT x.*,u.display_name,u.role current_user_role FROM role_change_requests x LEFT JOIN users u ON u.id=x.user_id ORDER BY x.created_at DESC LIMIT 200`),
    query(`SELECT x.*,u.display_name reviewed_by_name FROM access_review_records x LEFT JOIN users u ON u.id=x.reviewed_by ORDER BY x.review_date DESC,x.created_at DESC LIMIT 100`)
  ]);res.json({deletions:d.rows,roles:r.rows,reviews:v.rows});
});
app.post('/api/admin/access-governance/deletion-requests',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({targetType:z.enum(['application','photo']),targetId:z.string().min(1).max(120),officeName:z.string().max(120).optional().default(''),reason:z.string().min(1).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'削除申請の内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO deletion_requests(target_type,target_id,office_name,reason,requested_by) VALUES($1,$2,NULLIF($3,''),$4,$5) RETURNING *`,[d.targetType,d.targetId,d.officeName,d.reason,req.user.id]);await audit(req,'request-delete',d.targetType,d.targetId,{requestId:rows[0].id});res.status(201).json({request:rows[0]});
});
app.post('/api/admin/access-governance/deletion-requests/:id/decision',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({decision:z.enum(['approved','rejected']),note:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'判断内容を確認してください。'});const {rows}=await query(`UPDATE deletion_requests SET status=$1,decision_note=NULLIF($2,''),decided_by=$3,decided_at=now(),updated_at=now() WHERE id=$4 AND status='pending' RETURNING *`,[parsed.data.decision,parsed.data.note,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'承認待ちの削除申請が見つかりません。'});await audit(req,parsed.data.decision==='approved'?'approve-delete':'reject-delete',rows[0].target_type,rows[0].target_id,{requestId:rows[0].id});res.json({request:rows[0]});});
app.post('/api/admin/access-governance/role-change-requests',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({userId:z.string().uuid(),requestedRole:z.enum(['guest','office-user','office-admin','safety-environment-staff','safety-environment-director','safety-environment-admin']),effectiveDate:z.string().date().nullable().optional(),reason:z.string().min(1).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'権限変更申請の内容を確認してください。'});const {rows:u}=await query(`SELECT role FROM users WHERE id=$1`,[parsed.data.userId]);if(!u[0])return res.status(404).json({error:'利用者が見つかりません。'});if(parsed.data.requestedRole==='safety-environment-admin'&&u[0].role!=='safety-environment-director')return res.status(409).json({error:'システム管理者への移行先は安全環境室長に限定されています。'});const {rows}=await query(`INSERT INTO role_change_requests(user_id,current_role,requested_role,effective_date,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[parsed.data.userId,u[0].role,parsed.data.requestedRole,parsed.data.effectiveDate||null,parsed.data.reason,req.user.id]);await audit(req,'request-role-change','user',parsed.data.userId,{requestId:rows[0].id,requestedRole:parsed.data.requestedRole});res.status(201).json({request:rows[0]});});
app.post('/api/admin/access-governance/role-change-requests/:id/decision',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({decision:z.enum(['approved','rejected']),note:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'判断内容を確認してください。'});const {rows}=await query(`UPDATE role_change_requests SET status=$1,decision_note=NULLIF($2,''),decided_by=$3,decided_at=now(),updated_at=now() WHERE id=$4 AND status='pending' RETURNING *`,[parsed.data.decision,parsed.data.note,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'承認待ちの権限変更申請が見つかりません。'});await audit(req,parsed.data.decision==='approved'?'approve-role-change':'reject-role-change','user',rows[0].user_id,{requestId:rows[0].id,requestedRole:rows[0].requested_role});res.json({request:rows[0]});});
app.post('/api/admin/access-governance/reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({reviewDate:z.string().date(),targetCount:z.number().int().min(0).max(500),issueCount:z.number().int().min(0).max(500),nextReviewDate:z.string().date().nullable().optional(),notes:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success||parsed.data.issueCount>parsed.data.targetCount)return res.status(400).json({error:'棚卸し結果を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO access_review_records(review_date,target_count,issue_count,next_review_date,notes,reviewed_by) VALUES($1,$2,$3,$4,NULLIF($5,''),$6) RETURNING *`,[d.reviewDate,d.targetCount,d.issueCount,d.nextReviewDate||null,d.notes,req.user.id]);await audit(req,'record','access-review',rows[0].id,{targetCount:d.targetCount,issueCount:d.issueCount});res.status(201).json({review:rows[0]});});


// Part 222: user activity monitoring and inappropriate-use prevention
app.post('/api/usage-events',authenticate,async(req,res)=>{
  const schema=z.object({eventType:z.enum(['page-view','interaction','page-leave','search','view','download','print']),feature:z.string().min(1).max(80),pagePath:z.string().max(500).optional().nullable(),targetType:z.string().max(80).optional().nullable(),targetId:z.string().max(200).optional().nullable(),sessionId:z.string().max(100).optional().nullable(),details:z.record(z.any()).optional().default({})});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'利用記録の内容を確認してください。'});const d=parsed.data;
  await query(`INSERT INTO user_activity_events(user_id,event_type,feature,page_path,target_type,target_id,session_id,details,ip_address,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,[req.user.id,d.eventType,d.feature,d.pagePath||null,d.targetType||null,d.targetId||null,d.sessionId||null,JSON.stringify(d.details||{}),req.ip,req.get('user-agent')||null]);res.status(204).end();
});
app.get('/api/admin/user-activity',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({userId:z.string().uuid(),feature:z.string().max(80).optional().default(''),dateFrom:z.string().date().optional(),dateTo:z.string().date().optional(),limit:z.coerce.number().int().min(1).max(2000).default(1000)});const parsed=schema.safeParse(req.query);if(!parsed.success)return res.status(400).json({error:'検索条件を確認してください。'});const d=parsed.data;
  const {rows:userRows}=await query(`SELECT id,login_id,display_name,role,office_id FROM users WHERE id=$1`,[d.userId]);if(!userRows[0])return res.status(404).json({error:'利用者が見つかりません。'});
  const params=[d.userId,d.feature||null,d.dateFrom||null,d.dateTo||null,d.limit];
  const {rows:events}=await query(`SELECT event_type,feature,page_path,target_type,target_id,details,ip_address,user_agent,occurred_at FROM user_activity_events WHERE user_id=$1 AND ($2::text IS NULL OR feature=$2) AND ($3::date IS NULL OR occurred_at >= $3::date) AND ($4::date IS NULL OR occurred_at < $4::date + interval '1 day') ORDER BY occurred_at DESC LIMIT $5`,params);
  const {rows:auditRows}=await query(`SELECT action AS event_type,CASE WHEN entity_type IN ('application','photo') THEN CASE WHEN entity_type='photo' THEN 'photos' ELSE 'applications' END WHEN entity_type LIKE '%regulation%' THEN 'regulations' WHEN entity_type LIKE '%reference%' THEN 'references' WHEN action LIKE '%login%' THEN 'auth' ELSE 'administration' END feature,NULL::text page_path,entity_type target_type,entity_id target_id,details,ip_address,user_agent,created_at occurred_at FROM audit_logs WHERE user_id=$1 AND ($3::date IS NULL OR created_at >= $3::date) AND ($4::date IS NULL OR created_at < $4::date + interval '1 day') ORDER BY created_at DESC LIMIT $5`,params);
  const all=[...events,...auditRows].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at)).slice(0,d.limit);
  const count=f=>all.filter(x=>f(x)).length;const summary={total:all.length,pageViews:count(x=>x.event_type==='page-view'),searches:count(x=>['dangerous-goods-search','dangerous-goods-detail'].includes(x.feature)),regulationViews:count(x=>['regulations','references'].includes(x.feature)),caseViews:count(x=>['applications','photos'].includes(x.feature))};
  const {rows:agg}=await query(`SELECT feature,count(*)::int c FROM user_activity_events WHERE user_id=$1 AND occurred_at>=now()-interval '60 minutes' GROUP BY feature`,[d.userId]);const m=Object.fromEntries(agg.map(x=>[x.feature,x.c]));const alerts=[];
  if((m['dangerous-goods-detail']||0)>=50)alerts.push({severity:'warning',title:'危険物詳細の大量閲覧',summary:`直近60分に${m['dangerous-goods-detail']}件閲覧されています。`,rule:'60分間に50件以上'});
  if((m.regulations||0)+(m.references||0)>=100)alerts.push({severity:'warning',title:'法令・資料の大量閲覧',summary:`直近60分に${(m.regulations||0)+(m.references||0)}件閲覧されています。`,rule:'60分間に100件以上'});
  if((m.photos||0)>=30)alerts.push({severity:'critical',title:'写真の大量閲覧',summary:`直近60分に${m.photos}件閲覧されています。`,rule:'60分間に30件以上'});
  if((m.applications||0)>=80)alerts.push({severity:'warning',title:'申請番号の大量閲覧',summary:`直近60分に${m.applications}件閲覧されています。`,rule:'60分間に80件以上'});
  await audit(req,'review-user-activity','user',d.userId,{feature:d.feature||'all',dateFrom:d.dateFrom||null,dateTo:d.dateTo||null,resultCount:all.length});
  res.json({user:userRows[0],summary,alerts,events:all,generatedAt:new Date().toISOString(),notice:'透かし・スクリーンショット追跡は未実装'});
});


// Part 223: daily usage monitoring
app.get('/api/admin/daily-usage',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({date:z.string().date()});const parsed=schema.safeParse(req.query);if(!parsed.success)return res.status(400).json({error:'対象日を確認してください。'});const reportDate=parsed.data.date;
  const {rows:featureRows}=await query(`SELECT feature,count(*)::int count FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $1::date + interval '1 day' GROUP BY feature ORDER BY count(*) DESC`,[reportDate]);
  const {rows:userRows}=await query(`WITH e AS (SELECT user_id,min(occurred_at) first_event_at,max(occurred_at) last_event_at,count(*)::int event_count,jsonb_object_agg(feature,feature_count) feature_counts FROM (SELECT user_id,feature,min(occurred_at) occurred_at,count(*)::int feature_count FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $1::date + interval '1 day' GROUP BY user_id,feature) x GROUP BY user_id), ranked AS (SELECT user_id,array_agg(feature ORDER BY feature_count DESC,feature) FILTER (WHERE rn<=3) top_features FROM (SELECT user_id,feature,feature_count,row_number() OVER(PARTITION BY user_id ORDER BY feature_count DESC,feature) rn FROM (SELECT user_id,feature,count(*)::int feature_count FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $1::date + interval '1 day' GROUP BY user_id,feature) z) q GROUP BY user_id) SELECT u.id,u.login_id,u.display_name,u.role,e.first_event_at,e.last_event_at,e.event_count,COALESCE(r.top_features,ARRAY[]::text[]) top_features,((COALESCE((e.feature_counts->>'photos')::int,0)>=30) OR (COALESCE((e.feature_counts->>'applications')::int,0)>=80) OR (COALESCE((e.feature_counts->>'dangerous-goods-detail')::int,0)>=50) OR (COALESCE((e.feature_counts->>'regulations')::int,0)+COALESCE((e.feature_counts->>'references')::int,0)>=100)) alert_candidate FROM e JOIN users u ON u.id=e.user_id LEFT JOIN ranked r ON r.user_id=e.user_id ORDER BY e.event_count DESC,u.display_name`,[reportDate]);
  const {rows:loginRows}=await query(`SELECT count(DISTINCT user_id)::int count FROM audit_logs WHERE created_at >= $1::date AND created_at < $1::date + interval '1 day' AND action ILIKE '%login%'`,[reportDate]);
  const {rows:activeRows}=await query(`SELECT count(*)::int count FROM users WHERE is_active=true`,[]);
  const totalEvents=featureRows.reduce((n,x)=>n+x.count,0),activeUsers=userRows.length,loginUsers=loginRows[0]?.count||0,alertUsers=userRows.filter(x=>x.alert_candidate).length,inactiveUsers=Math.max(0,(activeRows[0]?.count||0)-activeUsers);
  const features=Object.fromEntries(featureRows.map(x=>[x.feature,x.count]));const payload={date:reportDate,summary:{activeUsers,totalEvents,loginUsers,alertUsers,inactiveUsers},features,users:userRows,generatedAt:new Date().toISOString()};
  await audit(req,'review-daily-usage','daily-usage',reportDate,{activeUsers,totalEvents,alertUsers});res.json(payload);
});



// Part 224: weekly/monthly usage analytics, alert response and retention governance
app.get('/api/admin/usage-period',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({period:z.enum(['daily','weekly','monthly']),date:z.string().date()});const parsed=schema.safeParse(req.query);if(!parsed.success)return res.status(400).json({error:'集計条件を確認してください。'});
  const base=new Date(`${parsed.data.date}T00:00:00Z`);let from=new Date(base),to=new Date(base);
  if(parsed.data.period==='weekly'){const day=(from.getUTCDay()+6)%7;from.setUTCDate(from.getUTCDate()-day);to=new Date(from);to.setUTCDate(to.getUTCDate()+7)}else if(parsed.data.period==='monthly'){from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),1));to=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,1))}else{to.setUTCDate(to.getUTCDate()+1)}
  const fromDate=from.toISOString().slice(0,10),toDate=to.toISOString().slice(0,10);
  const {rows:featureRows}=await query(`SELECT feature,count(*)::int count FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date GROUP BY feature ORDER BY count(*) DESC`,[fromDate,toDate]);
  const {rows:userRows}=await query(`WITH counts AS (SELECT user_id,feature,count(*)::int feature_count,count(DISTINCT occurred_at::date)::int active_days FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date GROUP BY user_id,feature), totals AS (SELECT user_id,sum(feature_count)::int event_count,max(active_days)::int active_days,jsonb_object_agg(feature,feature_count) feature_counts FROM counts GROUP BY user_id), ranked AS (SELECT user_id,array_agg(feature ORDER BY feature_count DESC,feature) FILTER (WHERE rn<=3) top_features FROM (SELECT user_id,feature,feature_count,row_number() OVER(PARTITION BY user_id ORDER BY feature_count DESC,feature) rn FROM counts) q GROUP BY user_id) SELECT u.id,u.login_id,u.display_name,u.role,t.active_days,t.event_count,COALESCE(r.top_features,ARRAY[]::text[]) top_features,((COALESCE((t.feature_counts->>'photos')::int,0)>=30) OR (COALESCE((t.feature_counts->>'applications')::int,0)>=80) OR (COALESCE((t.feature_counts->>'dangerous-goods-detail')::int,0)>=50) OR (COALESCE((t.feature_counts->>'regulations')::int,0)+COALESCE((t.feature_counts->>'references')::int,0)>=100)) alert_candidate FROM totals t JOIN users u ON u.id=t.user_id LEFT JOIN ranked r ON r.user_id=t.user_id ORDER BY t.event_count DESC,u.display_name`,[fromDate,toDate]);
  const {rows:inactiveRows}=await query(`SELECT id,login_id,display_name,role FROM users u WHERE is_active=true AND NOT EXISTS(SELECT 1 FROM user_activity_events e WHERE e.user_id=u.id AND e.occurred_at >= $1::date AND e.occurred_at < $2::date) ORDER BY display_name`,[fromDate,toDate]);
  const {rows:loginRows}=await query(`SELECT count(DISTINCT user_id)::int count FROM audit_logs WHERE created_at >= $1::date AND created_at < $2::date AND action ILIKE '%login%'`,[fromDate,toDate]);
  const totalEvents=featureRows.reduce((n,x)=>n+x.count,0),activeUsers=userRows.length,loginUsers=loginRows[0]?.count||0,alertUsers=userRows.filter(x=>x.alert_candidate).length;
  const payload={period:parsed.data.period,range:{from:fromDate,to:new Date(to.getTime()-86400000).toISOString().slice(0,10)},summary:{activeUsers,totalEvents,loginUsers,alertUsers,inactiveUsers:inactiveRows.length},features:Object.fromEntries(featureRows.map(x=>[x.feature,x.count])),users:userRows,inactiveUsers:inactiveRows,generatedAt:new Date().toISOString()};
  await audit(req,'review-usage-period','usage-period',`${parsed.data.period}:${fromDate}`,{toDate,activeUsers,totalEvents,alertUsers});res.json(payload);
});
app.get('/api/admin/activity-alert-cases',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query(`SELECT c.*,u.login_id,u.display_name,r.display_name reviewed_by_name FROM activity_alert_cases c JOIN users u ON u.id=c.user_id LEFT JOIN users r ON r.id=c.reviewed_by ORDER BY c.created_at DESC LIMIT 500`);res.json({cases:rows});});
app.post('/api/admin/activity-alert-cases',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({userId:z.string().uuid(),ruleCode:z.enum(['bulk-dangerous-goods','bulk-regulations','bulk-applications','bulk-photos','other']),periodLabel:z.string().max(200).optional().default(''),summary:z.string().min(1).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'対応記録の内容を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO activity_alert_cases(user_id,rule_code,period_label,summary,created_by) VALUES($1,$2,NULLIF($3,''),$4,$5) RETURNING *`,[d.userId,d.ruleCode,d.periodLabel,d.summary,req.user.id]);await audit(req,'create','activity-alert-case',rows[0].id,{userId:d.userId,ruleCode:d.ruleCode});res.status(201).json({case:rows[0]});});
app.patch('/api/admin/activity-alert-cases/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({status:z.enum(['open','reviewing','resolved','dismissed']),resolutionNote:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'対応状況を確認してください。'});const {rows}=await query(`UPDATE activity_alert_cases SET status=$1,resolution_note=NULLIF($2,''),reviewed_by=$3,reviewed_at=CASE WHEN $1 IN ('resolved','dismissed') THEN now() ELSE reviewed_at END,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.status,parsed.data.resolutionNote,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'対応記録が見つかりません。'});await audit(req,'update','activity-alert-case',req.params.id,{status:parsed.data.status});res.json({case:rows[0]});});
app.get('/api/admin/activity-retention-policy',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query(`SELECT p.*,u.display_name updated_by_name FROM activity_retention_policy p LEFT JOIN users u ON u.id=p.updated_by WHERE p.id=1`);res.json({policy:rows[0]||null});});
app.put('/api/admin/activity-retention-policy',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({eventRetentionDays:z.number().int().min(30).max(3650),reportRetentionDays:z.number().int().min(365).max(3650),nextReviewDate:z.string().date().nullable().optional(),note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'保存期間方針を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO activity_retention_policy(id,event_retention_days,report_retention_days,next_review_date,note,updated_by,updated_at) VALUES(1,$1,$2,$3,NULLIF($4,''),$5,now()) ON CONFLICT(id) DO UPDATE SET event_retention_days=EXCLUDED.event_retention_days,report_retention_days=EXCLUDED.report_retention_days,next_review_date=EXCLUDED.next_review_date,note=EXCLUDED.note,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`,[d.eventRetentionDays,d.reportRetentionDays,d.nextReviewDate||null,d.note,req.user.id]);await audit(req,'update','activity-retention-policy','1',{eventRetentionDays:d.eventRetentionDays,reportRetentionDays:d.reportRetentionDays});res.json({policy:rows[0]});});


// Part 227: periodic usage audit review records
app.get('/api/admin/activity-audit-reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT r.*,u.display_name reviewer_name FROM activity_audit_reviews r JOIN users u ON u.id=r.reviewed_by ORDER BY r.created_at DESC LIMIT 500`);
  await audit(req,'review','activity-audit-reviews','list',{resultCount:rows.length});res.json({reviews:rows});
});
app.post('/api/admin/activity-audit-reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({periodType:z.enum(['daily','weekly','monthly']),periodDate:z.string().date(),conclusion:z.enum(['normal','follow-up','escalated']),summary:z.string().min(1).max(5000),nextAction:z.string().max(5000).optional().default(''),nextReviewDate:z.string().date().nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'監査レビューの内容を確認してください。'});
  const d=parsed.data,base=new Date(`${d.periodDate}T00:00:00Z`);let from=new Date(base),to=new Date(base);
  if(d.periodType==='weekly'){const day=(from.getUTCDay()+6)%7;from.setUTCDate(from.getUTCDate()-day);to=new Date(from);to.setUTCDate(to.getUTCDate()+6)}else if(d.periodType==='monthly'){from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),1));to=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0))}
  const fromDate=from.toISOString().slice(0,10),toDate=to.toISOString().slice(0,10),exclusiveTo=new Date(to);exclusiveTo.setUTCDate(exclusiveTo.getUTCDate()+1);
  const {rows:counts}=await query(`SELECT feature,count(*)::int count,count(DISTINCT user_id)::int users FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date GROUP BY feature ORDER BY feature`,[fromDate,exclusiveTo.toISOString().slice(0,10)]);
  const snapshot={featureCounts:counts,generatedAt:new Date().toISOString()};
  const {rows}=await query(`INSERT INTO activity_audit_reviews(period_type,period_from,period_to,conclusion,summary,next_action,next_review_date,snapshot,reviewed_by) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,$8,$9) RETURNING *`,[d.periodType,fromDate,toDate,d.conclusion,d.summary,d.nextAction,d.nextReviewDate||null,JSON.stringify(snapshot),req.user.id]);
  await audit(req,'create','activity-audit-review',rows[0].id,{periodType:d.periodType,periodFrom:fromDate,periodTo:toDate,conclusion:d.conclusion});res.status(201).json({review:rows[0]});
});


// Part 228: audit approval, monitoring access review, retention preview and report scheduling
app.patch('/api/admin/activity-audit-reviews/:id/approval',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['approved','returned']),note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});
  const {rows}=await query(`UPDATE activity_audit_reviews SET approval_status=$1,approval_note=NULLIF($2,''),approved_by=$3,approved_at=now(),updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.status,parsed.data.note,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'監査レビューが見つかりません。'});
  await audit(req,parsed.data.status==='approved'?'approve':'return','activity-audit-review',req.params.id,{note:parsed.data.note});res.json({review:rows[0]});
});
app.get('/api/admin/activity-monitoring-access-log',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT a.*,u.login_id,u.display_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.entity_type IN ('user-activity','daily-usage','usage-period','activity-audit-reviews','activity-audit-review','activity-retention-policy','activity-alert-case') OR a.action IN ('review-user-activity','review-daily-usage','review-usage-period') ORDER BY a.created_at DESC LIMIT 500`);
  await audit(req,'review','activity-monitoring-access-log','list',{resultCount:rows.length});res.json({logs:rows});
});
app.get('/api/admin/activity-retention-preview',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows:policies}=await query(`SELECT * FROM activity_retention_policy WHERE id=1`);const p=policies[0]||{event_retention_days:365,report_retention_days:1095};
  const {rows:c}=await query(`SELECT (SELECT count(*)::bigint FROM user_activity_events WHERE occurred_at < now()-($1 || ' days')::interval) events,(SELECT count(*)::bigint FROM activity_audit_reviews WHERE created_at < now()-($2 || ' days')::interval) reviews,(SELECT count(*)::bigint FROM activity_alert_cases WHERE created_at < now()-($2 || ' days')::interval) alert_cases`,[String(p.event_retention_days),String(p.report_retention_days)]);
  const cutoffs={events:new Date(Date.now()-p.event_retention_days*86400000).toISOString().slice(0,10),reports:new Date(Date.now()-p.report_retention_days*86400000).toISOString().slice(0,10)};
  await audit(req,'preview','activity-retention','current',{cutoffs,counts:c[0]});res.json({policy:p,cutoffs,counts:{events:Number(c[0].events),reviews:Number(c[0].reviews),alertCases:Number(c[0].alert_cases)}});
});
app.post('/api/admin/activity-retention-previews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認メモを確認してください。'});
  const {rows:policies}=await query(`SELECT * FROM activity_retention_policy WHERE id=1`);const p=policies[0]||{event_retention_days:365,report_retention_days:1095};
  const eventCutoff=new Date(Date.now()-p.event_retention_days*86400000).toISOString().slice(0,10),reportCutoff=new Date(Date.now()-p.report_retention_days*86400000).toISOString().slice(0,10);
  const {rows:c}=await query(`SELECT (SELECT count(*)::bigint FROM user_activity_events WHERE occurred_at < $1::date) events,(SELECT count(*)::bigint FROM activity_audit_reviews WHERE created_at < $2::date) reviews,(SELECT count(*)::bigint FROM activity_alert_cases WHERE created_at < $2::date) alert_cases`,[eventCutoff,reportCutoff]);
  const {rows}=await query(`INSERT INTO activity_retention_previews(event_cutoff,report_cutoff,event_count,review_count,alert_case_count,note,created_by) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7) RETURNING *`,[eventCutoff,reportCutoff,c[0].events,c[0].reviews,c[0].alert_cases,parsed.data.note,req.user.id]);await audit(req,'create','activity-retention-preview',rows[0].id,{eventCutoff,reportCutoff});res.status(201).json({preview:rows[0]});
});
app.get('/api/admin/activity-report-schedules',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const {rows}=await query(`SELECT s.*,u.display_name created_by_name FROM activity_report_schedules s LEFT JOIN users u ON u.id=s.created_by ORDER BY s.created_at DESC`);await audit(req,'review','activity-report-schedules','list',{resultCount:rows.length});res.json({schedules:rows});});
app.post('/api/admin/activity-report-schedules',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({reportType:z.enum(['weekly','monthly']),deliveryDay:z.number().int().min(1).max(31),reportScope:z.enum(['summary','summary-and-alerts','full-audit']),nextRunDate:z.string().date().nullable().optional(),recipientNote:z.string().max(2000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'定期レポート設定を確認してください。'});const d=parsed.data;const {rows}=await query(`INSERT INTO activity_report_schedules(report_type,delivery_day,report_scope,next_run_date,recipient_note,created_by,updated_by) VALUES($1,$2,$3,$4,NULLIF($5,''),$6,$6) RETURNING *`,[d.reportType,d.deliveryDay,d.reportScope,d.nextRunDate||null,d.recipientNote,req.user.id]);await audit(req,'create','activity-report-schedule',rows[0].id,{reportType:d.reportType});res.status(201).json({schedule:rows[0]});});
app.patch('/api/admin/activity-report-schedules/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{const schema=z.object({isEnabled:z.boolean()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'設定内容を確認してください。'});const {rows}=await query(`UPDATE activity_report_schedules SET is_enabled=$1,updated_by=$2,updated_at=now() WHERE id=$3 RETURNING *`,[parsed.data.isEnabled,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'設定が見つかりません。'});await audit(req,'update','activity-report-schedule',req.params.id,{isEnabled:parsed.data.isEnabled});res.json({schedule:rows[0]});});



// Part 229: audit operations summary, controlled retention requests and report runs
app.get('/api/admin/activity-audit-operations-summary',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT
    (SELECT count(*)::int FROM activity_alert_cases WHERE status IN ('open','reviewing')) open_alerts,
    (SELECT count(*)::int FROM activity_alert_cases WHERE status IN ('open','reviewing') AND due_at IS NOT NULL AND due_at < now()) overdue_alerts,
    (SELECT count(*)::int FROM activity_audit_reviews WHERE approval_status='pending') pending_reviews,
    (SELECT count(*)::int FROM activity_retention_disposal_requests WHERE status='pending') pending_disposals,
    (SELECT count(*)::int FROM activity_report_schedules WHERE is_enabled=true AND next_run_date IS NOT NULL AND next_run_date <= current_date) due_reports`);
  await audit(req,'review','activity-audit-operations-summary','current',rows[0]);res.json({summary:rows[0]});
});
app.get('/api/admin/activity-retention-disposal-requests',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT r.*,u.display_name requested_by_name,d.display_name decided_by_name FROM activity_retention_disposal_requests r JOIN users u ON u.id=r.requested_by LEFT JOIN users d ON d.id=r.decided_by ORDER BY r.requested_at DESC LIMIT 200`);
  await audit(req,'review','activity-retention-disposal-requests','list',{resultCount:rows.length});res.json({requests:rows});
});
app.post('/api/admin/activity-retention-disposal-requests',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reason:z.string().min(1).max(5000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'整理申請の理由を入力してください。'});
  const {rows:policies}=await query(`SELECT * FROM activity_retention_policy WHERE id=1`);const p=policies[0]||{event_retention_days:365,report_retention_days:1095};
  const eventCutoff=new Date(Date.now()-p.event_retention_days*86400000).toISOString().slice(0,10),reportCutoff=new Date(Date.now()-p.report_retention_days*86400000).toISOString().slice(0,10);
  const {rows:c}=await query(`SELECT (SELECT count(*)::bigint FROM user_activity_events WHERE occurred_at < $1::date) events,(SELECT count(*)::bigint FROM activity_audit_reviews WHERE created_at < $2::date) reviews,(SELECT count(*)::bigint FROM activity_alert_cases WHERE created_at < $2::date) alert_cases`,[eventCutoff,reportCutoff]);
  const {rows}=await query(`INSERT INTO activity_retention_disposal_requests(event_cutoff,report_cutoff,event_count,review_count,alert_case_count,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[eventCutoff,reportCutoff,c[0].events,c[0].reviews,c[0].alert_cases,parsed.data.reason,req.user.id]);
  await audit(req,'request','activity-retention-disposal',rows[0].id,{eventCutoff,reportCutoff,counts:c[0]});res.status(201).json({request:rows[0]});
});
app.patch('/api/admin/activity-retention-disposal-requests/:id/decision',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['approved','rejected','cancelled']),note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'判断内容を確認してください。'});
  const {rows}=await query(`UPDATE activity_retention_disposal_requests SET status=$1,decision_note=NULLIF($2,''),decided_by=$3,decided_at=now() WHERE id=$4 AND status='pending' RETURNING *`,[parsed.data.status,parsed.data.note,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'承認待ちの整理申請が見つかりません。'});
  await audit(req,parsed.data.status,'activity-retention-disposal',req.params.id,{note:parsed.data.note});res.json({request:rows[0]});
});
app.get('/api/admin/activity-report-runs',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT r.*,u.display_name generated_by_name FROM activity_report_runs r JOIN users u ON u.id=r.generated_by ORDER BY r.generated_at DESC LIMIT 200`);await audit(req,'review','activity-report-runs','list',{resultCount:rows.length});res.json({runs:rows});
});
app.post('/api/admin/activity-report-runs/generate',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({periodType:z.enum(['weekly','monthly']),periodDate:z.string().date(),reportScope:z.enum(['summary','summary-and-alerts','full-audit'])});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'レポート条件を確認してください。'});
  const d=parsed.data,base=new Date(`${d.periodDate}T00:00:00Z`);let from=new Date(base),to=new Date(base);if(d.periodType==='weekly'){const day=(from.getUTCDay()+6)%7;from.setUTCDate(from.getUTCDate()-day);to=new Date(from);to.setUTCDate(to.getUTCDate()+6)}else{from=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),1));to=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0))};const f=from.toISOString().slice(0,10),t=to.toISOString().slice(0,10),ex=new Date(to);ex.setUTCDate(ex.getUTCDate()+1);
  const {rows:features}=await query(`SELECT feature,count(*)::int events,count(DISTINCT user_id)::int users FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date GROUP BY feature ORDER BY events DESC`,[f,ex.toISOString().slice(0,10)]);
  const {rows:summary}=await query(`SELECT count(*)::int total_events,count(DISTINCT user_id)::int active_users,count(*) FILTER(WHERE feature='auth')::int auth_events FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date`,[f,ex.toISOString().slice(0,10)]);
  let alerts=[],reviews=[];if(d.reportScope!=='summary'){({rows:alerts}=await query(`SELECT * FROM activity_alert_cases WHERE created_at >= $1::date AND created_at < $2::date ORDER BY created_at DESC`,[f,ex.toISOString().slice(0,10)]))}if(d.reportScope==='full-audit'){({rows:reviews}=await query(`SELECT * FROM activity_audit_reviews WHERE period_from <= $2::date AND period_to >= $1::date ORDER BY created_at DESC`,[f,t]))}
  const payload={generatedAt:new Date().toISOString(),period:{from:f,to:t,type:d.periodType},summary:summary[0],features,alerts,reviews,notice:'本システムの利用は任意です。'};
  const {rows}=await query(`INSERT INTO activity_report_runs(period_type,period_from,period_to,report_scope,report_payload,generated_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[d.periodType,f,t,d.reportScope,JSON.stringify(payload),req.user.id]);await audit(req,'generate','activity-report-run',rows[0].id,{periodType:d.periodType,periodFrom:f,periodTo:t,scope:d.reportScope});res.status(201).json({run:rows[0],report:payload});
});


// Part 230: completion workflow, report approval and monthly management summary
app.patch('/api/admin/activity-report-runs/:id/approval',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['approved','returned']),note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});
  const d=parsed.data;const {rows}=await query(`UPDATE activity_report_runs SET approval_status=$1,approved_by=$2,approved_at=now(),approval_note=NULLIF($3,''),status=CASE WHEN $1='approved' THEN 'approved' ELSE 'reviewed' END WHERE id=$4 RETURNING *`,[d.status,req.user.id,d.note,req.params.id]);if(!rows[0])return res.status(404).json({error:'監査レポートが見つかりません。'});
  await audit(req,d.status,'activity-report-run',req.params.id,{note:d.note});res.json({run:rows[0]});
});
app.patch('/api/admin/activity-retention-disposal-requests/:id/execute',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({executionReference:z.string().min(1).max(500),executionNote:z.string().min(1).max(5000),actualDeletion:z.boolean().optional().default(false)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'整理実行記録を確認してください。'});if(parsed.data.actualDeletion)return res.status(400).json({error:'この画面から実データ削除は実行できません。'});
  const {rows}=await query(`UPDATE activity_retention_disposal_requests SET status='executed',executed_at=now(),executed_by=$1,execution_reference=$2,execution_note=$3 WHERE id=$4 AND status='approved' RETURNING *`,[req.user.id,parsed.data.executionReference,parsed.data.executionNote,req.params.id]);if(!rows[0])return res.status(404).json({error:'承認済みの整理申請が見つかりません。'});
  await audit(req,'record-execution','activity-retention-disposal',req.params.id,{reference:parsed.data.executionReference,actualDeletion:false});res.json({request:rows[0]});
});
app.get('/api/admin/activity-monthly-management-summaries',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT s.*,g.display_name generated_by_name,a.display_name approved_by_name FROM activity_monthly_management_summaries s JOIN users g ON g.id=s.generated_by LEFT JOIN users a ON a.id=s.approved_by ORDER BY summary_month DESC LIMIT 36`);await audit(req,'review','activity-monthly-management-summaries','list',{resultCount:rows.length});res.json({summaries:rows});
});
app.post('/api/admin/activity-monthly-management-summaries',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({month:z.string().regex(/^\d{4}-\d{2}$/),conclusion:z.enum(['normal','follow-up','action-required']),managementNote:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'月次サマリーの内容を確認してください。'});const d=parsed.data,from=`${d.month}-01`;const base=new Date(`${from}T00:00:00Z`),to=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,1));const toDate=to.toISOString().slice(0,10);
  const {rows:usage}=await query(`SELECT count(*)::int total_events,count(DISTINCT user_id)::int active_users FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date`,[from,toDate]);
  const {rows:features}=await query(`SELECT feature,count(*)::int events FROM user_activity_events WHERE occurred_at >= $1::date AND occurred_at < $2::date GROUP BY feature ORDER BY events DESC`,[from,toDate]);
  const {rows:controls}=await query(`SELECT (SELECT count(*)::int FROM activity_alert_cases WHERE created_at >= $1::date AND created_at < $2::date) alert_cases,(SELECT count(*)::int FROM activity_alert_cases WHERE status IN ('open','reviewing')) open_alerts,(SELECT count(*)::int FROM activity_audit_reviews WHERE period_from < $2::date AND period_to >= $1::date) reviews,(SELECT count(*)::int FROM activity_report_runs WHERE period_from < $2::date AND period_to >= $1::date) reports`,[from,toDate]);
  const payload={month:d.month,generatedAt:new Date().toISOString(),usage:usage[0],features,controls:controls[0],notice:'本システムの利用は任意です。'};
  const {rows}=await query(`INSERT INTO activity_monthly_management_summaries(summary_month,summary_payload,conclusion,management_note,generated_by) VALUES($1,$2,$3,NULLIF($4,''),$5) ON CONFLICT(summary_month) DO UPDATE SET summary_payload=EXCLUDED.summary_payload,conclusion=EXCLUDED.conclusion,management_note=EXCLUDED.management_note,generated_by=EXCLUDED.generated_by,generated_at=now(),approved_by=NULL,approved_at=NULL,approval_note=NULL RETURNING *`,[from,JSON.stringify(payload),d.conclusion,d.managementNote,req.user.id]);await audit(req,'generate','activity-monthly-management-summary',rows[0].id,{month:d.month,conclusion:d.conclusion});res.status(201).json({summary:rows[0],report:payload});
});
app.patch('/api/admin/activity-monthly-management-summaries/:id/approval',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({note:z.string().max(5000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});const {rows}=await query(`UPDATE activity_monthly_management_summaries SET approved_by=$1,approved_at=now(),approval_note=NULLIF($2,'') WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);if(!rows[0])return res.status(404).json({error:'月次サマリーが見つかりません。'});await audit(req,'approve','activity-monthly-management-summary',req.params.id,{note:parsed.data.note});res.json({summary:rows[0]});
});



// Part 231: approved audit report distribution and evidence timeline
app.get('/api/admin/activity-report-distributions',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT d.*,r.period_type,r.period_from,r.period_to,u.display_name distributed_by_name FROM activity_report_distributions d JOIN activity_report_runs r ON r.id=d.report_run_id JOIN users u ON u.id=d.distributed_by ORDER BY d.distributed_at DESC LIMIT 300`);
  await audit(req,'review','activity-report-distributions','list',{resultCount:rows.length});res.json({distributions:rows});
});
app.post('/api/admin/activity-report-distributions',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reportRunId:z.string().uuid(),distributionMethod:z.enum(['secure-download','internal-email','meeting','other']),recipients:z.string().min(1).max(2000),purpose:z.string().min(1).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布記録を確認してください。'});const d=parsed.data;
  const approved=await query(`SELECT id FROM activity_report_runs WHERE id=$1 AND approval_status='approved'`,[d.reportRunId]);if(!approved.rows[0])return res.status(409).json({error:'承認済みの監査レポートだけを配布記録の対象にできます。'});
  const {rows}=await query(`INSERT INTO activity_report_distributions(report_run_id,distribution_method,recipients,purpose,distributed_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,[d.reportRunId,d.distributionMethod,d.recipients,d.purpose,req.user.id]);
  await audit(req,'record-distribution','activity-report-run',d.reportRunId,{distributionId:rows[0].id,distributionMethod:d.distributionMethod,recipients:d.recipients});res.status(201).json({distribution:rows[0]});
});
app.get('/api/admin/activity-audit-evidence',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT a.*,u.login_id,u.display_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.entity_type IN ('activity-report-run','activity-monthly-management-summary','activity-audit-review','activity-report-distributions','activity-retention-disposal') OR a.action IN ('generate','approve','return','record-distribution','record-execution') ORDER BY a.created_at DESC LIMIT 500`);
  await audit(req,'review','activity-audit-evidence','list',{resultCount:rows.length});res.json({logs:rows});
});



app.get('/api/admin/operations-acceptance-reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT r.*,u.display_name reviewed_by_name FROM operations_acceptance_reviews r LEFT JOIN users u ON u.id=r.reviewed_by ORDER BY r.review_date DESC,r.created_at DESC LIMIT 100`);
  await audit(req,'review','operations-acceptance-review','list',{resultCount:rows.length});
  res.json({reviews:rows});
});
app.post('/api/admin/operations-acceptance-reviews',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reviewType:z.enum(['initial','major-update','quarterly','annual']),targetVersion:z.string().max(50).optional().default(''),targetUsers:z.number().int().min(1).max(500),reviewDate:z.string().date(),overallDecision:z.enum(['hold','conditional','accepted']),domainResults:z.record(z.any()),overallNote:z.string().max(3000).optional().default(''),followUpNote:z.string().max(3000).optional().default(''),nextReviewDate:z.string().date().nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'点検記録の内容を確認してください。'});
  const d=parsed.data;const values=Object.values(d.domainResults||{});if(d.overallDecision==='accepted'&&(values.length<8||values.some(v=>v?.status!=='pass')))return res.status(400).json({error:'正式運用可には全分野の合格が必要です。'});
  const {rows}=await query(`INSERT INTO operations_acceptance_reviews(review_type,target_version,target_users,review_date,overall_decision,domain_results,overall_note,follow_up_note,next_review_date,reviewed_by) VALUES($1,NULLIF($2,''),$3,$4,$5,$6::jsonb,NULLIF($7,''),NULLIF($8,''),$9,$10) RETURNING *`,[d.reviewType,d.targetVersion,d.targetUsers,d.reviewDate,d.overallDecision,JSON.stringify(d.domainResults),d.overallNote,d.followUpNote,d.nextReviewDate||null,req.user.id]);
  await audit(req,'create','operations-acceptance-review',rows[0].id,{reviewType:d.reviewType,overallDecision:d.overallDecision,targetUsers:d.targetUsers});res.status(201).json({review:rows[0]});
});



// Part 235: operations acceptance approvals, corrective actions and period reporting
app.get('/api/admin/operations-acceptance-approvals',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT a.*,u.display_name decided_by_name FROM operations_acceptance_approvals a LEFT JOIN users u ON u.id=a.decided_by ORDER BY a.decided_at DESC LIMIT 300`);
  await audit(req,'review','operations-acceptance-approval','list',{resultCount:rows.length});res.json({approvals:rows});
});
app.post('/api/admin/operations-acceptance-approvals',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reviewId:z.string().uuid(),status:z.enum(['pending','approved','returned']),comment:z.string().max(2000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});const d=parsed.data;
  const existing=await query(`SELECT status FROM operations_acceptance_approvals WHERE review_id=$1 ORDER BY decided_at DESC LIMIT 1`,[d.reviewId]);
  if(existing.rows[0]?.status==='approved')return res.status(409).json({error:'承認済みの確定記録は変更できません。'});
  const review=await query(`SELECT id FROM operations_acceptance_reviews WHERE id=$1`,[d.reviewId]);if(!review.rows[0])return res.status(404).json({error:'点検記録が見つかりません。'});
  const {rows}=await query(`INSERT INTO operations_acceptance_approvals(review_id,status,comment,decided_by) VALUES($1,$2,NULLIF($3,''),$4) RETURNING *`,[d.reviewId,d.status,d.comment,req.user.id]);
  await audit(req,d.status==='approved'?'approve':d.status==='returned'?'return':'review','operations-acceptance-review',d.reviewId,{approvalId:rows[0].id,comment:d.comment});res.status(201).json({approval:rows[0]});
});
app.get('/api/admin/operations-acceptance-corrective-actions',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT c.*,u.display_name created_by_name FROM operations_acceptance_corrective_actions c LEFT JOIN users u ON u.id=c.created_by ORDER BY CASE WHEN c.status='completed' THEN 1 ELSE 0 END,c.due_date NULLS LAST,c.created_at DESC LIMIT 500`);
  await audit(req,'review','operations-acceptance-corrective-action','list',{resultCount:rows.length});res.json({actions:rows});
});
app.post('/api/admin/operations-acceptance-corrective-actions',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reviewId:z.string().uuid().nullable().optional(),priority:z.enum(['normal','high','urgent']),dueDate:z.string().date().nullable().optional(),status:z.enum(['open','working','completed']),detail:z.string().min(1).max(2500),completionEvidence:z.string().max(2500).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'是正対応の内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operations_acceptance_corrective_actions(review_id,priority,due_date,status,detail,completion_evidence,created_by,completed_at) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),$7,CASE WHEN $4='completed' THEN now() ELSE NULL END) RETURNING *`,[d.reviewId||null,d.priority,d.dueDate||null,d.status,d.detail,d.completionEvidence,req.user.id]);
  await audit(req,'create','operations-acceptance-corrective-action',rows[0].id,{reviewId:d.reviewId||null,priority:d.priority,status:d.status,dueDate:d.dueDate||null});res.status(201).json({action:rows[0]});
});
app.patch('/api/admin/operations-acceptance-corrective-actions/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['open','working','completed']),completionEvidence:z.string().max(2500).optional().default(''),dueDate:z.string().date().nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'更新内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`UPDATE operations_acceptance_corrective_actions SET status=$1,completion_evidence=NULLIF($2,''),due_date=COALESCE($3,due_date),completed_at=CASE WHEN $1='completed' THEN COALESCE(completed_at,now()) ELSE NULL END WHERE id=$4 RETURNING *`,[d.status,d.completionEvidence,d.dueDate||null,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'是正対応が見つかりません。'});await audit(req,'update','operations-acceptance-corrective-action',req.params.id,{status:d.status,dueDate:d.dueDate||null});res.json({action:rows[0]});
});
app.get('/api/admin/operations-acceptance-summary',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const year=Math.min(2100,Math.max(2020,Number(req.query.year)||new Date().getFullYear()));const periodType=req.query.periodType==='annual'?'annual':'quarterly';const quarter=Math.min(4,Math.max(1,Number(req.query.quarter)||1));
  const startMonth=periodType==='annual'?1:(quarter-1)*3+1;const endMonth=periodType==='annual'?12:startMonth+2;
  const from=`${year}-${String(startMonth).padStart(2,'0')}-01`;const to=new Date(Date.UTC(year,endMonth,0)).toISOString().slice(0,10);
  const reviewRows=await query(`SELECT r.*,a.status approval_status FROM operations_acceptance_reviews r LEFT JOIN LATERAL (SELECT status FROM operations_acceptance_approvals WHERE review_id=r.id ORDER BY decided_at DESC LIMIT 1) a ON true WHERE r.review_date BETWEEN $1 AND $2 ORDER BY r.review_date`,[from,to]);
  const correctiveRows=await query(`SELECT c.* FROM operations_acceptance_corrective_actions c LEFT JOIN operations_acceptance_reviews r ON r.id=c.review_id WHERE (r.review_date BETWEEN $1 AND $2) OR c.review_id IS NULL`,[from,to]);
  const summary={reviewCount:reviewRows.rows.length,approvedCount:reviewRows.rows.filter(x=>x.approval_status==='approved').length,acceptedCount:reviewRows.rows.filter(x=>x.overall_decision==='accepted').length,correctiveCount:correctiveRows.rows.length,openCorrectiveCount:correctiveRows.rows.filter(x=>x.status!=='completed').length,overdueCorrectiveCount:correctiveRows.rows.filter(x=>x.status!=='completed'&&x.due_date&&String(x.due_date).slice(0,10)<new Date().toISOString().slice(0,10)).length};
  await audit(req,'review','operations-acceptance-period-summary',`${periodType}-${year}-${periodType==='quarterly'?quarter:'all'}`,summary);res.json({period:{periodType,year,quarter:periodType==='quarterly'?quarter:null,from,to},summary,reviews:reviewRows.rows,correctiveActions:correctiveRows.rows});
});
app.post('/api/admin/operations-acceptance-period-reports',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({periodType:z.enum(['quarterly','annual']),periodYear:z.number().int().min(2020).max(2100),periodQuarter:z.number().int().min(1).max(4).nullable().optional(),periodFrom:z.string().date(),periodTo:z.string().date(),summary:z.record(z.any())});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'期間レポートを確認してください。'});const d=parsed.data;if(d.periodType==='quarterly'&&!d.periodQuarter)return res.status(400).json({error:'四半期を指定してください。'});
  const {rows}=await query(`INSERT INTO operations_acceptance_period_reports(period_type,period_year,period_quarter,period_from,period_to,summary,generated_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT (period_type,period_year,(COALESCE(period_quarter,0))) DO UPDATE SET period_from=EXCLUDED.period_from,period_to=EXCLUDED.period_to,summary=EXCLUDED.summary,generated_by=EXCLUDED.generated_by,generated_at=now() RETURNING *`,[d.periodType,d.periodYear,d.periodType==='quarterly'?d.periodQuarter:null,d.periodFrom,d.periodTo,JSON.stringify(d.summary),req.user.id]);
  await audit(req,'generate','operations-acceptance-period-report',rows[0].id,{periodType:d.periodType,periodYear:d.periodYear,periodQuarter:d.periodQuarter||null});res.status(201).json({report:rows[0]});
});


// Part 236: improvement plans and annual closing
app.get('/api/admin/operations-acceptance-improvement-plans',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT p.*,u.display_name created_by_name FROM operations_acceptance_improvement_plans p LEFT JOIN users u ON u.id=p.created_by ORDER BY CASE WHEN p.status='completed' THEN 1 ELSE 0 END,p.due_date NULLS LAST,p.created_at DESC LIMIT 500`);
  await audit(req,'review','operations-acceptance-improvement-plan','list',{resultCount:rows.length});res.json({plans:rows});
});
app.post('/api/admin/operations-acceptance-improvement-plans',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({reviewId:z.string().uuid().nullable().optional(),category:z.enum(['operation','security','data','training','performance','other']),ownerName:z.string().max(100).optional().default(''),dueDate:z.string().date().nullable().optional(),status:z.enum(['planned','working','completed','carried-over']),detail:z.string().min(1).max(3000),completionEvidence:z.string().max(3000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'改善計画の内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operations_acceptance_improvement_plans(review_id,category,owner_name,due_date,status,detail,completion_evidence,created_by,completed_at) VALUES($1,$2,NULLIF($3,''),$4,$5,$6,NULLIF($7,''),$8,CASE WHEN $5='completed' THEN now() ELSE NULL END) RETURNING *`,[d.reviewId||null,d.category,d.ownerName,d.dueDate||null,d.status,d.detail,d.completionEvidence,req.user.id]);
  await audit(req,'create','operations-acceptance-improvement-plan',rows[0].id,{reviewId:d.reviewId||null,category:d.category,status:d.status,dueDate:d.dueDate||null});res.status(201).json({plan:rows[0]});
});
app.patch('/api/admin/operations-acceptance-improvement-plans/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['planned','working','completed','carried-over']),ownerName:z.string().max(100).optional().default(''),dueDate:z.string().date().nullable().optional(),completionEvidence:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'更新内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`UPDATE operations_acceptance_improvement_plans SET status=$1,owner_name=NULLIF($2,''),due_date=$3,completion_evidence=NULLIF($4,''),completed_at=CASE WHEN $1='completed' THEN COALESCE(completed_at,now()) ELSE NULL END,updated_at=now() WHERE id=$5 RETURNING *`,[d.status,d.ownerName,d.dueDate||null,d.completionEvidence,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'改善計画が見つかりません。'});await audit(req,'update','operations-acceptance-improvement-plan',req.params.id,{status:d.status,dueDate:d.dueDate||null});res.json({plan:rows[0]});
});
app.get('/api/admin/operations-acceptance-annual-closings',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT c.*,u.display_name created_by_name FROM operations_acceptance_annual_closings c LEFT JOIN users u ON u.id=c.created_by ORDER BY c.closing_year DESC`);await audit(req,'review','operations-acceptance-annual-closing','list',{resultCount:rows.length});res.json({closings:rows});
});
app.post('/api/admin/operations-acceptance-annual-closings',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({closingYear:z.number().int().min(2020).max(2100),overallDecision:z.enum(['stable','observe','improvement-required']),annualSummary:z.record(z.any()),closingNote:z.string().max(4000).optional().default(''),carryOverNote:z.string().max(4000).optional().default(''),nextReviewDate:z.string().date().nullable().optional()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'年度総括の内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operations_acceptance_annual_closings(closing_year,overall_decision,annual_summary,closing_note,carry_over_note,next_review_date,created_by) VALUES($1,$2,$3::jsonb,NULLIF($4,''),NULLIF($5,''),$6,$7) ON CONFLICT (closing_year) DO UPDATE SET overall_decision=EXCLUDED.overall_decision,annual_summary=EXCLUDED.annual_summary,closing_note=EXCLUDED.closing_note,carry_over_note=EXCLUDED.carry_over_note,next_review_date=EXCLUDED.next_review_date,created_by=EXCLUDED.created_by,updated_at=now() RETURNING *`,[d.closingYear,d.overallDecision,JSON.stringify(d.annualSummary),d.closingNote,d.carryOverNote,d.nextReviewDate||null,req.user.id]);
  await audit(req,'save','operations-acceptance-annual-closing',rows[0].id,{closingYear:d.closingYear,overallDecision:d.overallDecision});res.status(201).json({closing:rows[0]});
});


// Part 237: improvement dashboard, progress history and handoff export
app.get('/api/admin/operations-acceptance-improvement-dashboard',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT p.*,u.display_name created_by_name FROM operations_acceptance_improvement_plans p LEFT JOIN users u ON u.id=p.created_by ORDER BY CASE WHEN p.status='completed' THEN 1 ELSE 0 END,p.due_date NULLS LAST,p.created_at DESC LIMIT 1000`);
  const today=new Date().toISOString().slice(0,10);const limit=new Date();limit.setDate(limit.getDate()+30);const soon=limit.toISOString().slice(0,10);
  const active=rows.filter(x=>x.status!=='completed');const summary={total:rows.length,active:active.length,overdue:active.filter(x=>x.due_date&&String(x.due_date).slice(0,10)<today).length,carriedOver:rows.filter(x=>x.status==='carried-over').length,unassigned:active.filter(x=>!x.owner_name).length,dueWithin30Days:active.filter(x=>x.due_date&&String(x.due_date).slice(0,10)>=today&&String(x.due_date).slice(0,10)<=soon).length};
  await audit(req,'review','operations-acceptance-improvement-dashboard','summary',summary);res.json({summary,plans:rows});
});
app.post('/api/admin/operations-acceptance-improvement-handoffs',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({targetYear:z.number().int().min(2020).max(2100),summary:z.record(z.any()),handoffPayload:z.record(z.any())});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'引継ぎ内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operations_acceptance_handoff_exports(target_year,summary,handoff_payload,generated_by) VALUES($1,$2::jsonb,$3::jsonb,$4) RETURNING *`,[d.targetYear,JSON.stringify(d.summary),JSON.stringify(d.handoffPayload),req.user.id]);
  await audit(req,'export','operations-acceptance-improvement-handoff',rows[0].id,{targetYear:d.targetYear,summary:d.summary});res.status(201).json({handoff:rows[0]});
});


// Part 503: central storage, immutable correction history, human approval and backup operations.
const regulationUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024, files: 1 } });

app.get('/api/auth/permissions', authenticate, (req,res) => {
  const operational = rolePermissionSnapshot()[req.user.role] || [];
  const ui = {
    guest: { dangerousGoods:true, regulations:true, references:true, applications:false, photos:false, documents:false, administration:false },
    'office-user': { dangerousGoods:true, regulations:true, references:true, applications:true, photos:true, documents:true, administration:false },
    'office-admin': { dangerousGoods:true, regulations:true, references:true, applications:true, photos:true, documents:true, administration:'office' },
    'safety-environment-staff': { dangerousGoods:true, regulations:true, references:true, applications:'read-all', photos:'read-all', documents:'read-all', regulationReview:true, administration:false },
    'safety-environment-director': { dangerousGoods:true, regulations:true, references:true, applications:'write-all', photos:'write-all', documents:'write-all', regulationReview:true, regulationApproval:true, administration:false },
    'safety-environment-admin': { dangerousGoods:true, regulations:true, references:true, applications:'write-all', photos:'write-all', documents:'write-all', regulationReview:true, regulationApproval:true, regulationPublish:true, administration:true },
    validator: { dangerousGoods:false, regulations:false, references:true, applications:false, photos:false, documents:false, validation:true },
    'revision-validator': { dangerousGoods:true, regulations:true, references:true, applications:false, photos:false, documents:false, regulationReview:true }
  };
  res.json({role:req.user.role,officeId:req.user.office_id || null,permissions:ui[req.user.role] || {},serverPermissions:operational});
});

app.post('/api/regulation-sources', authenticate, requireRole('safety-environment-staff','safety-environment-director','safety-environment-admin','revision-validator'), regulationUpload.single('source'), async (req,res) => {
  const schema=z.object({regulationId:z.string().min(1).max(150),editionLabel:z.string().min(1).max(150),publicationDate:z.string().date().nullable().optional(),effectiveFrom:z.string().date(),effectiveTo:z.string().date().nullable().optional(),language:z.string().max(10).default('ja'),publisher:z.string().max(200).default(''),sourceUrl:z.string().max(1000).default(''),changeSummary:z.string().max(5000).default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success||!req.file)return res.status(400).json({error:'原典ファイルと版情報を確認してください。'});
  const sha256=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const ext=path.extname(req.file.originalname)||'.pdf';const storageKey=createStorageKey(`regulations/sources/${parsed.data.regulationId}`,ext);
  await objectStorage.put(storageKey,req.file.buffer,{contentType:req.file.mimetype||'application/pdf',sha256});
  try{
    const {rows}=await query(`INSERT INTO regulation_sources(regulation_id,edition_label,publication_date,effective_from,effective_to,language,publisher,source_url,original_file_name,stored_file_name,storage_key,storage_provider,mime_type,file_size,checksum_sha256,status,change_summary,created_by)
      VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11,$12,$13,$14,$15,'source-registered',$16,$17) RETURNING *`,[parsed.data.regulationId,parsed.data.editionLabel,parsed.data.publicationDate||null,parsed.data.effectiveFrom,parsed.data.effectiveTo||null,parsed.data.language,parsed.data.publisher,parsed.data.sourceUrl,req.file.originalname,storageKey.split('/').pop(),storageKey,objectStorage.provider,req.file.mimetype||'application/pdf',req.file.size,sha256,parsed.data.changeSummary,req.user.id]);
    await audit(req,'register-source','regulation-source',rows[0].id,{regulationId:parsed.data.regulationId,editionLabel:parsed.data.editionLabel,sha256,storageProvider:objectStorage.provider});
    res.status(201).json({source:rows[0]});
  }catch(error){await objectStorage.delete(storageKey).catch(()=>{});throw error;}
});

app.get('/api/regulation-sources/:id/content',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const {rows}=await query('SELECT * FROM regulation_sources WHERE id=$1',[req.params.id]);const source=rows[0];if(!source)return res.status(404).json({error:'法令原典が見つかりません。'});
  const body=await objectStorage.get(source.storage_key||source.stored_file_name);const actual=crypto.createHash('sha256').update(body).digest('hex');if(actual!==source.checksum_sha256)return res.status(409).json({error:'法令原典のチェックサムが一致しません。'});
  res.setHeader('Content-Type',source.mime_type||'application/pdf');res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(source.original_file_name)}`);res.setHeader('Cache-Control','private, no-store');res.send(body);
});

app.post('/api/regulation-datasets',authenticate,requireRole('safety-environment-staff','safety-environment-director','safety-environment-admin','revision-validator'),regulationUpload.single('dataset'),async(req,res)=>{
  const schema=z.object({sourceId:z.string().uuid(),schemaVersion:z.string().min(1).max(50),dataFormat:z.enum(['json','csv']),recordCount:z.coerce.number().int().min(0).optional(),targetKeys:z.string().default('[]')});const parsed=schema.safeParse(req.body);if(!parsed.success||!req.file)return res.status(400).json({error:'更新データを確認してください。'});
  let targetKeys=[];try{targetKeys=JSON.parse(parsed.data.targetKeys||'[]');if(!Array.isArray(targetKeys))throw new Error();}catch{return res.status(400).json({error:'対象キーの形式が正しくありません。'});}
  const sha256=crypto.createHash('sha256').update(req.file.buffer).digest('hex');const ext=parsed.data.dataFormat==='csv'?'.csv':'.json';const storageKey=createStorageKey(`regulations/datasets/${parsed.data.sourceId}`,ext);await objectStorage.put(storageKey,req.file.buffer,{contentType:req.file.mimetype||'application/octet-stream',sha256});
  try{const {rows}=await query(`INSERT INTO regulation_datasets(source_id,schema_version,data_format,target_keys,original_file_name,stored_file_name,storage_key,storage_provider,file_size,checksum_sha256,record_count,validation_status,created_by)
    VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,'pending',$12) RETURNING *`,[parsed.data.sourceId,parsed.data.schemaVersion,parsed.data.dataFormat,JSON.stringify(targetKeys),req.file.originalname,storageKey.split('/').pop(),storageKey,objectStorage.provider,req.file.size,sha256,parsed.data.recordCount??null,req.user.id]);await audit(req,'register-dataset','regulation-dataset',rows[0].id,{sourceId:parsed.data.sourceId,sha256});res.status(201).json({dataset:rows[0]});}catch(error){await objectStorage.delete(storageKey).catch(()=>{});throw error;}
});

app.post('/api/regulation-change-sets',authenticate,requireRole('safety-environment-staff','safety-environment-director','safety-environment-admin','revision-validator'),async(req,res)=>{
  const schema=z.object({sourceId:z.string().uuid(),datasetId:z.string().uuid().nullable().optional(),baseSourceId:z.string().uuid().nullable().optional(),addedCount:z.number().int().min(0).default(0),changedCount:z.number().int().min(0).default(0),deletedCount:z.number().int().min(0).default(0),diffSummary:z.record(z.any()).default({}),reviewChecklist:z.array(z.any()).default([]),sourcePageReferences:z.array(z.any()).default([]),deletionJustification:z.string().max(5000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'変更セットの内容を確認してください。'});const d=parsed.data;
  if(d.deletedCount>0&&!d.deletionJustification.trim())return res.status(400).json({error:'削除を含む場合は削除理由が必要です。'});
  const checksum=crypto.createHash('sha256').update(JSON.stringify({sourceId:d.sourceId,datasetId:d.datasetId,baseSourceId:d.baseSourceId,diffSummary:d.diffSummary})).digest('hex');
  const {rows}=await query(`INSERT INTO regulation_change_sets(source_id,dataset_id,base_source_id,added_count,changed_count,deleted_count,diff_summary,status,created_by,review_checklist,source_page_references,deletion_justification,diff_checksum_sha256)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'draft',$8,$9::jsonb,$10::jsonb,NULLIF($11,''),$12) RETURNING *`,[d.sourceId,d.datasetId||null,d.baseSourceId||null,d.addedCount,d.changedCount,d.deletedCount,JSON.stringify(d.diffSummary),req.user.id,JSON.stringify(d.reviewChecklist),JSON.stringify(d.sourcePageReferences),d.deletionJustification,checksum]);
  await audit(req,'create','regulation-change-set',rows[0].id,{sourceId:d.sourceId,checksum});res.status(201).json({changeSet:rows[0]});
});

app.get('/api/regulation-change-sets',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const values=[];let where='1=1';if(req.query.status){values.push(String(req.query.status));where+=` AND c.status=$${values.length}`;}
  const {rows}=await query(`SELECT c.*,s.regulation_id,s.edition_label,s.checksum_sha256 source_checksum,creator.display_name created_by_name,reviewer.display_name reviewed_by_name,approver.display_name approved_by_name
    FROM regulation_change_sets c JOIN regulation_sources s ON s.id=c.source_id LEFT JOIN users creator ON creator.id=c.created_by LEFT JOIN users reviewer ON reviewer.id=c.reviewed_by LEFT JOIN users approver ON approver.id=c.approved_by WHERE ${where} ORDER BY c.created_at DESC LIMIT 500`,values);res.json({changeSets:rows});
});

app.get('/api/regulation-change-sets/:id/events',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const {rows}=await query(`SELECT e.*,u.display_name actor_name,u.login_id actor_login FROM regulation_approval_events e JOIN users u ON u.id=e.actor_user_id WHERE e.change_set_id=$1 ORDER BY e.created_at`,[req.params.id]);res.json({events:rows});
});

app.post('/api/regulation-change-sets/:id/submit',authenticate,requireRole('safety-environment-staff','safety-environment-director','safety-environment-admin','revision-validator'),async(req,res)=>{
  const schema=z.object({comment:z.string().max(3000).default('')});const parsed=schema.safeParse(req.body||{});if(!parsed.success)return res.status(400).json({error:'提出内容を確認してください。'});
  const {rows}=await query(`UPDATE regulation_change_sets SET status='submitted',submitted_by=$1,submitted_at=now() WHERE id=$2 AND status IN ('draft','returned') RETURNING *`,[req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'この変更セットは提出できる状態ではありません。'});
  await query(`INSERT INTO regulation_approval_events(change_set_id,event_type,actor_user_id,actor_role,comment,checklist,source_checksums) SELECT c.id,'submitted',$1,$2,$3,c.review_checklist,jsonb_build_object('diff',c.diff_checksum_sha256,'source',s.checksum_sha256) FROM regulation_change_sets c JOIN regulation_sources s ON s.id=c.source_id WHERE c.id=$4`,[req.user.id,req.user.role,parsed.data.comment,req.params.id]);await audit(req,'submit','regulation-change-set',req.params.id,{comment:parsed.data.comment});res.json({changeSet:rows[0]});
});

app.post('/api/regulation-change-sets/:id/review',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const schema=z.object({decision:z.enum(['reviewed','returned']),comment:z.string().min(1).max(5000),checklist:z.array(z.object({item:z.string().min(1),passed:z.boolean(),note:z.string().max(1000).optional()})).min(1)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'原典照合結果を確認してください。'});if(parsed.data.decision==='reviewed'&&parsed.data.checklist.some(x=>!x.passed))return res.status(400).json({error:'未合格の照合項目があるため照合済みにできません。'});
  const current=await query('SELECT * FROM regulation_change_sets WHERE id=$1',[req.params.id]);if(!current.rows[0])return res.status(404).json({error:'変更セットが見つかりません。'});requireDistinctRegulationActors(current.rows[0],req.user.id,'review');if(!['submitted','returned'].includes(current.rows[0].status))return res.status(409).json({error:'提出済みの変更セットだけを照合できます。'});
  const {rows}=await query(`UPDATE regulation_change_sets SET status=$1,reviewed_by=CASE WHEN $1='reviewed' THEN $2 ELSE NULL END,reviewed_at=CASE WHEN $1='reviewed' THEN now() ELSE NULL END,publication_block_reason=CASE WHEN $1='returned' THEN $3 ELSE NULL END,review_checklist=$4::jsonb WHERE id=$5 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.comment,JSON.stringify(parsed.data.checklist),req.params.id]);
  await query(`INSERT INTO regulation_approval_events(change_set_id,event_type,actor_user_id,actor_role,comment,checklist) VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[req.params.id,parsed.data.decision,req.user.id,req.user.role,parsed.data.comment,JSON.stringify(parsed.data.checklist)]);await audit(req,parsed.data.decision,'regulation-change-set',req.params.id,{comment:parsed.data.comment});res.json({changeSet:rows[0]});
});

app.post('/api/regulation-change-sets/:id/approve',authenticate,requireRole('safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const schema=z.object({decision:z.enum(['approved','rejected']),comment:z.string().min(1).max(5000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});
  const current=await query('SELECT * FROM regulation_change_sets WHERE id=$1',[req.params.id]);if(!current.rows[0])return res.status(404).json({error:'変更セットが見つかりません。'});requireDistinctRegulationActors(current.rows[0],req.user.id,'approve');if(current.rows[0].status!=='reviewed')return res.status(409).json({error:'原典照合済みの変更セットだけを承認できます。'});
  const {rows}=await query(`UPDATE regulation_change_sets SET status=$1,approved_by=CASE WHEN $1='approved' THEN $2 ELSE NULL END,approved_at=CASE WHEN $1='approved' THEN now() ELSE NULL END,approval_comment=$3,publication_block_reason=CASE WHEN $1='rejected' THEN $3 ELSE NULL END WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.comment,req.params.id]);
  await query(`INSERT INTO regulation_approval_events(change_set_id,event_type,actor_user_id,actor_role,comment) VALUES($1,$2,$3,$4,$5)`,[req.params.id,parsed.data.decision,req.user.id,req.user.role,parsed.data.comment]);await audit(req,parsed.data.decision==='approved'?'approve':'reject','regulation-change-set',req.params.id,{comment:parsed.data.comment});res.json({changeSet:rows[0]});
});

app.post('/api/regulation-change-sets/:id/publish',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({releaseVersion:z.string().min(1).max(100),effectiveFrom:z.string().date()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'公開版情報を確認してください。'});
  const published=await transaction(async client=>{const current=await client.query(`SELECT c.*,s.regulation_id FROM regulation_change_sets c JOIN regulation_sources s ON s.id=c.source_id WHERE c.id=$1 FOR UPDATE`,[req.params.id]);const row=current.rows[0];if(!row)throw Object.assign(new Error('変更セットが見つかりません。'),{status:404});if(row.status!=='approved'||!row.reviewed_by||!row.approved_by)throw Object.assign(new Error('照合・承認済みの変更セットだけを公開できます。'),{status:409});if([row.created_by,row.reviewed_by,row.approved_by].map(String).some((v,i,a)=>a.indexOf(v)!==i))throw Object.assign(new Error('作成・照合・承認は別の利用者が行う必要があります。'),{status:409});
    const previous=await client.query(`SELECT id FROM regulation_publications WHERE regulation_id=$1 ORDER BY published_at DESC LIMIT 1`,[row.regulation_id]);const pub=await client.query(`INSERT INTO regulation_publications(change_set_id,regulation_id,effective_from,release_version,previous_publication_id,published_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[row.id,row.regulation_id,parsed.data.effectiveFrom,parsed.data.releaseVersion,previous.rows[0]?.id||null,req.user.id]);await client.query(`UPDATE regulation_change_sets SET status='published',published_by=$1,published_at=now() WHERE id=$2`,[req.user.id,row.id]);await client.query(`UPDATE regulation_sources SET status='published',published_at=now() WHERE id=$1`,[row.source_id]);await client.query(`INSERT INTO regulation_approval_events(change_set_id,event_type,actor_user_id,actor_role,comment) VALUES($1,'published',$2,$3,$4)`,[row.id,req.user.id,req.user.role,`release ${parsed.data.releaseVersion}`]);return pub.rows[0];});
  await audit(req,'publish','regulation-change-set',req.params.id,{releaseVersion:parsed.data.releaseVersion,effectiveFrom:parsed.data.effectiveFrom});res.status(201).json({publication:published});
});


// Part 508: item-level legal source verification, human approval and publication control.
const regulationVerificationRoles=['revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'];
const regulationVerificationChecklistKeys=['source_identity','edition_effective_date','article_table_page','numeric_values','un_code_mapping','exceptions_notes','link_destination','display_integrity'];
const regulationVerificationChecklistLabels={
  source_identity:'原典の名称・発行者・版を確認',edition_effective_date:'改正日・適用開始日を確認',article_table_page:'条文・別表・ページを確認',numeric_values:'数値・単位・上限値を確認',un_code_mapping:'国連番号・等級・コードの対応を確認',exceptions_notes:'例外・注記・脚注を確認',link_destination:'原文リンクと表示開始位置を確認',display_integrity:'PC・スマートフォンの整理表示を確認'
};
const requireDistinctVerificationActor=(row,userId,stage)=>{
  const actor=String(userId||'');
  if(stage==='verify'&&[row.prepared_by,row.submitted_by].some(v=>String(v||'')===actor))throw Object.assign(new Error('作成者または提出者本人は原典照合者になれません。'),{status:409});
  if(stage==='approve'&&[row.prepared_by,row.submitted_by,row.verified_by].some(v=>String(v||'')===actor))throw Object.assign(new Error('作成者、提出者または原典照合者本人は承認できません。'),{status:409});
};

app.get('/api/regulation-verification/summary',authenticate,requireRole(...regulationVerificationRoles),async(_req,res)=>{
  const [summary,types,statuses,lastRun]=await Promise.all([
    query('SELECT * FROM regulation_verification_summary'),
    query(`SELECT target_type,count(*)::int total,count(*) FILTER(WHERE status='approved')::int approved,count(*) FILTER(WHERE status='amendment-pending')::int amendment_pending FROM regulation_verification_items GROUP BY target_type ORDER BY target_type`),
    query(`SELECT status,count(*)::int total FROM regulation_verification_items GROUP BY status ORDER BY status`),
    query('SELECT * FROM regulation_catalog_sync_runs ORDER BY executed_at DESC LIMIT 1')
  ]);
  res.json({summary:summary.rows[0]||{total:0},types:types.rows,statuses:statuses.rows,lastCatalogRun:lastRun.rows[0]||null,policy:{prototype:'未承認情報は参考表示',production:'承認済み情報のみ正式利用',requiredChecklist:regulationVerificationChecklistKeys.map(key=>({key,label:regulationVerificationChecklistLabels[key]}))}});
});

app.post('/api/admin/regulation-verification/catalog/rebuild',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const result=await transaction(client=>syncRegulationVerificationCatalog(client,{actorId:req.user.id,sourceRelease:'part508'}));
  await audit(req,'rebuild','regulation-verification-catalog',result.run.id,result.summary);res.status(201).json(result);
});

app.get('/api/admin/regulation-verification/catalog/runs',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const {rows}=await query('SELECT r.*,u.display_name executed_by_name FROM regulation_catalog_sync_runs r LEFT JOIN users u ON u.id=r.executed_by ORDER BY executed_at DESC LIMIT 100');res.json({runs:rows});
});

app.get('/api/regulation-verification/items',authenticate,requireRole(...regulationVerificationRoles),async(req,res)=>{
  const status=String(req.query.status||'').trim();const targetType=String(req.query.targetType||'').trim();const search=String(req.query.search||'').trim();const page=Math.max(1,Number(req.query.page||1));const limit=Math.min(100,Math.max(10,Number(req.query.limit||50)));const offset=(page-1)*limit;
  const values=[];const where=['1=1'];
  if(status){values.push(status);where.push(`i.status=$${values.length}`);}if(targetType){values.push(targetType);where.push(`i.target_type=$${values.length}`);}if(search){values.push(`%${search}%`);where.push(`(i.target_key ILIKE $${values.length} OR i.display_label ILIKE $${values.length} OR i.regulation_id ILIKE $${values.length})`);}
  values.push(limit,offset);const limitNo=values.length-1,offsetNo=values.length;
  const {rows}=await query(`SELECT i.*,prep.display_name prepared_by_name,sub.display_name submitted_by_name,ver.display_name verified_by_name,appv.display_name approved_by_name,c.certificate_number,c.status certificate_status,c.valid_from,c.valid_to,COUNT(*) OVER()::int total_count
    FROM regulation_verification_items i LEFT JOIN users prep ON prep.id=i.prepared_by LEFT JOIN users sub ON sub.id=i.submitted_by LEFT JOIN users ver ON ver.id=i.verified_by LEFT JOIN users appv ON appv.id=i.approved_by
    LEFT JOIN LATERAL (SELECT certificate_number,status,valid_from,valid_to FROM regulation_approval_certificates c WHERE c.item_id=i.id ORDER BY created_at DESC LIMIT 1) c ON true
    WHERE ${where.join(' AND ')} ORDER BY CASE i.status WHEN 'amendment-pending' THEN 0 WHEN 'submitted' THEN 1 WHEN 'source-verified' THEN 2 WHEN 'returned' THEN 3 WHEN 'prepared' THEN 4 WHEN 'unverified' THEN 5 WHEN 'approved' THEN 6 ELSE 7 END,i.updated_at DESC LIMIT $${limitNo} OFFSET $${offsetNo}`,values);
  res.json({items:rows,page,limit,total:rows[0]?.total_count||0});
});

app.get('/api/regulation-verification/items/:id/events',authenticate,requireRole(...regulationVerificationRoles),async(req,res)=>{
  const {rows}=await query(`SELECT e.*,u.display_name actor_name,u.login_id actor_login FROM regulation_verification_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.item_id=$1 ORDER BY e.created_at DESC`,[req.params.id]);res.json({events:rows});
});

app.post('/api/regulation-verification/items/:id/submit',authenticate,requireRole('safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const parsed=z.object({comment:z.string().max(3000).optional().default('')}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'提出内容を確認してください。'});
  const {rows}=await query(`UPDATE regulation_verification_items SET status='submitted',submitted_by=$1,submitted_at=now(),publication_block_reason=NULL,updated_at=now() WHERE id=$2 AND status IN ('unverified','prepared','returned','amendment-pending') RETURNING *`,[req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'この項目は原典照合へ提出できる状態ではありません。'});
  await query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,actor_role,comment,source_page_references,content_checksum_sha256) VALUES($1,'submitted',$2,$3,$4,$5::jsonb,$6)`,[rows[0].id,req.user.id,req.user.role,parsed.data.comment,JSON.stringify(rows[0].source_page_references||[]),rows[0].content_checksum_sha256]);await audit(req,'submit','regulation-verification-item',rows[0].id,{comment:parsed.data.comment});res.json({item:rows[0]});
});

app.post('/api/regulation-verification/items/:id/source-verify',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const schema=z.object({comment:z.string().min(1).max(5000),sourceChecksum:z.string().regex(/^[0-9a-f]{64}$/i).nullable().optional(),sourcePageReferences:z.array(z.record(z.any())).min(1),checklist:z.array(z.object({key:z.string(),label:z.string().optional(),passed:z.boolean(),note:z.string().max(2000).optional().default('')})).min(regulationVerificationChecklistKeys.length)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'原典照合結果を確認してください。'});
  const map=new Map(parsed.data.checklist.map(x=>[x.key,x]));const missing=regulationVerificationChecklistKeys.filter(key=>!map.has(key));const failed=regulationVerificationChecklistKeys.filter(key=>!map.get(key)?.passed);if(missing.length||failed.length)return res.status(400).json({error:`必須照合項目が未完了です。${[...missing,...failed].map(key=>regulationVerificationChecklistLabels[key]||key).join('、')}`});
  const current=await query('SELECT * FROM regulation_verification_items WHERE id=$1',[req.params.id]);const row=current.rows[0];if(!row)return res.status(404).json({error:'照合対象が見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済みの項目だけを原典照合できます。'});requireDistinctVerificationActor(row,req.user.id,'verify');
  const {rows}=await query(`UPDATE regulation_verification_items SET status='source-verified',verified_by=$1,verified_at=now(),last_source_checked_at=now(),verification_checklist=$2::jsonb,verification_note=$3,source_page_references=$4::jsonb,source_checksum_sha256=COALESCE($5,source_checksum_sha256),publication_block_reason=NULL,updated_at=now() WHERE id=$6 RETURNING *`,[req.user.id,JSON.stringify(parsed.data.checklist),parsed.data.comment,JSON.stringify(parsed.data.sourcePageReferences),parsed.data.sourceChecksum||null,req.params.id]);
  await query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,actor_role,comment,checklist,source_page_references,source_checksum_sha256,content_checksum_sha256) VALUES($1,'source-verified',$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)`,[req.params.id,req.user.id,req.user.role,parsed.data.comment,JSON.stringify(parsed.data.checklist),JSON.stringify(parsed.data.sourcePageReferences),parsed.data.sourceChecksum||null,row.content_checksum_sha256]);await audit(req,'source-verify','regulation-verification-item',req.params.id,{comment:parsed.data.comment});res.json({item:rows[0]});
});

app.post('/api/regulation-verification/items/:id/return',authenticate,requireRole('revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const parsed=z.object({reason:z.string().min(1).max(5000)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'差戻し理由を入力してください。'});
  const {rows}=await query(`UPDATE regulation_verification_items SET status='returned',verified_by=NULL,verified_at=NULL,approved_by=NULL,approved_at=NULL,publication_block_reason=$1,updated_at=now() WHERE id=$2 AND status IN ('submitted','source-verified') RETURNING *`,[parsed.data.reason,req.params.id]);if(!rows[0])return res.status(409).json({error:'この項目は差し戻せる状態ではありません。'});
  await query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,actor_role,comment) VALUES($1,'returned',$2,$3,$4)`,[req.params.id,req.user.id,req.user.role,parsed.data.reason]);await audit(req,'return','regulation-verification-item',req.params.id,{reason:parsed.data.reason});res.json({item:rows[0]});
});

app.post('/api/regulation-verification/items/:id/approve',authenticate,requireRole('safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const parsed=z.object({comment:z.string().min(1).max(5000),validFrom:z.string().date().optional(),nextReviewDue:z.string().date().optional()}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認内容を確認してください。'});
  const result=await transaction(async client=>{const current=await client.query('SELECT * FROM regulation_verification_items WHERE id=$1 FOR UPDATE',[req.params.id]);const row=current.rows[0];if(!row)throw Object.assign(new Error('照合対象が見つかりません。'),{status:404});if(row.status!=='source-verified'||!row.verified_by)throw Object.assign(new Error('原典照合済みの項目だけを承認できます。'),{status:409});requireDistinctVerificationActor(row,req.user.id,'approve');
    const certificateNumber=`SK-LAW-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;const validFrom=parsed.data.validFrom||new Date().toISOString().slice(0,10);const nextReviewDue=parsed.data.nextReviewDue||null;
    const updated=await client.query(`UPDATE regulation_verification_items SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,next_review_due=$3,publication_block_reason=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[req.user.id,parsed.data.comment,nextReviewDue,row.id]);
    const certificate=await client.query(`INSERT INTO regulation_approval_certificates(item_id,certificate_number,revision_number,target_type,target_key,display_label,source_edition,source_page_references,source_checksum_sha256,content_checksum_sha256,verification_checklist,verified_by,verified_at,approved_by,valid_from)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13,$14,$15) RETURNING *`,[row.id,certificateNumber,row.revision_number,row.target_type,row.target_key,row.display_label,row.source_edition,JSON.stringify(row.source_page_references||[]),row.source_checksum_sha256,row.content_checksum_sha256,JSON.stringify(row.verification_checklist||[]),row.verified_by,row.verified_at,req.user.id,validFrom]);
    await client.query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,actor_role,comment,checklist,source_page_references,source_checksum_sha256,content_checksum_sha256) VALUES($1,'approved',$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)`,[row.id,req.user.id,req.user.role,parsed.data.comment,JSON.stringify(row.verification_checklist||[]),JSON.stringify(row.source_page_references||[]),row.source_checksum_sha256,row.content_checksum_sha256]);return {item:updated.rows[0],certificate:certificate.rows[0]};});
  await audit(req,'approve','regulation-verification-item',req.params.id,{certificateNumber:result.certificate.certificate_number});res.status(201).json(result);
});

app.post('/api/regulation-verification/items/:id/suspend',authenticate,requireRole('safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const parsed=z.object({reason:z.string().min(1).max(5000)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'使用停止理由を入力してください。'});
  const result=await transaction(async client=>{const updated=await client.query(`UPDATE regulation_verification_items SET status='suspended',publication_block_reason=$1,updated_at=now() WHERE id=$2 AND status='approved' RETURNING *`,[parsed.data.reason,req.params.id]);if(!updated.rows[0])throw Object.assign(new Error('承認済みの項目だけを使用停止できます。'),{status:409});await client.query(`UPDATE regulation_approval_certificates SET status='suspended',valid_to=current_date WHERE item_id=$1 AND status='valid'`,[req.params.id]);await client.query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,actor_role,comment) VALUES($1,'suspended',$2,$3,$4)`,[req.params.id,req.user.id,req.user.role,parsed.data.reason]);return updated.rows[0];});await audit(req,'suspend','regulation-verification-item',req.params.id,{reason:parsed.data.reason});res.json({item:result});
});

app.get('/api/public/regulation-approval-status',async(req,res)=>{
  const targetType=String(req.query.targetType||'').trim();const targetKey=String(req.query.targetKey||'').trim();if(!targetType||!targetKey)return res.status(400).json({error:'照会対象を指定してください。'});
  const {rows}=await query(`SELECT i.target_type,i.target_key,i.display_label,i.status,i.source_edition,i.last_source_checked_at,i.approved_at,i.publication_block_reason,c.certificate_number,c.valid_from,c.valid_to,c.status certificate_status
    FROM regulation_verification_items i LEFT JOIN LATERAL (SELECT * FROM regulation_approval_certificates c WHERE c.item_id=i.id ORDER BY created_at DESC LIMIT 1)c ON true WHERE i.target_type=$1 AND i.target_key=$2`,[targetType,targetKey]);const row=rows[0];if(!row)return res.json({targetType,targetKey,status:'unregistered',approved:false});res.json({...row,approved:row.status==='approved'&&row.certificate_status==='valid'});
});


// Part 509: copyright, license and internal/public publication scope governance.
const publicationReadRoles=['revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'];
const publicationWriteRoles=['revision-validator','safety-environment-staff','safety-environment-director','safety-environment-admin'];
const publicationChecklistKeys=['rights-holder','terms-license','reproduction-scope','internal-scope','public-scope','attribution','expiry-update','checksum-version'];

app.get('/api/publication-rights/summary',authenticate,requireRole(...publicationReadRoles),async(_req,res)=>{
  const summary=(await query('SELECT * FROM publication_rights_summary')).rows[0]||{};
  const latest=(await query('SELECT * FROM publication_catalog_sync_runs ORDER BY executed_at DESC LIMIT 1')).rows[0]||null;
  const scope=(await query("SELECT setting_value FROM system_runtime_settings WHERE setting_key='publication_scope'")).rows[0]?.setting_value||{mode:config.publication.defaultScope};
  res.json({summary,latestCatalogRun:latest,scope});
});
app.get('/api/publication-rights/items',authenticate,requireRole(...publicationReadRoles),async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(10,Number(req.query.pageSize)||30)),offset=(page-1)*pageSize;
  const values=[],where=[];const add=(sql,value)=>{values.push(value);where.push(sql.replace('?',`$${values.length}`));};
  if(req.query.status)add('status=?',String(req.query.status));
  if(req.query.sourceClass)add('source_class=?',String(req.query.sourceClass));
  if(req.query.riskLevel)add('risk_level=?',String(req.query.riskLevel));
  if(req.query.search){values.push(`%${String(req.query.search).trim()}%`);where.push(`(asset_key ILIKE $${values.length} OR file_path ILIKE $${values.length} OR display_label ILIKE $${values.length})`);}
  const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
  const total=Number((await query(`SELECT count(*) count FROM publication_rights_items ${clause}`,values)).rows[0]?.count||0);
  const rows=(await query(`SELECT i.*,p.display_name prepared_by_name,r.display_name reviewed_by_name,a.display_name approved_by_name
    FROM publication_rights_items i LEFT JOIN users p ON p.id=i.prepared_by LEFT JOIN users r ON r.id=i.reviewed_by LEFT JOIN users a ON a.id=i.approved_by
    ${clause} ORDER BY CASE risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,status,file_path LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,pageSize,offset])).rows;
  res.json({items:rows,total,page,pageCount:Math.max(1,Math.ceil(total/pageSize))});
});
app.post('/api/publication-rights/catalog/rebuild',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const result=await syncPublicationRightsCatalog({executedBy:req.user.id});await audit(req,'catalog-rebuild','publication-rights','part509',result);res.status(201).json(result);
});
app.post('/api/publication-rights/items/:id/submit',authenticate,requireRole(...publicationWriteRoles),async(req,res)=>{
  const schema=z.object({comment:z.string().min(1).max(5000),rightsHolder:z.string().max(500).optional().default(''),rightsBasis:z.string().max(3000).optional().default(''),licenseReference:z.string().max(1000).optional().default(''),sourceUrl:z.string().url().or(z.literal('')).optional().default(''),attributionText:z.string().max(3000).optional().default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'権利確認への提出内容を確認してください。'});const d=parsed.data;
  const rows=(await query(`UPDATE publication_rights_items SET status='submitted',rights_holder=$1,rights_basis=$2,license_reference=$3,source_url=$4,attribution_text=$5,submitted_by=$6,submitted_at=now(),review_note=$7,updated_at=now() WHERE id=$8 AND status IN ('unreviewed','prepared','returned') RETURNING *`,[d.rightsHolder,d.rightsBasis,d.licenseReference,d.sourceUrl,d.attributionText,req.user.id,d.comment,req.params.id])).rows;
  if(!rows[0])return res.status(409).json({error:'現在の状態では権利確認へ提出できません。'});
  await query(`INSERT INTO publication_rights_events(item_id,event_type,actor_user_id,actor_role,comment,checksum_sha256) VALUES($1,'submitted',$2,$3,$4,$5)`,[req.params.id,req.user.id,req.user.role,d.comment,rows[0].checksum_sha256]);await audit(req,'submit','publication-rights-item',req.params.id,{comment:d.comment});res.json({item:rows[0]});
});
app.post('/api/publication-rights/items/:id/review',authenticate,requireRole(...publicationReadRoles),async(req,res)=>{
  const schema=z.object({decision:z.enum(['reviewed','returned']),comment:z.string().min(1).max(5000),checklist:z.array(z.object({key:z.string(),checked:z.boolean(),note:z.string().max(1000).optional().default('')}))});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'権利確認内容を確認してください。'});const d=parsed.data;
  const row=(await query('SELECT * FROM publication_rights_items WHERE id=$1',[req.params.id])).rows[0];if(!row)return res.status(404).json({error:'対象資料が見つかりません。'});requireDistinctPublicationActors(row,req.user.id,'review');
  if(d.decision==='reviewed'){const checked=new Set(d.checklist.filter(x=>x.checked).map(x=>x.key));if(publicationChecklistKeys.some(key=>!checked.has(key)))return res.status(400).json({error:'8項目すべての権利・公開範囲確認が必要です。'});}
  const updated=(await query(`UPDATE publication_rights_items SET status=$1,reviewed_by=CASE WHEN $1='reviewed' THEN $2 ELSE NULL END,reviewed_at=CASE WHEN $1='reviewed' THEN now() ELSE NULL END,review_note=$3,rights_checklist=$4::jsonb,updated_at=now() WHERE id=$5 AND status='submitted' RETURNING *`,[d.decision,req.user.id,d.comment,JSON.stringify(d.checklist),req.params.id])).rows[0];if(!updated)return res.status(409).json({error:'現在の状態では権利確認を登録できません。'});
  await query(`INSERT INTO publication_rights_events(item_id,event_type,actor_user_id,actor_role,comment,checklist,checksum_sha256) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,[req.params.id,d.decision,req.user.id,req.user.role,d.comment,JSON.stringify(d.checklist),row.checksum_sha256]);await audit(req,d.decision,'publication-rights-item',req.params.id,{comment:d.comment});res.json({item:updated});
});
app.post('/api/publication-rights/items/:id/decide',authenticate,requireRole('safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const schema=z.object({decision:z.enum(['approved','restricted','metadata-only','prohibited']),allowedScopes:z.array(z.enum(['internal-authenticated','internal-restricted','public-approved'])).default([]),publicTreatment:z.enum(['full','excerpt','metadata-only','external-link-only','blocked']),comment:z.string().min(1).max(5000),rightsExpiryDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional().default(''),nextReviewDue:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'公開範囲の決定内容を確認してください。'});const d=parsed.data;
  const row=(await query('SELECT * FROM publication_rights_items WHERE id=$1',[req.params.id])).rows[0];if(!row)return res.status(404).json({error:'対象資料が見つかりません。'});requireDistinctPublicationActors(row,req.user.id,'approve');
  if(['approved','restricted','metadata-only'].includes(d.decision)&&row.status!=='reviewed')return res.status(409).json({error:'権利確認済みの資料だけを承認できます。'});
  if(['approved','restricted','metadata-only'].includes(d.decision)&&!d.allowedScopes.length)return res.status(400).json({error:'許可する利用範囲を1つ以上選択してください。'});
  if(d.allowedScopes.includes('public-approved') && !['approved','metadata-only'].includes(d.decision))return res.status(400).json({error:'外部公開範囲を許可する場合は、利用承認済みまたは書誌情報のみを選択してください。'});
  if(d.allowedScopes.includes('public-approved') && !['full','excerpt','metadata-only','external-link-only'].includes(d.publicTreatment))return res.status(400).json({error:'外部公開時の表示方法を指定してください。'});
  if(d.allowedScopes.includes('public-approved') && !String(row.rights_holder||'').trim())return res.status(400).json({error:'外部公開には権利者・発行者の確認が必要です。'});
  if(d.allowedScopes.includes('public-approved') && !String(row.rights_basis||'').trim())return res.status(400).json({error:'外部公開には利用根拠・確認条件の記録が必要です。'});
  if(d.publicTreatment==='external-link-only' && !String(row.source_url||'').trim())return res.status(400).json({error:'公式外部リンクのみとする場合は、公式URLを登録してください。'});
  const updated=(await query(`UPDATE publication_rights_items SET status=$1,allowed_scopes=$2::jsonb,public_treatment=$3,approved_by=$4,approved_at=now(),restriction_reason=$5,rights_expiry_date=NULLIF($6,'')::date,next_review_due=NULLIF($7,'')::date,last_terms_checked_at=now(),updated_at=now() WHERE id=$8 RETURNING *`,[d.decision,JSON.stringify(d.allowedScopes),d.publicTreatment,req.user.id,d.comment,d.rightsExpiryDate,d.nextReviewDue,req.params.id])).rows[0];
  await query(`INSERT INTO publication_rights_events(item_id,event_type,actor_user_id,actor_role,comment,decision_snapshot,checksum_sha256) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,[req.params.id,d.decision,req.user.id,req.user.role,d.comment,JSON.stringify({allowedScopes:d.allowedScopes,publicTreatment:d.publicTreatment,rightsExpiryDate:d.rightsExpiryDate,nextReviewDue:d.nextReviewDue}),row.checksum_sha256]);await audit(req,'decide','publication-rights-item',req.params.id,{decision:d.decision,allowedScopes:d.allowedScopes});res.json({item:updated});
});
app.get('/api/publication-rights/export',authenticate,requireRole('safety-environment-director','safety-environment-admin'),async(req,res)=>{
  const rows=(await query(`SELECT asset_key AS "assetKey",file_path AS "filePath",display_label AS "displayLabel",source_class AS "sourceClass",status,allowed_scopes AS "allowedScopes",public_treatment AS "publicTreatment",rights_holder AS "rightsHolder",rights_basis AS "rightsBasis",license_reference AS "licenseReference",source_url AS "sourceUrl",attribution_text AS "attributionText",rights_expiry_date AS "rightsExpiryDate",checksum_sha256 AS "checksumSha256",approved_at AS "approvedAt" FROM publication_rights_items ORDER BY file_path`)).rows;await audit(req,'export','publication-rights','decisions',{count:rows.length});res.json({release:'part509',exportedAt:new Date().toISOString(),items:rows});
});
app.get('/api/publication-rights/items/:id/events',authenticate,requireRole(...publicationReadRoles),async(req,res)=>{
  const rows=(await query(`SELECT e.*,u.display_name actor_name FROM publication_rights_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.item_id=$1 ORDER BY e.created_at DESC`,[req.params.id])).rows;res.json({events:rows});
});
app.get('/api/public/publication-rights-status',async(req,res)=>{
  const assetKey=String(req.query.assetKey||'');if(!assetKey)return res.status(400).json({error:'assetKeyが必要です。'});
  const row=(await query(`SELECT asset_key,file_path,display_label,source_class,status,allowed_scopes,public_treatment,rights_expiry_date,restriction_reason,attribution_text,source_url,updated_at FROM publication_rights_items WHERE asset_key=$1`,[assetKey])).rows[0];
  if(!row)return res.json({assetKey,status:'unregistered',allowed:false,publicTreatment:'blocked'});
  const expired=row.rights_expiry_date&&String(row.rights_expiry_date).slice(0,10)<new Date().toISOString().slice(0,10);res.json({...row,expired,allowed:!expired&&['approved','restricted','metadata-only'].includes(row.status)});
});
app.get('/api/system/publication-scope',async(_req,res)=>{
  const value=(await query("SELECT setting_value FROM system_runtime_settings WHERE setting_key='publication_scope'")).rows[0]?.setting_value||{mode:config.publication.defaultScope};res.json(value);
});
app.get('/api/admin/publication-scope',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const value=(await query("SELECT setting_value FROM system_runtime_settings WHERE setting_key='publication_scope'")).rows[0]?.setting_value||{mode:config.publication.defaultScope};res.json(value);
});
app.put('/api/admin/publication-scope',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({mode:z.enum(['prototype-review','internal-authenticated','internal-restricted','public-approved']),note:z.string().max(3000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'公開範囲設定を確認してください。'});const value={...parsed.data,updatedAt:new Date().toISOString(),updatedBy:req.user.id};
  await query(`INSERT INTO system_runtime_settings(setting_key,setting_value,updated_by,updated_at) VALUES('publication_scope',$1::jsonb,$2,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=now()`,[JSON.stringify(value),req.user.id]);await audit(req,'update','publication-scope','publication_scope',value);res.json(value);
});

app.get('/api/admin/backup-status',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [settings,runs,ledger,restores]=await Promise.all([query(`SELECT * FROM system_backup_settings WHERE id='default'`),query(`SELECT * FROM system_backup_runs ORDER BY started_at DESC LIMIT 100`),query(`SELECT * FROM system_backup_ledger ORDER BY created_at DESC LIMIT 100`),query(`SELECT * FROM system_restore_history ORDER BY restored_at DESC LIMIT 100`)]);
  const latest=runs.rows[0]||null;const settingsRow=settings.rows[0]||null;const overdue=!latest||!settingsRow?true:(Date.now()-new Date(latest.started_at).getTime())>Number(settingsRow.interval_hours||24)*3600_000*1.5;const offsiteRecorded=Boolean(latest?.offsite_location);const offsiteRequiredMissing=Boolean(settingsRow?.require_offsite_copy&&!offsiteRecorded);const restoreTestDue=!latest?.verified_at||(latest?.verified_at&&Date.now()-new Date(latest.verified_at).getTime()>Number(settingsRow?.restore_test_interval_days||90)*86400_000);
  res.json({settings:settingsRow,runs:runs.rows,legacyLedger:ledger.rows,restores:restores.rows,health:{overdue,latestStatus:latest?.status||'none',offsiteRecorded,offsiteRequiredMissing,restoreTestDue}});
});

app.put('/api/admin/backup-settings',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({enabled:z.boolean(),intervalHours:z.number().int().min(1).max(168),retentionDays:z.number().int().min(7).max(3650),requireOffsiteCopy:z.boolean(),restoreTestIntervalDays:z.number().int().min(7).max(365)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'バックアップ設定を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO system_backup_settings(id,enabled,interval_hours,retention_days,require_offsite_copy,restore_test_interval_days,updated_by,updated_at) VALUES('default',$1,$2,$3,$4,$5,$6,now()) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled,interval_hours=excluded.interval_hours,retention_days=excluded.retention_days,require_offsite_copy=excluded.require_offsite_copy,restore_test_interval_days=excluded.restore_test_interval_days,updated_by=excluded.updated_by,updated_at=now() RETURNING *`,[d.enabled,d.intervalHours,d.retentionDays,d.requireOffsiteCopy,d.restoreTestIntervalDays,req.user.id]);await audit(req,'update','backup-settings','default',d);res.json({settings:rows[0]});
});

app.post('/api/admin/backups/:id/restore-test',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({result:z.enum(['passed','failed']),note:z.string().max(5000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'復元試験結果を確認してください。'});const {rows}=await query(`UPDATE system_backup_runs SET verified_at=now(),status=CASE WHEN $1='passed' THEN 'verified' ELSE status END,verification_result=$2::jsonb WHERE id=$3 RETURNING *`,[parsed.data.result,JSON.stringify({result:parsed.data.result,note:parsed.data.note,verifiedBy:req.user.id}),req.params.id]);if(!rows[0])return res.status(404).json({error:'バックアップ記録が見つかりません。'});await audit(req,'restore-test','system-backup-run',req.params.id,{result:parsed.data.result,note:parsed.data.note});res.json({run:rows[0]});
});


// Part 506: centrally store application verification and CTU calculation results.
app.get('/api/application-results', authenticate, requireOperationalRead, async (req,res)=>{
  const officeId=officeScope(req.user);
  const applicationId=String(req.query.applicationId||'').trim()||null;
  const {rows}=await query(`SELECT r.*,a.application_number,o.name office_name
    FROM application_linked_results r JOIN applications a ON a.id=r.application_id JOIN offices o ON o.id=r.office_id
    WHERE ($1::uuid IS NULL OR r.application_id=$1) AND ($2::text IS NULL OR r.office_id=$2)
    ORDER BY r.created_at DESC LIMIT 1000`,[applicationId,officeId]);
  res.json({results:rows});
});

app.post('/api/application-results', authenticate, requireOperationalWrite, async (req,res)=>{
  const schema=z.object({clientId:z.string().max(200).optional(),applicationId:z.string().uuid(),resultType:z.enum(['dangerous-goods-verification','ctu-securing','other']),title:z.string().min(1).max(300),resultVersion:z.number().int().min(1).max(9999).optional().default(1),status:z.enum(['recorded','confirmed']).optional().default('recorded'),sourcePage:z.string().max(500).optional().default(''),payload:z.record(z.any())});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認・算出結果の登録内容を確認してください。'});const d=parsed.data;
  const created=await transaction(async client=>{
    const appResult=await client.query(`SELECT id,office_id FROM applications WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2) FOR UPDATE`,[d.applicationId,officeScope(req.user)]);const application=appResult.rows[0];if(!application)throw Object.assign(new Error('登録先の申請番号が見つかりません。'),{status:404});
    const {rows}=await client.query(`INSERT INTO application_linked_results(client_id,application_id,office_id,result_type,title,result_version,status,source_page,payload,created_by,created_by_name)
      VALUES(NULLIF($1,''),$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9::jsonb,$10,$11)
      ON CONFLICT(client_id) WHERE client_id IS NOT NULL DO UPDATE SET title=excluded.title,result_version=excluded.result_version,status=excluded.status,source_page=excluded.source_page,payload=excluded.payload,updated_at=now()
      RETURNING *`,[d.clientId||'',application.id,application.office_id,d.resultType,d.title,d.resultVersion,d.status,d.sourcePage,JSON.stringify(d.payload),req.user.id,req.user.display_name||req.user.login_id||'利用者']);
    return rows[0];
  });
  await audit(req,'create','application-linked-result',created.id,{applicationId:d.applicationId,resultType:d.resultType,resultVersion:d.resultVersion});res.status(201).json({result:created});
});

app.patch('/api/application-results/:id', authenticate, requireOperationalWrite, async (req,res)=>{
  const schema=z.object({action:z.enum(['cancel','restore']),reason:z.string().max(2000).optional().default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'変更内容を確認してください。'});const officeId=officeScope(req.user);
  const {rows}=await query(`UPDATE application_linked_results SET status=CASE WHEN $1='cancel' THEN 'cancelled' ELSE CASE WHEN payload#>>'{review,status}'='confirmed' THEN 'confirmed' ELSE 'recorded' END END,cancelled_at=CASE WHEN $1='cancel' THEN now() ELSE NULL END,cancel_reason=CASE WHEN $1='cancel' THEN $2 ELSE NULL END,updated_at=now() WHERE id=$3 AND ($4::text IS NULL OR office_id=$4) RETURNING *`,[parsed.data.action,parsed.data.reason,req.params.id,officeId]);if(!rows[0])return res.status(404).json({error:'対象の確認・算出結果が見つかりません。'});await audit(req,parsed.data.action,'application-linked-result',req.params.id,{reason:parsed.data.reason});res.json({result:rows[0]});
});

// Part 506: full-system release staging. It never overwrites the active release directly.
const migrationSafePath=value=>{
  const v=String(value||'').replace(/\\/g,'/').replace(/^\.\//,'');
  if(!v||v.startsWith('/')||v.includes('..')||v.includes('\0'))return null;
  if(/(^|\/)(\.env|\.git|node_modules|server\/data|server\/storage)(\/|$)/i.test(v))return null;
  return v;
};
const migrationOriginAllowed=value=>{
  try{
    const url=new URL(value);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))return false;
    const allowed=config.systemMigration.allowedSourceOrigins||[];if(!allowed.length)return false;
    return allowed.some(item=>{try{return new URL(item).origin===url.origin}catch{return false}});
  }catch{return false}
};
const migrationSha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

app.get('/api/admin/system-migration/diagnose',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const db=await query('SELECT now() server_time');
  res.json({enabled:config.systemMigration.enabled,environment:config.nodeEnv,serverTime:db.rows[0].server_time,stagingDir:config.systemMigration.stagingDir,releaseDir:config.systemMigration.releaseDir,maxFiles:config.systemMigration.maxFiles,maxBytes:config.systemMigration.maxBytes,allowedSourceOrigins:config.systemMigration.allowedSourceOrigins.map(x=>{try{return new URL(x).origin}catch{return x}}),activation:'staging-only'});
});

app.post('/api/admin/system-migration/stage',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  if(!config.systemMigration.enabled)return res.status(409).json({error:'移行先サーバーでSYSTEM_MIGRATION_ENABLEDを有効にしてください。'});
  const schema=z.object({sourceBaseUrl:z.string().url(),release:z.string().min(1).max(120),fileManifest:z.object({files:z.array(z.object({path:z.string().min(1).max(1000),size:z.number().int().nonnegative(),sha256:z.string().regex(/^[a-f0-9]{64}$/i)})).max(config.systemMigration.maxFiles),totalBytes:z.number().int().nonnegative().optional(),manifestSha256:z.string().optional()})});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'システムファイル一覧を確認してください。'});const d=parsed.data;
  if(!migrationOriginAllowed(d.sourceBaseUrl))return res.status(400).json({error:'公開元URLが許可された移行元に登録されていません。SYSTEM_MIGRATION_SOURCE_ORIGINSを確認してください。'});
  const safeFiles=d.fileManifest.files.map(x=>({...x,path:migrationSafePath(x.path)}));if(safeFiles.some(x=>!x.path))return res.status(400).json({error:'移行対象に安全でないファイルパスが含まれています。'});
  const totalBytes=safeFiles.reduce((n,x)=>n+x.size,0);if(totalBytes>config.systemMigration.maxBytes)return res.status(413).json({error:'移行対象容量が上限を超えています。'});
  const stageId=`${String(d.release).replace(/[^A-Za-z0-9._-]/g,'_')}-${Date.now()}`;const target=path.join(config.systemMigration.stagingDir,stageId);await fs.promises.mkdir(target,{recursive:true});
  const sourceBase=d.sourceBaseUrl.replace(/\/$/,'')+'/';let completed=0,bytes=0;
  try{
    const concurrency=6;let cursor=0;const workers=Array.from({length:Math.min(concurrency,safeFiles.length||1)},async()=>{while(cursor<safeFiles.length){const item=safeFiles[cursor++];const url=new URL(item.path,sourceBase);const response=await fetch(url,{redirect:'follow'});if(!response.ok)throw new Error(`${item.path}: HTTP ${response.status}`);const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length!==item.size)throw new Error(`${item.path}: サイズ不一致`);if(migrationSha(buffer)!==item.sha256.toLowerCase())throw new Error(`${item.path}: SHA-256不一致`);const out=path.join(target,item.path);await fs.promises.mkdir(path.dirname(out),{recursive:true});await fs.promises.writeFile(out,buffer);completed++;bytes+=buffer.length;}});await Promise.all(workers);
    await fs.promises.writeFile(path.join(target,'STAGED_RELEASE.json'),JSON.stringify({stageId,release:d.release,sourceBaseUrl:d.sourceBaseUrl,fileCount:completed,totalBytes:bytes,stagedAt:new Date().toISOString(),manifestSha256:d.fileManifest.manifestSha256||''},null,2));
    await query(`INSERT INTO system_migration_runs(stage_id,source_base_url,source_release,target_path,file_count,total_bytes,status,details,created_by,completed_at) VALUES($1,$2,$3,$4,$5,$6,'staged',$7::jsonb,$8,now())`,[stageId,d.sourceBaseUrl,d.release,target,completed,bytes,JSON.stringify({manifestSha256:d.fileManifest.manifestSha256||''}),req.user.id]);await audit(req,'stage','full-system-migration',stageId,{release:d.release,fileCount:completed,totalBytes:bytes});res.status(201).json({stageId,release:d.release,files:completed,bytes,status:'staged',note:'稼働中のシステムは変更していません。ステージング内容を検証後、配置管理者が切り替えてください。'});
  }catch(error){await fs.promises.rm(target,{recursive:true,force:true});await query(`INSERT INTO system_migration_runs(stage_id,source_base_url,source_release,target_path,file_count,total_bytes,status,details,created_by,completed_at) VALUES($1,$2,$3,$4,$5,$6,'failed',$7::jsonb,$8,now()) ON CONFLICT(stage_id) DO UPDATE SET status='failed',details=excluded.details,completed_at=now()`,[stageId,d.sourceBaseUrl,d.release,target,completed,bytes,JSON.stringify({error:error.message}),req.user.id]);throw Object.assign(new Error(`システム全体のステージングに失敗しました。${error.message}`),{status:502});}
});

app.get('/api/admin/system-migration/runs',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{const {rows}=await query('SELECT * FROM system_migration_runs ORDER BY created_at DESC LIMIT 100');res.json({runs:rows});});


// Part 510: backup verification, isolated restore, full migration, cutover and rollback drills.
const recoveryDrillTypes=['backup-verification','isolated-restore','full-migration','cutover','rollback'];
const recoveryStatuses=['planned','running','passed','warning','failed','cancelled'];
const recoveryDue=(row,days)=>!row?.completed_at||Date.now()-new Date(row.completed_at).getTime()>Number(days||1)*86400_000;

app.get('/api/admin/recovery/readiness',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  const [settingsResult,backupResult,drillResult,activationResult]=await Promise.all([
    query(`SELECT * FROM system_recovery_settings WHERE id='default'`),
    query(`SELECT * FROM system_backup_runs ORDER BY started_at DESC LIMIT 50`),
    query(`SELECT d.*,b.backup_id,m.stage_id migration_stage_id,u.display_name executed_by_name,w.display_name witnessed_by_name
      FROM system_recovery_drills d LEFT JOIN system_backup_runs b ON b.id=d.backup_run_id LEFT JOIN system_migration_runs m ON m.id=d.migration_run_id
      LEFT JOIN users u ON u.id=d.executed_by LEFT JOIN users w ON w.id=d.witnessed_by ORDER BY d.created_at DESC LIMIT 100`),
    query(`SELECT * FROM system_release_activations ORDER BY created_at DESC LIMIT 50`)
  ]);
  const settings=settingsResult.rows[0]||{rpo_minutes:config.recovery.rpoMinutes,rto_minutes:config.recovery.rtoMinutes,backup_verification_interval_days:7,restore_drill_interval_days:90,migration_drill_interval_days:180,require_offsite_copy:true,require_isolated_restore:true,require_rollback_test:true};
  const latestBackup=backupResult.rows[0]||null;
  const latestByType=Object.fromEntries(recoveryDrillTypes.map(type=>[type,drillResult.rows.find(row=>row.drill_type===type&&['passed','warning','failed'].includes(row.status))||null]));
  const backupAgeMinutes=latestBackup?Math.round((Date.now()-new Date(latestBackup.started_at).getTime())/60000):null;
  const checks=[
    {key:'backup-within-rpo',label:'RPO以内のバックアップ',passed:backupAgeMinutes!=null&&backupAgeMinutes<=Number(settings.rpo_minutes),detail:backupAgeMinutes==null?'バックアップ記録なし':`${backupAgeMinutes}分前`},
    {key:'latest-backup-completed',label:'最新バックアップ完了',passed:['completed','verified'].includes(latestBackup?.status),detail:latestBackup?.status||'記録なし'},
    {key:'latest-backup-verified',label:'最新バックアップ整合性検証',passed:['verified'].includes(latestBackup?.status)||latestBackup?.verification_level==='full',detail:latestBackup?.verification_level||latestBackup?.status||'未検証'},
    {key:'offsite-copy',label:'独立した保管先への複製',passed:!settings.require_offsite_copy||Boolean(latestBackup?.offsite_location),detail:latestBackup?.offsite_location||'未記録'},
    {key:'restore-drill',label:'隔離復元試験が期限内',passed:!settings.require_isolated_restore||!recoveryDue(latestByType['isolated-restore'],settings.restore_drill_interval_days),detail:latestByType['isolated-restore']?.completed_at||'未実施'},
    {key:'migration-drill',label:'システム全体移行試験が期限内',passed:!recoveryDue(latestByType['full-migration'],settings.migration_drill_interval_days),detail:latestByType['full-migration']?.completed_at||'未実施'},
    {key:'rollback-drill',label:'ロールバック試験',passed:!settings.require_rollback_test||Boolean(latestByType.rollback?.completed_at&&latestByType.rollback.status==='passed'),detail:latestByType.rollback?.completed_at||'未実施'}
  ];
  res.json({release:'part528',settings,latestBackup,backups:backupResult.rows,drills:drillResult.rows,activations:activationResult.rows,checks,ready:checks.every(x=>x.passed)});
});

app.put('/api/admin/recovery/settings',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({rpoMinutes:z.number().int().min(5).max(10080),rtoMinutes:z.number().int().min(15).max(10080),backupVerificationIntervalDays:z.number().int().min(1).max(365),restoreDrillIntervalDays:z.number().int().min(7).max(730),migrationDrillIntervalDays:z.number().int().min(14).max(730),requireOffsiteCopy:z.boolean(),requireIsolatedRestore:z.boolean(),requireRollbackTest:z.boolean()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'復旧目標・試験間隔を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO system_recovery_settings(id,rpo_minutes,rto_minutes,backup_verification_interval_days,restore_drill_interval_days,migration_drill_interval_days,require_offsite_copy,require_isolated_restore,require_rollback_test,updated_by,updated_at)
    VALUES('default',$1,$2,$3,$4,$5,$6,$7,$8,$9,now()) ON CONFLICT(id) DO UPDATE SET rpo_minutes=excluded.rpo_minutes,rto_minutes=excluded.rto_minutes,backup_verification_interval_days=excluded.backup_verification_interval_days,restore_drill_interval_days=excluded.restore_drill_interval_days,migration_drill_interval_days=excluded.migration_drill_interval_days,require_offsite_copy=excluded.require_offsite_copy,require_isolated_restore=excluded.require_isolated_restore,require_rollback_test=excluded.require_rollback_test,updated_by=excluded.updated_by,updated_at=now() RETURNING *`,[d.rpoMinutes,d.rtoMinutes,d.backupVerificationIntervalDays,d.restoreDrillIntervalDays,d.migrationDrillIntervalDays,d.requireOffsiteCopy,d.requireIsolatedRestore,d.requireRollbackTest,req.user.id]);
  await audit(req,'update','system-recovery-settings','default',d);res.json({settings:rows[0]});
});

app.post('/api/admin/recovery/drills',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({drillType:z.enum(recoveryDrillTypes),status:z.enum(recoveryStatuses).optional().default('planned'),backupRunId:z.string().uuid().nullable().optional(),migrationRunId:z.string().uuid().nullable().optional(),sourceRelease:z.string().max(200).nullable().optional(),targetRelease:z.string().max(200).nullable().optional(),sourceEnvironment:z.string().max(200).nullable().optional(),targetEnvironment:z.string().max(200).nullable().optional(),rpoMinutesObserved:z.number().int().min(0).max(10080).nullable().optional(),rtoMinutesObserved:z.number().int().min(0).max(10080).nullable().optional(),expectedCounts:z.record(z.any()).optional().default({}),actualCounts:z.record(z.any()).optional().default({}),integrityChecks:z.array(z.record(z.any())).optional().default([]),evidence:z.record(z.any()).optional().default({}),notes:z.string().max(10000).optional().default(''),failureReason:z.string().max(10000).nullable().optional(),witnessedBy:z.string().uuid().nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'試験記録の内容を確認してください。'});const d=parsed.data;
  if(['passed','warning','failed'].includes(d.status)&&!d.notes.trim())return res.status(400).json({error:'完了結果を保存する場合は、実施内容・結果を記録してください。'});
  const nowComplete=['passed','warning','failed','cancelled'].includes(d.status);
  const {rows}=await query(`INSERT INTO system_recovery_drills(drill_type,status,backup_run_id,migration_run_id,source_release,target_release,source_environment,target_environment,started_at,completed_at,rpo_minutes_observed,rto_minutes_observed,expected_counts,actual_counts,integrity_checks,evidence,notes,failure_reason,executed_by,witnessed_by,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $2='planned' THEN NULL ELSE now() END,CASE WHEN $9 THEN now() ELSE NULL END,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$18) RETURNING *`,[d.drillType,d.status,d.backupRunId||null,d.migrationRunId||null,d.sourceRelease||null,d.targetRelease||null,d.sourceEnvironment||null,d.targetEnvironment||null,nowComplete,d.rpoMinutesObserved??null,d.rtoMinutesObserved??null,JSON.stringify(d.expectedCounts),JSON.stringify(d.actualCounts),JSON.stringify(d.integrityChecks),JSON.stringify(d.evidence),d.notes,d.failureReason||null,req.user.id,d.witnessedBy||null]);
  await audit(req,'create','system-recovery-drill',rows[0].id,{drillType:d.drillType,status:d.status});res.status(201).json({drill:rows[0]});
});

app.patch('/api/admin/recovery/drills/:id',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({status:z.enum(['running','passed','warning','failed','cancelled']),rpoMinutesObserved:z.number().int().min(0).max(10080).nullable().optional(),rtoMinutesObserved:z.number().int().min(0).max(10080).nullable().optional(),actualCounts:z.record(z.any()).optional().default({}),integrityChecks:z.array(z.record(z.any())).optional().default([]),evidence:z.record(z.any()).optional().default({}),notes:z.string().max(10000).optional().default(''),failureReason:z.string().max(10000).nullable().optional(),witnessedBy:z.string().uuid().nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'試験結果を確認してください。'});const d=parsed.data;
  const complete=['passed','warning','failed','cancelled'].includes(d.status);
  const {rows}=await query(`UPDATE system_recovery_drills SET status=$1,started_at=COALESCE(started_at,now()),completed_at=CASE WHEN $2 THEN now() ELSE NULL END,rpo_minutes_observed=COALESCE($3,rpo_minutes_observed),rto_minutes_observed=COALESCE($4,rto_minutes_observed),actual_counts=$5::jsonb,integrity_checks=$6::jsonb,evidence=$7::jsonb,notes=$8,failure_reason=$9,executed_by=$10,witnessed_by=COALESCE($11,witnessed_by),updated_at=now() WHERE id=$12 RETURNING *`,[d.status,complete,d.rpoMinutesObserved??null,d.rtoMinutesObserved??null,JSON.stringify(d.actualCounts),JSON.stringify(d.integrityChecks),JSON.stringify(d.evidence),d.notes,d.failureReason||null,req.user.id,d.witnessedBy||null,req.params.id]);
  if(!rows[0])return res.status(404).json({error:'対象の試験記録が見つかりません。'});await audit(req,'update','system-recovery-drill',req.params.id,{status:d.status});res.json({drill:rows[0]});
});

app.post('/api/admin/recovery/activations',authenticate,requireRole('safety-environment-admin'),async(req,res)=>{
  const schema=z.object({activationId:z.string().min(1).max(200),previousRelease:z.string().max(300).nullable().optional(),targetRelease:z.string().min(1).max(300),stagePath:z.string().max(2000).nullable().optional(),activePath:z.string().max(2000).nullable().optional(),status:z.enum(['planned','validated','activated','rolled-back','failed']),preflightResults:z.array(z.record(z.any())).optional().default([]),postActivationResults:z.array(z.record(z.any())).optional().default([]),rollbackResults:z.array(z.record(z.any())).optional().default([]),details:z.record(z.any()).optional().default({})});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'切替・ロールバック記録を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO system_release_activations(activation_id,previous_release,target_release,stage_path,active_path,status,preflight_results,post_activation_results,rollback_results,details,activated_by,activated_at,rolled_back_by,rolled_back_at)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,CASE WHEN $6 IN ('activated','rolled-back') THEN $11 ELSE NULL END,CASE WHEN $6='activated' THEN now() ELSE NULL END,CASE WHEN $6='rolled-back' THEN $11 ELSE NULL END,CASE WHEN $6='rolled-back' THEN now() ELSE NULL END)
    ON CONFLICT(activation_id) DO UPDATE SET previous_release=excluded.previous_release,target_release=excluded.target_release,stage_path=excluded.stage_path,active_path=excluded.active_path,status=excluded.status,preflight_results=excluded.preflight_results,post_activation_results=excluded.post_activation_results,rollback_results=excluded.rollback_results,details=excluded.details,activated_by=COALESCE(excluded.activated_by,system_release_activations.activated_by),activated_at=COALESCE(excluded.activated_at,system_release_activations.activated_at),rolled_back_by=COALESCE(excluded.rolled_back_by,system_release_activations.rolled_back_by),rolled_back_at=COALESCE(excluded.rolled_back_at,system_release_activations.rolled_back_at) RETURNING *`,[d.activationId,d.previousRelease||null,d.targetRelease,d.stagePath||null,d.activePath||null,d.status,JSON.stringify(d.preflightResults),JSON.stringify(d.postActivationResults),JSON.stringify(d.rollbackResults),JSON.stringify(d.details),req.user.id]);
  await audit(req,'record','system-release-activation',d.activationId,{status:d.status,targetRelease:d.targetRelease});res.status(201).json({activation:rows[0]});
});

app.get('/api/admin/recovery/runbook',authenticate,requireRole('safety-environment-admin'),async(_req,res)=>{
  res.json({release:'part528',title:'バックアップ・復元・移行試験手順',principles:['稼働環境へ直接復元せず、最初に隔離環境で復元試験する','復元前に現在環境をバックアップする','移行先へステージング後、ファイル・DB・権限・主要機能を検証する','本番切替はシンボリックリンク等で原子的に行う','ヘルスチェック失敗時は直前リリースへ戻す','試験結果と証跡を復旧訓練台帳へ保存する'],commands:{backup:'npm run backup',verify:'npm run backup:verify -- /backups/backup_xxx',restoreDrill:'npm run restore:drill -- /backups/backup_xxx',migrationDrill:'npm run migration:drill -- system-release_xxx.tar.gz',activate:'npm run release:activate -- <release-name> <health-url>',rollback:'npm run release:rollback -- <previous-release-path>'},webCommandExecution:false,note:'Web画面は設定・結果・証跡の管理に限定します。バックアップ、復元、切替コマンドは承認された運用ホストから実行してください。'});
});

// Part 528: integrated phases 19-21 - operations command center, escalation, SLO and management reporting.
const commandCenterReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff'];
const commandCenterWriteRoles=['safety-environment-admin'];
const commandCenterText=value=>String(value||'').trim();
const commandCenterSha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/operations-command-center',authenticate,requireRole(...commandCenterReadRoles),async(_req,res)=>{
  const [users,rosters,shifts,policies,alerts,objectives,measurements,forecasts,reports]=await Promise.all([
    query(`SELECT id,login_id,display_name,role,office_id,active FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','office-admin') ORDER BY display_name`),
    query(`SELECT * FROM operational_on_call_rosters ORDER BY active DESC,name`),
    query(`SELECT s.*,pu.display_name primary_name,bu.display_name backup_name,r.name roster_name FROM operational_on_call_shifts s JOIN operational_on_call_rosters r ON r.id=s.roster_id JOIN users pu ON pu.id=s.primary_user_id LEFT JOIN users bu ON bu.id=s.backup_user_id WHERE s.ends_at >= now()-interval '30 days' ORDER BY s.starts_at DESC LIMIT 100`),
    query(`SELECT * FROM operational_escalation_policies ORDER BY active DESC,severity,name`),
    query(`SELECT a.*,u.display_name assigned_name,r.name roster_name FROM operational_alerts a LEFT JOIN users u ON u.id=a.assigned_user_id LEFT JOIN operational_on_call_rosters r ON r.id=a.assigned_roster_id ORDER BY CASE a.status WHEN 'open' THEN 0 WHEN 'acknowledged' THEN 1 WHEN 'investigating' THEN 2 WHEN 'monitoring' THEN 3 ELSE 4 END,a.detected_at DESC LIMIT 200`),
    query(`SELECT o.*,u.display_name owner_name FROM operational_service_objectives o LEFT JOIN users u ON u.id=o.owner_user_id ORDER BY o.active DESC,o.critical DESC,o.name`),
    query(`SELECT m.*,o.name objective_name,o.critical,o.target_percent FROM operational_slo_measurements m JOIN operational_service_objectives o ON o.id=m.objective_id ORDER BY m.period_end DESC,m.recorded_at DESC LIMIT 200`),
    query(`SELECT f.*,u.display_name owner_name FROM operational_capacity_forecasts f JOIN users u ON u.id=f.owner_user_id ORDER BY CASE f.status WHEN 'planned' THEN 0 WHEN 'in-progress' THEN 1 ELSE 2 END,f.due_at LIMIT 200`),
    query(`SELECT r.*,cu.display_name creator_name,rv.display_name reviewer_name,au.display_name approver_name FROM operational_management_reports r JOIN users cu ON cu.id=r.created_by LEFT JOIN users rv ON rv.id=r.reviewed_by LEFT JOIN users au ON au.id=r.approved_by ORDER BY r.period_end DESC,r.created_at DESC LIMIT 100`)
  ]);
  const now=new Date();
  const activeAlerts=alerts.rows.filter(a=>!['resolved','closed','cancelled'].includes(a.status));
  const currentShifts=shifts.rows.filter(s=>new Date(s.starts_at)<=now&&new Date(s.ends_at)>now);
  const summary={
    generatedAt:now.toISOString(),
    openAlerts:activeAlerts.length,
    criticalAlerts:activeAlerts.filter(a=>a.severity==='critical').length,
    acknowledgementOverdue:activeAlerts.filter(a=>deriveAlertState(a,now).acknowledgementOverdue).length,
    resolutionOverdue:activeAlerts.filter(a=>deriveAlertState(a,now).resolutionOverdue).length,
    activeOnCall:currentShifts.length,
    missedSlo:measurements.rows.filter(m=>m.status==='missed').length,
    overdueCapacityActions:forecasts.rows.filter(f=>!['completed','cancelled'].includes(f.status)&&new Date(f.due_at)<now).length
  };
  res.json({release:'part528',summary,users:users.rows,rosters:rosters.rows,shifts:shifts.rows,currentShifts,policies:policies.rows,alerts:alerts.rows,objectives:objectives.rows,measurements:measurements.rows,forecasts:forecasts.rows,reports:reports.rows});
});

app.post('/api/admin/operations-command-center/rosters',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({name:z.string().min(1).max(120),timezone:z.string().min(1).max(80).default('Asia/Tokyo'),active:z.boolean().default(true)});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'当番表の入力内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operational_on_call_rosters(name,timezone,active,created_by) VALUES($1,$2,$3,$4) RETURNING *`,[d.name,d.timezone,d.active,req.user.id]);
  await audit(req,'create','operational-on-call-roster',rows[0].id,{name:d.name});res.status(201).json({roster:rows[0]});
});

app.post('/api/admin/operations-command-center/shifts',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({rosterId:z.string().uuid(),startsAt:z.string().datetime(),endsAt:z.string().datetime(),primaryUserId:z.string().uuid(),backupUserId:z.string().uuid().nullable().optional(),handoverNote:z.string().max(5000).default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'当番期間と担当者を確認してください。'});const d=parsed.data;
  const validation=validateShift(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
  const overlap=await query(`SELECT 1 FROM operational_on_call_shifts WHERE roster_id=$1 AND tstzrange(starts_at,ends_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)') LIMIT 1`,[d.rosterId,d.startsAt,d.endsAt]);
  if(overlap.rowCount)return res.status(409).json({error:'同じ当番表に重複する期間があります。'});
  const {rows}=await query(`INSERT INTO operational_on_call_shifts(roster_id,starts_at,ends_at,primary_user_id,backup_user_id,handover_note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[d.rosterId,d.startsAt,d.endsAt,d.primaryUserId,d.backupUserId||null,d.handoverNote,req.user.id]);
  await audit(req,'create','operational-on-call-shift',rows[0].id,{rosterId:d.rosterId,startsAt:d.startsAt,endsAt:d.endsAt});res.status(201).json({shift:rows[0]});
});

app.post('/api/admin/operations-command-center/shifts/:id/acknowledge',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const found=await query(`SELECT * FROM operational_on_call_shifts WHERE id=$1`,[req.params.id]);if(!found.rows[0])return res.status(404).json({error:'当番記録が見つかりません。'});
  if(![found.rows[0].primary_user_id,found.rows[0].backup_user_id].filter(Boolean).includes(req.user.id))return res.status(403).json({error:'当番の主担当者または副担当者のみ確認できます。'});
  const {rows}=await query(`UPDATE operational_on_call_shifts SET acknowledged_at=now(),acknowledged_by=$1,updated_at=now() WHERE id=$2 RETURNING *`,[req.user.id,req.params.id]);
  await audit(req,'acknowledge','operational-on-call-shift',req.params.id,{});res.json({shift:rows[0]});
});

app.post('/api/admin/operations-command-center/escalation-policies',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({name:z.string().min(1).max(120),severity:z.enum(['critical','high','medium','low']),acknowledgementMinutes:z.number().int().min(1).max(4320),resolutionMinutes:z.number().int().min(1).max(43200),steps:z.array(z.object({afterMinutes:z.number().int().min(0).max(43200),targetRole:z.string().max(80).optional(),targetUserId:z.string().uuid().optional(),channel:z.enum(['email','phone','dashboard']).default('dashboard')})).min(1).max(10),active:z.boolean().default(true)});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'エスカレーション方針を確認してください。'});const d=parsed.data;
  if(d.resolutionMinutes<d.acknowledgementMinutes)return res.status(400).json({error:'復旧期限は応答期限以降にしてください。'});
  const validation=validateEscalationSteps(d.steps);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
  const {rows}=await query(`INSERT INTO operational_escalation_policies(name,severity,acknowledgement_minutes,resolution_minutes,steps,active,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING *`,[d.name,d.severity,d.acknowledgementMinutes,d.resolutionMinutes,JSON.stringify(d.steps),d.active,req.user.id]);
  await audit(req,'create','operational-escalation-policy',rows[0].id,{severity:d.severity});res.status(201).json({policy:rows[0]});
});

app.post('/api/admin/operations-command-center/alerts',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({alertKey:z.string().min(1).max(160),source:z.string().min(1).max(120),title:z.string().min(1).max(240),description:z.string().max(10000).default(''),severity:z.enum(['critical','high','medium','low']),detectedAt:z.string().datetime(),assignedUserId:z.string().uuid().nullable().optional(),assignedRosterId:z.string().uuid().nullable().optional(),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'アラート内容を確認してください。'});const d=parsed.data;
  const policy=await query(`SELECT * FROM operational_escalation_policies WHERE active=true AND severity=$1 ORDER BY updated_at DESC LIMIT 1`,[d.severity]);
  const deadlines=calculateAlertDeadlines(d.severity,d.detectedAt,policy.rows[0]?{ackMinutes:policy.rows[0].acknowledgement_minutes,resolveMinutes:policy.rows[0].resolution_minutes}:{});
  try{
    const {rows}=await transaction(async client=>{
      const inserted=await client.query(`INSERT INTO operational_alerts(alert_key,source,title,description,severity,detected_at,acknowledgement_due_at,resolution_due_at,assigned_user_id,assigned_roster_id,evidence_sha256,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[d.alertKey,d.source,d.title,d.description,d.severity,d.detectedAt,deadlines.ackDueAt,deadlines.resolveDueAt,d.assignedUserId||null,d.assignedRosterId||null,d.evidenceSha256?.toLowerCase()||null,req.user.id]);
      await client.query(`INSERT INTO operational_alert_events(alert_id,event_type,note,actor_id) VALUES($1,'detected',$2,$3)`,[inserted.rows[0].id,d.description,req.user.id]);return inserted;
    });
    await audit(req,'create','operational-alert',rows[0].id,{severity:d.severity,alertKey:d.alertKey});res.status(201).json({alert:rows[0]});
  }catch(error){if(error?.code==='23505')return res.status(409).json({error:'同じアラートキーは登録済みです。'});throw error;}
});

app.post('/api/admin/operations-command-center/alerts/:id/acknowledge',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({note:z.string().min(1).max(5000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認内容を入力してください。'});const d=parsed.data;
  const {rows}=await transaction(async client=>{
    const updated=await client.query(`UPDATE operational_alerts SET status=CASE WHEN status='open' THEN 'acknowledged' ELSE status END,acknowledged_at=COALESCE(acknowledged_at,now()),acknowledged_by=COALESCE(acknowledged_by,$1),updated_at=now() WHERE id=$2 AND status NOT IN ('resolved','closed','cancelled') RETURNING *`,[req.user.id,req.params.id]);
    if(!updated.rows[0])return updated;await client.query(`INSERT INTO operational_alert_events(alert_id,event_type,level,note,actor_id) VALUES($1,'acknowledged',$2,$3,$4)`,[req.params.id,updated.rows[0].escalation_level,d.note,req.user.id]);return updated;
  });
  if(!rows[0])return res.status(404).json({error:'未解決のアラートが見つかりません。'});await audit(req,'acknowledge','operational-alert',req.params.id,{});res.json({alert:rows[0]});
});

app.post('/api/admin/operations-command-center/alerts/:id/escalate',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({note:z.string().min(1).max(5000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'エスカレーション理由を入力してください。'});const d=parsed.data;
  const {rows}=await transaction(async client=>{const updated=await client.query(`UPDATE operational_alerts SET escalation_level=escalation_level+1,status=CASE WHEN status='open' THEN 'investigating' ELSE status END,updated_at=now() WHERE id=$1 AND status NOT IN ('resolved','closed','cancelled') RETURNING *`,[req.params.id]);if(!updated.rows[0])return updated;await client.query(`INSERT INTO operational_alert_events(alert_id,event_type,level,note,actor_id) VALUES($1,'escalated',$2,$3,$4)`,[req.params.id,updated.rows[0].escalation_level,d.note,req.user.id]);return updated;});
  if(!rows[0])return res.status(404).json({error:'未解決のアラートが見つかりません。'});await audit(req,'escalate','operational-alert',req.params.id,{level:rows[0].escalation_level});res.json({alert:rows[0]});
});

app.post('/api/admin/operations-command-center/alerts/:id/resolve',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({resolution:z.string().min(10).max(10000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i).optional()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'復旧内容を10文字以上で入力してください。'});const d=parsed.data;
  const found=await query(`SELECT * FROM operational_alerts WHERE id=$1`,[req.params.id]);const alert=found.rows[0];if(!alert)return res.status(404).json({error:'アラートが見つかりません。'});
  if(['critical','high'].includes(alert.severity)&&alert.acknowledged_by===req.user.id)return res.status(409).json({error:'重大・高アラートは、確認者とは別の利用者が復旧完了を記録してください。'});
  const {rows}=await transaction(async client=>{const updated=await client.query(`UPDATE operational_alerts SET status='resolved',resolution=$1,resolved_at=now(),resolved_by=$2,evidence_sha256=COALESCE($3,evidence_sha256),updated_at=now() WHERE id=$4 AND status NOT IN ('resolved','closed','cancelled') RETURNING *`,[d.resolution,req.user.id,d.evidenceSha256?.toLowerCase()||null,req.params.id]);if(!updated.rows[0])return updated;await client.query(`INSERT INTO operational_alert_events(alert_id,event_type,level,note,actor_id) VALUES($1,'resolved',$2,$3,$4)`,[req.params.id,updated.rows[0].escalation_level,d.resolution,req.user.id]);return updated;});
  if(!rows[0])return res.status(409).json({error:'このアラートはすでに終了しています。'});await audit(req,'resolve','operational-alert',req.params.id,{severity:alert.severity});res.json({alert:rows[0]});
});

app.post('/api/admin/operations-command-center/objectives',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({name:z.string().min(1).max(160),metricType:z.enum(['availability','success-rate','latency','delivery-rate','recovery-rate']),targetPercent:z.number().positive().max(100),windowDays:z.number().int().min(1).max(366).default(30),critical:z.boolean().default(false),ownerUserId:z.string().uuid().nullable().optional(),active:z.boolean().default(true)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'サービス水準目標を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO operational_service_objectives(name,metric_type,target_percent,window_days,critical,owner_user_id,active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[d.name,d.metricType,d.targetPercent,d.windowDays,d.critical,d.ownerUserId||null,d.active,req.user.id]);await audit(req,'create','operational-service-objective',rows[0].id,{targetPercent:d.targetPercent});res.status(201).json({objective:rows[0]});
});

app.post('/api/admin/operations-command-center/measurements',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({objectiveId:z.string().uuid(),periodStart:z.string().date(),periodEnd:z.string().date(),numerator:z.number().nonnegative(),denominator:z.number().positive(),evidenceNote:z.string().min(1).max(10000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i).optional()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'SLO測定値を確認してください。'});const d=parsed.data;
  const objective=await query(`SELECT * FROM operational_service_objectives WHERE id=$1 AND active=true`,[d.objectiveId]);if(!objective.rows[0])return res.status(404).json({error:'有効なサービス水準目標が見つかりません。'});
  let result;try{result=calculateSlo({numerator:d.numerator,denominator:d.denominator,targetPercent:Number(objective.rows[0].target_percent)});}catch(error){return res.status(400).json({error:error.message});}
  const evidenceSha=(d.evidenceSha256||commandCenterSha({objectiveId:d.objectiveId,periodStart:d.periodStart,periodEnd:d.periodEnd,numerator:d.numerator,denominator:d.denominator,evidenceNote:d.evidenceNote})).toLowerCase();
  const {rows}=await query(`INSERT INTO operational_slo_measurements(objective_id,period_start,period_end,numerator,denominator,actual_percent,status,error_budget_remaining,evidence_note,evidence_sha256,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(objective_id,period_start,period_end) DO UPDATE SET numerator=excluded.numerator,denominator=excluded.denominator,actual_percent=excluded.actual_percent,status=excluded.status,error_budget_remaining=excluded.error_budget_remaining,evidence_note=excluded.evidence_note,evidence_sha256=excluded.evidence_sha256,recorded_by=excluded.recorded_by,recorded_at=now() RETURNING *`,[d.objectiveId,d.periodStart,d.periodEnd,d.numerator,d.denominator,result.actualPercent,result.status,result.errorBudgetRemaining,d.evidenceNote,evidenceSha,req.user.id]);await audit(req,'record','operational-slo-measurement',rows[0].id,{status:result.status,actualPercent:result.actualPercent});res.status(201).json({measurement:rows[0],calculation:result});
});

app.post('/api/admin/operations-command-center/capacity-forecasts',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({resourceType:z.enum(['database','storage','api','notifications','users','sessions']),unit:z.string().min(1).max(40),currentValue:z.number().nonnegative(),warningThreshold:z.number().nonnegative(),criticalThreshold:z.number().nonnegative(),forecastValue:z.number().nonnegative(),forecastAt:z.string().date(),actionPlan:z.string().min(10).max(10000),ownerUserId:z.string().uuid(),dueAt:z.string().date()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'容量予測の入力内容を確認してください。'});const d=parsed.data;
  const validation=validateCapacityForecast(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
  const {rows}=await query(`INSERT INTO operational_capacity_forecasts(resource_type,unit,current_value,warning_threshold,critical_threshold,forecast_value,forecast_at,action_plan,owner_user_id,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[d.resourceType,d.unit,d.currentValue,d.warningThreshold,d.criticalThreshold,d.forecastValue,d.forecastAt,d.actionPlan,d.ownerUserId,d.dueAt,req.user.id]);await audit(req,'create','operational-capacity-forecast',rows[0].id,{resourceType:d.resourceType});res.status(201).json({forecast:rows[0]});
});

app.post('/api/admin/operations-command-center/capacity-forecasts/:id/complete',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({completionNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'完了内容を10文字以上で入力してください。'});
  const {rows}=await query(`UPDATE operational_capacity_forecasts SET status='completed',action_plan=action_plan||E'\n\n完了記録: '||$1,completed_at=now(),completed_by=$2,updated_at=now() WHERE id=$3 AND status NOT IN ('completed','cancelled') RETURNING *`,[parsed.data.completionNote,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'未完了の容量対策が見つかりません。'});await audit(req,'complete','operational-capacity-forecast',req.params.id,{});res.json({forecast:rows[0]});
});

app.post('/api/admin/operations-command-center/reports',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({periodType:z.enum(['weekly','monthly','quarterly']),periodStart:z.string().date(),periodEnd:z.string().date(),summary:z.string().min(10).max(20000),risks:z.string().min(1).max(20000),decisions:z.string().max(20000).default(''),nextActions:z.string().min(1).max(20000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'運用報告の期間・内容を確認してください。'});const d=parsed.data;if(new Date(d.periodEnd)<new Date(d.periodStart))return res.status(400).json({error:'報告期間を確認してください。'});
  const {rows}=await query(`INSERT INTO operational_management_reports(period_type,period_start,period_end,summary,risks,decisions,next_actions,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[d.periodType,d.periodStart,d.periodEnd,d.summary,d.risks,d.decisions,d.nextActions,req.user.id]);await audit(req,'create','operational-management-report',rows[0].id,{periodType:d.periodType});res.status(201).json({report:rows[0]});
});

app.post('/api/admin/operations-command-center/reports/:id/submit',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const reportResult=await query(`SELECT * FROM operational_management_reports WHERE id=$1`,[req.params.id]);const report=reportResult.rows[0];if(!report)return res.status(404).json({error:'運用報告が見つかりません。'});if(report.created_by!==req.user.id)return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(report.status))return res.status(409).json({error:'この報告は提出できる状態ではありません。'});
  const [alerts,measurements,forecasts]=await Promise.all([query(`SELECT * FROM operational_alerts WHERE detected_at::date BETWEEN $1 AND $2 OR status NOT IN ('resolved','closed','cancelled')`,[report.period_start,report.period_end]),query(`SELECT m.*,o.critical FROM operational_slo_measurements m JOIN operational_service_objectives o ON o.id=m.objective_id WHERE m.period_start<=$2 AND m.period_end>=$1`,[report.period_start,report.period_end]),query(`SELECT * FROM operational_capacity_forecasts WHERE created_at::date<=$2 AND (completed_at IS NULL OR completed_at::date>=$1)`,[report.period_start,report.period_end])]);
  const gate=evaluateReportGate({report,alerts:alerts.rows,measurements:measurements.rows,forecasts:forecasts.rows});const snapshot={release:'part528',generatedAt:new Date().toISOString(),alertCount:alerts.rowCount,activeAlerts:alerts.rows.filter(a=>!['resolved','closed','cancelled'].includes(a.status)).length,sloMeasurementCount:measurements.rowCount,missedSlo:measurements.rows.filter(m=>m.status==='missed').length,capacityForecastCount:forecasts.rowCount,blockers:gate.blockers};const sha=commandCenterSha(snapshot);
  const {rows}=await query(`UPDATE operational_management_reports SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$3 RETURNING *`,[JSON.stringify(snapshot),sha,req.params.id]);await audit(req,'submit','operational-management-report',req.params.id,{blockers:gate.blockers});res.json({report:rows[0],gate});
});

app.post('/api/admin/operations-command-center/reports/:id/review',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const d=parsed.data;
  const found=await query(`SELECT * FROM operational_management_reports WHERE id=$1`,[req.params.id]);const report=found.rows[0];if(!report)return res.status(404).json({error:'運用報告が見つかりません。'});if(report.status!=='submitted')return res.status(409).json({error:'提出済み報告だけを確認できます。'});if(report.created_by===req.user.id)return res.status(409).json({error:'作成者本人は確認者になれません。'});
  const {rows}=await query(`UPDATE operational_management_reports SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,approval_note='',updated_at=now() WHERE id=$4 RETURNING *`,[d.decision,req.user.id,d.note,req.params.id]);await audit(req,'review','operational-management-report',req.params.id,{decision:d.decision});res.json({report:rows[0]});
});

app.post('/api/admin/operations-command-center/reports/:id/approve',authenticate,requireRole(...commandCenterWriteRoles),async(req,res)=>{
  const schema=z.object({note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM operational_management_reports WHERE id=$1`,[req.params.id]);const report=found.rows[0];if(!report)return res.status(404).json({error:'運用報告が見つかりません。'});if(report.status!=='reviewed')return res.status(409).json({error:'確認済み報告だけを承認できます。'});if([report.created_by,report.reviewed_by].includes(req.user.id))return res.status(409).json({error:'作成者・確認者とは別の利用者が承認してください。'});
  const currentHash=commandCenterSha(report.snapshot||{});if(currentHash!==report.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。差戻して再提出してください。'});
  const [alerts,measurements,forecasts]=await Promise.all([query(`SELECT * FROM operational_alerts WHERE status NOT IN ('resolved','closed','cancelled') OR detected_at::date BETWEEN $1 AND $2`,[report.period_start,report.period_end]),query(`SELECT m.*,o.critical FROM operational_slo_measurements m JOIN operational_service_objectives o ON o.id=m.objective_id WHERE m.period_start<=$2 AND m.period_end>=$1`,[report.period_start,report.period_end]),query(`SELECT * FROM operational_capacity_forecasts WHERE status NOT IN ('completed','cancelled')`,[])]);
  const gate=evaluateReportGate({report:{...report,approved_by:req.user.id},alerts:alerts.rows,measurements:measurements.rows,forecasts:forecasts.rows});if(!gate.allowed)return res.status(409).json({error:'承認条件を満たしていません。',blockers:gate.blockers});
  const {rows}=await query(`UPDATE operational_management_reports SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','operational-management-report',req.params.id,{});res.json({report:rows[0],gate});
});


// Part 530: integrated phases 22-24 - retention/disposal, vulnerability management and external audit assurance.
const assuranceReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator'];
const assuranceWriteRoles=['safety-environment-admin'];
const assuranceSha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/assurance-security-audit',authenticate,requireRole(...assuranceReadRoles),async(_req,res)=>{
  const [users,policies,archives,disposals,vulnerabilities,audits,evidence,findings]=await Promise.all([
    query(`SELECT id,login_id,display_name,role,office_id,active FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator','office-admin') ORDER BY display_name`),
    query(`SELECT * FROM assurance_retention_policies ORDER BY active DESC,record_type`),
    query(`SELECT b.*,p.record_type,p.retention_days,u.display_name creator_name,v.display_name verifier_name FROM assurance_archive_batches b JOIN assurance_retention_policies p ON p.id=b.policy_id JOIN users u ON u.id=b.created_by LEFT JOIN users v ON v.id=b.verified_by ORDER BY b.period_end DESC,b.created_at DESC LIMIT 200`),
    query(`SELECT d.*,b.title archive_title,cu.display_name creator_name,ru.display_name reviewer_name,eu.display_name executor_name,vu.display_name verifier_name FROM assurance_disposal_requests d JOIN assurance_archive_batches b ON b.id=d.archive_batch_id JOIN users cu ON cu.id=d.created_by LEFT JOIN users ru ON ru.id=d.reviewed_by LEFT JOIN users eu ON eu.id=d.executed_by LEFT JOIN users vu ON vu.id=d.verified_by ORDER BY CASE d.status WHEN 'draft' THEN 0 WHEN 'reviewed' THEN 1 WHEN 'executed' THEN 2 ELSE 3 END,d.due_at LIMIT 200`),
    query(`SELECT v.*,ou.display_name owner_name,mu.display_name mitigator_name,vu.display_name verifier_name FROM security_vulnerability_cases v JOIN users ou ON ou.id=v.owner_user_id LEFT JOIN users mu ON mu.id=v.mitigated_by LEFT JOIN users vu ON vu.id=v.verified_by ORDER BY CASE v.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,CASE WHEN v.status IN ('closed','cancelled') THEN 1 ELSE 0 END,v.due_at LIMIT 300`),
    query(`SELECT a.*,cu.display_name creator_name,ru.display_name reviewer_name,au.display_name approver_name FROM external_audits a JOIN users cu ON cu.id=a.created_by LEFT JOIN users ru ON ru.id=a.reviewed_by LEFT JOIN users au ON au.id=a.approved_by ORDER BY a.period_end DESC,a.created_at DESC LIMIT 100`),
    query(`SELECT e.*,u.display_name prepared_name FROM external_audit_evidence e JOIN users u ON u.id=e.prepared_by ORDER BY e.created_at DESC LIMIT 300`),
    query(`SELECT f.*,u.display_name owner_name,ru.display_name resolver_name,vu.display_name verifier_name FROM external_audit_findings f JOIN users u ON u.id=f.owner_user_id LEFT JOIN users ru ON ru.id=f.resolved_by LEFT JOIN users vu ON vu.id=f.verified_by ORDER BY CASE f.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,CASE WHEN f.status IN ('verified','closed','cancelled') THEN 1 ELSE 0 END,f.due_at LIMIT 300`)
  ]);
  const gate=evaluateAssuranceGate({disposals:disposals.rows,vulnerabilities:vulnerabilities.rows,audits:audits.rows,findings:findings.rows});
  const now=new Date();
  res.json({release:'part530',generatedAt:now.toISOString(),users:users.rows,policies:policies.rows,archives:archives.rows,disposals:disposals.rows,vulnerabilities:vulnerabilities.rows,audits:audits.rows,evidence:evidence.rows,findings:findings.rows,gate,summary:{activePolicies:policies.rows.filter(x=>x.active).length,legalHolds:archives.rows.filter(x=>x.legal_hold).length,pendingDisposals:disposals.rows.filter(x=>!['verified','cancelled'].includes(x.status)).length,openCriticalVulnerabilities:vulnerabilities.rows.filter(x=>x.severity==='critical'&&!['closed','cancelled'].includes(x.status)).length,overdueVulnerabilities:vulnerabilities.rows.filter(x=>!['closed','cancelled'].includes(x.status)&&new Date(x.due_at)<now).length,openAuditFindings:findings.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)).length}});
});

app.post('/api/admin/assurance-security-audit/retention-policies',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({recordType:z.string().min(1).max(100),retentionDays:z.number().int().min(30).max(36500),disposition:z.enum(['archive-then-dispose','retain-only','legal-hold']),ownerRole:z.string().min(1).max(100),note:z.string().max(10000).default('')});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'保存ポリシーの入力内容を確認してください。'});const d=parsed.data;const validation=validateRetentionPolicy(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
  const {rows}=await query(`INSERT INTO assurance_retention_policies(record_type,retention_days,disposition,owner_role,note,created_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(record_type) DO UPDATE SET retention_days=excluded.retention_days,disposition=excluded.disposition,owner_role=excluded.owner_role,note=excluded.note,active=true,updated_at=now() RETURNING *`,[d.recordType,d.retentionDays,d.disposition,d.ownerRole,d.note,req.user.id]);await audit(req,'upsert','assurance-retention-policy',rows[0].id,d);res.status(201).json({policy:rows[0]});
});

app.post('/api/admin/assurance-security-audit/archive-batches',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({policyId:z.string().uuid(),title:z.string().min(1).max(300),periodStart:z.string().date(),periodEnd:z.string().date(),recordCount:z.number().int().min(0),storageReference:z.string().min(1).max(1000),manifestSha256:z.string().regex(/^[a-fA-F0-9]{64}$/),legalHold:z.boolean().default(false)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'アーカイブ記録を確認してください。'});const d=parsed.data;if(new Date(d.periodEnd)<new Date(d.periodStart))return res.status(400).json({error:'対象期間を確認してください。'});
  const {rows}=await query(`INSERT INTO assurance_archive_batches(policy_id,title,period_start,period_end,record_count,storage_reference,manifest_sha256,legal_hold,status,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'archived',$9) RETURNING *`,[d.policyId,d.title,d.periodStart,d.periodEnd,d.recordCount,d.storageReference,d.manifestSha256.toLowerCase(),d.legalHold,req.user.id]);await audit(req,'create','assurance-archive-batch',rows[0].id,{title:d.title,recordCount:d.recordCount,legalHold:d.legalHold});res.status(201).json({archive:rows[0]});
});

app.post('/api/admin/assurance-security-audit/disposals',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({archiveBatchId:z.string().uuid(),title:z.string().min(1).max(300),dueAt:z.string().date(),reason:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'廃棄申請の入力内容を確認してください。'});const d=parsed.data;const batch=await query(`SELECT * FROM assurance_archive_batches WHERE id=$1`,[d.archiveBatchId]);if(!batch.rows[0])return res.status(404).json({error:'対象アーカイブが見つかりません。'});if(batch.rows[0].legal_hold)return res.status(409).json({error:'法的保全中のアーカイブは廃棄申請できません。'});
  const {rows}=await query(`INSERT INTO assurance_disposal_requests(archive_batch_id,title,due_at,reason,legal_hold,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[d.archiveBatchId,d.title,d.dueAt,d.reason,batch.rows[0].legal_hold,req.user.id]);await audit(req,'create','assurance-disposal-request',rows[0].id,{title:d.title,dueAt:d.dueAt});res.status(201).json({disposal:rows[0]});
});

app.post('/api/admin/assurance-security-audit/disposals/:id/review',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const found=await query(`SELECT * FROM assurance_disposal_requests WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'廃棄申請が見つかりません。'});const check=validateDisposalActors(row,req.user.id,'review');if(!check.valid)return res.status(409).json({error:check.errors.join(' ')});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'確認可能な状態ではありません。'});
  const {rows}=await query(`UPDATE assurance_disposal_requests SET status='reviewed',reviewed_by=$1,reviewed_at=now(),updated_at=now() WHERE id=$2 RETURNING *`,[req.user.id,req.params.id]);await audit(req,'review','assurance-disposal-request',req.params.id,{});res.json({disposal:rows[0]});
});

app.post('/api/admin/assurance-security-audit/disposals/:id/execute',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({executionNote:z.string().min(10).max(10000),executionSha256:z.string().regex(/^[a-fA-F0-9]{64}$/)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'廃棄結果とSHA-256を入力してください。'});const found=await query(`SELECT * FROM assurance_disposal_requests WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'廃棄申請が見つかりません。'});const check=validateDisposalActors(row,req.user.id,'execute');if(!check.valid)return res.status(409).json({error:check.errors.join(' ')});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み申請だけを実行できます。'});
  const {rows}=await query(`UPDATE assurance_disposal_requests SET status='executed',executed_by=$1,executed_at=now(),execution_note=$2,execution_sha256=$3,updated_at=now() WHERE id=$4 RETURNING *`,[req.user.id,parsed.data.executionNote,parsed.data.executionSha256.toLowerCase(),req.params.id]);await audit(req,'execute','assurance-disposal-request',req.params.id,{});res.json({disposal:rows[0]});
});

app.post('/api/admin/assurance-security-audit/disposals/:id/verify',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({verificationNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'検証結果を10文字以上で入力してください。'});const found=await query(`SELECT * FROM assurance_disposal_requests WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'廃棄申請が見つかりません。'});const check=validateDisposalActors(row,req.user.id,'verify');if(!check.valid)return res.status(409).json({error:check.errors.join(' ')});if(row.status!=='executed')return res.status(409).json({error:'実行済み申請だけを検証できます。'});
  const {rows}=await query(`UPDATE assurance_disposal_requests SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.verificationNote,req.params.id]);await audit(req,'verify','assurance-disposal-request',req.params.id,{});res.json({disposal:rows[0]});
});

app.post('/api/admin/assurance-security-audit/vulnerabilities',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({externalId:z.string().max(200).optional().default(''),assetName:z.string().min(1).max(300),componentName:z.string().max(300).default(''),title:z.string().min(1).max(500),severity:z.enum(['critical','high','medium','low']),cvss:z.number().min(0).max(10).nullable().optional(),detectedAt:z.string().datetime(),source:z.string().max(500).default(''),affectedVersion:z.string().max(200).default(''),fixedVersion:z.string().max(200).default(''),ownerUserId:z.string().uuid(),mitigationPlan:z.string().min(10).max(20000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'脆弱性案件の入力内容を確認してください。'});const d=parsed.data;const validation=validateVulnerability(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});const due=calculateVulnerabilityDue(d.detectedAt,d.severity);
  const {rows}=await query(`INSERT INTO security_vulnerability_cases(external_id,asset_name,component_name,title,severity,cvss,detected_at,due_at,source,affected_version,fixed_version,owner_user_id,mitigation_plan,created_by) VALUES(NULLIF($1,''),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[d.externalId,d.assetName,d.componentName,d.title,d.severity,d.cvss??null,d.detectedAt,due.toISOString(),d.source,d.affectedVersion,d.fixedVersion,d.ownerUserId,d.mitigationPlan,req.user.id]);await audit(req,'create','security-vulnerability',rows[0].id,{severity:d.severity,dueAt:due.toISOString()});res.status(201).json({vulnerability:rows[0]});
});

app.post('/api/admin/assurance-security-audit/vulnerabilities/:id/mitigate',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({decision:z.enum(['mitigated','accepted']),resolutionNote:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-fA-F0-9]{64}$/),fixedVersion:z.string().max(200).default(''),riskAcceptanceReason:z.string().max(10000).default(''),riskAcceptanceExpiresAt:z.string().datetime().nullable().optional()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'対応結果を確認してください。'});const d=parsed.data;if(d.decision==='accepted'&&(!d.riskAcceptanceReason.trim()||!d.riskAcceptanceExpiresAt||new Date(d.riskAcceptanceExpiresAt)<=new Date()))return res.status(400).json({error:'リスク受容理由と将来の有効期限が必要です。'});
  const {rows}=await query(`UPDATE security_vulnerability_cases SET status=$1,resolution_note=$2,evidence_sha256=$3,fixed_version=COALESCE(NULLIF($4,''),fixed_version),risk_acceptance_reason=$5,risk_acceptance_expires_at=$6,mitigated_by=$7,mitigated_at=now(),updated_at=now() WHERE id=$8 AND status NOT IN ('closed','cancelled') RETURNING *`,[d.decision,d.resolutionNote,d.evidenceSha256.toLowerCase(),d.fixedVersion,d.riskAcceptanceReason,d.riskAcceptanceExpiresAt||null,req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'未完了の脆弱性案件が見つかりません。'});await audit(req,'mitigate','security-vulnerability',req.params.id,{decision:d.decision});res.json({vulnerability:rows[0]});
});

app.post('/api/admin/assurance-security-audit/vulnerabilities/:id/verify',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const found=await query(`SELECT * FROM security_vulnerability_cases WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'脆弱性案件が見つかりません。'});const validation=validateVulnerabilityClosure(row,req.user.id);if(!validation.valid)return res.status(409).json({error:validation.errors.join(' ')});
  const {rows}=await query(`UPDATE security_vulnerability_cases SET status='closed',verified_by=$1,verified_at=now(),updated_at=now() WHERE id=$2 RETURNING *`,[req.user.id,req.params.id]);await audit(req,'verify','security-vulnerability',req.params.id,{});res.json({vulnerability:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({title:z.string().min(1).max(500),auditType:z.enum(['external','customer','certification','regulatory']),auditorOrganization:z.string().min(1).max(500),scope:z.string().min(10).max(20000),periodStart:z.string().date(),periodEnd:z.string().date(),dueAt:z.string().date()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'外部監査の入力内容を確認してください。'});const d=parsed.data;if(new Date(d.periodEnd)<new Date(d.periodStart))return res.status(400).json({error:'監査期間を確認してください。'});
  const {rows}=await query(`INSERT INTO external_audits(title,audit_type,auditor_organization,scope,period_start,period_end,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[d.title,d.auditType,d.auditorOrganization,d.scope,d.periodStart,d.periodEnd,d.dueAt,req.user.id]);await audit(req,'create','external-audit',rows[0].id,{title:d.title});res.status(201).json({audit:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits/:id/evidence',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({title:z.string().min(1).max(500),classification:z.enum(['public','internal','confidential','restricted']),storageReference:z.string().min(1).max(1000),sha256:z.string(),note:z.string().max(10000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'証跡情報を確認してください。'});const d=parsed.data;const validation=validateEvidenceMetadata(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
  const {rows}=await query(`INSERT INTO external_audit_evidence(audit_id,title,classification,storage_reference,sha256,note,prepared_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.id,d.title,d.classification,d.storageReference,d.sha256.toLowerCase(),d.note,req.user.id]);await audit(req,'create','external-audit-evidence',rows[0].id,{auditId:req.params.id,classification:d.classification});res.status(201).json({evidence:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits/:id/findings',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({title:z.string().min(1).max(500),severity:z.enum(['critical','high','medium','low']),description:z.string().min(10).max(20000),correctivePlan:z.string().min(10).max(20000),ownerUserId:z.string().uuid(),dueAt:z.string().date()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'監査指摘の入力内容を確認してください。'});const d=parsed.data;
  const {rows}=await query(`INSERT INTO external_audit_findings(audit_id,title,severity,description,corrective_plan,owner_user_id,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.params.id,d.title,d.severity,d.description,d.correctivePlan,d.ownerUserId,d.dueAt,req.user.id]);await audit(req,'create','external-audit-finding',rows[0].id,{auditId:req.params.id,severity:d.severity});res.status(201).json({finding:rows[0]});
});

app.post('/api/admin/assurance-security-audit/findings/:id/resolve',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({resolutionNote:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-fA-F0-9]{64}$/)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'是正結果と証跡SHA-256を入力してください。'});
  const {rows}=await query(`UPDATE external_audit_findings SET status='resolved',resolution_note=$1,evidence_sha256=$2,resolved_by=$3,resolved_at=now(),updated_at=now() WHERE id=$4 AND status NOT IN ('verified','closed','cancelled') RETURNING *`,[parsed.data.resolutionNote,parsed.data.evidenceSha256.toLowerCase(),req.user.id,req.params.id]);if(!rows[0])return res.status(404).json({error:'未完了の監査指摘が見つかりません。'});await audit(req,'resolve','external-audit-finding',req.params.id,{});res.json({finding:rows[0]});
});

app.post('/api/admin/assurance-security-audit/findings/:id/verify',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({verificationNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'検証所見を入力してください。'});const found=await query(`SELECT * FROM external_audit_findings WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'監査指摘が見つかりません。'});if(row.status!=='resolved')return res.status(409).json({error:'是正済みの指摘だけを検証できます。'});if([row.owner_user_id,row.resolved_by].includes(req.user.id))return res.status(409).json({error:'責任者・是正実施者とは別の利用者が検証してください。'});
  const {rows}=await query(`UPDATE external_audit_findings SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.verificationNote,req.params.id]);await audit(req,'verify','external-audit-finding',req.params.id,{});res.json({finding:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits/:id/submit',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const found=await query(`SELECT * FROM external_audits WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'外部監査が見つかりません。'});if(row.created_by!==req.user.id)return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});const [ev,fi]=await Promise.all([query(`SELECT id,title,classification,sha256 FROM external_audit_evidence WHERE audit_id=$1 ORDER BY created_at`,[req.params.id]),query(`SELECT id,title,severity,status,due_at FROM external_audit_findings WHERE audit_id=$1 ORDER BY created_at`,[req.params.id])]);if(!ev.rowCount)return res.status(409).json({error:'提出には1件以上の証跡が必要です。'});const snapshot={release:'part530',auditId:req.params.id,evidence:ev.rows,findings:fi.rows,generatedAt:new Date().toISOString()};const sha=assuranceSha(snapshot);
  const {rows}=await query(`UPDATE external_audits SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),sha,req.user.id,req.params.id]);await audit(req,'submit','external-audit',req.params.id,{evidenceCount:ev.rowCount,findingCount:fi.rowCount});res.json({audit:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits/:id/review',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM external_audits WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'外部監査が見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済み監査だけを確認できます。'});const actors=validateAuditActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
  const {rows}=await query(`UPDATE external_audits SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,approval_note='',updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','external-audit',req.params.id,{decision:parsed.data.decision});res.json({audit:rows[0]});
});

app.post('/api/admin/assurance-security-audit/audits/:id/approve',authenticate,requireRole(...assuranceWriteRoles),async(req,res)=>{
  const schema=z.object({note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM external_audits WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'外部監査が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み監査だけを承認できます。'});const actors=validateAuditActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(assuranceSha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。'});const fi=await query(`SELECT * FROM external_audit_findings WHERE audit_id=$1`,[req.params.id]);const gate=evaluateAssuranceGate({findings:fi.rows});if(!gate.allowed)return res.status(409).json({error:'未解決の監査指摘が残っています。',blockers:gate.blockers});
  const {rows}=await query(`UPDATE external_audits SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','external-audit',req.params.id,{});res.json({audit:rows[0],gate});
});

// Part 531: integrated phases 25-27 - platform health, configuration drift and reliability improvement governance.
const reliabilityReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator'];
const reliabilityWriteRoles=['safety-environment-admin'];
const reliabilitySha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/platform-reliability',authenticate,requireRole(...reliabilityReadRoles),async(_req,res)=>{
 const [users,health,baselines,drifts,actions,reviews]=await Promise.all([
  query(`SELECT id,display_name,role,office_id FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator','office-admin') ORDER BY display_name`),
  query(`SELECT h.*,u.display_name recorded_name FROM platform_health_snapshots h JOIN users u ON u.id=h.recorded_by ORDER BY h.measured_at DESC LIMIT 300`),
  query(`SELECT b.*,u.display_name creator_name FROM configuration_baselines b JOIN users u ON u.id=b.created_by ORDER BY b.active DESC,b.environment,b.component_name,b.created_at DESC LIMIT 300`),
  query(`SELECT d.*,b.environment,b.component_name,b.baseline_version,o.display_name owner_name,r.display_name resolver_name,v.display_name verifier_name FROM configuration_drift_cases d JOIN configuration_baselines b ON b.id=d.baseline_id JOIN users o ON o.id=d.owner_user_id LEFT JOIN users r ON r.id=d.resolved_by LEFT JOIN users v ON v.id=d.verified_by ORDER BY CASE d.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,CASE WHEN d.status IN ('verified','closed','cancelled') THEN 1 ELSE 0 END,d.due_at LIMIT 400`),
  query(`SELECT a.*,o.display_name owner_name,c.display_name completer_name,v.display_name verifier_name FROM reliability_improvement_actions a JOIN users o ON o.id=a.owner_user_id LEFT JOIN users c ON c.id=a.completed_by LEFT JOIN users v ON v.id=a.verified_by ORDER BY CASE a.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,CASE WHEN a.status IN ('verified','closed','cancelled') THEN 1 ELSE 0 END,a.due_at LIMIT 400`),
  query(`SELECT r.*,c.display_name creator_name,rv.display_name reviewer_name,a.display_name approver_name FROM reliability_review_cycles r JOIN users c ON c.id=r.created_by LEFT JOIN users rv ON rv.id=r.reviewed_by LEFT JOIN users a ON a.id=r.approved_by ORDER BY r.period_end DESC,r.created_at DESC LIMIT 100`)
 ]);
 const gate=evaluateReliabilityGate({healthSnapshots:health.rows,drifts:drifts.rows,actions:actions.rows});
 const prod=health.rows.find(x=>x.environment==='production');const now=new Date();
 const summary={productionHealth:prod?.status||null,criticalDrifts:drifts.rows.filter(x=>['critical','high'].includes(x.severity)&&!['verified','closed','cancelled'].includes(x.status)).length,overdueDrifts:drifts.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)&&new Date(x.due_at)<now).length,openActions:actions.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)).length,overdueActions:actions.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)&&new Date(`${x.due_at}T23:59:59`)<now).length,backupAgeHours:prod?.backup_age_hours??null,restoreTestAgeDays:prod?.restore_test_age_days??null};
 res.json({users:users.rows,healthSnapshots:health.rows,baselines:baselines.rows,drifts:drifts.rows,actions:actions.rows,reviews:reviews.rows,summary,gate});
});

app.post('/api/admin/platform-reliability/health-snapshots',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({environment:z.enum(['production','staging','test','development']),measuredAt:z.string().datetime(),p95ResponseMs:z.number().nonnegative(),errorRatePercent:z.number().min(0).max(100),cpuPercent:z.number().min(0).max(100),memoryPercent:z.number().min(0).max(100),dbConnectionPercent:z.number().min(0).max(100),storagePercent:z.number().min(0).max(100),backupAgeHours:z.number().nonnegative(),restoreTestAgeDays:z.number().nonnegative(),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'健全性測定の入力内容を確認してください。'});const d=parsed.data;const result=evaluateHealthSnapshot(d);if(!result.valid)return res.status(400).json({error:result.errors.join(' ')});
 const {rows}=await query(`INSERT INTO platform_health_snapshots(environment,measured_at,p95_response_ms,error_rate_percent,cpu_percent,memory_percent,db_connection_percent,storage_percent,backup_age_hours,restore_test_age_days,status,blockers,warnings,evidence_sha256,evidence_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16) RETURNING *`,[d.environment,d.measuredAt,d.p95ResponseMs,d.errorRatePercent,d.cpuPercent,d.memoryPercent,d.dbConnectionPercent,d.storagePercent,d.backupAgeHours,d.restoreTestAgeDays,result.status,JSON.stringify(result.blockers),JSON.stringify(result.warnings),d.evidenceSha256.toLowerCase(),d.evidenceReference,req.user.id]);await audit(req,'record','platform-health-snapshot',rows[0].id,{environment:d.environment,status:result.status});res.status(201).json({snapshot:rows[0],evaluation:result});
});

app.post('/api/admin/platform-reliability/baselines',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({environment:z.enum(['production','staging','test','development']),componentName:z.string().min(1).max(500),baselineVersion:z.string().min(1).max(200),configurationSha256:z.string(),storageReference:z.string().min(1).max(1000),note:z.string().max(10000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'構成基準の入力内容を確認してください。'});const d=parsed.data;const validation=validateConfigurationBaseline(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO configuration_baselines(environment,component_name,baseline_version,configuration_sha256,storage_reference,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(environment,component_name,baseline_version) DO UPDATE SET configuration_sha256=excluded.configuration_sha256,storage_reference=excluded.storage_reference,note=excluded.note,active=true,updated_at=now() RETURNING *`,[d.environment,d.componentName,d.baselineVersion,d.configurationSha256.toLowerCase(),d.storageReference,d.note,req.user.id]);await audit(req,'upsert','configuration-baseline',rows[0].id,{environment:d.environment,component:d.componentName});res.status(201).json({baseline:rows[0]});
});

app.post('/api/admin/platform-reliability/drifts',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({baselineId:z.string().uuid(),title:z.string().min(1).max(500),severity:z.enum(['critical','high','medium','low']),detectedAt:z.string().datetime(),description:z.string().min(10).max(20000),remediationPlan:z.string().min(10).max(20000),ownerUserId:z.string().uuid()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'構成差分の入力内容を確認してください。'});const d=parsed.data;const validation=validateDrift(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});const due=calculateDriftDue(d.detectedAt,d.severity);
 const {rows}=await query(`INSERT INTO configuration_drift_cases(baseline_id,title,severity,detected_at,due_at,description,remediation_plan,owner_user_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[d.baselineId,d.title,d.severity,d.detectedAt,due.toISOString(),d.description,d.remediationPlan,d.ownerUserId,req.user.id]);await audit(req,'create','configuration-drift',rows[0].id,{severity:d.severity});res.status(201).json({drift:rows[0]});
});

app.post('/api/admin/platform-reliability/drifts/:id/resolve',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({resolutionNote:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'是正内容と証跡SHA-256を入力してください。'});const found=await query(`SELECT * FROM configuration_drift_cases WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'構成差分が見つかりません。'});const actors=validateDriftActors(row,req.user.id,'resolve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE configuration_drift_cases SET status='resolved',resolution_note=$1,evidence_sha256=$2,resolved_by=$3,resolved_at=now(),updated_at=now() WHERE id=$4 AND status NOT IN ('verified','closed','cancelled') RETURNING *`,[parsed.data.resolutionNote,parsed.data.evidenceSha256.toLowerCase(),req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'この差分は完了済みです。'});await audit(req,'resolve','configuration-drift',req.params.id,{});res.json({drift:rows[0]});
});
app.post('/api/admin/platform-reliability/drifts/:id/verify',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({verificationNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'検証所見を入力してください。'});const found=await query(`SELECT * FROM configuration_drift_cases WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'構成差分が見つかりません。'});if(row.status!=='resolved')return res.status(409).json({error:'是正済みの差分だけを検証できます。'});const actors=validateDriftActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE configuration_drift_cases SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.verificationNote,req.params.id]);await audit(req,'verify','configuration-drift',req.params.id,{});res.json({drift:rows[0]});
});

app.post('/api/admin/platform-reliability/actions',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({sourceType:z.enum(['health','capacity','backup','configuration','security','audit','other']),sourceReference:z.string().max(1000).default(''),title:z.string().min(1).max(500),priority:z.enum(['critical','high','medium','low']),description:z.string().min(10).max(20000),successCriteria:z.string().min(10).max(20000),ownerUserId:z.string().uuid(),dueAt:z.string().date()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'改善施策の入力内容を確認してください。'});const d=parsed.data;
 const {rows}=await query(`INSERT INTO reliability_improvement_actions(source_type,source_reference,title,priority,description,success_criteria,owner_user_id,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[d.sourceType,d.sourceReference,d.title,d.priority,d.description,d.successCriteria,d.ownerUserId,d.dueAt,req.user.id]);await audit(req,'create','reliability-action',rows[0].id,{priority:d.priority});res.status(201).json({action:rows[0]});
});
app.post('/api/admin/platform-reliability/actions/:id/complete',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({completionNote:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'実施内容と証跡SHA-256を入力してください。'});const found=await query(`SELECT * FROM reliability_improvement_actions WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'改善施策が見つかりません。'});const actors=validateActionActors(row,req.user.id,'complete');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE reliability_improvement_actions SET status='completed',completion_note=$1,evidence_sha256=$2,completed_by=$3,completed_at=now(),updated_at=now() WHERE id=$4 AND status NOT IN ('verified','closed','cancelled') RETURNING *`,[parsed.data.completionNote,parsed.data.evidenceSha256.toLowerCase(),req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'この施策は完了済みです。'});await audit(req,'complete','reliability-action',req.params.id,{});res.json({action:rows[0]});
});
app.post('/api/admin/platform-reliability/actions/:id/verify',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({verificationNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'効果確認所見を入力してください。'});const found=await query(`SELECT * FROM reliability_improvement_actions WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'改善施策が見つかりません。'});if(row.status!=='completed')return res.status(409).json({error:'実施完了済みの施策だけを検証できます。'});const actors=validateActionActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE reliability_improvement_actions SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.verificationNote,req.params.id]);await audit(req,'verify','reliability-action',req.params.id,{});res.json({action:rows[0]});
});

app.post('/api/admin/platform-reliability/reviews',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({periodStart:z.string().date(),periodEnd:z.string().date(),title:z.string().min(1).max(500),summary:z.string().min(10).max(20000),decision:z.string().max(20000).default(''),nextActions:z.string().min(5).max(20000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'信頼性レビューの入力内容を確認してください。'});const d=parsed.data;if(new Date(d.periodEnd)<new Date(d.periodStart))return res.status(400).json({error:'レビュー期間を確認してください。'});
 const {rows}=await query(`INSERT INTO reliability_review_cycles(period_start,period_end,title,summary,decision,next_actions,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[d.periodStart,d.periodEnd,d.title,d.summary,d.decision,d.nextActions,req.user.id]);await audit(req,'create','reliability-review',rows[0].id,{});res.status(201).json({review:rows[0]});
});
app.post('/api/admin/platform-reliability/reviews/:id/submit',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const found=await query(`SELECT * FROM reliability_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'信頼性レビューが見つかりません。'});if(row.created_by!==req.user.id)return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});
 const [health,drifts,actions]=await Promise.all([query(`SELECT * FROM platform_health_snapshots WHERE measured_at::date BETWEEN $1 AND $2 OR environment='production' ORDER BY measured_at DESC LIMIT 500`,[row.period_start,row.period_end]),query(`SELECT * FROM configuration_drift_cases WHERE detected_at::date<=$2 AND (verified_at IS NULL OR verified_at::date>=$1)`,[row.period_start,row.period_end]),query(`SELECT * FROM reliability_improvement_actions WHERE created_at::date<=$2 AND (verified_at IS NULL OR verified_at::date>=$1)`,[row.period_start,row.period_end])]);const gate=evaluateReliabilityGate({healthSnapshots:health.rows,drifts:drifts.rows,actions:actions.rows});const snapshot={release:'part531',generatedAt:new Date().toISOString(),healthIds:health.rows.map(x=>x.id),driftIds:drifts.rows.map(x=>x.id),actionIds:actions.rows.map(x=>x.id),blockers:gate.blockers};const sha=reliabilitySha(snapshot);
 const {rows}=await query(`UPDATE reliability_review_cycles SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),sha,req.user.id,req.params.id]);await audit(req,'submit','reliability-review',req.params.id,{blockers:gate.blockers});res.json({review:rows[0],gate});
});
app.post('/api/admin/platform-reliability/reviews/:id/review',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM reliability_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'信頼性レビューが見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済みレビューだけを確認できます。'});const actors=validateReviewActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE reliability_review_cycles SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,approval_note='',updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','reliability-review',req.params.id,{decision:parsed.data.decision});res.json({review:rows[0]});
});
app.post('/api/admin/platform-reliability/reviews/:id/approve',authenticate,requireRole(...reliabilityWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM reliability_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'信頼性レビューが見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済みレビューだけを承認できます。'});const actors=validateReviewActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(reliabilitySha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。'});
 const [health,drifts,actions]=await Promise.all([query(`SELECT * FROM platform_health_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM configuration_drift_cases WHERE status NOT IN ('verified','closed','cancelled')`),query(`SELECT * FROM reliability_improvement_actions WHERE status NOT IN ('verified','closed','cancelled')`)]);const gate=evaluateReliabilityGate({healthSnapshots:health.rows,drifts:drifts.rows,actions:actions.rows});if(!gate.allowed)return res.status(409).json({error:'信頼性承認条件を満たしていません。',blockers:gate.blockers});
 const {rows}=await query(`UPDATE reliability_review_cycles SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','reliability-review',req.params.id,{});res.json({review:rows[0],gate});
});

// Part 532: integrated phases 28-30 - database/search quality, attachment integrity and cross-data consistency governance.
const dataIntegrityReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator'];
const dataIntegrityWriteRoles=['safety-environment-admin'];
const dataAssuranceSha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/data-integrity-performance',authenticate,requireRole(...dataIntegrityReadRoles),async(_req,res)=>{
 const [users,databaseSnapshots,attachmentSnapshots,integritySnapshots,issues,reviews]=await Promise.all([
  query(`SELECT id,display_name,role,office_id FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator','office-admin') ORDER BY display_name`),
  query(`SELECT s.*,u.display_name recorded_name FROM data_performance_snapshots s JOIN users u ON u.id=s.recorded_by ORDER BY s.measured_at DESC LIMIT 300`),
  query(`SELECT s.*,u.display_name recorded_name FROM attachment_integrity_snapshots s JOIN users u ON u.id=s.recorded_by ORDER BY s.measured_at DESC LIMIT 300`),
  query(`SELECT s.*,u.display_name recorded_name FROM cross_data_integrity_snapshots s JOIN users u ON u.id=s.recorded_by ORDER BY s.measured_at DESC LIMIT 300`),
  query(`SELECT i.*,o.display_name owner_name,r.display_name resolver_name,v.display_name verifier_name FROM data_integrity_issues i JOIN users o ON o.id=i.owner_user_id LEFT JOIN users r ON r.id=i.resolved_by LEFT JOIN users v ON v.id=i.verified_by ORDER BY CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,CASE WHEN i.status IN ('verified','closed','cancelled') THEN 1 ELSE 0 END,i.due_at LIMIT 500`),
  query(`SELECT r.*,c.display_name creator_name,rv.display_name reviewer_name,a.display_name approver_name FROM data_assurance_review_cycles r JOIN users c ON c.id=r.created_by LEFT JOIN users rv ON rv.id=r.reviewed_by LEFT JOIN users a ON a.id=r.approved_by ORDER BY r.period_end DESC,r.created_at DESC LIMIT 100`)
 ]);
 const gate=evaluateDataAssuranceGate({databaseSnapshots:databaseSnapshots.rows,attachmentSnapshots:attachmentSnapshots.rows,integritySnapshots:integritySnapshots.rows,issues:issues.rows});
 const latest=(rows)=>rows.find(x=>x.environment==='production')||null;const now=new Date();
 const summary={databaseStatus:latest(databaseSnapshots.rows)?.status||null,attachmentStatus:latest(attachmentSnapshots.rows)?.status||null,integrityStatus:latest(integritySnapshots.rows)?.status||null,openIssues:issues.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)).length,criticalIssues:issues.rows.filter(x=>['critical','high'].includes(x.severity)&&!['verified','closed','cancelled'].includes(x.status)).length,overdueIssues:issues.rows.filter(x=>!['verified','closed','cancelled'].includes(x.status)&&new Date(x.due_at)<now).length};
 res.json({users:users.rows,databaseSnapshots:databaseSnapshots.rows,attachmentSnapshots:attachmentSnapshots.rows,integritySnapshots:integritySnapshots.rows,issues:issues.rows,reviews:reviews.rows,summary,gate});
});

app.post('/api/admin/data-integrity-performance/database-snapshots',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({environment:z.enum(['production','staging','test','development']),measuredAt:z.string().datetime(),queryP95Ms:z.number().nonnegative(),searchP95Ms:z.number().nonnegative(),failedQueryPercent:z.number().min(0).max(100),cacheHitPercent:z.number().min(0).max(100),connectionUsePercent:z.number().min(0).max(100),indexBloatPercent:z.number().min(0).max(100),noResultPercent:z.number().min(0).max(100),indexedRecordCount:z.number().int().nonnegative(),indexedUniqueUnCount:z.number().int().nonnegative(),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'DB・検索性能測定の入力内容を確認してください。'});const d=parsed.data;const evaluation=evaluateDatabaseSearchSnapshot(d);if(!evaluation.valid)return res.status(400).json({error:evaluation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO data_performance_snapshots(environment,measured_at,query_p95_ms,search_p95_ms,failed_query_percent,cache_hit_percent,connection_use_percent,index_bloat_percent,no_result_percent,indexed_record_count,indexed_unique_un_count,status,blockers,warnings,evidence_reference,evidence_sha256,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17) RETURNING *`,[d.environment,d.measuredAt,d.queryP95Ms,d.searchP95Ms,d.failedQueryPercent,d.cacheHitPercent,d.connectionUsePercent,d.indexBloatPercent,d.noResultPercent,d.indexedRecordCount,d.indexedUniqueUnCount,evaluation.status,JSON.stringify(evaluation.blockers),JSON.stringify(evaluation.warnings),d.evidenceReference,d.evidenceSha256.toLowerCase(),req.user.id]);
 await audit(req,'record','data-performance-snapshot',rows[0].id,{environment:d.environment,status:evaluation.status});res.status(201).json({snapshot:rows[0],evaluation});
});

app.post('/api/admin/data-integrity-performance/attachment-snapshots',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({environment:z.enum(['production','staging','test','development']),measuredAt:z.string().datetime(),totalFiles:z.number().int().nonnegative(),linkedFiles:z.number().int().nonnegative(),orphanedFiles:z.number().int().nonnegative(),missingFiles:z.number().int().nonnegative(),hashMismatchFiles:z.number().int().nonnegative(),malwarePendingFiles:z.number().int().nonnegative(),malwareFailedFiles:z.number().int().nonnegative(),metadataMismatchFiles:z.number().int().nonnegative(),quarantinedFiles:z.number().int().nonnegative(),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'添付資料・写真健全性測定の入力内容を確認してください。'});const d=parsed.data;const evaluation=evaluateAttachmentIntegritySnapshot(d);if(!evaluation.valid)return res.status(400).json({error:evaluation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO attachment_integrity_snapshots(environment,measured_at,total_files,linked_files,orphaned_files,missing_files,hash_mismatch_files,malware_pending_files,malware_failed_files,metadata_mismatch_files,quarantined_files,status,blockers,warnings,evidence_reference,evidence_sha256,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16,$17) RETURNING *`,[d.environment,d.measuredAt,d.totalFiles,d.linkedFiles,d.orphanedFiles,d.missingFiles,d.hashMismatchFiles,d.malwarePendingFiles,d.malwareFailedFiles,d.metadataMismatchFiles,d.quarantinedFiles,evaluation.status,JSON.stringify(evaluation.blockers),JSON.stringify(evaluation.warnings),d.evidenceReference,d.evidenceSha256.toLowerCase(),req.user.id]);
 await audit(req,'record','attachment-integrity-snapshot',rows[0].id,{environment:d.environment,status:evaluation.status});res.status(201).json({snapshot:rows[0],evaluation});
});

app.post('/api/admin/data-integrity-performance/integrity-snapshots',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({environment:z.enum(['production','staging','test','development']),measuredAt:z.string().datetime(),applicationCount:z.number().int().nonnegative(),duplicateApplicationNumberCount:z.number().int().nonnegative(),invalidCaseSchemaCount:z.number().int().nonnegative(),missingCommonCaseCount:z.number().int().nonnegative(),ctuLinkMismatchCount:z.number().int().nonnegative(),documentLinkBrokenCount:z.number().int().nonnegative(),photoLinkBrokenCount:z.number().int().nonnegative(),revisionGapCount:z.number().int().nonnegative(),officeScopeMismatchCount:z.number().int().nonnegative(),danglingUserReferenceCount:z.number().int().nonnegative(),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'横断データ整合性測定の入力内容を確認してください。'});const d=parsed.data;const evaluation=evaluateCrossDataIntegritySnapshot(d);if(!evaluation.valid)return res.status(400).json({error:evaluation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO cross_data_integrity_snapshots(environment,measured_at,application_count,duplicate_application_number_count,invalid_case_schema_count,missing_common_case_count,ctu_link_mismatch_count,document_link_broken_count,photo_link_broken_count,revision_gap_count,office_scope_mismatch_count,dangling_user_reference_count,status,blockers,warnings,evidence_reference,evidence_sha256,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18) RETURNING *`,[d.environment,d.measuredAt,d.applicationCount,d.duplicateApplicationNumberCount,d.invalidCaseSchemaCount,d.missingCommonCaseCount,d.ctuLinkMismatchCount,d.documentLinkBrokenCount,d.photoLinkBrokenCount,d.revisionGapCount,d.officeScopeMismatchCount,d.danglingUserReferenceCount,evaluation.status,JSON.stringify(evaluation.blockers),JSON.stringify(evaluation.warnings),d.evidenceReference,d.evidenceSha256.toLowerCase(),req.user.id]);
 await audit(req,'record','cross-data-integrity-snapshot',rows[0].id,{environment:d.environment,status:evaluation.status});res.status(201).json({snapshot:rows[0],evaluation});
});

app.post('/api/admin/data-integrity-performance/issues',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({sourceType:z.enum(['database-search','attachment','cross-data','application-case','ctu-link','other']),sourceReference:z.string().max(1000).default(''),title:z.string().min(1).max(500),severity:z.enum(['critical','high','medium','low']),detectedAt:z.string().datetime(),description:z.string().min(10).max(20000),remediationPlan:z.string().min(10).max(20000),ownerUserId:z.string().uuid()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'整合性課題の入力内容を確認してください。'});const d=parsed.data;const validation=validateIntegrityIssue(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});const dueAt=calculateIssueDue(d.detectedAt,d.severity);
 const {rows}=await query(`INSERT INTO data_integrity_issues(source_type,source_reference,title,severity,detected_at,due_at,description,remediation_plan,owner_user_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[d.sourceType,d.sourceReference,d.title,d.severity,d.detectedAt,dueAt.toISOString(),d.description,d.remediationPlan,d.ownerUserId,req.user.id]);await audit(req,'create','data-integrity-issue',rows[0].id,{severity:d.severity});res.status(201).json({issue:rows[0]});
});

app.post('/api/admin/data-integrity-performance/issues/:id/resolve',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({resolutionNote:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'是正内容と証跡SHA-256を入力してください。'});const found=await query(`SELECT * FROM data_integrity_issues WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'整合性課題が見つかりません。'});const actors=validateIssueActors(row,req.user.id,'resolve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE data_integrity_issues SET status='resolved',resolution_note=$1,evidence_sha256=$2,resolved_by=$3,resolved_at=now(),updated_at=now() WHERE id=$4 AND status NOT IN ('verified','closed','cancelled') RETURNING *`,[parsed.data.resolutionNote,parsed.data.evidenceSha256.toLowerCase(),req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'この課題は完了済みです。'});await audit(req,'resolve','data-integrity-issue',req.params.id,{});res.json({issue:rows[0]});
});

app.post('/api/admin/data-integrity-performance/issues/:id/verify',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({verificationNote:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'検証所見を入力してください。'});const found=await query(`SELECT * FROM data_integrity_issues WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'整合性課題が見つかりません。'});if(row.status!=='resolved')return res.status(409).json({error:'是正済み課題だけを検証できます。'});const actors=validateIssueActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE data_integrity_issues SET status='verified',verification_note=$1,verified_by=$2,verified_at=now(),updated_at=now() WHERE id=$3 RETURNING *`,[parsed.data.verificationNote,req.user.id,req.params.id]);await audit(req,'verify','data-integrity-issue',req.params.id,{});res.json({issue:rows[0]});
});

app.post('/api/admin/data-integrity-performance/reviews',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({periodStart:z.string().date(),periodEnd:z.string().date(),title:z.string().min(1).max(500),summary:z.string().min(10).max(20000),decision:z.string().max(20000).default(''),nextActions:z.string().min(5).max(20000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'データ保証レビューの入力内容を確認してください。'});const d=parsed.data;if(new Date(d.periodEnd)<new Date(d.periodStart))return res.status(400).json({error:'レビュー期間を確認してください。'});
 const {rows}=await query(`INSERT INTO data_assurance_review_cycles(period_start,period_end,title,summary,decision,next_actions,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[d.periodStart,d.periodEnd,d.title,d.summary,d.decision,d.nextActions,req.user.id]);await audit(req,'create','data-assurance-review',rows[0].id,{});res.status(201).json({review:rows[0]});
});

app.post('/api/admin/data-integrity-performance/reviews/:id/submit',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const found=await query(`SELECT * FROM data_assurance_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'データ保証レビューが見つかりません。'});if(String(row.created_by)!==String(req.user.id))return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});
 const [databaseSnapshots,attachmentSnapshots,integritySnapshots,issues]=await Promise.all([query(`SELECT * FROM data_performance_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM attachment_integrity_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM cross_data_integrity_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM data_integrity_issues WHERE status NOT IN ('verified','closed','cancelled')`)]);const gate=evaluateDataAssuranceGate({databaseSnapshots:databaseSnapshots.rows,attachmentSnapshots:attachmentSnapshots.rows,integritySnapshots:integritySnapshots.rows,issues:issues.rows});const snapshot={release:'part533',generatedAt:new Date().toISOString(),databaseSnapshotIds:databaseSnapshots.rows.map(x=>x.id),attachmentSnapshotIds:attachmentSnapshots.rows.map(x=>x.id),integritySnapshotIds:integritySnapshots.rows.map(x=>x.id),issueIds:issues.rows.map(x=>x.id),blockers:gate.blockers};const snapshotSha256=dataAssuranceSha(snapshot);
 const {rows}=await query(`UPDATE data_assurance_review_cycles SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),snapshotSha256,req.user.id,req.params.id]);await audit(req,'submit','data-assurance-review',req.params.id,{blockers:gate.blockers});res.json({review:rows[0],gate});
});

app.post('/api/admin/data-integrity-performance/reviews/:id/review',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM data_assurance_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'データ保証レビューが見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済みレビューだけを確認できます。'});const actors=validateDataReviewActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});
 const {rows}=await query(`UPDATE data_assurance_review_cycles SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,approval_note='',updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','data-assurance-review',req.params.id,{decision:parsed.data.decision});res.json({review:rows[0]});
});

app.post('/api/admin/data-integrity-performance/reviews/:id/approve',authenticate,requireRole(...dataIntegrityWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(1).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM data_assurance_review_cycles WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'データ保証レビューが見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済みレビューだけを承認できます。'});const actors=validateDataReviewActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(dataAssuranceSha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。'});
 const [databaseSnapshots,attachmentSnapshots,integritySnapshots,issues]=await Promise.all([query(`SELECT * FROM data_performance_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM attachment_integrity_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM cross_data_integrity_snapshots ORDER BY measured_at DESC LIMIT 500`),query(`SELECT * FROM data_integrity_issues WHERE status NOT IN ('verified','closed','cancelled')`)]);const gate=evaluateDataAssuranceGate({databaseSnapshots:databaseSnapshots.rows,attachmentSnapshots:attachmentSnapshots.rows,integritySnapshots:integritySnapshots.rows,issues:issues.rows});if(!gate.allowed)return res.status(409).json({error:'データ保証承認条件を満たしていません。',blockers:gate.blockers});
 const {rows}=await query(`UPDATE data_assurance_review_cycles SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','data-assurance-review',req.params.id,{});res.json({review:rows[0],gate});
});

// Part 533: integrated phases 31-33 - quality rules, change impact analysis and release distribution governance.
const qualityReleaseReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator'];
const qualityReleaseWriteRoles=['safety-environment-admin'];
const qualityReleaseSha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/quality-release-governance',authenticate,requireRole(...qualityReleaseReadRoles),async(_req,res)=>{
 const [users,runs,candidates,impacts,defects,releases]=await Promise.all([
  query(`SELECT id,display_name,role,office_id FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator','office-admin') ORDER BY display_name`),
  query(`SELECT r.*,u.display_name recorded_name FROM quality_rule_runs r JOIN users u ON u.id=r.recorded_by ORDER BY r.executed_at DESC LIMIT 300`),
  query(`SELECT c.*,o.display_name owner_name,cr.display_name creator_name,rv.display_name reviewer_name,ap.display_name applier_name,v.display_name verifier_name FROM quality_correction_candidates c JOIN users o ON o.id=c.owner_user_id JOIN users cr ON cr.id=c.created_by LEFT JOIN users rv ON rv.id=c.reviewed_by LEFT JOIN users ap ON ap.id=c.applied_by LEFT JOIN users v ON v.id=c.verified_by ORDER BY CASE c.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,c.detected_at DESC LIMIT 500`),
  query(`SELECT i.*,c.display_name creator_name,r.display_name reviewer_name,a.display_name approver_name FROM change_impact_analyses i JOIN users c ON c.id=i.created_by LEFT JOIN users r ON r.id=i.reviewed_by LEFT JOIN users a ON a.id=i.approved_by ORDER BY i.analyzed_at DESC LIMIT 200`),
  query(`SELECT d.*,o.display_name owner_name,r.display_name resolver_name,v.display_name verifier_name FROM release_governance_defects d JOIN users o ON o.id=d.owner_user_id LEFT JOIN users r ON r.id=d.resolved_by LEFT JOIN users v ON v.id=d.verified_by ORDER BY CASE d.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,d.due_at LIMIT 500`),
  query(`SELECT r.*,c.display_name creator_name,rv.display_name reviewer_name,a.display_name approver_name,p.display_name publisher_name,v.display_name verifier_name FROM release_distribution_candidates r JOIN users c ON c.id=r.created_by LEFT JOIN users rv ON rv.id=r.reviewed_by LEFT JOIN users a ON a.id=r.approved_by LEFT JOIN users p ON p.id=r.published_by LEFT JOIN users v ON v.id=r.verified_by ORDER BY r.created_at DESC LIMIT 100`)
 ]);
 const gate=evaluateReleaseGate({qualityRuns:runs.rows,correctionCandidates:candidates.rows,impactAnalyses:impacts.rows,defects:defects.rows,releaseCandidate:releases.rows[0]||null});
 res.json({users:users.rows,qualityRuns:runs.rows,correctionCandidates:candidates.rows,impactAnalyses:impacts.rows,defects:defects.rows,releases:releases.rows,gate});
});

app.post('/api/admin/quality-release-governance/rule-runs',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({domain:z.enum(['dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other']),executedAt:z.string().datetime(),ruleSetVersion:z.string().min(1).max(200),evaluatedCount:z.number().int().nonnegative(),violationCount:z.number().int().nonnegative(),criticalViolationCount:z.number().int().nonnegative(),autoFixCandidateCount:z.number().int().nonnegative(),manualReviewCount:z.number().int().nonnegative(),falsePositivePercent:z.number().min(0).max(100),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'品質ルール実行結果の入力内容を確認してください。'});const d=parsed.data,evaluation=evaluateQualityRuleRun(d);if(!evaluation.valid)return res.status(400).json({error:evaluation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO quality_rule_runs(domain,executed_at,rule_set_version,evaluated_count,violation_count,critical_violation_count,auto_fix_candidate_count,manual_review_count,false_positive_percent,violation_rate,status,blockers,warnings,evidence_reference,evidence_sha256,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16) RETURNING *`,[d.domain,d.executedAt,d.ruleSetVersion,d.evaluatedCount,d.violationCount,d.criticalViolationCount,d.autoFixCandidateCount,d.manualReviewCount,d.falsePositivePercent,evaluation.violationRate,evaluation.status,JSON.stringify(evaluation.blockers),JSON.stringify(evaluation.warnings),d.evidenceReference,d.evidenceSha256.toLowerCase(),req.user.id]);await audit(req,'record','quality-rule-run',rows[0].id,{domain:d.domain,status:evaluation.status});res.status(201).json({run:rows[0],evaluation});
});

app.post('/api/admin/quality-release-governance/candidates',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({ruleRunId:z.string().uuid().optional().nullable(),ruleId:z.string().min(1).max(200),domain:z.enum(['dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other']),entityReference:z.string().min(1).max(1000),fieldName:z.string().min(1).max(300),currentValueSha256:z.string().regex(/^[a-f0-9]{64}$/i),proposedValueSha256:z.string().regex(/^[a-f0-9]{64}$/i),severity:z.enum(['critical','high','medium','low']),confidencePercent:z.number().min(0).max(100),rationale:z.string().min(10).max(10000),ownerUserId:z.string().uuid(),detectedAt:z.string().datetime()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'自動是正候補の入力内容を確認してください。'});const d=parsed.data,validation=validateCorrectionCandidate(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});
 const {rows}=await query(`INSERT INTO quality_correction_candidates(rule_run_id,rule_id,domain,entity_reference,field_name,current_value_sha256,proposed_value_sha256,severity,confidence_percent,rationale,owner_user_id,detected_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[d.ruleRunId||null,d.ruleId,d.domain,d.entityReference,d.fieldName,d.currentValueSha256.toLowerCase(),d.proposedValueSha256.toLowerCase(),d.severity,d.confidencePercent,d.rationale,d.ownerUserId,d.detectedAt,req.user.id]);await audit(req,'create','quality-correction-candidate',rows[0].id,{severity:d.severity});res.status(201).json({candidate:rows[0]});
});

app.post('/api/admin/quality-release-governance/candidates/:id/review',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({decision:z.enum(['reviewed','rejected']),note:z.string().min(5).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM quality_correction_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'是正候補が見つかりません。'});if(row.status!=='open')return res.status(409).json({error:'未確認の候補だけを確認できます。'});const actors=validateCorrectionActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE quality_correction_candidates SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','quality-correction-candidate',req.params.id,{decision:parsed.data.decision});res.json({candidate:rows[0]});
});

app.post('/api/admin/quality-release-governance/candidates/:id/apply',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(10).max(10000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'適用内容と証跡SHA-256を入力してください。'});const found=await query(`SELECT * FROM quality_correction_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'是正候補が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み候補だけを適用できます。'});const actors=validateCorrectionActors(row,req.user.id,'apply');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE quality_correction_candidates SET status='applied',applied_by=$1,applied_at=now(),application_note=$2,application_evidence_sha256=$3,updated_at=now() WHERE id=$4 RETURNING *`,[req.user.id,parsed.data.note,parsed.data.evidenceSha256.toLowerCase(),req.params.id]);await audit(req,'apply','quality-correction-candidate',req.params.id,{});res.json({candidate:rows[0]});
});

app.post('/api/admin/quality-release-governance/candidates/:id/verify',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'効果確認所見を入力してください。'});const found=await query(`SELECT * FROM quality_correction_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'是正候補が見つかりません。'});if(row.status!=='applied')return res.status(409).json({error:'適用済み候補だけを検証できます。'});const actors=validateCorrectionActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE quality_correction_candidates SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'verify','quality-correction-candidate',req.params.id,{});res.json({candidate:rows[0]});
});

app.post('/api/admin/quality-release-governance/impacts',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({changeType:z.enum(['application','database','master-data','regulation','configuration','security','mixed']),sourceRelease:z.string().min(1).max(100),targetRelease:z.string().min(1).max(100),analyzedAt:z.string().datetime(),changedFileCount:z.number().int().nonnegative(),changedTableCount:z.number().int().nonnegative(),impactedComponents:z.array(z.string().min(1)).min(1),regressionTargets:z.array(z.string().min(1)).min(1),riskLevel:z.enum(['critical','high','medium','low']),summary:z.string().min(10).max(20000),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'変更影響分析の入力内容を確認してください。'});const d=parsed.data,evaluation=evaluateChangeImpact(d);if(!evaluation.valid)return res.status(400).json({error:evaluation.errors.join(' ')});const {rows}=await query(`INSERT INTO change_impact_analyses(change_type,source_release,target_release,analyzed_at,changed_file_count,changed_table_count,impacted_components,regression_targets,risk_level,summary,evidence_reference,evidence_sha256,created_by) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13) RETURNING *`,[d.changeType,d.sourceRelease,d.targetRelease,d.analyzedAt,d.changedFileCount,d.changedTableCount,JSON.stringify(d.impactedComponents),JSON.stringify(d.regressionTargets),d.riskLevel,d.summary,d.evidenceReference,d.evidenceSha256.toLowerCase(),req.user.id]);await audit(req,'create','change-impact-analysis',rows[0].id,{risk:d.riskLevel});res.status(201).json({impact:rows[0],evaluation});
});

app.post('/api/admin/quality-release-governance/impacts/:id/review',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(5).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM change_impact_analyses WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'変更影響分析が見つかりません。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'確認できる状態ではありません。'});const actors=validateImpactActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE change_impact_analyses SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','change-impact-analysis',req.params.id,{decision:parsed.data.decision});res.json({impact:rows[0]});
});

app.post('/api/admin/quality-release-governance/impacts/:id/approve',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(5).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM change_impact_analyses WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'変更影響分析が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み分析だけを承認できます。'});const actors=validateImpactActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE change_impact_analyses SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','change-impact-analysis',req.params.id,{});res.json({impact:rows[0]});
});

app.post('/api/admin/quality-release-governance/defects',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({releaseName:z.string().min(1).max(100),severity:z.enum(['critical','high','medium','low']),title:z.string().min(1).max(500),description:z.string().min(10).max(20000),detectedAt:z.string().datetime(),ownerUserId:z.string().uuid()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'リリース不具合の入力内容を確認してください。'});const d=parsed.data,validation=validateReleaseDefect(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});const dueAt=calculateDefectDue(d.detectedAt,d.severity);const {rows}=await query(`INSERT INTO release_governance_defects(release_name,severity,title,description,detected_at,due_at,owner_user_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[d.releaseName,d.severity,d.title,d.description,d.detectedAt,dueAt.toISOString(),d.ownerUserId,req.user.id]);await audit(req,'create','release-governance-defect',rows[0].id,{severity:d.severity});res.status(201).json({defect:rows[0]});
});

app.post('/api/admin/quality-release-governance/defects/:id/resolve',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(10).max(20000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'解決内容と証跡SHA-256を入力してください。'});const found=await query(`SELECT * FROM release_governance_defects WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'不具合が見つかりません。'});if(String(row.owner_user_id)===String(req.user.id))return res.status(409).json({error:'責任者本人だけで解決を確定できません。'});const {rows}=await query(`UPDATE release_governance_defects SET status='resolved',resolution_note=$1,evidence_sha256=$2,resolved_by=$3,resolved_at=now(),updated_at=now() WHERE id=$4 AND status='open' RETURNING *`,[parsed.data.note,parsed.data.evidenceSha256.toLowerCase(),req.user.id,req.params.id]);if(!rows[0])return res.status(409).json({error:'解決できる状態ではありません。'});await audit(req,'resolve','release-governance-defect',req.params.id,{});res.json({defect:rows[0]});
});

app.post('/api/admin/quality-release-governance/defects/:id/verify',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'検証所見を入力してください。'});const found=await query(`SELECT * FROM release_governance_defects WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'不具合が見つかりません。'});if(row.status!=='resolved')return res.status(409).json({error:'解決済み不具合だけを検証できます。'});if([row.owner_user_id,row.resolved_by].some(x=>String(x||'')===String(req.user.id)))return res.status(409).json({error:'責任者・解決実施者とは別の利用者が検証してください。'});const {rows}=await query(`UPDATE release_governance_defects SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'verify','release-governance-defect',req.params.id,{});res.json({defect:rows[0]});
});

app.post('/api/admin/quality-release-governance/releases',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const evidenceSchema=z.object({type:z.string().min(1).max(100),reference:z.string().min(1).max(1000),sha256:z.string().regex(/^[a-f0-9]{64}$/i)});const schema=z.object({releaseName:z.string().regex(/^part\d+$/i),baseRelease:z.string().regex(/^part\d+$/i),releaseSummary:z.string().min(10).max(20000),packageSha256:z.string().regex(/^[a-f0-9]{64}$/i),rollbackPackageSha256:z.string().regex(/^[a-f0-9]{64}$/i),evidenceItems:z.array(evidenceSchema)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'リリース候補の入力内容を確認してください。'});const d=parsed.data,validation=validateReleaseCandidate(d);if(!validation.valid)return res.status(400).json({error:validation.errors.join(' ')});const {rows}=await query(`INSERT INTO release_distribution_candidates(release_name,base_release,release_summary,package_sha256,rollback_package_sha256,evidence_items,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,[d.releaseName.toLowerCase(),d.baseRelease.toLowerCase(),d.releaseSummary,d.packageSha256.toLowerCase(),d.rollbackPackageSha256.toLowerCase(),JSON.stringify(d.evidenceItems.map(x=>({...x,sha256:x.sha256.toLowerCase()}))),req.user.id]);await audit(req,'create','release-distribution-candidate',rows[0].id,{release:d.releaseName});res.status(201).json({release:rows[0]});
});

app.post('/api/admin/quality-release-governance/releases/:id/submit',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const found=await query(`SELECT * FROM release_distribution_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'リリース候補が見つかりません。'});if(String(row.created_by)!==String(req.user.id))return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});const [runs,candidates,impacts,defects]=await Promise.all([query(`SELECT * FROM quality_rule_runs ORDER BY executed_at DESC LIMIT 300`),query(`SELECT * FROM quality_correction_candidates WHERE status NOT IN ('verified','rejected','cancelled')`),query(`SELECT * FROM change_impact_analyses ORDER BY analyzed_at DESC LIMIT 100`),query(`SELECT * FROM release_governance_defects WHERE release_name=$1 AND status NOT IN ('verified','closed','cancelled')`,[row.release_name])]);const gate=evaluateReleaseGate({qualityRuns:runs.rows,correctionCandidates:candidates.rows,impactAnalyses:impacts.rows,defects:defects.rows,releaseCandidate:row});const snapshot={release:'part534',generatedAt:new Date().toISOString(),qualityRunIds:runs.rows.map(x=>x.id),candidateIds:candidates.rows.map(x=>x.id),impactIds:impacts.rows.map(x=>x.id),defectIds:defects.rows.map(x=>x.id),blockers:gate.blockers};const snapshotSha256=qualityReleaseSha(snapshot);const {rows}=await query(`UPDATE release_distribution_candidates SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,approved_by=NULL,approved_at=NULL,published_by=NULL,published_at=NULL,verified_by=NULL,verified_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),snapshotSha256,req.user.id,req.params.id]);await audit(req,'submit','release-distribution-candidate',req.params.id,{blockers:gate.blockers});res.json({release:rows[0],gate});
});

app.post('/api/admin/quality-release-governance/releases/:id/review',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(5).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM release_distribution_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'リリース候補が見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済み候補だけを確認できます。'});const actors=validateReleaseActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE release_distribution_candidates SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,approved_at=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,req.params.id]);await audit(req,'review','release-distribution-candidate',req.params.id,{decision:parsed.data.decision});res.json({release:rows[0]});
});

app.post('/api/admin/quality-release-governance/releases/:id/approve',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(5).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM release_distribution_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'リリース候補が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み候補だけを承認できます。'});const actors=validateReleaseActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(qualityReleaseSha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。'});const [runs,candidates,impacts,defects]=await Promise.all([query(`SELECT * FROM quality_rule_runs ORDER BY executed_at DESC LIMIT 300`),query(`SELECT * FROM quality_correction_candidates WHERE status NOT IN ('verified','rejected','cancelled')`),query(`SELECT * FROM change_impact_analyses ORDER BY analyzed_at DESC LIMIT 100`),query(`SELECT * FROM release_governance_defects WHERE release_name=$1 AND status NOT IN ('verified','closed','cancelled')`,[row.release_name])]);const gate=evaluateReleaseGate({qualityRuns:runs.rows,correctionCandidates:candidates.rows,impactAnalyses:impacts.rows,defects:defects.rows,releaseCandidate:row});if(!gate.allowed)return res.status(409).json({error:'リリース承認条件を満たしていません。',blockers:gate.blockers});const {rows}=await query(`UPDATE release_distribution_candidates SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'approve','release-distribution-candidate',req.params.id,{});res.json({release:rows[0],gate});
});

app.post('/api/admin/quality-release-governance/releases/:id/publish',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({distributionReference:z.string().min(1).max(1000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布参照番号を入力してください。'});const found=await query(`SELECT * FROM release_distribution_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'リリース候補が見つかりません。'});if(row.status!=='approved')return res.status(409).json({error:'承認済み候補だけを配布できます。'});const actors=validateReleaseActors(row,req.user.id,'publish');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE release_distribution_candidates SET status='published',published_by=$1,published_at=now(),distribution_reference=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.distributionReference,req.params.id]);await audit(req,'publish','release-distribution-candidate',req.params.id,{reference:parsed.data.distributionReference});res.json({release:rows[0]});
});

app.post('/api/admin/quality-release-governance/releases/:id/verify',authenticate,requireRole(...qualityReleaseWriteRoles),async(req,res)=>{
 const schema=z.object({note:z.string().min(10).max(10000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布後確認所見を入力してください。'});const found=await query(`SELECT * FROM release_distribution_candidates WHERE id=$1`,[req.params.id]);const row=found.rows[0];if(!row)return res.status(404).json({error:'リリース候補が見つかりません。'});if(row.status!=='published')return res.status(409).json({error:'配布済み候補だけを確認できます。'});const actors=validateReleaseActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE release_distribution_candidates SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,req.params.id]);await audit(req,'verify','release-distribution-candidate',req.params.id,{});res.json({release:rows[0]});
});



const distributionContinuityReadRoles=['safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator'];
const distributionContinuityWriteRoles=['safety-environment-admin'];
const distributionContinuitySha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

app.get('/api/admin/distribution-continuity',authenticate,requireRole(...distributionContinuityReadRoles),async(_req,res)=>{
 const [users,packages,tests,exercises,reviews]=await Promise.all([
  query(`SELECT id,display_name,role,office_id FROM users WHERE active=true AND role IN ('safety-environment-admin','safety-environment-director','safety-environment-staff','revision-validator','office-admin') ORDER BY display_name`),
  query(`SELECT p.*,c.display_name creator_name,e.display_name executor_name,r.display_name reviewer_name,a.display_name approver_name,pb.display_name publisher_name,v.display_name verifier_name FROM master_distribution_packages p LEFT JOIN users c ON c.id=p.created_by LEFT JOIN users e ON e.id=p.submitted_by LEFT JOIN users r ON r.id=p.reviewed_by LEFT JOIN users a ON a.id=p.approved_by LEFT JOIN users pb ON pb.id=p.published_by LEFT JOIN users v ON v.id=p.verified_by ORDER BY p.generated_at DESC LIMIT 300`),
  query(`SELECT t.*,u.display_name recorded_name FROM client_compatibility_tests t JOIN users u ON u.id=t.recorded_by ORDER BY t.tested_at DESC LIMIT 500`),
  query(`SELECT x.*,c.display_name creator_name,e.display_name executor_name,r.display_name reviewer_name,rs.display_name reconciler_name,v.display_name verifier_name FROM continuity_exercises x JOIN users c ON c.id=x.created_by JOIN users e ON e.id=x.executor_user_id LEFT JOIN users r ON r.id=x.reviewed_by LEFT JOIN users rs ON rs.id=x.reconciled_by LEFT JOIN users v ON v.id=x.verified_by ORDER BY x.restored_at DESC LIMIT 300`),
  query(`SELECT r.*,u.display_name creator_name,rv.display_name reviewer_name,a.display_name approver_name FROM distribution_continuity_reviews r JOIN users u ON u.id=r.created_by LEFT JOIN users rv ON rv.id=r.reviewed_by LEFT JOIN users a ON a.id=r.approved_by ORDER BY r.period_end DESC,r.created_at DESC LIMIT 100`)
 ]);
 const gate=evaluateDistributionContinuityGate({packages:packages.rows,compatibilityTests:tests.rows,exercises:exercises.rows});
 const latestDevice=device=>tests.rows.find(x=>x.device_class===device);
 res.json({users:users.rows,packages:packages.rows,compatibilityTests:tests.rows,exercises:exercises.rows,reviews:reviews.rows,gate,summary:{distributionStatus:packages.rows[0]?.status||null,desktopStatus:latestDevice('desktop')?.status||null,smartphoneStatus:latestDevice('smartphone')?.status||null,continuityStatus:exercises.rows[0]?.status||null}});
});

app.post('/api/admin/distribution-continuity/packages',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{
 const schema=z.object({packageType:z.enum(['full','delta','hotfix','rollback']),dataDomain:z.enum(['dangerous-goods','domestic-law','code-mapping','application-case','all']),sourceRelease:z.string().regex(/^part\d+$/i),targetRelease:z.string().regex(/^part\d+$/i),generatedAt:z.coerce.date(),schemaVersion:z.string().min(1).max(100),baseRecordCount:z.number().int().nonnegative(),addedCount:z.number().int().nonnegative(),changedCount:z.number().int().nonnegative(),removedCount:z.number().int().nonnegative(),manifestSha256:z.string().regex(/^[a-f0-9]{64}$/i),packageSha256:z.string().regex(/^[a-f0-9]{64}$/i),rollbackSha256:z.string().regex(/^[a-f0-9]{64}$/i),evidenceReference:z.string().min(1).max(1000),note:z.string().max(10000).default('')});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布候補の入力内容を確認してください。'});const d=parsed.data,r=evaluateDistributionPackage(d);if(!r.valid)return res.status(400).json({error:r.errors.join(' ')});
 const {rows}=await query(`INSERT INTO master_distribution_packages(package_type,data_domain,source_release,target_release,generated_at,schema_version,base_record_count,added_count,changed_count,removed_count,expected_record_count,result_status,manifest_sha256,package_sha256,rollback_sha256,evidence_reference,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,[d.packageType,d.dataDomain,d.sourceRelease.toLowerCase(),d.targetRelease.toLowerCase(),d.generatedAt,d.schemaVersion,d.baseRecordCount,d.addedCount,d.changedCount,d.removedCount,r.expectedRecordCount,r.status,d.manifestSha256.toLowerCase(),d.packageSha256.toLowerCase(),d.rollbackSha256.toLowerCase(),d.evidenceReference,d.note,req.user.id]);await audit(req,'create','master-distribution-package',rows[0].id,{target:d.targetRelease,status:r.status});res.status(201).json({package:rows[0],evaluation:r});
});
app.post('/api/admin/distribution-continuity/packages/:id/submit',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const found=await query(`SELECT * FROM master_distribution_packages WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'配布候補が見つかりません。'});if(String(row.created_by)!==String(req.user.id))return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});const snapshot={release:'part534',packageId:row.id,targetRelease:row.target_release,resultStatus:row.result_status,manifestSha256:row.manifest_sha256,packageSha256:row.package_sha256,rollbackSha256:row.rollback_sha256,generatedAt:new Date().toISOString()},sha=distributionContinuitySha(snapshot);const {rows}=await query(`UPDATE master_distribution_packages SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,approved_by=NULL,published_by=NULL,verified_by=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),sha,req.user.id,row.id]);await audit(req,'submit','master-distribution-package',row.id,{});res.json({package:rows[0]});});
app.post('/api/admin/distribution-continuity/packages/:id/review',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(5).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM master_distribution_packages WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'配布候補が見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済み候補だけを確認できます。'});const actors=validateDistributionActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE master_distribution_packages SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,row.id]);await audit(req,'review','master-distribution-package',row.id,{decision:parsed.data.decision});res.json({package:rows[0]});});
app.post('/api/admin/distribution-continuity/packages/:id/approve',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(5).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM master_distribution_packages WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'配布候補が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み候補だけを承認できます。'});const actors=validateDistributionActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(distributionContinuitySha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の配布証跡が変更されています。'});if(row.result_status==='critical')return res.status(409).json({error:'重大状態の配布候補は承認できません。'});const {rows}=await query(`UPDATE master_distribution_packages SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'approve','master-distribution-package',row.id,{});res.json({package:rows[0]});});
app.post('/api/admin/distribution-continuity/packages/:id/publish',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({distributionReference:z.string().min(1).max(1000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布参照番号を入力してください。'});const found=await query(`SELECT * FROM master_distribution_packages WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'配布候補が見つかりません。'});if(row.status!=='approved')return res.status(409).json({error:'承認済み候補だけを配布できます。'});const actors=validateDistributionActors(row,req.user.id,'publish');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE master_distribution_packages SET status='published',published_by=$1,published_at=now(),distribution_reference=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.distributionReference,row.id]);await audit(req,'publish','master-distribution-package',row.id,{});res.json({package:rows[0]});});
app.post('/api/admin/distribution-continuity/packages/:id/verify',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(10).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'配布後確認所見を入力してください。'});const found=await query(`SELECT * FROM master_distribution_packages WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'配布候補が見つかりません。'});if(row.status!=='published')return res.status(409).json({error:'配布済み候補だけを確認できます。'});const actors=validateDistributionActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE master_distribution_packages SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'verify','master-distribution-package',row.id,{});res.json({package:rows[0]});});

app.post('/api/admin/distribution-continuity/compatibility-tests',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({environmentId:z.string().min(1).max(200),deviceClass:z.enum(['desktop','smartphone','tablet']),browser:z.enum(['chrome','edge','safari','firefox']),browserVersion:z.string().min(1).max(100),os:z.string().min(1).max(200),testedAt:z.coerce.date(),onlineSuccess:z.boolean(),offlineStartup:z.boolean(),syncSuccess:z.boolean(),layoutSuccess:z.boolean(),pdfDeepLinkSuccess:z.boolean(),storageSuccess:z.boolean(),serviceWorkerSuccess:z.boolean(),testCount:z.number().int().positive(),failureCount:z.number().int().nonnegative(),evidenceReference:z.string().min(1).max(1000),evidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i),note:z.string().max(10000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'互換性試験の入力内容を確認してください。'});const d=parsed.data,r=evaluateClientCompatibility(d);if(!r.valid)return res.status(400).json({error:r.errors.join(' ')});const {rows}=await query(`INSERT INTO client_compatibility_tests(environment_id,device_class,browser,browser_version,os,tested_at,online_success,offline_startup,sync_success,layout_success,pdf_deep_link_success,storage_success,service_worker_success,test_count,failure_count,status,warnings,evidence_reference,evidence_sha256,note,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21) RETURNING *`,[d.environmentId,d.deviceClass,d.browser,d.browserVersion,d.os,d.testedAt,d.onlineSuccess,d.offlineStartup,d.syncSuccess,d.layoutSuccess,d.pdfDeepLinkSuccess,d.storageSuccess,d.serviceWorkerSuccess,d.testCount,d.failureCount,r.status,JSON.stringify(r.warnings),d.evidenceReference,d.evidenceSha256.toLowerCase(),d.note,req.user.id]);await audit(req,'create','client-compatibility-test',rows[0].id,{device:d.deviceClass,status:r.status});res.status(201).json({test:rows[0],evaluation:r});});

app.post('/api/admin/distribution-continuity/exercises',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({outageType:z.enum(['api','database','storage','network','authentication','master-sync','other']),startedAt:z.coerce.date(),restoredAt:z.coerce.date(),manualRecordCount:z.number().int().nonnegative(),reenteredCount:z.number().int().nonnegative(),conflictCount:z.number().int().nonnegative(),lostCount:z.number().int().nonnegative(),duplicateCount:z.number().int().nonnegative(),playbookReference:z.string().min(1).max(1000),manualExportSha256:z.string().regex(/^[a-f0-9]{64}$/i),syncEvidenceSha256:z.string().regex(/^[a-f0-9]{64}$/i),executorUserId:z.string().uuid(),note:z.string().max(10000).default('')});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'手動継続訓練の入力内容を確認してください。'});const d=parsed.data;if(String(d.executorUserId)===String(req.user.id))return res.status(409).json({error:'記録者とは別の利用者を実行担当者にしてください。'});const r=validateContinuityExercise(d);if(!r.valid)return res.status(400).json({error:r.errors.join(' ')});const {rows}=await query(`INSERT INTO continuity_exercises(outage_type,started_at,restored_at,duration_minutes,manual_record_count,reentered_count,conflict_count,lost_count,duplicate_count,result_status,playbook_reference,manual_export_sha256,sync_evidence_sha256,note,executor_user_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[d.outageType,d.startedAt,d.restoredAt,r.durationMinutes,d.manualRecordCount,d.reenteredCount,d.conflictCount,d.lostCount,d.duplicateCount,r.status,d.playbookReference,d.manualExportSha256.toLowerCase(),d.syncEvidenceSha256.toLowerCase(),d.note,d.executorUserId,req.user.id]);await audit(req,'create','continuity-exercise',rows[0].id,{status:r.status});res.status(201).json({exercise:rows[0],evaluation:r});});
app.post('/api/admin/distribution-continuity/exercises/:id/review',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(10).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認所見を入力してください。'});const found=await query(`SELECT * FROM continuity_exercises WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'訓練記録が見つかりません。'});if(row.status!=='recorded')return res.status(409).json({error:'記録済み訓練だけを確認できます。'});const actors=validateContinuityActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE continuity_exercises SET status='reviewed',reviewed_by=$1,reviewed_at=now(),review_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'review','continuity-exercise',row.id,{});res.json({exercise:rows[0]});});
app.post('/api/admin/distribution-continuity/exercises/:id/reconcile',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(10).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'再同期結果を入力してください。'});const found=await query(`SELECT * FROM continuity_exercises WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'訓練記録が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済み訓練だけを再同期完了にできます。'});const actors=validateContinuityActors(row,req.user.id,'reconcile');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE continuity_exercises SET status='reconciled',reconciled_by=$1,reconciled_at=now(),reconciliation_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'reconcile','continuity-exercise',row.id,{});res.json({exercise:rows[0]});});
app.post('/api/admin/distribution-continuity/exercises/:id/verify',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(10).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'最終確認所見を入力してください。'});const found=await query(`SELECT * FROM continuity_exercises WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'訓練記録が見つかりません。'});if(row.status!=='reconciled')return res.status(409).json({error:'再同期済み訓練だけを最終確認できます。'});const actors=validateContinuityActors(row,req.user.id,'verify');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(row.result_status==='critical')return res.status(409).json({error:'重大状態の訓練は最終確認できません。再訓練してください。'});const {rows}=await query(`UPDATE continuity_exercises SET status='verified',verified_by=$1,verified_at=now(),verification_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'verify','continuity-exercise',row.id,{});res.json({exercise:rows[0]});});

app.post('/api/admin/distribution-continuity/reviews',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const evidence=z.object({type:z.string().min(1).max(100),reference:z.string().min(1).max(1000),sha256:z.string().regex(/^[a-f0-9]{64}$/i)});const schema=z.object({targetRelease:z.string().regex(/^part\d+$/i),periodStart:z.coerce.date(),periodEnd:z.coerce.date(),summary:z.string().min(10).max(20000),evidenceItems:z.array(evidence)}),parsed=schema.safeParse(req.body);if(!parsed.success||parsed.data.periodEnd<parsed.data.periodStart)return res.status(400).json({error:'統合レビューの入力内容を確認してください。'});const d=parsed.data,gate=evaluateDistributionContinuityGate({reviewCandidate:d});if(gate.blockers.some(x=>x.startsWith('必須証跡')||x.startsWith('証跡SHA')))return res.status(400).json({error:gate.blockers.join(' ')});const {rows}=await query(`INSERT INTO distribution_continuity_reviews(target_release,period_start,period_end,summary,evidence_items,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,[d.targetRelease.toLowerCase(),d.periodStart,d.periodEnd,d.summary,JSON.stringify(d.evidenceItems.map(x=>({...x,sha256:x.sha256.toLowerCase()}))),req.user.id]);await audit(req,'create','distribution-continuity-review',rows[0].id,{});res.status(201).json({review:rows[0]});});
app.post('/api/admin/distribution-continuity/reviews/:id/submit',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const found=await query(`SELECT * FROM distribution_continuity_reviews WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'レビューが見つかりません。'});if(String(row.created_by)!==String(req.user.id))return res.status(403).json({error:'作成者本人が提出してください。'});if(!['draft','returned'].includes(row.status))return res.status(409).json({error:'提出できる状態ではありません。'});const [packages,tests,exercises]=await Promise.all([query(`SELECT * FROM master_distribution_packages ORDER BY generated_at DESC LIMIT 300`),query(`SELECT * FROM client_compatibility_tests ORDER BY tested_at DESC LIMIT 500`),query(`SELECT * FROM continuity_exercises ORDER BY restored_at DESC LIMIT 300`)]);const gate=evaluateDistributionContinuityGate({packages:packages.rows,compatibilityTests:tests.rows,exercises:exercises.rows,reviewCandidate:row});const snapshot={release:'part534',generatedAt:new Date().toISOString(),packageIds:packages.rows.map(x=>x.id),testIds:tests.rows.map(x=>x.id),exerciseIds:exercises.rows.map(x=>x.id),blockers:gate.blockers},sha=distributionContinuitySha(snapshot);const {rows}=await query(`UPDATE distribution_continuity_reviews SET status='submitted',snapshot=$1::jsonb,snapshot_sha256=$2,submitted_by=$3,submitted_at=now(),reviewed_by=NULL,approved_by=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[JSON.stringify(snapshot),sha,req.user.id,row.id]);await audit(req,'submit','distribution-continuity-review',row.id,{blockers:gate.blockers});res.json({review:rows[0],gate});});
app.post('/api/admin/distribution-continuity/reviews/:id/review',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(5).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'確認結果と所見を入力してください。'});const found=await query(`SELECT * FROM distribution_continuity_reviews WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'レビューが見つかりません。'});if(row.status!=='submitted')return res.status(409).json({error:'提出済みレビューだけを確認できます。'});const actors=validateDistributionReviewActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});const {rows}=await query(`UPDATE distribution_continuity_reviews SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,approved_by=NULL,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,row.id]);await audit(req,'review','distribution-continuity-review',row.id,{decision:parsed.data.decision});res.json({review:rows[0]});});
app.post('/api/admin/distribution-continuity/reviews/:id/approve',authenticate,requireRole(...distributionContinuityWriteRoles),async(req,res)=>{const schema=z.object({note:z.string().min(5).max(10000)}),parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'承認所見を入力してください。'});const found=await query(`SELECT * FROM distribution_continuity_reviews WHERE id=$1`,[req.params.id]),row=found.rows[0];if(!row)return res.status(404).json({error:'レビューが見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'確認済みレビューだけを承認できます。'});const actors=validateDistributionReviewActors(row,req.user.id,'approve');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(distributionContinuitySha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'提出時の証跡スナップショットが変更されています。'});const [packages,tests,exercises]=await Promise.all([query(`SELECT * FROM master_distribution_packages ORDER BY generated_at DESC LIMIT 300`),query(`SELECT * FROM client_compatibility_tests ORDER BY tested_at DESC LIMIT 500`),query(`SELECT * FROM continuity_exercises ORDER BY restored_at DESC LIMIT 300`)]);const gate=evaluateDistributionContinuityGate({packages:packages.rows,compatibilityTests:tests.rows,exercises:exercises.rows,reviewCandidate:row});if(!gate.allowed)return res.status(409).json({error:'統合レビューの承認条件を満たしていません。',blockers:gate.blockers});const {rows}=await query(`UPDATE distribution_continuity_reviews SET status='approved',approved_by=$1,approved_at=now(),approval_note=$2,updated_at=now() WHERE id=$3 RETURNING *`,[req.user.id,parsed.data.note,row.id]);await audit(req,'approve','distribution-continuity-review',row.id,{});res.json({review:rows[0],gate});});


// Part 535: application/request intake, pre-check and handoff audit metadata.
const intakeSchema=z.object({
  sourceFileName:z.string().max(500).optional().default(''),
  sourceFormat:z.enum(['xls','xlsx','csv']),
  sourceSha256:z.string().regex(/^[a-f0-9]{64}$/i),
  sourceSizeBytes:z.number().int().nonnegative().max(104857600).default(0),
  originalFileStored:z.literal(false).default(false),
  importedAt:z.string().datetime(),
  cargoCount:z.number().int().nonnegative(),
  validationStatus:z.enum(['ready','review','blocked']),
  blockerCount:z.number().int().nonnegative().default(0),
  warningCount:z.number().int().nonnegative().default(0),
  validationSummary:z.record(z.any()).default({}),
  checklist:z.array(z.record(z.any())).max(100).default([]),
  applicationId:z.string().uuid().optional().nullable(),
  status:z.enum(['imported','reviewed','registered','updated']).default('imported')
});

app.get('/api/application-intake-workflows',authenticate,requireOperationalRead,async(req,res)=>{
  const officeId=officeScope(req.user,req.query.officeId);
  const values=[];let where='1=1';if(officeId){values.push(officeId);where+=` AND w.office_id=$${values.length}`;}
  const {rows}=await query(`SELECT w.id,w.application_id,w.source_label,w.source_format,w.source_sha256,w.source_size_bytes,w.imported_at,w.cargo_count,w.validation_status,w.blocker_count,w.warning_count,w.status,w.created_at,w.reviewed_at,w.registered_at,u.display_name created_by_name,ru.display_name reviewed_by_name,gu.display_name registered_by_name FROM application_intake_workflows w LEFT JOIN users u ON u.id=w.created_by LEFT JOIN users ru ON ru.id=w.reviewed_by LEFT JOIN users gu ON gu.id=w.registered_by WHERE ${where} ORDER BY w.created_at DESC LIMIT 300`,values);
  res.json({workflows:rows});
});

app.post('/api/application-intake-workflows',authenticate,requireOperationalWrite,async(req,res)=>{
  const parsed=intakeSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'申請書・依頼書の取込記録を確認してください。'});
  const d=parsed.data,evaluation=evaluateIntakeRecord(d);if(!evaluation.allowed&&d.status!=='imported')return res.status(409).json({error:'登録条件を満たしていません。',blockers:evaluation.blockers});
  const officeId=officeScope(req.user,req.body.officeId);if(!officeId||officeId==='__NO_OPERATIONAL_SCOPE__')return res.status(403).json({error:'取込記録を登録できる事業所権限がありません。'});
  if(d.applicationId){const appResult=await query(`SELECT id FROM applications WHERE id=$1 AND deleted_at IS NULL AND office_id=$2`,[d.applicationId,officeId]);if(!appResult.rows[0])return res.status(404).json({error:'関連付ける申請番号が見つかりません。'});}
  const snapshot={sourceSha256:d.sourceSha256.toLowerCase(),sourceFormat:d.sourceFormat,importedAt:d.importedAt,cargoCount:d.cargoCount,validationStatus:evaluation.status,blockerCount:d.blockerCount,warningCount:d.warningCount,applicationId:d.applicationId||null,checklist:d.checklist.map(x=>({code:String(x.code||''),complete:Boolean(x.complete)}))};
  const sha=intakeSnapshotSha(snapshot);
  const {rows}=await query(`INSERT INTO application_intake_workflows(office_id,application_id,source_label,source_format,source_sha256,source_size_bytes,original_file_stored,imported_at,cargo_count,validation_status,blocker_count,warning_count,validation_summary,checklist,status,created_by,snapshot,snapshot_sha256) VALUES($1,$2,$3,$4,$5,$6,false,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16::jsonb,$17) RETURNING *`,[officeId,d.applicationId||null,evaluation.sourceLabel,d.sourceFormat,d.sourceSha256.toLowerCase(),d.sourceSizeBytes,d.importedAt,d.cargoCount,evaluation.status,d.blockerCount,d.warningCount,JSON.stringify(d.validationSummary),JSON.stringify(d.checklist),d.status,req.user.id,JSON.stringify(snapshot),sha]);
  await audit(req,'create','application-intake-workflow',rows[0].id,{status:d.status,cargoCount:d.cargoCount,applicationId:d.applicationId||null});res.status(201).json({workflow:rows[0],evaluation});
});

app.post('/api/application-intake-workflows/:id/review',authenticate,requireOperationalWrite,async(req,res)=>{
  const schema=z.object({decision:z.enum(['reviewed','returned']),note:z.string().min(3).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'原本照合結果と所見を入力してください。'});
  const officeId=officeScope(req.user,req.query.officeId);const found=await query(`SELECT * FROM application_intake_workflows WHERE id=$1 AND ($2::text IS NULL OR office_id=$2)`,[req.params.id,officeId]);const row=found.rows[0];if(!row)return res.status(404).json({error:'取込記録が見つかりません。'});if(!['imported','returned'].includes(row.status))return res.status(409).json({error:'原本照合できる状態ではありません。'});
  const actors=validateIntakeActors(row,req.user.id,'review');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(parsed.data.decision==='reviewed'&&(row.validation_status==='blocked'||row.blocker_count>0))return res.status(409).json({error:'遮断項目が残っているため照合完了にできません。'});
  const {rows}=await query(`UPDATE application_intake_workflows SET status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.decision,req.user.id,parsed.data.note,row.id]);await audit(req,'review','application-intake-workflow',row.id,{decision:parsed.data.decision});res.json({workflow:rows[0]});
});

app.post('/api/application-intake-workflows/:id/register',authenticate,requireOperationalWrite,async(req,res)=>{
  const schema=z.object({applicationId:z.string().uuid(),note:z.string().min(3).max(3000)});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'申請番号と登録確認所見を入力してください。'});
  const officeId=officeScope(req.user,req.query.officeId);const found=await query(`SELECT * FROM application_intake_workflows WHERE id=$1 AND ($2::text IS NULL OR office_id=$2)`,[req.params.id,officeId]);const row=found.rows[0];if(!row)return res.status(404).json({error:'取込記録が見つかりません。'});if(row.status!=='reviewed')return res.status(409).json({error:'原本照合済みの取込記録だけを登録完了にできます。'});
  const actors=validateIntakeActors(row,req.user.id,'register');if(!actors.valid)return res.status(409).json({error:actors.errors.join(' ')});if(intakeSnapshotSha(row.snapshot||{})!==row.snapshot_sha256)return res.status(409).json({error:'取込時の証跡スナップショットが変更されています。'});
  const appResult=await query(`SELECT id FROM applications WHERE id=$1 AND deleted_at IS NULL AND office_id=$2`,[parsed.data.applicationId,row.office_id]);if(!appResult.rows[0])return res.status(404).json({error:'関連付ける申請番号が見つかりません。'});
  const {rows}=await query(`UPDATE application_intake_workflows SET application_id=$1,status='registered',registered_by=$2,registered_at=now(),registration_note=$3,updated_at=now() WHERE id=$4 RETURNING *`,[parsed.data.applicationId,req.user.id,parsed.data.note,row.id]);await audit(req,'register','application-intake-workflow',row.id,{applicationId:parsed.data.applicationId});res.json({workflow:rows[0]});
});

app.use((error, req, res, _next) => {
  console.error(error);
  const status = Number(error?.status || error?.statusCode || 500);
  const message = status >= 500 ? 'サーバー処理中にエラーが発生しました。管理者へ連絡してください。' : (error?.message || '処理を完了できませんでした。');
  if (!res.headersSent) res.status(status).json({ error: message });
});

cleanupExpiredSessions().catch(error => console.error('session cleanup failed', error));
setInterval(() => cleanupExpiredSessions().catch(error => console.error('session cleanup failed', error)), 6 * 60 * 60_000).unref();

app.listen(config.port, () => console.log(`Inspection Support API listening on ${config.port}`));
