import { db } from './src/database/db';
import { createNotification } from './src/controllers/notification.controller';

async function run() {
  const { rows } = await db.query(`SELECT id FROM users LIMIT 1`);
  if (rows.length > 0) {
    try {
      const notif = await createNotification(
        rows[0].id,
        'Test',
        'Test Msg',
        'test_type',
        'care_plan_updates',
        'medium'
      );
      console.log('Created:', notif);
    } catch(e) {
      console.error('Error:', e);
    }
  }
  process.exit(0);
}
run().catch(console.error);
