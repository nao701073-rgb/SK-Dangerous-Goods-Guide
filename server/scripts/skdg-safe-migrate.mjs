import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Read-only migration catalog validator. Deliberately DOES NOT connect to databases.
// No apply mode exists until existing-db forward-only upgrades and restore are verified.
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(scriptsDir, '../sql');
const manifestPath = path.join(scriptsDir, 'skdg-migration-catalog.json');
const args = process.argv.slice(2);
const fail = (code, message) => { console.error(`STOP: ${message}`); process.exitCode = code; };

if (args.length !== 1 || !['--blocked-legacy', '--plan'].includes(args[0])) {
  fail(78, 'MIGRATION_EXECUTION_DISABLED_USE_NPM_RUN_MIGRATE_PLAN');
} else if (args[0] === '--blocked-legacy') {
  fail(78, 'UNSAFE_LEGACY_MIGRATOR_BLOCKED_EXISTING_DB_UPGRADE_NOT_APPROVED');
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries) || manifest.entries.length !== 110) {
      throw new Error('CATALOG_FORMAT_OR_COUNT_INVALID');
    }
    const names = new Set();
    const counts = { Unchanged: 0, Modified: 0, Added: 0 };
    for (const entry of manifest.entries) {
      if (!entry || !/^\d{3}_[A-Za-z0-9_-]+\.sql$/.test(entry.name)
          || !/^[0-9a-f]{64}$/i.test(entry.sha256 || '') || names.has(entry.name)
          || !Object.hasOwn(counts, entry.status)) {
        throw new Error('CATALOG_ENTRY_INVALID_OR_DUPLICATE');
      }
      names.add(entry.name);
      counts[entry.status]++;
    }
    if (counts.Unchanged !== 91 || counts.Modified !== 18 || counts.Added !== 1) {
      throw new Error('CATALOG_CHANGE_SCOPE_INVALID');
    }
    const files = fs.readdirSync(sqlDir).filter(name => /^\d+.*\.sql$/.test(name));
    if (files.length !== 110 || files.some(name => !names.has(name))) {
      throw new Error('SQL_FILE_SET_MISMATCH');
    }
    // The catalog records SHA256 for LF-normalized SQL bytes. The release ZIP
    // contains 108 SQL files with CRLF, and two already with LF. Normalizing
    // CRLF *only for verification* leaves the actual SQL files unchanged.
    // Using latin1 here is byte-preserving even if SQL text contains UTF-8.
    let rawMatches = 0;
    let crlfNormalizedMatches = 0;
    for (const entry of manifest.entries) {
      const file = path.join(sqlDir, entry.name);
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('SQL_FILE_TYPE_INVALID_' + entry.name);
      const bytes = fs.readFileSync(file);
      const actual = crypto.createHash('sha256').update(bytes).digest('hex');
      if (actual.toUpperCase() === entry.sha256.toUpperCase()) {
        rawMatches++;
        continue;
      }
      // A content change other than CRLF -> LF MUST still fail closed.
      const normalizedBytes = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
      const normalizedHash = crypto.createHash('sha256').update(normalizedBytes).digest('hex');
      if (normalizedHash.toUpperCase() !== entry.sha256.toUpperCase()) {
        throw new Error('SQL_CHECKSUM_MISMATCH_' + entry.name);
      }
      crlfNormalizedMatches++;
    }
    console.log('SKDG_R65_MIGRATION_MODE: OFFLINE_CATALOG_PLAN_ONLY');
    console.log('SQL_CATALOG_ENTRIES: 110');
    console.log('SQL_UNCHANGED: 91');
    console.log('SQL_MODIFIED: 18');
    console.log('SQL_ADDED: 1');
    console.log('SQL_RAW_SHA256_MATCH: ' + rawMatches);
    console.log('SQL_CRLF_TO_LF_CANONICAL_SHA256_MATCH: ' + crlfNormalizedMatches);
    console.log('ALL_110_SQL_CATALOG_SHA256_MATCH_WITH_CRLF_NORMALIZATION: True');
    console.log('DATABASES_CONNECTED: 0');
    console.log('SQL_EXECUTED: NO');
    console.log('LEGACY_MIGRATION_EXECUTION: BLOCKED');
    console.log('EXISTING_DB_UPGRADE_APPROVED: NO');
    console.log('RESULT: SKDG_MIGRATION_PLAN_STATIC_PASS_RELEASE_HOLD');
  } catch (error) {
    fail(2, String(error?.message || error));
  }
}
