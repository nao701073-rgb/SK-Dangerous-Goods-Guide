import fs from 'fs';
import path from 'path';

const expected = {
  guest: {
    applicationScope: 'none', applicationsRead: false, applicationsWrite: false, applicationsDelete: false,
    photosRead: false, photosWrite: false, photosDelete: false,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: false
  },
  'office-user': {
    applicationScope: 'own-office', applicationsRead: true, applicationsWrite: true, applicationsDelete: true,
    photosRead: true, photosWrite: true, photosDelete: true,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: false
  },
  'office-admin': {
    applicationScope: 'own-office', applicationsRead: true, applicationsWrite: true, applicationsDelete: true,
    photosRead: true, photosWrite: true, photosDelete: true,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: true, userAdministration: 'own-office'
  },
  'safety-environment-director': {
    applicationScope: 'all-offices', applicationsRead: true, applicationsWrite: true, applicationsDelete: false,
    photosRead: true, photosWrite: true, photosDelete: false,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: true, systemSettingsMode: 'limited'
  },
  'safety-environment-staff': {
    applicationScope: 'all-offices', applicationsRead: true, applicationsWrite: false, applicationsDelete: false,
    photosRead: true, photosWrite: false, photosDelete: false,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: false
  },
  'safety-environment-admin': {
    applicationScope: 'all-offices', applicationsRead: true, applicationsWrite: true, applicationsDelete: true,
    photosRead: true, photosWrite: true, photosDelete: true,
    dangerousGoodsSearch: true, regulationsRead: true, referencesRead: true,
    userSettings: true, systemSettings: true, userAdministration: 'all-offices'
  }
};

const issues = [];
const assert = (condition, role, field, message) => { if (!condition) issues.push({ role, field, message }); };
for (const [role, rules] of Object.entries(expected)) {
  assert(Boolean(rules.applicationScope), role, 'applicationScope', '申請番号の範囲が未定義です。');
  if (role === 'guest') {
    assert(!rules.applicationsRead && !rules.photosRead, role, 'operationalRead', 'ゲストは申請番号・写真を閲覧できません。');
    assert(rules.dangerousGoodsSearch && rules.regulationsRead && rules.referencesRead && rules.userSettings, role, 'guestFeatures', 'ゲストに必要な閲覧機能が不足しています。');
  }
  if (role === 'safety-environment-director') {
    assert(rules.applicationsWrite && rules.photosWrite, role, 'write', '安全環境室長は全事業所の登録・編集が必要です。');
    assert(!rules.applicationsDelete && !rules.photosDelete, role, 'delete', '安全環境室長は削除不可でなければなりません。');
  }
  if (role === 'safety-environment-staff') {
    assert(rules.applicationsRead && rules.photosRead, role, 'read', '安全環境室職員は全事業所閲覧が必要です。');
    assert(!rules.applicationsWrite && !rules.photosWrite && !rules.applicationsDelete && !rules.photosDelete, role, 'writeDelete', '安全環境室職員は閲覧専用です。');
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  version: 'Part 219',
  expectedUsersPilot: 50,
  expectedUsersFuture: 150,
  result: issues.length ? 'failed' : 'passed',
  issueCount: issues.length,
  issues,
  matrix: expected
};
const output = path.resolve(process.cwd(), '../docs/Part219_役割別権限監査レポート.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2));
for (const [role, rules] of Object.entries(expected)) console.log(`OK ${role}: ${JSON.stringify(rules)}`);
if (issues.length) {
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}
console.log(`role permission validation passed; report=${output}`);
