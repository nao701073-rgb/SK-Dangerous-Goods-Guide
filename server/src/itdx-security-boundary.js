import crypto from 'crypto';
import express from 'express';

const bool = (name, fallback=false) => {
  const value = process.env[name];
  if (value == null || value === '') return fallback;
  return ['1','true','yes','on'].includes(String(value).toLowerCase());
};
const number = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};
const text = (...names) => {
  for (const name of names) if (process.env[name]) return String(process.env[name]);
  return '';
};
const phishingResistantMethods = new Set(['webauthn','fido2','passkey','hwk','hardware-key','phishing-resistant']);

export function readItdxSecurityPolicy() {
  const production = (process.env.NODE_ENV || 'development') === 'production';
  return {
    production,
    externalAuthEnabled: bool('ITDX_EXTERNAL_AUTH_ENABLED', bool('EXTERNAL_AUTH_ENABLED', false)),
    requirePhishingResistant: bool('ITDX_REQUIRE_PHISHING_RESISTANT_MFA', bool('REQUIRE_PHISHING_RESISTANT_MFA', production)),
    allowLocalAuth: bool('ITDX_ALLOW_LOCAL_AUTH', bool('ALLOW_LOCAL_AUTH', !production)),
    externalAuthLoginUrl: text('ITDX_EXTERNAL_AUTH_LOGIN_URL','EXTERNAL_AUTH_LOGIN_URL'),
    sharedSecret: text('ITDX_EXTERNAL_AUTH_SHARED_SECRET','EXTERNAL_AUTH_SHARED_SECRET'),
    sharedSecretHeader: (text('ITDX_EXTERNAL_AUTH_SHARED_SECRET_HEADER','EXTERNAL_AUTH_SHARED_SECRET_HEADER') || 'x-iss-external-auth-secret').toLowerCase(),
    userHeader: (text('ITDX_EXTERNAL_AUTH_USER_HEADER','EXTERNAL_AUTH_USER_HEADER') || 'x-auth-request-user').toLowerCase(),
    emailHeader: (text('ITDX_EXTERNAL_AUTH_EMAIL_HEADER','EXTERNAL_AUTH_EMAIL_HEADER') || 'x-auth-request-email').toLowerCase(),
    displayNameHeader: (text('ITDX_EXTERNAL_AUTH_DISPLAY_NAME_HEADER','EXTERNAL_AUTH_DISPLAY_NAME_HEADER') || 'x-auth-request-name').toLowerCase(),
    assuranceHeader: (text('ITDX_EXTERNAL_AUTH_ASSURANCE_HEADER','EXTERNAL_AUTH_ASSURANCE_HEADER') || 'x-auth-request-amr').toLowerCase(),
    auditRetentionDays: number('AUDIT_RETENTION_DAYS', 365),
    enforceHttps: bool('ENFORCE_HTTPS', production),
    requireEncryptedStorage: bool('ITDX_REQUIRE_ENCRYPTED_STORAGE', production),
    corporateGithubConfirmed: bool('ITDX_CORPORATE_GITHUB_CONFIRMED', false),
    isolatedDevConfirmed: bool('ITDX_ISOLATED_DEV_CONFIRMED', false),
    cloudDeployment: bool('ITDX_CLOUD_DEPLOYMENT', false)
  };
}

export function assertItdxProductionSecurity() {
  const p = readItdxSecurityPolicy();
  if (!p.production) return p;
  const errors = [];
  if (!p.externalAuthEnabled) errors.push('ITDX_EXTERNAL_AUTH_ENABLED=true is required in production');
  if (!p.requirePhishingResistant) errors.push('ITDX_REQUIRE_PHISHING_RESISTANT_MFA=true is required in production');
  if (p.allowLocalAuth) errors.push('ITDX_ALLOW_LOCAL_AUTH=false is required in production');
  if (p.sharedSecret.length < 32) errors.push('ITDX_EXTERNAL_AUTH_SHARED_SECRET must be at least 32 characters');
  if (!p.enforceHttps) errors.push('ENFORCE_HTTPS=true is required in production');
  if (p.auditRetentionDays < 180) errors.push('AUDIT_RETENTION_DAYS must be at least 180 days');
  if (!p.requireEncryptedStorage) errors.push('ITDX_REQUIRE_ENCRYPTED_STORAGE=true is required in production');
  if (errors.length) throw new Error(`ITDX production security gate failed: ${errors.join('; ')}`);
  return p;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a,b);
}

function parseAssurance(value) {
  return String(value || '').toLowerCase().split(/[\s,;|]+/).filter(Boolean);
}

export function createItdxSecurityBoundary() {
  const policy = readItdxSecurityPolicy();
  return function itdxSecurityBoundary(req,res,next) {
    const requestId = String(req.get('x-request-id') || '').slice(0,128) || crypto.randomUUID();
    req.itdxRequestId = requestId;
    res.set('X-Request-ID', requestId);
    res.set('Referrer-Policy','no-referrer');
    res.set('Permissions-Policy','camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
    res.set('X-Content-Type-Options','nosniff');
    if (String(req.path || '').startsWith('/api/')) res.set('Cache-Control','no-store');
    if (String(req.method || '').toUpperCase() === 'TRACE') return res.status(405).json({error:'TRACE method is disabled.'});
    if (!policy.allowLocalAuth && req.method === 'POST' && ['/api/auth/login','/api/auth/mfa/verify','/api/auth/mfa/resend'].includes(req.path)) {
      return res.status(403).json({error:'この環境ではローカル認証を使用できません。会社承認の社内認証を利用してください。'});
    }
    next();
  };
}

function readExternalIdentity(req) {
  const policy = readItdxSecurityPolicy();
  if (!policy.externalAuthEnabled) throw Object.assign(new Error('社内認証連携が有効化されていません。'),{status:503});
  if (!safeEqual(req.get(policy.sharedSecretHeader), policy.sharedSecret)) throw Object.assign(new Error('社内認証ゲートウェイを確認できません。'),{status:401});
  const loginId = String(req.get(policy.userHeader) || '').trim();
  const email = String(req.get(policy.emailHeader) || '').trim();
  const displayName = String(req.get(policy.displayNameHeader) || '').trim();
  const methods = parseAssurance(req.get(policy.assuranceHeader));
  const phishingResistant = methods.some(method => phishingResistantMethods.has(method));
  if (!loginId && !email) throw Object.assign(new Error('社内認証から利用者識別情報を取得できません。'),{status:401});
  if (policy.requirePhishingResistant && !phishingResistant) throw Object.assign(new Error('フィッシング耐性のある多要素認証を確認できません。'),{status:403});
  return {loginId,email,displayName,methods,phishingResistant};
}

const publicUser = user => ({
  id:user.id, loginId:user.login_id, email:user.email, displayName:user.display_name,
  role:user.role, officeId:user.office_id, accountCategory:user.account_category
});

export function createItdxExternalAuthRouter({query,createServerSession,audit}) {
  const router = express.Router();
  router.get('/status', (_req,res) => {
    const p = readItdxSecurityPolicy();
    res.json({
      enabled:p.externalAuthEnabled,
      loginUrl:p.externalAuthLoginUrl || null,
      requirePhishingResistant:p.requirePhishingResistant,
      localAuthEnabled:p.allowLocalAuth,
      emailOtpIsPhishingResistant:false
    });
  });
  router.post('/session', async (req,res) => {
    try {
      const identity = readExternalIdentity(req);
      const values=[]; const clauses=[];
      if (identity.email) { values.push(identity.email); clauses.push(`lower(email)=lower($${values.length})`); }
      if (identity.loginId) { values.push(identity.loginId); clauses.push(`lower(login_id)=lower($${values.length})`); }
      const {rows} = await query(`SELECT * FROM users WHERE active=true AND (${clauses.join(' OR ')}) LIMIT 1`,values);
      const user = rows[0];
      if (!user) return res.status(403).json({error:'社内認証は成功しましたが、本システムの利用者として承認されていません。管理者へ利用申請してください。'});
      if (user.account_expires_at && new Date(user.account_expires_at) <= new Date()) return res.status(403).json({error:'アカウントの有効期限が終了しています。'});
      await query('UPDATE users SET last_login_at=now(),first_login_at=COALESCE(first_login_at,now()),email_verified=CASE WHEN $2<>\'\' THEN true ELSE email_verified END,mfa_last_verified_at=CASE WHEN $3 THEN now() ELSE mfa_last_verified_at END WHERE id=$1',[user.id,identity.email,identity.phishingResistant]).catch(()=>{});
      req.user = user;
      // External-authentication audit is fail-closed: production authentication must not succeed without security evidence.
      await query(`INSERT INTO account_security_events(user_id,event_type,ip_address,user_agent,details) VALUES($1,'login-success',$2,$3,$4::jsonb)`,[user.id,req.ip||null,req.get('user-agent')||null,JSON.stringify({source:'itdx-external-auth',methods:identity.methods,phishingResistant:identity.phishingResistant,requestId:req.itdxRequestId})]);
      if (audit) await audit(req,'external-login','user',user.id,{methods:identity.methods,phishingResistant:identity.phishingResistant,requestId:req.itdxRequestId});
      const created = await createServerSession(user,req,res,{remember:false});
      res.json({authMode:'server-session',csrfToken:created.csrfToken,mfaRequired:false,passwordChangeRequired:false,user:publicUser(user),assurance:{phishingResistant:identity.phishingResistant,methods:identity.methods}});
    } catch(error) {
      res.status(error.status || 401).json({error:error.message || '社内認証を確認できません。'});
    }
  });
  return router;
}
