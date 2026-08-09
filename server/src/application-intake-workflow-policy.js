import crypto from 'node:crypto';

const SHA_RE=/^[a-f0-9]{64}$/i;
const ALLOWED_FORMATS=new Set(['xls','xlsx','csv']);
const normalize=v=>String(v??'').trim();
const safeFileLabel=value=>{
  const text=normalize(value).replace(/\\/g,'/').split('/').pop()||'';
  const ext=(text.split('.').pop()||'').toLowerCase();
  return ALLOWED_FORMATS.has(ext)?`application.${ext}`:'application-data';
};

export function evaluateIntakeRecord(input={}){
  const blockers=[];const warnings=[];
  const format=normalize(input.sourceFormat).toLowerCase();
  const cargoCount=Number(input.cargoCount||0);
  const blockerCount=Number(input.blockerCount||0);
  const warningCount=Number(input.warningCount||0);
  if(!ALLOWED_FORMATS.has(format))blockers.push('取込形式はxls、xlsx、csvのいずれかにしてください。');
  if(!SHA_RE.test(normalize(input.sourceSha256)))blockers.push('取込元SHA-256を確認してください。');
  if(Boolean(input.originalFileStored))blockers.push('申請書・依頼書の原本ファイルは取込台帳へ保存できません。');
  if(cargoCount<1)blockers.push('対象危険物は1件以上必要です。');
  if(blockerCount>0)blockers.push('事前チェックの遮断項目が残っています。');
  if(warningCount>0)warnings.push(`確認事項が${warningCount}件あります。`);
  if(normalize(input.validationStatus)==='blocked')blockers.push('事前チェック結果が登録不可です。');
  return {allowed:blockers.length===0,blockers,warnings,status:blockers.length?'blocked':warnings.length?'review':'ready',sourceLabel:safeFileLabel(input.sourceFileName||input.sourceLabel||format)};
}

export function validateIntakeActors(row,userId,stage){
  const actor=String(userId||'');const errors=[];
  if(stage==='review'&&String(row.created_by||'')===actor)errors.push('取込記録の作成者本人は原本照合者になれません。');
  if(stage==='register'&&String(row.reviewed_by||'')===actor)errors.push('原本照合者本人は登録完了確認者になれません。');
  return {valid:errors.length===0,errors};
}

export function intakeSnapshotSha(value){
  return crypto.createHash('sha256').update(JSON.stringify(value??{})).digest('hex');
}

export {safeFileLabel};
