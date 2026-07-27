import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const args = new Set(process.argv.slice(2));
const fileArg = process.argv.slice(2).find(v => !v.startsWith('--'));
const dryRun = args.has('--dry-run');
if (!fileArg) {
  console.error('Usage: npm run users:import -- ./data/users.csv [--dry-run]');
  process.exit(1);
}

function parseCsv(text) {
  const rows=[]; let row=[]; let field=''; let quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){field+='"';i++;}
      else if(c==='"') quoted=false;
      else field+=c;
    } else if(c==='"') quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field || row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const headers=rows.shift().map(h=>h.trim());
  return rows.filter(r=>r.some(v=>v.trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()])));
}

const allowedRoles = new Set(['office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator']);
const roleCategory = role => ({
  'office-user':'inspector','office-admin':'office-director',
  'safety-environment-director':'safety-environment-director',
  'safety-environment-staff':'safety-environment-staff',
  'safety-environment-admin':'safety-environment-admin',guest:'staff-guest',validator:'staff-validator'
})[role];
const generatePassword=()=>`Sk!${crypto.randomBytes(9).toString('base64url')}9a`;

const records=parseCsv(fs.readFileSync(fileArg,'utf8').replace(/^\uFEFF/,''));
if(records.length>200) throw new Error('一度に登録できる利用者は200名までです。');
const offices=new Set((await pool.query('SELECT id FROM offices WHERE active=true')).rows.map(r=>r.id));
const seen=new Set(); const errors=[]; const prepared=[];
for(let i=0;i<records.length;i++){
  const line=i+2, r=records[i];
  const loginId=(r.login_id||'').toLowerCase();
  const role=r.role||''; const officeId=r.office_id||null;
  if(!/^[a-z0-9._-]{3,100}$/.test(loginId)) errors.push(`行${line}: login_idが不正です。`);
  if(seen.has(loginId)) errors.push(`行${line}: login_idがCSV内で重複しています。`); seen.add(loginId);
  if(!(r.display_name||'').trim()) errors.push(`行${line}: display_nameが必要です。`);
  if(!allowedRoles.has(role)) errors.push(`行${line}: roleが不正です。`);
  if(['office-user','office-admin'].includes(role) && !offices.has(officeId)) errors.push(`行${line}: 有効なoffice_idが必要です。`);
  if(['safety-environment-director','safety-environment-staff','safety-environment-admin','guest','validator'].includes(role) && officeId) errors.push(`行${line}: このroleではoffice_idを空欄にしてください。`);
  const password=r.initial_password || generatePassword();
  prepared.push({...r,loginId,role,officeId,password});
}
if(errors.length){console.error(errors.join('\n'));await pool.end();process.exit(2);}
console.log(`検証完了: ${prepared.length}名 / dry-run=${dryRun}`);
if(dryRun){await pool.end();process.exit(0);}

const client=await pool.connect(); const credentials=[];
try{
  await client.query('BEGIN');
  for(const r of prepared){
    const hash=await bcrypt.hash(r.password,12);
    const email=(r.email||'').toLowerCase()||null;
    const result=await client.query(`INSERT INTO users(login_id,email,display_name,password_hash,role,account_category,office_id,must_change_password,mfa_required,activated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,now())
      ON CONFLICT(login_id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,role=excluded.role,account_category=excluded.account_category,office_id=excluded.office_id,active=true,updated_at=now()
      RETURNING id`,[r.loginId,email,r.display_name,hash,r.role,roleCategory(r.role),['office-user','office-admin'].includes(r.role)?r.officeId:null,String(r.mfa_required).toLowerCase()==='true']);
    credentials.push({login_id:r.loginId,display_name:r.display_name,initial_password:r.password,user_id:result.rows[0].id});
  }
  await client.query('COMMIT');
  const out=`initial-credentials-${new Date().toISOString().replace(/[:.]/g,'-')}.csv`;
  fs.writeFileSync(out,'login_id,display_name,initial_password\n'+credentials.map(v=>[v.login_id,v.display_name,v.initial_password].map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n'));
  console.log(`登録完了: ${credentials.length}名。初期認証情報: ${out}`);
  console.warn('初期認証情報ファイルは安全な方法で配布し、配布後に削除してください。');
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
