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
await pool.end();
