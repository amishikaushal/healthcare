import { db } from './db'
import { logger } from '../utils/logger'

async function migrate() {
  try {
    await db.query('BEGIN')

    // 1. Create notification_preferences table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        medication_reminders BOOLEAN DEFAULT TRUE,
        appointment_reminders BOOLEAN DEFAULT TRUE,
        doctor_messages BOOLEAN DEFAULT TRUE,
        care_plan_updates BOOLEAN DEFAULT TRUE,
        risk_alerts BOOLEAN DEFAULT TRUE,
        ai_weekly_reports BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `)
    logger.info('✅ Created notification_preferences table')

    // 2. Create notifications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(100) NOT NULL,
        category VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'unread',
        related_entity_id UUID,
        action_url VARCHAR(255),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `)
    logger.info('✅ Created notifications table')

    // Add indexes for performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `)
    logger.info('✅ Created indexes on notifications table')

    await db.query('COMMIT')
    logger.info('🎉 Notifications migration completed successfully')
  } catch (error) {
    await db.query('ROLLBACK')
    logger.error('❌ Migration failed', error)
    process.exit(1)
  }
}

migrate().then(() => process.exit(0))
