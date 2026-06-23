import { db } from './db'
import { logger } from '../utils/logger'

const sql = `
CREATE TABLE IF NOT EXISTS patient_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  doc_type      VARCHAR(50)  NOT NULL DEFAULT 'other',
  file_name     VARCHAR(255) NOT NULL,
  file_size     INTEGER      NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_data     BYTEA        NOT NULL,
  ocr_text      TEXT,
  ai_summary    TEXT,
  is_processed  BOOLEAN      NOT NULL DEFAULT false,
  tags          TEXT[]       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_doc_type   ON patient_documents(doc_type);
`

async function migrate() {
  try {
    await db.query(sql)
    logger.info('✅ patient_documents table created / already exists')
    process.exit(0)
  } catch (err) {
    logger.error('Migration failed', err)
    process.exit(1)
  }
}

migrate()
