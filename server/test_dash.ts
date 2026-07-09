import { db } from './src/database/db';
import { getDashboardSummary } from './src/controllers/dashboard.controller';

async function run() {
  const { rows } = await db.query(`SELECT id, user_id FROM patients LIMIT 1`);
  if (rows.length > 0) {
    const patientId = rows[0].id;
    const userId = rows[0].user_id;
    const req = { user: { userId, patientId } } as any;
    const res = {
      json: (data: any) => console.log(JSON.stringify(data, null, 2))
    } as any;
    const next = (err: any) => console.error(err);
    await getDashboardSummary(req, res, next);
  }
  process.exit(0);
}
run().catch(console.error);
