import pg from 'pg';
import { config } from './config.js';
const { Pool } = pg;
export const pool = new Pool({ connectionString: config.databaseUrl, max: 20, idleTimeoutMillis: 30000 });
export const query = (text, params = []) => pool.query(text, params);
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
