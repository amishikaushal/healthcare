import { Request, Response } from 'express'
import { db } from '../database/db'
import { extractAndSummarise } from '../services/ocr.service'
import { logger } from '../utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// GET /documents  →  list all docs for the authenticated patient
// ─────────────────────────────────────────────────────────────────────────────
export async function listDocuments(req: Request, res: Response) {
  try {
    const patientId = req.user?.patientId
    if (!patientId) {
      return res.status(403).json({ success: false, message: 'Patient record not found' })
    }

    const result = await db.query(
      `SELECT
         id, title, doc_type, file_name, file_size, mime_type,
         ai_summary, is_processed, tags, created_at
       FROM patient_documents
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    )

    return res.json({ success: true, data: result.rows })
  } catch (err) {
    logger.error('listDocuments error', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch documents' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /documents  →  upload, OCR, Gemini summarise, persist
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadDocument(req: Request, res: Response) {
  try {
    const patientId = req.user?.patientId
    if (!patientId) {
      return res.status(403).json({ success: false, message: 'Patient record not found' })
    }

    const file = req.file
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' })
    }

    const {
      title   = file.originalname,
      docType = 'other',
      tags    = '',
    } = req.body as { title?: string; docType?: string; tags?: string }

    const tagArray: string[] = tags
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : []

    // ── 1. Insert initial record (unprocessed) ──────────────────────────────
    const insert = await db.query(
      `INSERT INTO patient_documents
         (patient_id, title, doc_type, file_name, file_size, mime_type, file_data, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        patientId,
        title,
        docType,
        file.originalname,
        file.size,
        file.mimetype,
        file.buffer,
        tagArray,
      ]
    )
    const docId: string = insert.rows[0].id

    // ── 2. OCR in background — respond immediately so UI feels fast ──────────
    processDocumentAsync(docId, file.buffer, file.mimetype, docType, patientId).catch(
      (err) => logger.error('Background OCR/AI failed', err)
    )

    // ── 3. Return the stub record so the UI can render it right away ─────────
    const stub = await db.query(
      `SELECT id, title, doc_type, file_name, file_size, mime_type,
              ai_summary, is_processed, tags, created_at
       FROM patient_documents WHERE id = $1`,
      [docId]
    )

    return res.status(201).json({ success: true, data: stub.rows[0] })
  } catch (err) {
    logger.error('uploadDocument error', err)
    return res.status(500).json({ success: false, message: 'Upload failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /documents/:id/download
// ─────────────────────────────────────────────────────────────────────────────
export async function downloadDocument(req: Request, res: Response) {
  try {
    const patientId = req.user?.patientId
    const { id } = req.params

    const result = await db.query(
      `SELECT file_data, file_name, mime_type, patient_id
       FROM patient_documents WHERE id = $1`,
      [id]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found' })
    }
    const doc = result.rows[0]
    // Ensure ownership (patients see only their docs; doctors can see their patients' — skip for now)
    if (patientId && doc.patient_id !== patientId) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    res.setHeader('Content-Type', doc.mime_type)
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`)
    return res.send(doc.file_data)
  } catch (err) {
    logger.error('downloadDocument error', err)
    return res.status(500).json({ success: false, message: 'Download failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /documents/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteDocument(req: Request, res: Response) {
  try {
    const patientId = req.user?.patientId
    const { id } = req.params

    const result = await db.query(
      `DELETE FROM patient_documents
       WHERE id = $1 AND patient_id = $2
       RETURNING id`,
      [id, patientId]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Document not found or not yours' })
    }
    return res.json({ success: true, message: 'Document deleted' })
  } catch (err) {
    logger.error('deleteDocument error', err)
    return res.status(500).json({ success: false, message: 'Delete failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /documents/:id/status  →  poll for OCR/AI completion
// ─────────────────────────────────────────────────────────────────────────────
export async function getDocumentStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const result = await db.query(
      `SELECT id, is_processed, ai_summary FROM patient_documents WHERE id = $1`,
      [id]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Not found' })
    }
    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Status check failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: OCR → Gemini → update DB
// ─────────────────────────────────────────────────────────────────────────────
async function processDocumentAsync(
  docId: string,
  buffer: Buffer,
  mimeType: string,
  docType: string,
  patientId: string
) {
  // Get patient context for a richer summary
  const ctx = await db.query(
    `SELECT u.first_name, u.last_name, p.primary_condition
     FROM patients p JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [patientId]
  ).catch(() => ({ rows: [] }))

  const patientContext = ctx.rows.length
    ? `Patient: ${ctx.rows[0].first_name} ${ctx.rows[0].last_name}, Condition: ${ctx.rows[0].primary_condition || 'not specified'}`
    : 'Patient context unavailable'

  // Single Gemini Vision call — reads the raw file and returns both OCR text + AI summary
  const { ocrText, aiSummary } = await extractAndSummarise(buffer, mimeType, docType, patientContext)

  // Persist results
  await db.query(
    `UPDATE patient_documents
     SET ocr_text = $1, ai_summary = $2, is_processed = true, updated_at = NOW()
     WHERE id = $3`,
    [ocrText || null, aiSummary || null, docId]
  )

  logger.info(
    `Document ${docId} processed. OCR chars: ${ocrText.length}, ` +
    `Summary: "${aiSummary.slice(0, 80)}${aiSummary.length > 80 ? '…' : ''}"`
  )
}
