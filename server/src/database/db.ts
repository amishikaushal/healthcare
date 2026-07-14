import { Pool, PoolClient, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

// When DATABASE_URL is set (Neon/production), use connection string.
// Otherwise fall back to individual DB_* params (Docker / local dev).
const poolConfig = config.db.connectionString
  ? {
      connectionString: config.db.connectionString,
      ssl: { rejectUnauthorized: false },
      min: config.db.poolMin,
      max: config.db.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      min: config.db.poolMin,
      max: config.db.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', err);
});

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
  ) => pool.query<T>(text, params),

  getClient: (): Promise<PoolClient> => pool.connect(),

  transaction: async <T>(
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await fn(client);

      await client.query('COMMIT');

      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  testConnection: async (): Promise<void> => {
    const client = await pool.connect();

    try {
      await client.query('SELECT 1');
      logger.info('✅ Database connected');
    } finally {
      client.release();
    }
  },
};

export default pool;