// TEST156 LAB ONLY: authenticated, transactional browser-to-DB bridge.
// Client-readable names and actor labels are NOT authority. Authorization is from req.user.
import crypto from 'crypto';
import { z } from 'zod';

const entities = {
  'corrective-evidence-case-reopen-request':'request',
  'corrective-evidence-case-reopen-investigation':'investigation',
  'corrective-evidence-case-closure-certificate':'certificate'
};
const actions = {
  request: {create:[null,'pending-approval'],approve:['pending-approval','approved']},
  investigation: {
    create:[null,'investigating'],
    update:['investigating','investigating'],
    submit:['investigating','pending-review'],
    approve:['pending-review','corrective-in-progress'],
    'complete-corrective':['corrective-in-progress','pending-corrective-verification'],
    'verify-corrective':['pending-corrective-verification','reevaluation-pending'],
    'review-reevaluation':['reevaluation-pending',null],
    reclose:['pending-reclosure','reclosed']
  },
  certificate:{'create-reclosure':[null,'archived-reclosure']}
};
const schema=z.object({
  queueId:z.string().min(1).max(150),
  entity:z.enum(Object.keys(entities)),
  action:z.string().min(1).max(40),
  payload:z.record(z.string(),z.any())
}).strict();
const bad=(status,message)=>Object.assign(new Error(message),{status});
const sha256=obj=>crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const text=(v,max=5000)=>String(v??'').slice(0,max);
const timestamp=v=>v && !Number.isNaN(Date.parse(v))?new Date(v).toISOString():null;
const allowedRole = user => ['office-admin','safety-environment-admin'].includes(user?.role);
function scope(user,officeId){
  if(!allowedRole(user))throw bad(403,'再調査同期の操作権限がありません。');
  if(!officeId || typeof officeId!=='string')throw bad(400,'所属事業所が必要です。');
  if(user.role==='office-admin' && String(user.office_id)!==officeId)throw bad(403,'所属外の事業所です。');
}
function actorSeparation(kind,action,actorMap,userId){
  const same=key=>actorMap[key] && actorMap[key]===userId;
  if ((kind==='request'&&action==='approve'&&same('createdBy')) ||
    (kind==='investigation'&&action==='approve'&&same('submittedBy')) ||
    (kind==='investigation'&&action==='verify-corrective'&&same('correctiveCompletedBy')) ||
    (kind==='investigation'&&action==='review-reevaluation'&&(same('correctiveCompletedBy')||same('correctiveVerifiedBy'))) ||
    (kind==='investigation'&&action==='reclose'&&same('reevaluatedBy'))) {
    throw bad(409,'担当者の職務分離に反します。');
  }
}
function nextActorMap(kind,action,prior,userId){
  const m={...(prior||{})};
  const fields={create:'createdBy',submit:'submittedBy',approve:'approvedBy',
    'complete-corrective':'correctiveCompletedBy','verify-corrective':'correctiveVerifiedBy',
    'review-reevaluation':'reevaluatedBy',reclose:'reclosedBy'};
  if(fields[action])m[fields[action]]=userId;
  return m;
}
const chooseState=(kind,action,payload)=>{
  let [,next]=actions[kind][action];
  if (action==='review-reevaluation') {
    const result=payload.reevaluationResult;
    if (!['recurrence','no-recurrence'].includes(result))throw bad(400,'再評価結果が不正です。');
    next=result==='recurrence'?'corrective-in-progress':'pending-reclosure';
  }
  if(kind==='investigation'&&action==='reclose'&&payload.reevaluationResult!=='no-recurrence')throw bad(409,'再発なしの再評価が必要です。');
  if(payload.status!==next)throw bad(409,'業務ステータスと同期操作が一致しません。');
  return next;
};
function required(v,label){if(typeof v!=='string'||!v.trim())throw bad(400,`${label}がありません。`);return v.trim();}
async function upsertInvestigation(client,action,p,userId){
  if(action==='create') {
    await client.query(`INSERT INTO case_reopen_investigations
      (id,reopen_request_id,previous_closure_certificate_id,corrective_action_id,office_id,status,scope,assigned_to,due_at,progress,findings,root_cause,additional_action)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[
      required(p.id,'調査ID'),required(p.reopenRequestId,'申請ID'),
      required(p.previousClosureCertificateId,'以前の証明書ID'),required(p.correctiveActionId,'是正ID'),
      required(p.officeId,'事業所ID'),p.status,required(p.scope,'調査範囲'),required(p.assignedTo,'担当者'),
      timestamp(p.dueAt),Number(p.progress||0),text(p.findings),text(p.rootCause),text(p.additionalAction)
    ]);
  } else {
    const args=[p.id,p.status,Number(p.progress||0),text(p.findings),text(p.rootCause),
      text(p.additionalAction),timestamp(p.dueAt),timestamp(p.correctiveDueAt),
      timestamp(p.reevaluationDueAt),action,String(userId),text(p.reevaluationResult,50),
      text(p.reclosureCertificateId,150),p.officeId];
    const result=await client.query(`UPDATE case_reopen_investigations SET
      status=$2,progress=$3,findings=$4,root_cause=$5,additional_action=$6,
      due_at=$7,corrective_due_at=$8,reevaluation_due_at=$9,
      submitted_by=CASE WHEN $10='submit' THEN $11 ELSE submitted_by END,
      submitted_at=CASE WHEN $10='submit' THEN now() ELSE submitted_at END,
      reviewed_by=CASE WHEN $10='approve' THEN $11 ELSE reviewed_by END,
      reviewed_at=CASE WHEN $10='approve' THEN now() ELSE reviewed_at END,
      corrective_completed_by=CASE WHEN $10='complete-corrective' THEN $11 ELSE corrective_completed_by END,
      corrective_completed_at=CASE WHEN $10='complete-corrective' THEN now() ELSE corrective_completed_at END,
      corrective_verified_by=CASE WHEN $10='verify-corrective' THEN $11 ELSE corrective_verified_by END,
      corrective_verified_at=CASE WHEN $10='verify-corrective' THEN now() ELSE corrective_verified_at END,
      reevaluation_result=CASE WHEN $10='review-reevaluation' THEN $12 ELSE reevaluation_result END,
      reevaluated_by=CASE WHEN $10='review-reevaluation' THEN $11 ELSE reevaluated_by END,
      reevaluated_at=CASE WHEN $10='review-reevaluation' THEN now() ELSE reevaluated_at END,
      reclosed_by=CASE WHEN $10='reclose' THEN $11 ELSE reclosed_by END,
      reclosed_at=CASE WHEN $10='reclose' THEN now() ELSE reclosed_at END,
      reclosure_certificate_id=CASE WHEN $10='reclose' THEN NULLIF($13,'') ELSE reclosure_certificate_id END,
      updated_at=now()
      WHERE id=$1 AND office_id=$14 RETURNING id`,args);
    if(result.rowCount!==1)throw bad(409,'再調査データの更新対象がありません。');
  }
}
export function registerReopenSyncRoutes({app,authenticate,requireOperationalRead,requireOperationalWrite,query,transaction}){
  app.post('/api/reopen-sync/events',authenticate,requireOperationalWrite,async(req,res)=>{
    const parsed=schema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'同期要求の形式が不正です。'});
    const {queueId,entity,action,payload}=parsed.data;
    const kind=entities[entity];
    if(!Object.prototype.hasOwnProperty.call(actions[kind],action))return res.status(400).json({error:'未対応の同期操作です。'});
    if(Buffer.byteLength(JSON.stringify(payload),'utf8')>60000)return res.status(413).json({error:'同期データが大きすぎます。'});
    const clientId=String(kind==='certificate'?payload.certificateId:payload.id||'');
    if(!clientId||clientId.length>150)return res.status(400).json({error:'対象IDが不正です。'});
    try{
      scope(req.user,payload.officeId);
      const digest=sha256({entity,action,payload});
      const result=await transaction(async client=>{
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`${kind}:${clientId}`]);
        const receipt=await client.query('SELECT * FROM case_reopen_sync_receipts WHERE queue_id=$1',[queueId]);
        if(receipt.rows[0]){
          if(receipt.rows[0].request_sha256!==digest||receipt.rows[0].office_id!==payload.officeId||String(receipt.rows[0].actor_id)!==String(req.user.id))throw bad(409,'送信IDが別の内容で再利用されています。');
          return {...receipt.rows[0].response,idempotent:true};
        }
        const office=await client.query('SELECT id FROM offices WHERE id=$1',[payload.officeId]);
        if(!office.rows.length)throw bad(400,'事業所が存在しません。');
        const existing=await client.query('SELECT * FROM case_reopen_sync_state WHERE entity_type=$1 AND client_id=$2 FOR UPDATE',[kind,clientId]);
        const before=existing.rows[0]||null;
        if(before&&before.office_id!==payload.officeId)throw bad(403,'同期対象の事業所が一致しません。');
        const [expectedBefore]=actions[kind][action];
        if((before?.status??null)!==expectedBefore)throw bad(409,'同期順序が一致しません。先行する操作を同期してください。');
        if(before) {
          const previous=before.snapshot||{};
          const keys=kind==='request'?['certificateId','correctiveActionId']:
            kind==='investigation'?['reopenRequestId','previousClosureCertificateId','correctiveActionId']:[];
          for(const key of keys)if(String(previous[key]??'')!==String(payload[key]??''))
            throw bad(409,'案件の紐付け情報を変更できません。');
        }
        const next=chooseState(kind,action,payload);
        actorSeparation(kind,action,before?.actor_map||{},String(req.user.id));
        if(kind==='investigation'&&action==='create'){
          const parent=await client.query(`SELECT office_id,status,snapshot FROM case_reopen_sync_state
            WHERE entity_type='request' AND client_id=$1 FOR UPDATE`,[payload.reopenRequestId]);
          if(!parent.rows.length||parent.rows[0].office_id!==payload.officeId||parent.rows[0].status!=='approved')throw bad(409,'承認済みの案件再開申請がサーバー側にありません。');
          if(String(parent.rows[0].snapshot.certificateId)!==String(payload.previousClosureCertificateId)||String(parent.rows[0].snapshot.correctiveActionId)!==String(payload.correctiveActionId))throw bad(409,'申請元の証明書・是正IDが一致しません。');
        }
        if(kind==='certificate'){
          const parent=await client.query(`SELECT office_id,status,snapshot FROM case_reopen_sync_state
            WHERE entity_type='investigation' AND client_id=$1 FOR UPDATE`,[payload.reinvestigationId]);
          if(!parent.rows.length||parent.rows[0].office_id!==payload.officeId||parent.rows[0].status!=='reclosed'||String(parent.rows[0].snapshot.reclosureCertificateId)!==clientId)throw bad(409,'再クローズ済みの調査記録がありません。');
        }
        if(kind==='investigation')await upsertInvestigation(client,action,payload,req.user.id);
        const actorMap=nextActorMap(kind,action,before?.actor_map||{},String(req.user.id));
        const revision=(Number(before?.revision)||0)+1;
        await client.query(`INSERT INTO case_reopen_sync_state(entity_type,client_id,office_id,status,snapshot,actor_map,revision,created_by,updated_by)
          VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$8)
          ON CONFLICT(entity_type,client_id) DO UPDATE SET
          status=EXCLUDED.status,snapshot=EXCLUDED.snapshot,actor_map=EXCLUDED.actor_map,
          revision=EXCLUDED.revision,updated_by=EXCLUDED.updated_by,updated_at=now()`,
          [kind,clientId,payload.officeId,next,JSON.stringify(payload),JSON.stringify(actorMap),revision,req.user.id]);
        if(kind==='investigation')await client.query(`INSERT INTO case_reopen_investigation_events(investigation_id,event_type,actor,note)
          VALUES($1,$2,$3,$4)`,[clientId,action,String(req.user.id),`sync:${queueId}`]);
        if(kind==='investigation'&&action==='reclose')await client.query(`UPDATE case_reopen_sync_state SET status='reclosed',snapshot=jsonb_set(snapshot,'{status}',to_jsonb('reclosed'::text)),updated_at=now() WHERE entity_type='request' AND client_id=$1 AND office_id=$2`,[payload.reopenRequestId,payload.officeId]);
        const response={status:'persisted',clientId,entity,action,serverRevision:revision};
        await client.query(`INSERT INTO case_reopen_sync_receipts(queue_id,request_sha256,entity_type,client_id,office_id,action,actor_id,response)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[queueId,digest,kind,clientId,payload.officeId,action,req.user.id,JSON.stringify(response)]);
        return response;
      });
      return res.json(result);
    }catch(error){
      if(error.status)return res.status(error.status).json({error:error.message});
      console.error('reopen sync transaction failed',error?.code||error?.name||'unknown');
      return res.status(500).json({error:'再調査データを保存できませんでした。同期キューは保持されます。'});
    }
  });
  app.get('/api/reopen-sync/state',authenticate,requireOperationalRead,async(req,res)=>{
    try{
      if(!allowedRole(req.user))return res.status(403).json({error:'権限がありません。'});
      const requested=String(req.query.officeId||req.user.office_id||'');
      scope(req.user,requested);
      const {rows}=await query(`SELECT entity_type,client_id,office_id,status,snapshot,revision,updated_at
        FROM case_reopen_sync_state WHERE office_id=$1 ORDER BY updated_at DESC LIMIT 500`,[requested]);
      return res.json({items:rows});
    }catch(error){if(error.status)return res.status(error.status).json({error:error.message});return res.status(500).json({error:'再調査データを取得できませんでした。'});}
  });
}
