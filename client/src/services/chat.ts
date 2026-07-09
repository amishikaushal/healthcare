import api from './api'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string
  title: string | null
  message_count: number
  last_message_at: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  rag_sources: Array<{ documentId: string; score: number }> | null
  created_at: string
}

export interface SendMessageResponse {
  message: ChatMessage
  sources: string[]
  sessionTitle?: string
}

// ── API calls ──────────────────────────────────────────────────────────────────

/** Create a new chat session for a patient */
export const createSession = (patientId: string): Promise<ChatSession> =>
  api.post('/chat/sessions', { patientId }).then(r => r.data.data)

/** List all sessions for a patient (most recent first) */
export const getSessions = (patientId: string): Promise<ChatSession[]> =>
  api.get('/chat/sessions', { params: { patientId } }).then(r => r.data.data)

/** Load all messages in a session */
export const getMessages = (sessionId: string): Promise<ChatMessage[]> =>
  api.get(`/chat/sessions/${sessionId}/messages`).then(r => r.data.data)

/** Send a user message and get the AI response (RAG-powered) */
export const sendMessage = (
  sessionId: string,
  patientId: string,
  content: string
): Promise<SendMessageResponse> =>
  api
    .post('/chat/message', { sessionId, patientId, content }, { timeout: 60000 })
    .then(r => r.data.data)
