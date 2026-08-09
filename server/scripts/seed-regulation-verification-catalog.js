import { pool } from '../src/db.js';
import { syncRegulationVerificationCatalog } from '../src/regulation-catalog.js';
const client=await pool.connect();
try{await client.query('BEGIN');const result=await syncRegulationVerificationCatalog(client,{sourceRelease:'part508'});await client.query('COMMIT');console.log(JSON.stringify(result,null,2));}
catch(error){await client.query('ROLLBACK');throw error;}
finally{client.release();await pool.end();}
