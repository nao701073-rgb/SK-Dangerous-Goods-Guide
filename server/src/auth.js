import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export const OPERATIONAL_ROLES = ['office-user','office-admin','safety-environment-admin'];
export const VALIDATION_ROLES = ['validator','safety-environment-admin'];

export const ADMIN_ROLES = ['office-admin','safety-environment-admin'];

export const requireAdministrator = (req,res,next) => ADMIN_ROLES.includes(req.user.role)
  ? next()
  : res.status(403).json({ error: '管理者画面からのみ実行できます。' });

export function canManageUser(manager, target) {
  if (manager.role === 'safety-environment-admin') return true;
  return manager.role === 'office-admin'
    && target.office_id === manager.office_id
    && target.role === 'office-user';
}


export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, officeId: user.office_id, loginId: user.login_id, tokenVersion: Number(user.token_version || 1) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export async function authenticate(req, res, next) {
  try {
    const value = req.headers.authorization || '';
    const token = value.startsWith('Bearer ') ? value.slice(7) : '';
    if (!token) return res.status(401).json({ error: '認証が必要です。' });
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query(`SELECT id,login_id,email,display_name,role,office_id,active,must_change_password,
      password_changed_at,mfa_required,email_verified,account_category,token_version,password_reset_required FROM users WHERE id=$1`, [payload.sub]);
    const user = rows[0];
    if (!user?.active) return res.status(401).json({ error: '利用者が無効です。' });
    if (Number(payload.tokenVersion || 1) !== Number(user.token_version || 1)) return res.status(401).json({ error: '管理者操作によりセッションが終了しました。再度ログインしてください。' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: '認証情報が無効または期限切れです。' });
  }
}

export const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role)
  ? next()
  : res.status(403).json({ error: 'この操作を行う権限がありません。' });

export const requireOperationalRead = (req,res,next) => OPERATIONAL_ROLES.includes(req.user.role)
  ? next() : res.status(403).json({ error: 'ゲスト・検証者アカウントでは申請番号・写真データを閲覧できません。' });

export const requireOperationalWrite = (req,res,next) => OPERATIONAL_ROLES.includes(req.user.role)
  ? next() : res.status(403).json({ error: 'このアカウントは閲覧専用です。' });

export function officeScope(user, requestedOfficeId) {
  if (user.role === 'safety-environment-admin') return requestedOfficeId || null;
  if (user.role === 'office-user' || user.role === 'office-admin') return user.office_id;
  return '__NO_OPERATIONAL_SCOPE__';
}

export function validatePassword(password) {
  const errors = [];
  if (password.length < config.passwordMinLength) errors.push(`${config.passwordMinLength}文字以上`);
  if (!/[A-Z]/.test(password)) errors.push('英大文字');
  if (!/[a-z]/.test(password)) errors.push('英小文字');
  if (!/[0-9]/.test(password)) errors.push('数字');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('記号');
  return errors;
}
