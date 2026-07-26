import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const password = process.env.VALIDATION_INITIAL_PASSWORD || 'ChangeMe!2026';
const passwordHash = await bcrypt.hash(password, 12);
const users = [
  ['safety.validation','safety.validation@internal.local','安全環境室 検証管理者','safety-environment-admin','safety-environment',null],
  ['kawasaki.admin','kawasaki.admin@internal.local','川崎事業所 検証管理者','office-admin','inspector','office-kawasaki'],
  ['kawasaki.inspector','kawasaki.inspector@internal.local','川崎事業所 検証利用者','office-user','inspector','office-kawasaki'],
  ['company.guest','company.guest@internal.local','社内職員 ゲスト','guest','staff-guest',null],
  ['company.validator','company.validator@internal.local','社内職員 検証者','validator','staff-validator',null]
];

for (const [loginId,email,displayName,role,category,officeId] of users) {
  await pool.query(`INSERT INTO users(login_id,email,display_name,password_hash,role,account_category,office_id,must_change_password,mfa_required)
    VALUES(lower($1),lower($2),$3,$4,$5,$6,$7,true,true)
    ON CONFLICT(email) DO UPDATE SET login_id=excluded.login_id,display_name=excluded.display_name,role=excluded.role,account_category=excluded.account_category,office_id=excluded.office_id,active=true`,
    [loginId,email,displayName,passwordHash,role,category,officeId]);
}

const admin = await pool.query("SELECT id FROM users WHERE login_id='safety.validation'");
const createdBy = admin.rows[0]?.id || null;
const samples = [
  ['office-kawasaki','VAL-KW-001','検証荷主A','UN1017 塩素','川崎事業所試験運用サンプル'],
  ['office-kawasaki','VAL-KW-002','検証荷主B','UN1203 ガソリン','川崎事業所試験運用サンプル']
];
for (const [officeId, number, shipper, cargo, note] of samples) {
  await pool.query(`INSERT INTO applications(application_number,shipper,cargo_name,note,office_id,block_id,created_by,updated_by,status)
    SELECT $1,$2,$3,$4,o.id,o.block_id,$5,$5,'検証用' FROM offices o WHERE o.id=$6
    ON CONFLICT(office_id,application_number) DO UPDATE SET shipper=excluded.shipper,cargo_name=excluded.cargo_name,note=excluded.note,status='検証用'`,
    [number, shipper, cargo, note, createdBy, officeId]);
}
console.log('Kawasaki pilot validation users and sample applications are ready.');
console.log(`Initial password: ${password} (must be changed after login)`);
console.log('MFA codes are sent to the registered internal email addresses.');
await pool.end();
