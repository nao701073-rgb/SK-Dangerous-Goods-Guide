import crypto from 'crypto';
import { query } from '../src/db.js';
import { objectStorage } from '../src/storage.js';

const rows=(await query(`SELECT 'photo' kind,id,COALESCE(storage_key,stored_name) storage_key,sha256 FROM photos WHERE deleted_at IS NULL
UNION ALL SELECT 'document' kind,id::text,storage_key,sha256 FROM application_documents WHERE cancelled_at IS NULL`)).rows;
let missing=0,mismatch=0;
for(const item of rows){
  if(!(await objectStorage.exists(item.storage_key))){console.error(`missing ${item.kind}: ${item.id} ${item.storage_key}`);missing++;continue;}
  const body=await objectStorage.get(item.storage_key);const sha=crypto.createHash('sha256').update(body).digest('hex');if(sha!==item.sha256){console.error(`checksum mismatch ${item.kind}: ${item.id}`);mismatch++;}
}
console.log(JSON.stringify({provider:objectStorage.provider,checked:rows.length,missing,mismatch},null,2));
if(missing||mismatch)process.exit(2);
process.exit(0);
