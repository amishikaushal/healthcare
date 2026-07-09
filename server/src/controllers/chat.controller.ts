import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/db'
import { semanticSearch } from '../services/qdrant.service'
import { chatWithHistory, generateText, ChatMessage } from '../services/gemini.service'
import { ApiError } from '../utils/errors'
import { ApiResponse } from '../types'
import { getProfileForCondition, mapConditionToCategory, ALL_SYMPTOMS } from '../config/recoveryProfiles'

// ── Build condition-aware system context ────────────────────────────────────
const buildSystemContext = async (patientId: string): Promise<string> => {
  const { rows: [patient] } = await db.query(
    `SELECT u.first_name, u.last_name, p.date_of_birth, p.blood_type, p.allergies,
            c.name AS condition, c.icd_code, c.severity AS condition_severity,
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

  // Fetch last 7 logs including vitals JSONB
  const { rows: recentLogs } = await db.query(
    `SELECT log_date, overall_feeling, energy_level, sleep_hours, notes, status, vitals
     FROM recovery_logs WHERE patient_id = $1 AND deleted_at IS NULL
     ORDER BY log_date DESC LIMIT 7`,
    [patientId]
  )

  const { rows: medications } = await db.query(
    `SELECT m.name, ms.dosage, ms.frequency
     FROM medication_schedules ms JOIN medications m ON m.id = ms.medication_id
     WHERE ms.patient_id = $1 AND ms.is_active = TRUE AND ms.deleted_at IS NULL`,
    [patientId]
  )

  // ── Condition profile detection ─────────────────────────────────────
  const conditionName: string = patient?.condition || ''
  const profile  = getProfileForCondition(conditionName)

  // Format condition-specific vitals for one log entry
  const formatVitals = (vitals: Record<string, any> | null): string => {
    if (!vitals || Object.keys(vitals).length === 0) return ''
    return profile.fields
      .filter(f => vitals[f.key] !== undefined && vitals[f.key] !== null)
      .map(f => `  ${f.label}: ${vitals[f.key]}${f.unit ? ' ' + f.unit : ''}`)
      .join('\n')
  }

  // ── Trend analysis between two most recent logs ──────────────────────
  let trendSection = ''
  if (recentLogs.length >= 2) {
    const latestV = recentLogs[0].vitals || {}
    const prevV   = recentLogs[1].vitals || {}
    const trends: string[] = []

    for (const fieldKey of profile.trendFields) {
      const cur  = latestV[fieldKey]
      const prev = prevV[fieldKey]
      if (typeof cur === 'number' && typeof prev === 'number' && cur !== prev) {
        const field = profile.fields.find(f => f.key === fieldKey)
        const unit  = field?.unit || ''
        const delta = cur - prev
        trends.push(`  ${field?.label || fieldKey}: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unit} since previous log`)
      }
    }
    const df = recentLogs[0].overall_feeling
    const dp = recentLogs[1].overall_feeling
    if (typeof df === 'number' && typeof dp === 'number' && df !== dp) {
      trends.push(`  Overall Feeling: ${df - dp > 0 ? '+' : ''}${df - dp} since previous log`)
    }
    if (trends.length > 0) {
      trendSection = `\n## Recovery Trends (latest vs. previous)\n${trends.join('\n')}`
    }
  }

  // ── Format log entries ─────────────────────────────────────────────
  const logsSection = recentLogs.length > 0
    ? recentLogs.map(l => {
        const syms: string[] = (l.vitals?.symptoms || [])
          .map((id: string) => ALL_SYMPTOMS[id]?.label || id)
        const vitalsStr = formatVitals(l.vitals)
        return [
          `- ${l.log_date}: Feeling ${l.overall_feeling ?? 'N/A'}/10, Energy ${l.energy_level ?? 'N/A'}/10, Sleep ${l.sleep_hours ?? 'N/A'}h`,
          vitalsStr ? `\n${vitalsStr}` : '',
          syms.length > 0 ? `\n  Symptoms: ${syms.join(', ')}` : '',
        ].join('')
      }).join('\n')
    : 'No recent logs'

  return `You are RecoveryOS AI, a compassionate medical assistant for ${patient?.first_name || 'the patient'} ${patient?.last_name || ''}.

## Patient Context
- Condition: ${conditionName || 'Unknown'} (ICD: ${patient?.icd_code || 'N/A'})
- Recovery Category: ${profile.displayName} ${profile.emoji}
- Care Plan: ${patient?.plan_title || 'None'}
- Current Phase: ${patient?.phase_name || 'N/A'}
- Allergies: ${patient?.allergies?.join(', ') || 'None known'}

## Recent Recovery (last 7 days)
${logsSection}
${trendSection}

## Current Medications
${medications.map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n') || 'None recorded'}

## Instructions
- Be empathetic, clear, and medically appropriate
- The patient is in the ${profile.displayName} ${profile.emoji} recovery category — tailor all advice accordingly
- Reference condition-specific vitals (e.g., temperature for fever, O₂ sat for respiratory) when relevant
- Always recommend consulting their doctor for medical decisions
- If asked about medications, remind them to verify with their doctor
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

// ── Auto-title generator ─────────────────────────────────────────────────────
const generateSessionTitle = async (firstMessage: string): Promise<string> => {
  try {
    const title = await generateText(
      `In 4-6 words max, generate a short, meaningful title for a medical chat conversation that starts with this message. Return ONLY the title — no quotes, no punctuation at the end.\n\nMessage: "${firstMessage.slice(0, 200)}"`
    )
    return title.trim().slice(0, 80) || 'New Chat'
  } catch {
    // Fallback: use first 50 chars of the message
    return firstMessage.slice(0, 50).trim() + (firstMessage.length > 50 ? '…' : '')
  }
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

    // Update session — also set title from first message if still 'New Chat'
    const { rows: [currentSession] } = await db.query(
      'SELECT title, message_count FROM chat_sessions WHERE id=$1',
      [sessionId]
    )
    const isFirstMessage = currentSession?.message_count === 0
    const newTitle = isFirstMessage
      ? await generateSessionTitle(content)
      : undefined

    if (newTitle) {
      await db.query(
        `UPDATE chat_sessions
         SET message_count = message_count + 2,
             last_message_at = NOW(),
             updated_at = NOW(),
             title = $2
         WHERE id = $1`,
        [sessionId, newTitle]
      )
    } else {
      await db.query(
        `UPDATE chat_sessions
         SET message_count = message_count + 2,
             last_message_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      )
    }

    res.json({
      success: true,
      data: {
        message: {
          ...aiMsg,
          rag_sources: ragResults.length > 0
            ? ragResults.map(r => ({ documentId: r.documentId, score: r.score }))
            : null,
        },
        sources: ragResults.map(r => r.documentId),
        sessionTitle: newTitle,
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
