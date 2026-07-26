-- Part 96: 全事業所共通の個人アカウント・事業所長管理者方針

-- 事業所管理者は事業所長が使用し、各事業所につき有効な1アカウントに限定する。
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_office_admin_per_office
ON users(office_id)
WHERE role = 'office-admin' AND active = true AND office_id IS NOT NULL;

-- 既存の事業所管理者区分を明示する。
UPDATE users
SET account_category = 'office-director'
WHERE role = 'office-admin' AND (account_category IS NULL OR account_category <> 'office-director');

COMMENT ON INDEX uq_one_active_office_admin_per_office IS
'各事業所の事業所管理者は事業所長が使用する有効な1アカウントに限定';
