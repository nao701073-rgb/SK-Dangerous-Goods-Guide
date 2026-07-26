import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(root, '../sql');
const files = fs.readdirSync(sqlDir).filter(name => /^\d+.*\.sql$/.test(name)).sort();
for (const file of files) {
  const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
  console.log(`Applying ${file}`);
  await pool.query(sql);
}
await pool.end();
console.log('Migrations completed.');
