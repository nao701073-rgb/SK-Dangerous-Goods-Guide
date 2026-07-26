import 'dotenv/config';

const number = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
};
const bool = (name, fallback=false) => {
  const value = process.env[name];
  if (value == null) return fallback;
  return ['1','true','yes','on'].includes(String(value).toLowerCase());
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: number('PORT', 8080),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://inspection_user:change_me@localhost:5432/inspection_support',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret-immediately',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionIdleMinutes: number('SESSION_IDLE_MINUTES', 30),
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
  photoStorageDir: process.env.PHOTO_STORAGE_DIR || new URL('../storage/photos', import.meta.url).pathname,
  trustProxy: number('TRUST_PROXY', 1),
  passwordMinLength: number('PASSWORD_MIN_LENGTH', 12),
  passwordMaxAgeDays: number('PASSWORD_MAX_AGE_DAYS', 180),
  loginMaxFailures: number('LOGIN_MAX_FAILURES', 5),
  loginLockMinutes: number('LOGIN_LOCK_MINUTES', 30),
  auditRetentionDays: number('AUDIT_RETENTION_DAYS', 365),
  allowLocalAuth: bool('ALLOW_LOCAL_AUTH', true),
  mfa: {
    enabled: bool('MFA_ENABLED', false),
    codeMinutes: number('MFA_CODE_MINUTES', 10),
    maxAttempts: number('MFA_MAX_ATTEMPTS', 5),
    resendSeconds: number('MFA_RESEND_SECONDS', 60)
  },
  accountTokenMinutes: number('ACCOUNT_TOKEN_MINUTES', 1440),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'https://inspection.internal.example.jp',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: number('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'inspection-support@example.local',
    rejectUnauthorized: bool('SMTP_REJECT_UNAUTHORIZED', true)
  },
  oidc: {
    enabled: bool('OIDC_ENABLED', false),
    issuer: process.env.OIDC_ISSUER || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    audience: process.env.OIDC_AUDIENCE || ''
  },
  defaults: {
    perApplication: number('DEFAULT_PHOTO_PER_APPLICATION', 20),
    perOffice: number('DEFAULT_PHOTO_PER_OFFICE', 1000),
    maxFileMb: number('DEFAULT_PHOTO_MAX_FILE_MB', 8),
    storageMb: number('DEFAULT_PHOTO_STORAGE_MB', 500)
  }
};
