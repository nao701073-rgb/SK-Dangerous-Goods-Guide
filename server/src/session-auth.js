import crypto from 'crypto';
import { config } from './config.js';
import { query } from './db.js';

const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const randomToken = bytes => crypto.randomBytes(bytes).toString('base64url');
const csrfForSession = sessionId => crypto.createHmac('sha256', config.session.csrfSecret).update(String(sessionId)).digest('base64url');
const safeMethods = new Set(['GET','HEAD','OPTIONS']);

export function parseCookies(req) {
  const output = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 1) return;
    const key = part.slice(0,index).trim();
    const value = part.slice(index+1).trim();
    try { output[key] = decodeURIComponent(value); } catch { output[key] = value; }
  });
  return output;
}

function cookieAttributes(maxAgeSeconds) {
  const attributes = [
    'Path=/',
    'HttpOnly',
    `SameSite=${config.session.sameSite}`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (config.session.secure) attributes.push('Secure');
  if (config.session.domain) attributes.push(`Domain=${config.session.domain}`);
  return attributes.join('; ');
}

export function clearSessionCookie(res) {
  res.append('Set-Cookie', `${config.session.cookieName}=; ${cookieAttributes(0)}`);
}

export async function createServerSession(user, req, res, { remember=false }={}) {
  const rawToken = randomToken(48);
  const sessionId = crypto.randomUUID();
  const csrfToken = csrfForSession(sessionId);
  const now = Date.now();
  const absoluteMs = remember
    ? config.session.rememberDays * 86400_000
    : config.session.absoluteHours * 3600_000;
  const idleMs = config.session.idleMinutes * 60_000;
  const ipHash = sha256(`${config.session.fingerprintSalt}:${req.ip || ''}`);
  const userAgentHash = sha256(`${config.session.fingerprintSalt}:${req.get('user-agent') || ''}`);
  const expiresAt = new Date(now + absoluteMs);
  const idleExpiresAt = new Date(Math.min(now + idleMs, expiresAt.getTime()));
  const { rows } = await query(`INSERT INTO auth_sessions
    (id,user_id,token_hash,csrf_hash,token_version,remember_me,ip_hash,user_agent_hash,idle_expires_at,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,created_at,last_seen_at,idle_expires_at,expires_at`,
    [sessionId,user.id,sha256(rawToken),sha256(csrfToken),Number(user.token_version || 1),Boolean(remember),ipHash,userAgentHash,idleExpiresAt,expiresAt]);
  if (config.session.maxActivePerUser > 0) {
    await query(`UPDATE auth_sessions SET revoked_at=now(),revoked_reason='session-limit'
      WHERE id IN (SELECT id FROM auth_sessions WHERE user_id=$1 AND revoked_at IS NULL ORDER BY created_at DESC OFFSET $2)`,
      [user.id, config.session.maxActivePerUser]);
  }
  res.append('Set-Cookie', `${config.session.cookieName}=${encodeURIComponent(rawToken)}; ${cookieAttributes(absoluteMs/1000)}`);
  return { session:rows[0], csrfToken };
}

export async function readServerSession(req) {
  if (!config.session.enabled) return null;
  const token = parseCookies(req)[config.session.cookieName];
  if (!token) return null;
  const { rows } = await query(`SELECT s.id session_id,s.user_id,s.csrf_hash,s.token_version session_token_version,
      s.created_at session_created_at,s.last_seen_at session_last_seen_at,s.idle_expires_at,s.expires_at,s.ip_hash,s.user_agent_hash,
      u.id,u.login_id,u.email,u.display_name,u.role,u.office_id,u.active,u.must_change_password,
      u.password_changed_at,u.mfa_required,u.email_verified,u.account_category,u.token_version,u.password_reset_required
    FROM auth_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND s.idle_expires_at>now()`, [sha256(token)]);
  const row = rows[0];
  if (!row?.active) return null;
  if (Number(row.session_token_version || 1) !== Number(row.token_version || 1)) return null;
  const currentIpHash = sha256(`${config.session.fingerprintSalt}:${req.ip || ''}`);
  const currentUserAgentHash = sha256(`${config.session.fingerprintSalt}:${req.get('user-agent') || ''}`);
  if ((config.session.bindUserAgent && row.user_agent_hash && row.user_agent_hash !== currentUserAgentHash)
      || (config.session.bindIp && row.ip_hash && row.ip_hash !== currentIpHash)) {
    await query(`UPDATE auth_sessions SET revoked_at=now(),revoked_reason='fingerprint-mismatch' WHERE id=$1`,[row.session_id]);
    return null;
  }
  const now = Date.now();
  const absoluteExpiry = new Date(row.expires_at).getTime();
  const nextIdle = new Date(Math.min(now + config.session.idleMinutes*60_000, absoluteExpiry));
  if (now - new Date(row.session_last_seen_at).getTime() > config.session.touchIntervalSeconds*1000) {
    await query('UPDATE auth_sessions SET last_seen_at=now(),idle_expires_at=$1 WHERE id=$2', [nextIdle,row.session_id]);
  }
  return {
    user:row,
    sessionId:row.session_id,
    csrfHash:row.csrf_hash,
    authMode:'server-session'
  };
}

export function verifyCsrf(req, session) {
  if (safeMethods.has(String(req.method || '').toUpperCase())) return true;
  const supplied = String(req.get(config.session.csrfHeader) || '');
  if (!supplied || !session?.csrfHash) return false;
  const suppliedHash = sha256(supplied);
  const left = Buffer.from(suppliedHash);
  const right = Buffer.from(session.csrfHash);
  return left.length === right.length && crypto.timingSafeEqual(left,right);
}


export async function rotateSessionCsrf(sessionId) {
  if (!sessionId) throw new Error('sessionId is required');
  const csrfToken = csrfForSession(sessionId);
  const { rows } = await query(`SELECT id FROM auth_sessions
    WHERE id=$1 AND csrf_hash=$2 AND revoked_at IS NULL AND expires_at>now() AND idle_expires_at>now()`,
    [sessionId,sha256(csrfToken)]);
  return rows[0] ? csrfToken : null;
}

export async function revokeSession(sessionId, reason='logout') {
  if (!sessionId) return;
  await query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()),revoked_reason=COALESCE(revoked_reason,$2) WHERE id=$1',[sessionId,reason]);
}

export async function revokeAllUserSessions(userId, reason='logout-all') {
  await query('UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()),revoked_reason=COALESCE(revoked_reason,$2) WHERE user_id=$1 AND revoked_at IS NULL',[userId,reason]);
}

export async function cleanupExpiredSessions() {
  await query(`DELETE FROM auth_sessions WHERE COALESCE(revoked_at,expires_at,idle_expires_at) < now() - interval '30 days'`);
}
