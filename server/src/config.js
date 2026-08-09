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
  session: {
    enabled: bool('SERVER_SESSION_ENABLED', true),
    cookieName: process.env.SESSION_COOKIE_NAME || (process.env.NODE_ENV === 'production' ? '__Host-iss_session' : 'iss_session'),
    csrfHeader: (process.env.CSRF_HEADER_NAME || 'x-csrf-token').toLowerCase(),
    idleMinutes: number('SESSION_IDLE_MINUTES', 30),
    absoluteHours: number('SESSION_ABSOLUTE_HOURS', 8),
    rememberDays: number('SESSION_REMEMBER_DAYS', 7),
    touchIntervalSeconds: number('SESSION_TOUCH_INTERVAL_SECONDS', 60),
    sameSite: process.env.SESSION_COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax'),
    secure: bool('SESSION_COOKIE_SECURE', process.env.NODE_ENV === 'production'),
    domain: process.env.SESSION_COOKIE_DOMAIN || '',
    fingerprintSalt: process.env.SESSION_FINGERPRINT_SALT || process.env.JWT_SECRET || 'development-fingerprint-salt',
    csrfSecret: process.env.CSRF_SECRET || process.env.SESSION_FINGERPRINT_SALT || process.env.JWT_SECRET || 'development-csrf-secret',
    legacyBearerEnabled: bool('LEGACY_BEARER_AUTH_ENABLED', process.env.NODE_ENV !== 'production'),
    bindUserAgent: bool('SESSION_BIND_USER_AGENT', true),
    bindIp: bool('SESSION_BIND_IP', false),
    maxActivePerUser: number('SESSION_MAX_ACTIVE_PER_USER', 10)
  },
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean),
  photoStorageDir: process.env.PHOTO_STORAGE_DIR || new URL('../storage/photos', import.meta.url).pathname,
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'filesystem').toLowerCase(),
    localDir: process.env.ATTACHMENT_STORAGE_DIR || process.env.PHOTO_STORAGE_DIR || new URL('../storage/attachments', import.meta.url).pathname,
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'ap-northeast-1',
      endpoint: process.env.S3_ENDPOINT || '',
      prefix: process.env.S3_PREFIX || 'inspection-support',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      forcePathStyle: bool('S3_FORCE_PATH_STYLE', false),
      sse: process.env.S3_SERVER_SIDE_ENCRYPTION || 'AES256'
    }
  },
  trustProxy: number('TRUST_PROXY', 1),
  passwordMinLength: number('PASSWORD_MIN_LENGTH', 12),
  passwordMaxAgeDays: number('PASSWORD_MAX_AGE_DAYS', 180),
  loginMaxFailures: number('LOGIN_MAX_FAILURES', 5),
  loginLockMinutes: number('LOGIN_LOCK_MINUTES', 30),
  auditRetentionDays: number('AUDIT_RETENTION_DAYS', 365),
  allowLocalAuth: bool('ALLOW_LOCAL_AUTH', process.env.NODE_ENV !== 'production'),
  enforceHttps: bool('ENFORCE_HTTPS', process.env.NODE_ENV === 'production'),
  adminSuccessionEnabled: bool('ADMIN_SUCCESSION_ENABLED', false),
  mfa: {
    enabled: bool('MFA_ENABLED', false),
    codeMinutes: number('MFA_CODE_MINUTES', 10),
    maxAttempts: number('MFA_MAX_ATTEMPTS', 5),
    resendSeconds: number('MFA_RESEND_SECONDS', 60)
  },
  accountTokenMinutes: number('ACCOUNT_TOKEN_MINUTES', 1440),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'https://guide.example.jp',
  publication: {
    defaultScope: process.env.PUBLICATION_SCOPE || 'prototype-review',
    publicBuildOutputDir: process.env.PUBLIC_BUILD_OUTPUT_DIR || new URL('../data/public-release', import.meta.url).pathname,
    requireApprovedPublicAssets: bool('REQUIRE_APPROVED_PUBLIC_ASSETS', process.env.NODE_ENV === 'production')
  },
  recovery: {
    backupDir: process.env.BACKUP_DIR || '/backups',
    releaseSourceDir: process.env.SYSTEM_RELEASE_SOURCE_DIR || new URL('../..', import.meta.url).pathname,
    releaseDir: process.env.SYSTEM_MIGRATION_RELEASE_DIR || new URL('../data/releases', import.meta.url).pathname,
    currentReleaseLink: process.env.SYSTEM_CURRENT_RELEASE_LINK || new URL('../data/current', import.meta.url).pathname,
    evidenceDir: process.env.RECOVERY_EVIDENCE_DIR || new URL('../data/recovery-evidence', import.meta.url).pathname,
    rpoMinutes: number('RECOVERY_RPO_MINUTES', 1440),
    rtoMinutes: number('RECOVERY_RTO_MINUTES', 240),
    commandExecutionEnabled: bool('RECOVERY_COMMAND_EXECUTION_ENABLED', false)
  },
  systemMigration: {
    enabled: bool('SYSTEM_MIGRATION_ENABLED', false),
    stagingDir: process.env.SYSTEM_MIGRATION_STAGING_DIR || new URL('../data/migration-staging', import.meta.url).pathname,
    releaseDir: process.env.SYSTEM_MIGRATION_RELEASE_DIR || new URL('../data/releases', import.meta.url).pathname,
    maxFiles: number('SYSTEM_MIGRATION_MAX_FILES', 5000),
    maxBytes: number('SYSTEM_MIGRATION_MAX_BYTES', 1024 * 1024 * 1024),
    allowedSourceOrigins: (process.env.SYSTEM_MIGRATION_SOURCE_ORIGINS || process.env.PUBLIC_APP_URL || '').split(',').map(v => v.trim()).filter(Boolean)
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: number('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'inspection-support@example.jp',
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
