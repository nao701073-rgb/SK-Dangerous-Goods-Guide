import { query } from './db.js';
export async function audit(req, action, entityType, entityId, details = {}) {
  try {
    await query(`INSERT INTO audit_logs(user_id,role,office_id,action,entity_type,entity_id,ip_address,user_agent,details)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [req.user?.id || null, req.user?.role || null, req.user?.office_id || null,
      action, entityType, entityId ? String(entityId) : null, req.ip || null, req.headers['user-agent'] || null, details]);
  } catch (error) {
    console.error('audit failed', error.message);
  }
}
