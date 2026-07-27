BEGIN;

CREATE TABLE IF NOT EXISTS account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','accepted','expired','cancelled','failed')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX IF NOT EXISTS idx_account_invitations_status_expires ON account_invitations(status,expires_at);
CREATE INDEX IF NOT EXISTS idx_account_invitations_user ON account_invitations(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS account_access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_period text NOT NULL,
  total_users integer NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  locked_users integer NOT NULL DEFAULT 0,
  dormant_users integer NOT NULL DEFAULT 0,
  mfa_missing_users integer NOT NULL DEFAULT 0,
  pending_initial_login integer NOT NULL DEFAULT 0,
  findings text,
  corrective_action text,
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_account_access_reviews_period ON account_access_reviews(review_period,reviewed_at DESC);

CREATE TABLE IF NOT EXISTS operation_readiness_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_code text NOT NULL,
  check_label text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','not-applicable')),
  evidence_note text,
  checked_by uuid REFERENCES users(id),
  checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(check_code)
);

INSERT INTO operation_readiness_checks(check_code,check_label,category) VALUES
 ('auth-login','一般利用者・管理者のログイン確認','認証'),
 ('auth-mfa','管理対象役割のMFA確認','認証'),
 ('auth-reset','パスワード再設定メールと完了確認','認証'),
 ('auth-lock','連続失敗時のロックと解除確認','認証'),
 ('auth-force-logout','管理者による強制ログアウト確認','認証'),
 ('users-import','初期利用者CSVの検証・一括登録','利用者'),
 ('roles-scope','事業所・安全環境室の閲覧範囲確認','権限'),
 ('audit-login','ログイン・管理操作の監査記録確認','監査'),
 ('backup-database','データベースの日次バックアップ確認','保全'),
 ('backup-photo','写真保存領域のバックアップ確認','保全'),
 ('restore-test','復元手順の実施確認','保全'),
 ('notification-mail','認証・運用通知メールの送信確認','通知'),
 ('privacy-review','個人情報・写真の取扱い確認','セキュリティ'),
 ('capacity-150','150名想定の検索・一覧性能確認','性能')
ON CONFLICT(check_code) DO NOTHING;

COMMIT;
