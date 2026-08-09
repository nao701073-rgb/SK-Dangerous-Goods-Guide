import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '../..');
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const loadWindowScript = file => {
  const sandbox = { window:{} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:file,timeout:30_000});
  return sandbox.window;
};

export function buildRegulationVerificationCatalog() {
  const legalWindow = loadWindowScript(path.join(appRoot,'data/legal-code-master.js'));
  const unWindow = loadWindowScript(path.join(appRoot,'data/un-data.js'));
  const master = legalWindow.LEGAL_CODE_MASTER || {};
  const rows = Array.isArray(unWindow.UN_DATABASE) ? unWindow.UN_DATABASE : [];
  const criteria = master.judgementCriteriaByRecord || {};
  const items = [];
  for (const regulation of master.regulations || []) {
    items.push({targetType:'regulation',targetKey:String(regulation.regulationId),displayLabel:String(regulation.officialName||regulation.shortName||regulation.regulationId),regulationId:String(regulation.regulationId),sourceEdition:String(master.sourceEdition||''),sourcePages:[],sourceChecksum:null,contentChecksum:sha(regulation)});
  }
  for (const [code,detail] of Object.entries(master.codes || {})) {
    const pages=[...new Set([...(detail.domesticOriginalPages||[]),...(detail.domesticImdgReferences||[]).map(x=>x.page)].filter(Number.isFinite))];
    items.push({targetType:'code',targetKey:code,displayLabel:`${code} ${detail.labelJa||'コード'}`,regulationId:detail.domesticOriginalSource?'domestic-dangerous-goods-notification':'international-imdg',sourceEdition:String(detail.sourceEdition||master.sourceEdition||''),sourcePages:pages.map(page=>({page})),sourceChecksum:null,contentChecksum:sha(detail)});
  }
  for (const row of rows) {
    const key=`${String(row.unNumber||'').padStart(4,'0')}|${String(row.class||'-')}|${String(row.item||'-')}|${String(row.properShippingNameJa||'')}`;
    const judgement=criteria[key]||null;
    const pages=(judgement?.sections||[]).map(x=>({law:x.law||'',page:Number(x.page),title:x.title||'',pdfPath:x.pdfPath||''}));
    const content={unNumber:row.unNumber,properShippingNameJa:row.properShippingNameJa,properShippingName:row.properShippingName,class:row.class,item:row.item,packingGroup:row.packingGroup,packing:{small:row.smallPackingInstruction,smallAdditional:row.smallPackingAdditional,large:row.largePackingInstruction,largeAdditional:row.largePackingAdditional,ibc:row.ibcInstruction,ibcAdditional:row.ibcAdditional,tank:row.portableTankInstruction,tankAdditional:row.portableTankAdditional},judgement};
    items.push({targetType:'dangerous-good-criteria',targetKey:key,displayLabel:`国連番号${String(row.unNumber||'').padStart(4,'0')} ${row.properShippingNameJa||row.properShippingName||''}`,regulationId:'domestic-dangerous-goods-notification',sourceEdition:String(master.sourceEdition||row.source||''),sourcePages:pages,sourceChecksum:null,contentChecksum:sha(content)});
  }
  return {master,rows,items};
}

export async function syncRegulationVerificationCatalog(client,{actorId=null,sourceRelease='part508'}={}) {
  const {master,rows,items}=buildRegulationVerificationCatalog();
  let inserted=0,updated=0,unchanged=0,amendmentPending=0;
  for(const item of items){
    const existing=await client.query('SELECT id,content_checksum_sha256,status,revision_number FROM regulation_verification_items WHERE target_type=$1 AND target_key=$2 FOR UPDATE',[item.targetType,item.targetKey]);
    if(!existing.rows[0]){
      const created=await client.query(`INSERT INTO regulation_verification_items(target_type,target_key,display_label,regulation_id,source_edition,source_page_references,source_checksum_sha256,content_checksum_sha256,status,prepared_by,prepared_at)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,'prepared',$9,CASE WHEN $9::uuid IS NULL THEN NULL ELSE now() END) RETURNING id`,[item.targetType,item.targetKey,item.displayLabel,item.regulationId,item.sourceEdition,JSON.stringify(item.sourcePages),item.sourceChecksum,item.contentChecksum,actorId]);
      await client.query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,comment,source_page_references,content_checksum_sha256) VALUES($1,'catalog-created',$2,$3,$4::jsonb,$5)`,[created.rows[0].id,actorId,'静的マスターから照合対象を登録',JSON.stringify(item.sourcePages),item.contentChecksum]);inserted++;
    }else if(existing.rows[0].content_checksum_sha256!==item.contentChecksum){
      const nextStatus=existing.rows[0].status==='approved'?'amendment-pending':'prepared';
      await client.query(`UPDATE regulation_verification_items SET display_label=$1,regulation_id=$2,source_edition=$3,source_page_references=$4::jsonb,content_checksum_sha256=$5,status=$6,publication_block_reason=$7,revision_number=revision_number+1,prepared_by=COALESCE($8,prepared_by),prepared_at=CASE WHEN $8::uuid IS NULL THEN prepared_at ELSE now() END,submitted_by=NULL,verified_by=NULL,approved_by=NULL,submitted_at=NULL,verified_at=NULL,approved_at=NULL,updated_at=now() WHERE id=$9`,[item.displayLabel,item.regulationId,item.sourceEdition,JSON.stringify(item.sourcePages),item.contentChecksum,nextStatus,'静的マスターの内容変更を検出したため再照合が必要です。',actorId,existing.rows[0].id]);
      await client.query(`UPDATE regulation_approval_certificates SET status='superseded',valid_to=current_date WHERE item_id=$1 AND status='valid'`,[existing.rows[0].id]);
      await client.query(`INSERT INTO regulation_verification_events(item_id,event_type,actor_user_id,comment,source_page_references,content_checksum_sha256) VALUES($1,$2,$3,$4,$5::jsonb,$6)`,[existing.rows[0].id,nextStatus==='amendment-pending'?'amendment-pending':'catalog-updated',actorId,'静的マスターの内容変更を検出',JSON.stringify(item.sourcePages),item.contentChecksum]);updated++;if(nextStatus==='amendment-pending')amendmentPending++;
    }else{
      await client.query(`UPDATE regulation_verification_items SET display_label=$1,regulation_id=$2,source_edition=$3,source_page_references=$4::jsonb,updated_at=now() WHERE id=$5`,[item.displayLabel,item.regulationId,item.sourceEdition,JSON.stringify(item.sourcePages),existing.rows[0].id]);unchanged++;
    }
  }
  const run=await client.query(`INSERT INTO regulation_catalog_sync_runs(source_release,source_master_version,expected_dangerous_goods,expected_codes,expected_regulations,inserted_count,updated_count,amendment_pending_count,unchanged_count,details,executed_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) RETURNING *`,[sourceRelease,master.masterVersion||'',rows.length,Object.keys(master.codes||{}).length,(master.regulations||[]).length,inserted,updated,amendmentPending,unchanged,JSON.stringify({total:items.length,sourceEdition:master.sourceEdition||''}),actorId]);
  return {run:run.rows[0],summary:{total:items.length,inserted,updated,amendmentPending,unchanged,expectedDangerousGoods:rows.length,expectedCodes:Object.keys(master.codes||{}).length,expectedRegulations:(master.regulations||[]).length}};
}
