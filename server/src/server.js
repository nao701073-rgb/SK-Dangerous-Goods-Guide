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
import { audit } from './audit.js';
import { sendMail, maskEmail } from './mailer.js';

fs.mkdirSync(config.photoStorageDir, { recursive: true });
const app = express();
app.set('trust proxy', config.trustProxy);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, cb) {
  if (!origin || !config.corsOrigins.length || config.corsOrigins.includes(origin)) return cb(null, true);
  cb(new Error('CORS origin is not allowed'));
}, credentials: false }));
app.use(express.json({ limit: '5mb' }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/uploads', express.static(config.photoStorageDir, { fallthrough: false, immutable: true, maxAge: '1d' }));


const hashText = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomDigits = length => Array.from({ length }, () => crypto.randomInt(0, 10)).join('');
const publicUser = user => ({ id:user.id, loginId:user.login_id, email:user.email, displayName:user.display_name, role:user.role, officeId:user.office_id, accountCategory:user.account_category });

const detectImageType = buffer => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0]===0xFF && buffer[1]===0xD8 && buffer[2]===0xFF) return { ext:'.jpg', mime:'image/jpeg' };
  if (buffer.slice(0,8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))) return { ext:'.png', mime:'image/png' };
  if (buffer.slice(0,4).toString()==='RIFF' && buffer.slice(8,12).toString()==='WEBP') return { ext:'.webp', mime:'image/webp' };
  return null;
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
    photoStorage: process.env.PHOTO_STORAGE_PROVIDER || 'persistent-disk',
    systemVersion: 'Part 215'
  });
});

app.post('/api/auth/login', async (req, res) => {
  if (!config.allowLocalAuth) return res.status(403).json({ error: 'ローカル認証は無効です。社内認証を利用してください。' });
  const schema = z.object({ loginId: z.string().min(1).max(100), password: z.string().min(1).max(300) });
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
    return res.status(401).json({ error: lock ? 'ログイン失敗回数が上限に達したため、一時ロックしました。' : 'ログイン情報が正しくありません。' });
  }
  await query('UPDATE users SET failed_login_count=0,locked_until=NULL WHERE id=$1', [user.id]);
  if (config.mfa.enabled && user.mfa_required) {
    const challenge = await issueMfaChallenge(user, 'login');
    await audit({ ...req, user }, 'mfa-issued', 'user', user.id, { purpose:'login' });
    return res.json({ mfaRequired:true, ...challenge, resendAfterSeconds:config.mfa.resendSeconds });
  }
  await query('UPDATE users SET last_login_at=now(),first_login_at=COALESCE(first_login_at,now()) WHERE id=$1', [user.id]);
  await query(`INSERT INTO account_security_events(user_id,event_type,ip_address,user_agent,details) VALUES($1,'login-success',$2,$3,$4::jsonb)`,[user.id,req.ip||null,req.get('user-agent')||null,JSON.stringify({mfa:false})]).catch(()=>{});
  const token = signToken(user);
  res.json({ token, mfaRequired:false, passwordChangeRequired:Boolean(user.must_change_password), user:publicUser(user) });
});

app.post('/api/auth/mfa/verify', async (req,res) => {
  const schema=z.object({ challengeId:z.string().uuid(), code:z.string().regex(/^\d{6}$/) });
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
  const user={ id:row.user_id, login_id:row.login_id, email:row.email, display_name:row.display_name, role:row.role, office_id:row.office_id, account_category:row.account_category, must_change_password:row.must_change_password };
  const token=signToken(user);
  res.json({token,passwordChangeRequired:Boolean(user.must_change_password),user:publicUser(user)});
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
  const {rows}=await query(`SELECT t.id token_id,u.id user_id FROM account_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=$1 AND t.token_type='password-reset' AND t.consumed_at IS NULL AND t.expires_at>now()`,[hashText(parsed.data.token)]);if(!rows[0])return res.status(400).json({error:'再設定リンクが無効または期限切れです。'});const hash=await bcrypt.hash(parsed.data.newPassword,12);await transaction(async client=>{await client.query('UPDATE users SET password_hash=$1,password_changed_at=now(),must_change_password=false,failed_login_count=0,locked_until=NULL WHERE id=$2',[hash,rows[0].user_id]);await client.query('UPDATE account_tokens SET consumed_at=now() WHERE id=$1',[rows[0].token_id]);});res.status(204).end();
});

app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/change-password' , authenticate, async (req, res) => {
  const schema = z.object({ currentPassword: z.string().min(1).max(300), newPassword: z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'パスワード入力を確認してください。' });
  const errors = validatePassword(parsed.data.newPassword);
  if (errors.length) return res.status(400).json({ error: `新しいパスワードには${errors.join('・')}が必要です。` });
  const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(parsed.data.currentPassword, rows[0].password_hash))) return res.status(401).json({ error: '現在のパスワードが正しくありません。' });
  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  await query('UPDATE users SET password_hash=$1,password_changed_at=now(),must_change_password=false,updated_at=now() WHERE id=$2', [hash, req.user.id]);
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

const applicationSchema = z.object({ clientId: z.string().max(100).optional(), applicationNumber: z.string().min(1).max(100), shipper: z.string().max(300).default(''), cargoName: z.string().max(500).default(''), note: z.string().max(5000).default(''), status: z.string().max(50).default('active'), officeId: z.string().min(1) });
app.post('/api/applications', authenticate, requireOperationalWrite, async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '申請番号の入力内容を確認してください。' });
  const officeId = officeScope(req.user, parsed.data.officeId);
  if (!officeId) return res.status(400).json({ error: '事業所を指定してください。' });
  try {
    const { rows } = await query(`INSERT INTO applications(client_id,application_number,shipper,cargo_name,note,status,office_id,block_id,created_by,updated_by)
      SELECT $1,$2,$3,$4,$5,$6,o.id,o.block_id,$7,$7 FROM offices o WHERE o.id=$8
      RETURNING *`, [parsed.data.clientId || null, parsed.data.applicationNumber.trim(), parsed.data.shipper, parsed.data.cargoName, parsed.data.note, parsed.data.status, req.user.id, officeId]);
    await audit(req, 'create', 'application', rows[0].id, { applicationNumber: rows[0].application_number });
    res.status(201).json({ application: rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: '同じ事業所に同一の申請番号が登録されています。' });
    throw error;
  }
});

app.put('/api/applications/:id', authenticate, requireOperationalWrite, async (req, res) => {
  const schema = z.object({ applicationNumber: z.string().min(1).max(100).optional(), shipper: z.string().max(300).optional(), cargoName: z.string().max(500).optional(), note: z.string().max(5000).optional(), status: z.string().max(50).optional(), version: z.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: '更新内容を確認してください。' });
  const officeId = officeScope(req.user, req.query.officeId);
  const { rows } = await query(`UPDATE applications SET application_number=COALESCE($1,application_number),shipper=COALESCE($2,shipper),cargo_name=COALESCE($3,cargo_name),note=COALESCE($4,note),status=COALESCE($5,status),updated_by=$6,version=version+1,updated_at=now()
    WHERE id=$7 AND deleted_at IS NULL AND version=$8 AND ($9::text IS NULL OR office_id=$9) RETURNING *`, [parsed.data.applicationNumber, parsed.data.shipper, parsed.data.cargoName, parsed.data.note, parsed.data.status, req.user.id, req.params.id, parsed.data.version, officeId]);
  if (!rows[0]) return res.status(409).json({ error: '他の利用者が更新したか、対象が見つかりません。再読み込みしてください。' });
  await audit(req, 'update', 'application', rows[0].id);
  res.json({ application: rows[0] });
});

app.delete('/api/applications/:id', authenticate, requireOperationalDelete, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const { rows } = await query('UPDATE applications SET deleted_at=now(),updated_by=$1,updated_at=now(),version=version+1 WHERE id=$2 AND deleted_at IS NULL AND ($3::text IS NULL OR office_id=$3) RETURNING id', [req.user.id, req.params.id, officeId]);
  if (!rows[0]) return res.status(404).json({ error: '対象が見つかりません。' });
  await audit(req, 'delete', 'application', req.params.id);
  res.status(204).end();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1 } });
app.get('/api/photos', authenticate, requireOperationalRead, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const values = [];
  let where = 'p.deleted_at IS NULL';
  if (officeId) { values.push(officeId); where += ` AND p.office_id=$${values.length}`; }
  if (req.query.applicationId) { values.push(req.query.applicationId); where += ` AND p.application_id=$${values.length}`; }
  const { rows } = await query(`SELECT p.*,a.application_number,o.name office_name,b.name block_name FROM photos p
    JOIN applications a ON a.id=p.application_id JOIN offices o ON o.id=p.office_id JOIN blocks b ON b.id=p.block_id
    WHERE ${where} ORDER BY p.created_at DESC LIMIT 5000`, values);
  res.json({ photos: rows.map(row => ({ ...row, url: `/uploads/${row.stored_name}` })) });
});

app.post('/api/photos', authenticate, requireOperationalWrite, upload.single('photo'), async (req, res) => {
  const schema = z.object({ applicationId: z.string().uuid(), clientId: z.string().max(100).optional(), shootingAt: z.string().optional(), registeredBy: z.string().max(100).default(''), comment: z.string().max(2000).default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || !req.file) return res.status(400).json({ error: '写真と申請番号を確認してください。' });
  const detectedImage = detectImageType(req.file.buffer);
  if (!detectedImage) return res.status(400).json({ error: 'JPEG・PNG・WebP形式の画像のみ登録できます。拡張子だけを変更したファイルは登録できません。' });

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

    const ext = detectedImage.ext;
    const storedName = `${crypto.randomUUID()}${ext}`;
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    fs.writeFileSync(path.join(config.photoStorageDir, storedName), req.file.buffer, { flag: 'wx' });
    try {
      const photoResult = await client.query(`INSERT INTO photos(client_id,application_id,block_id,office_id,original_name,stored_name,mime_type,file_size,sha256,shooting_at,registered_by_name,comment,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [parsed.data.clientId || null, application.id, application.block_id, application.office_id, req.file.originalname, storedName, detectedImage.mime, req.file.size, sha256, parsed.data.shootingAt || null, parsed.data.registeredBy, parsed.data.comment, req.user.id]);
      return photoResult.rows[0];
    } catch (error) {
      fs.rmSync(path.join(config.photoStorageDir, storedName), { force: true });
      throw error;
    }
  });
  await audit(req, 'create', 'photo', result.id, { applicationId: result.application_id, fileSize: result.file_size });
  res.status(201).json({ photo: { ...result, url: `/uploads/${result.stored_name}` } });
});

app.delete('/api/photos/:id', authenticate, requireOperationalDelete, async (req, res) => {
  const officeId = officeScope(req.user, req.query.officeId);
  const { rows } = await query('UPDATE photos SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR office_id=$2) RETURNING id,stored_name', [req.params.id, officeId]);
  if (!rows[0]) return res.status(404).json({ error: '対象が見つかりません。' });
  await audit(req, 'delete', 'photo', req.params.id);
  res.status(204).end();
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
        const updated = await query(`UPDATE applications SET shipper=COALESCE($1,shipper),cargo_name=COALESCE($2,cargo_name),note=COALESCE($3,note),status=COALESCE($4,status),updated_by=$5,version=version+1,updated_at=now() WHERE id=$6 AND version=$7 AND deleted_at IS NULL AND ($8::text IS NULL OR office_id=$8) RETURNING id,version,updated_at`, [item.payload.shipper, item.payload.cargoName, item.payload.note, item.payload.status, req.user.id, id, version, officeId]);
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
  role: z.enum(['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator']),
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
  if(role && ['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator'].includes(role)) where.push(`u.role=${push(role)}`);
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
  const accountCategory = data.role === 'guest' ? 'staff-guest' : data.role === 'validator' ? 'staff-validator' : data.role === 'safety-environment-admin' ? 'safety-environment-admin' : data.role === 'safety-environment-director' ? 'safety-environment-director' : data.role === 'safety-environment-staff' ? 'safety-environment-staff' : data.role === 'office-admin' ? 'office-director' : 'inspector';
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
  res.json({ photo: { ...result, url: `/uploads/${result.stored_name}` } });
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
      { role: 'guest', label: 'ゲスト', applications: '利用不可', photos: '利用不可', administration: 'ユーザー設定のみ' },
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
  try {
    fs.mkdirSync(config.photoStorageDir, { recursive: true });
    fs.accessSync(config.photoStorageDir, fs.constants.R_OK | fs.constants.W_OK);
    const probe = path.join(config.photoStorageDir, `.preflight-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, 'ok'); fs.rmSync(probe, { force: true }); storageOk = true;
  } catch (error) {
    push('photo-storage', '写真保存先の読み書き', false, error.message);
  }
  if (storageOk) push('photo-storage', '写真保存先の読み書き', true, config.photoStorageDir);
  const defaultSecret = 'development-only-change-this-secret-immediately';
  push('jwt-secret', 'JWT秘密鍵', config.jwtSecret.length >= 32 && config.jwtSecret !== defaultSecret, config.jwtSecret === defaultSecret ? '開発用既定値のため変更が必要です。' : `${config.jwtSecret.length}文字で設定済み`);
  push('production-mode', '本番実行モード', config.nodeEnv === 'production', `NODE_ENV=${config.nodeEnv}`, 'recommended');
  push('cors', 'CORS許可元', config.corsOrigins.length > 0, config.corsOrigins.length ? config.corsOrigins.join(', ') : '未設定（全Originを許可する開発設定）');
  push('auth', '認証方式', config.oidc.enabled || config.allowLocalAuth, config.oidc.enabled ? `OIDC: ${config.oidc.issuer}` : config.allowLocalAuth ? 'ローカル認証' : '認証方式未設定');
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
          await client.query(`INSERT INTO applications(application_number,shipper,cargo_name,note,status,office_id,block_id,created_by,updated_by)
            SELECT $1,$2,$3,$4,$5,o.id,o.block_id,$6,$6 FROM offices o WHERE o.id=$7
            ON CONFLICT(office_id,application_number) WHERE deleted_at IS NULL DO NOTHING`,[String(row.applicationNumber||'').trim(),row.shipper||'',row.cargoName||'',row.note||'',row.status||'受付',req.user.id,officeId]);
        } else if(parsed.data.importType==='users'){
          if(req.user.role==='office-admin' && row.officeId!==req.user.office_id) throw new Error('所属事業所以外は登録できません。');
          if(req.user.role==='office-admin' && row.role!=='office-user') throw new Error('事業所管理者は検査員のみ登録できます。');
          const passwordErrors=validatePassword(String(row.initialPassword||'')); if(passwordErrors.length) throw new Error(`パスワード要件: ${passwordErrors.join('・')}`);
          const hash=await bcrypt.hash(String(row.initialPassword),12);
          await client.query(`INSERT INTO users(login_id,email,password_hash,display_name,role,office_id,account_category,must_change_password,active)
            VALUES($1,NULLIF($2,''),$3,$4,$5,NULLIF($6,''),CASE WHEN $5 IN ('guest','validator') THEN 'internal-viewer' ELSE 'inspector' END,true,true)`,[String(row.loginId).trim(),row.email||'',hash,row.displayName,row.role,row.officeId||null]);
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

app.listen(config.port, () => console.log(`Inspection Support API listening on ${config.port}`));
