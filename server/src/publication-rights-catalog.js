import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transaction } from './db.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const catalogPath=path.resolve(here,'../../data/publication-rights-catalog.json');

export const readPublicationRightsCatalog=()=>JSON.parse(fs.readFileSync(catalogPath,'utf8'));

export async function syncPublicationRightsCatalog({executedBy=null}={}){
  const catalog=readPublicationRightsCatalog();
  return transaction(async client=>{
    let inserted=0,updated=0,checksumChanged=0,unchanged=0;
    for(const item of catalog.items){
      const existing=await client.query('SELECT id,checksum_sha256,status FROM publication_rights_items WHERE asset_key=$1',[item.assetKey]);
      if(!existing.rows[0]){
        const created=await client.query(`INSERT INTO publication_rights_items(
          asset_key,file_path,display_label,asset_category,source_class,mime_type,file_size,checksum_sha256,risk_level,
          recommended_scope,public_treatment,rights_holder,rights_basis,license_reference,source_url,attribution_text,review_note,
          last_terms_checked_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now()) RETURNING id`,[
          item.assetKey,item.filePath,item.displayLabel,item.assetCategory,item.sourceClass,item.mimeType,item.fileSize,item.checksumSha256,item.riskLevel,
          item.recommendedScope,item.publicTreatment,item.rightsHolder||'',item.rightsBasis||'',item.licenseReference||'',item.sourceUrl||'',item.attributionText||'',item.reason||''
        ]);
        await client.query(`INSERT INTO publication_rights_events(item_id,event_type,actor_user_id,comment,checksum_sha256,decision_snapshot)
          VALUES($1,'catalog-created',$2,$3,$4,$5::jsonb)`,[created.rows[0].id,executedBy,item.reason||'',item.checksumSha256,JSON.stringify({recommendedScope:item.recommendedScope,publicTreatment:item.publicTreatment,sourceClass:item.sourceClass})]);
        inserted++;
        continue;
      }
      const row=existing.rows[0];
      const changed=row.checksum_sha256!==item.checksumSha256;
      await client.query(`UPDATE publication_rights_items SET file_path=$1,display_label=$2,asset_category=$3,source_class=$4,mime_type=$5,file_size=$6,
        checksum_sha256=$7,risk_level=$8,recommended_scope=$9,updated_at=now(),
        status=CASE WHEN checksum_sha256<>$7 AND status IN ('approved','restricted','metadata-only') THEN 'submitted' ELSE status END,
        restriction_reason=CASE WHEN checksum_sha256<>$7 AND status IN ('approved','restricted','metadata-only') THEN 'ファイル内容が変更されたため権利条件の再確認が必要です。' ELSE restriction_reason END,
        revision_number=CASE WHEN checksum_sha256<>$7 THEN revision_number+1 ELSE revision_number END
        WHERE id=$10`,[item.filePath,item.displayLabel,item.assetCategory,item.sourceClass,item.mimeType,item.fileSize,item.checksumSha256,item.riskLevel,item.recommendedScope,row.id]);
      if(changed){
        checksumChanged++;updated++;
        await client.query(`INSERT INTO publication_rights_events(item_id,event_type,actor_user_id,comment,checksum_sha256,decision_snapshot)
          VALUES($1,'checksum-changed',$2,'ファイル内容の変更を検出しました。権利条件を再確認してください。',$3,$4::jsonb)`,[row.id,executedBy,item.checksumSha256,JSON.stringify({previousStatus:row.status})]);
      }else unchanged++;
    }
    const run=await client.query(`INSERT INTO publication_catalog_sync_runs(source_release,scanned_count,inserted_count,updated_count,checksum_changed_count,unchanged_count,total_bytes,details,executed_by)
      VALUES('part509',$1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *`,[catalog.summary.total,inserted,updated,checksumChanged,unchanged,catalog.summary.totalBytes,JSON.stringify(catalog.summary),executedBy]);
    return {run:run.rows[0],summary:catalog.summary};
  });
}
