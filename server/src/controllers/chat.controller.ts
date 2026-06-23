import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { semanticSearch } from '../services/qdrant.service'
import { chatWithHistory, ChatMessage } from '../services/gemini.service'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'

// ── Build system context for the patient ─────────────────────────────────────
const buildSystemContext = async (patientId: string): Promise<string> => {
  const { rows: [patient] } = await db.query(
    `SELECT u.first_name, u.last_name, p.date_of_birth, p.blood_type, p.allergies,
            c.name AS condition, c.icd_code,
            cp.title AS plan_title, cp.status AS plan_status,
            cph.name AS phase_name, cph.phase_order
     FROM patients p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN conditions c ON c.patient_id = p.id AND c.status = 'active' AND c.deleted_at IS NULL
     LEFT JOIN care_plans cp ON cp.patient_id = p.id AND cp.status = 'active' AND cp.deleted_at IS NULL
     LEFT JOIN care_phases cph ON cph.care_plan_id = cp.id AND cph.status = 'active' AND cph.deleted_at IS NULL
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [patientId]
  )

  const { rows: recentLogs } = await db.query(
    `SELECT log_date, pain_level, overall_feeling, energy_level, sleep_hours, notes, status
     FROM recovery_logs WHERE patient_id = $1 AND deleted_at IS NULL
     ORDER BY log_date DESC LIMIT 7`,
    [patientId]
  )

  const { rows: medications } = await db.query(
    `SELECT m.name, ms.dosage, ms.frequency, ms.scheduled_times
     FROM medication_schedules ms JOIN medications m ON m.id = ms.medication_id
     WHERE ms.patient_id = $1 AND ms.is_active = TRUE AND ms.deleted_at IS NULL`,
    [patientId]
  )

  return `You are RecoveryOS AI, a compassionate medical assistant for ${patient?.first_name || 'the patient'} ${patient?.last_name || ''}.

## Patient Context
- Condition: ${patient?.condition || 'Unknown'} (ICD: ${patient?.icd_code || 'N/A'})
- Care Plan: ${patient?.plan_title || 'None'}
- Current Phase: ${patient?.phase_name || 'N/A'}
- Allergies: ${patient?.allergies?.join(', ') || 'None known'}

## Recent Recovery (last 7 days)
${recentLogs.map(l => `- ${l.log_date}: Pain ${l.pain_level}/10, Feeling ${l.overall_feeling}/10, Energy ${l.energy_level}/10, Sleep ${l.sleep_hours}h`).join('\n') || 'No recent logs'}

## Current Medications
${medications.map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n') || 'None recorded'}

## Instructions
- Be empathetic, clear, and medically appropriate
- Reference the patient's specific recovery data when relevant
- Always recommend consulting their doctor for medical decisions
- If asked about medications, note interactions and remind them to verify with their doctor
- Respond in the same language as the user
- Keep responses concise but thorough
- Use markdown formatting for clarity`
}

// ── Create session ────────────────────────────────────────────────────────────
export const createSession = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.body
    if (!patientId) throw new ApiError(400, 'patientId required')

    const { rows: [session] } = await db.query(
      `INSERT INTO chat_sessions (id, patient_id, title, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING id, created_at`,
      [uuidv4(), patientId, 'New Chat']
    )

    res.status(201).json({ success: true, data: session } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Send message ──────────────────────────────────────────────────────────────
export const sendMessage = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, content, patientId } = req.body
    if (!sessionId || !content || !patientId) {
      throw new ApiError(400, 'sessionId, content, and patientId required')
    }

    // Verify session belongs to patient
    const { rows: [session] } = await db.query(
      'SELECT id FROM chat_sessions WHERE id=$1 AND patient_id=$2 AND deleted_at IS NULL',
      [sessionId, patientId]
    )
    if (!session) throw new ApiError(404, 'Session not found')

    // Store user message
    await db.query(
      `INSERT INTO chat_messages (id, session_id, patient_id, role, content)
       VALUES ($1, $2, $3, 'user', $4)`,
      [uuidv4(), sessionId, patientId, content]
    )

    // Semantic search for relevant docs
    const ragResults = await semanticSearch(content, patientId, 4)
    const ragContext = ragResults.length > 0
      ? `\n\n## Relevant Documents\n${ragResults.map(r => `[${r.documentId}]: ${r.content}`).join('\n\n')}`
      : ''

    // Load recent message history (last 10)
    const { rows: history } = await db.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id=$1 AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 10`,
      [sessionId]
    )

    const historyMessages: ChatMessage[] = history
      .reverse()
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))

    // Build system context (patient data + RAG)
    const systemContext = await buildSystemContext(patientId) + ragContext

    // Generate AI response
    const aiResponse = await chatWithHistory(historyMessages, systemContext)

    // Store AI message
    const { rows: [aiMsg] } = await db.query(
      `INSERT INTO chat_messages (id, session_id, patient_id, role, content, rag_sources)
       VALUES ($1, $2, $3, 'assistant', $4, $5)
       RETURNING id, role, content, rag_sources, created_at`,
      [
        uuidv4(), sessionId, patientId, aiResponse,
        JSON.stringify(ragResults.map(r => ({ documentId: r.documentId, score: r.score }))),
      ]
    )

    // Update session
    await db.query(
      `UPDATE chat_sessions SET message_count=message_count+2, last_message_at=NOW(), updated_at=NOW()
       WHERE id=$1`,
      [sessionId]
    )

    res.json({
      success: true,
      data: {
        message: aiMsg,
        sources: ragResults.map(r => r.documentId),
      },
    } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get sessions ──────────────────────────────────────────────────────────────
export const getSessions = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { patientId } = req.query
    const { rows } = await db.query(
      `SELECT id, title, message_count, last_message_at, created_at
       FROM chat_sessions WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY last_message_at DESC NULLS LAST LIMIT 20`,
      [patientId]
    )
    res.json({ success: true, data: rows } as ApiResponse)
  } catch (err) { next(err) }
}

// ── Get session messages ──────────────────────────────────────────────────────
export const getMessages = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params
    const { rows } = await db.query(
      `SELECT id, role, content, rag_sources, created_at
       FROM chat_messages WHERE session_id=$1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [sessionId]
    )
    res.json({ success: true, data: rows } as ApiResponse)
  } catch (err) { next(err) }
}
