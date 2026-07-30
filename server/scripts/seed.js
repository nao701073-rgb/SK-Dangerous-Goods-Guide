import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';
const blocks = [{ id:'block-01', name:'第一ブロック', sort:1 }];
const offices = [
  ['office-metropolitan-survey','block-01','首都圏サーベイセンター'],
  ['office-kawasaki','block-01','川崎事業所'],
  ['office-yokohama','block-01','横浜事業所'],
  ['office-yokohama-daikoku','block-01','横浜大黒事業所']
];
for (const b of blocks) await pool.query('INSERT INTO blocks(id,name,sort_order) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=excluded.name', [b.id,b.name,b.sort]);
for (const o of offices) await pool.query('INSERT INTO offices(id,block_id,name) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=excluded.name,block_id=excluded.block_id', o);
const loginId = process.env.BOOTSTRAP_ADMIN_LOGIN_ID || 'safety-admin';
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (email && password) {
  const hash = await bcrypt.hash(password, 12);
  await pool.query(`INSERT INTO users(login_id,email,display_name,password_hash,role,account_category,office_id,mfa_required,must_change_password)
    VALUES(lower($1),lower($2),'安全環境室 管理者',$3,'safety-environment-admin','safety-environment',NULL,true,true)
    ON CONFLICT(email) DO UPDATE SET login_id=excluded.login_id,active=true`, [loginId,email,hash]);
  console.log(`Bootstrap administrator checked: ${loginId}`);
}

const validationAccounts = [
  ['ooura','大浦 検査員','office-user','office-kawasaki','Kensa-363!'],
  ['sato','佐藤 事業所管理者','office-admin','office-kawasaki','TempPass!2026'],
  ['naritake','成竹（なりたけ）','office-user','office-kawasaki','TempPass!2026'],
  ['awasaki','粟崎（あわさき）','office-user','office-kawasaki','TempPass!2026'],
  ['yamamoto','山本 安全環境室長','safety-environment-director',null,'Director-363!'],
  ['tanaka','田中 安全環境室職員','safety-environment-staff',null,'Staff-363!'],
  ['suzuki','鈴木 システム管理者','safety-environment-admin',null,'Admin-363!'],
  ['ito','伊藤 ゲスト','guest',null,'Guest-363!'],
  ['kobayashi','小林 検証者','validator',null,'Validator-363!'],
  ['revision-validator','改正検証者用アカウント','revision-validator',null,'TempPass!2026'],
  ['daikoku.sato','佐藤','office-user','office-yokohama-daikoku','TempPass!2026'],
  ['daikoku.ueki','植木','office-user','office-yokohama-daikoku','TempPass!2026']
];
if (process.env.DISABLE_VALIDATION_ACCOUNTS !== 'true') {
  for (const [validationLoginId, displayName, role, officeId, temporaryPassword] of validationAccounts) {
    const hash = await bcrypt.hash(temporaryPassword, 12);
    const category = role === 'guest' ? 'staff-guest' : role === 'validator' ? 'staff-validator' : role === 'revision-validator' ? 'staff-validator' : role === 'safety-environment-admin' ? 'safety-environment-admin' : role === 'safety-environment-director' ? 'safety-environment-director' : role === 'safety-environment-staff' ? 'safety-environment-staff' : role === 'office-admin' ? 'office-director' : 'inspector';
    await pool.query(`INSERT INTO users(login_id,display_name,password_hash,role,account_category,office_id,must_change_password,mfa_required,active,activated_at)
      VALUES(lower($1),$2,$3,$4,$5,$6,false,false,true,now())
      ON CONFLICT(login_id) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,account_category=excluded.account_category,office_id=excluded.office_id,active=true`,
      [validationLoginId,displayName,hash,role,category,officeId]);
  }
  console.log('Validation accounts checked: ooura, sato, naritake, awasaki, yamamoto, tanaka, suzuki, ito, kobayashi, revision-validator, daikoku.sato, daikoku.ueki');
}

await pool.end();
