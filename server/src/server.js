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
import { authenticate, requireRole, requireOperationalRead, requireOperationalWrite, requireAdministrator, canManageUser, signToken, officeScope, validatePassword } from './auth.js';
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

app.post('/api/auth/login', async (req, res) => {
  if (!config.allowLocalAuth) return res.status(403).json({ error: 'ローカル認証は無効です。社内認証を利用してください。' });
  const schema = z.object({ loginId: z.string().min(1).max(100), password: z.string().min(1).max(300) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'ログインIDとパスワードを確認してください。' });
  const { rows } = await query('SELECT * FROM users WHERE lower(login_id)=lower($1) AND active=true', [parsed.data.loginId.trim()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'ログイン情報が正しくありません。' });
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
  await query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
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
  await query('UPDATE users SET last_login_at=now(),email_verified=true WHERE id=$1',[row.user_id]);
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

app.delete('/api/applications/:id', authenticate, requireOperationalWrite, async (req, res) => {
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
    if (req.user.role !== 'safety-environment-admin' && application.office_id !== req.user.office_id) throw Object.assign(new Error('この事業所の写真は登録できません。'), { status: 403 });
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

app.delete('/api/photos/:id', authenticate, requireOperationalWrite, async (req, res) => {
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
  role: z.enum(['office-user','office-admin','safety-environment-admin','guest','validator']),
  officeId: z.string().nullable().optional(),
  initialPassword: z.string().min(8).max(300)
});

app.get('/api/admin/users', authenticate, requireAdministrator, async (req, res) => {
  const values=[];
  let where='1=1';
  if(req.user.role==='office-admin'){ values.push(req.user.office_id); where=`u.office_id=$1 AND u.role='office-user'`; }
  const { rows } = await query(`SELECT u.id,u.login_id,u.email,u.display_name,u.role,u.account_category,u.office_id,u.active,u.mfa_required,u.email_verified,u.must_change_password,u.last_login_at,u.created_at,u.locked_until,
    o.name office_name,b.name block_name FROM users u
    LEFT JOIN offices o ON o.id=u.office_id LEFT JOIN blocks b ON b.id=o.block_id
    WHERE ${where} ORDER BY u.role,u.display_name`, values);
  res.json({ users: rows, managerRole:req.user.role, officeId:req.user.office_id });
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
  const accountCategory = data.role === 'guest' ? 'staff-guest' : data.role === 'validator' ? 'staff-validator' : data.role === 'safety-environment-admin' ? 'safety-environment' : data.role === 'office-admin' ? 'office-director' : 'inspector';
  const passwordErrors = validatePassword(data.initialPassword);
  if (passwordErrors.length) return res.status(400).json({ error: `初期パスワードには${passwordErrors.join('・')}が必要です。` });
  const hash = await bcrypt.hash(data.initialPassword, 12);
  try {
    const { rows } = await query(`INSERT INTO users(login_id,email,display_name,password_hash,role,account_category,office_id,must_change_password,mfa_required,activated_at)
      VALUES(lower($1),NULLIF(lower($2),''),$3,$4,$5,$6,$7,false,false,now()) RETURNING id,login_id,email,display_name,role,account_category,office_id,active,mfa_required,created_at`,
      [data.loginId, data.email || '', data.displayName, hash, data.role, accountCategory, ['office-user','office-admin'].includes(data.role) ? data.officeId : null]);
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
      { role: 'safety-environment-admin', label: '安全環境室管理者', applications: '全ブロック・全事業所', photos: '全ブロック・全事業所', administration: '利用者・事業所・上限・監査・検証管理' },
      { role: 'guest', label: 'ゲスト（社内職員）', applications: '閲覧不可', photos: '閲覧不可', administration: '危険物・法令・資料の閲覧のみ' },
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

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'サーバー内部でエラーが発生しました。' });
});

app.listen(config.port, () => console.log(`Inspection Support API listening on ${config.port}`));
