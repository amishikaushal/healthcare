import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Bot, User, Loader2, Sparkles, RefreshCw, X,
  PlusCircle, MessageSquare, ChevronLeft, Clock, Brain,
  FileText, Zap, AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'
import { useAuthStore } from '@/store/authStore'
import {
  createSession,
  getSessions,
  getMessages,
  sendMessage as apiSendMessage,
  type ChatSession,
  type ChatMessage,
} from '@/services/chat'
import { formatDistanceToNow } from 'date-fns'

const SUGGESTED = [
  'What should I expect in my current recovery phase?',
  'Can you summarise my recent recovery trends?',
  'Am I taking all my medications correctly?',
  'What exercises should I focus on this week?',
  'My pain seems higher today — what could cause this?',
]

// ── Welcome message ────────────────────────────────────────────────────────────
const WELCOME: ChatMessage = {
  id: '__welcome__',
  role: 'assistant',
  content: `Hello! I'm your **RecoveryOS AI Assistant** — powered by Google Gemini. 👋

I have real-time access to:
- 📋 Your **care plan** and current recovery phase
- 💊 Your **medications** and schedule  
- 📈 Your **recovery logs** from the past 7 days
- 📄 Your **uploaded medical documents** (via RAG search)

How can I help you today?`,
  rag_sources: null,
  created_at: new Date().toISOString(),
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-teal-600" />
      </div>
      <div className="bg-white border border-surface-200 shadow-card px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-teal-400"
              style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-surface-400 ml-1">Thinking with Gemini…</span>
      </div>
    </div>
  )
}

function RagBadge({ sources }: { sources: Array<{ documentId: string; score: number }> }) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      <span className="text-xs text-surface-400 mr-1 flex items-center gap-1">
        <Brain className="w-3 h-3" /> Sources:
      </span>
      {sources.map((s, i) => (
        <span
          key={i}
          className="text-xs bg-teal-50 border border-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1"
        >
          <FileText className="w-2.5 h-2.5" />
          {s.documentId.slice(0, 8)}…
          <span className="text-teal-400">{(s.score * 100).toFixed(0)}%</span>
        </span>
      ))}
    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const ragSources = msg.rag_sources && msg.rag_sources.length > 0 ? msg.rag_sources : null

  return (
    <div className={clsx('flex gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        isUser ? 'bg-brand-600' : 'bg-teal-50 border border-teal-100'
      )}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-teal-600" />}
      </div>

      <div className={clsx('max-w-[78%] space-y-1 flex flex-col', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-none'
            : 'bg-white border border-surface-200 shadow-card text-surface-700 rounded-tl-none'
        )}>
          {isUser
            ? msg.content
            : <div className="prose prose-sm max-w-none prose-headings:text-surface-800 prose-p:text-surface-700 prose-strong:text-surface-800 prose-li:text-surface-700">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>}
        </div>

        {ragSources && <RagBadge sources={ragSources} />}

        <span className="text-xs text-surface-400 px-1">
          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function SessionItem({
  session,
  active,
  onClick,
}: {
  session: ChatSession
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-2.5 rounded-xl transition-all',
        active
          ? 'bg-brand-50 border border-brand-100'
          : 'hover:bg-surface-50 border border-transparent'
      )}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className={clsx('w-3.5 h-3.5 mt-0.5 shrink-0', active ? 'text-brand-500' : 'text-surface-400')} />
        <div className="min-w-0">
          <p className={clsx('text-xs font-medium truncate', active ? 'text-brand-700' : 'text-surface-600')}>
            {session.title || 'New Chat'}
          </p>
          <p className="text-xs text-surface-400 mt-0.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {session.last_message_at
              ? formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true })
              : 'Just created'}
            {session.message_count > 0 && (
              <span className="ml-1 px-1 py-px bg-surface-100 rounded text-surface-400">
                {session.message_count} msgs
              </span>
            )}
          </p>
        </div>
      </div>
    </button>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export default function AIAssistant() {
  const { user } = useAuthStore()
  const patientId = user?.patientId

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [initialising, setInitialising] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!patientId) return
    getSessions(patientId)
      .then(setSessions)
      .catch(err => console.error('Failed to load sessions:', err))
  }, [patientId])

  const loadSession = useCallback(async (session: ChatSession) => {
    setActiveSession(session)
    setLoadingSession(true)
    setError(null)
    try {
      const msgs = await getMessages(session.id)
      setMessages(msgs.length > 0 ? msgs : [WELCOME])
    } catch {
      setError('Failed to load conversation history')
      setMessages([WELCOME])
    } finally {
      setLoadingSession(false)
    }
  }, [])

  const startNewSession = useCallback(async () => {
    if (!patientId || initialising) return
    setInitialising(true)
    setError(null)
    try {
      const session = await createSession(patientId)
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      setMessages([WELCOME])
    } catch {
      setError('Failed to create a new conversation')
    } finally {
      setInitialising(false)
    }
  }, [patientId, initialising])

  const ensureSession = useCallback(async (): Promise<ChatSession | null> => {
    if (activeSession) return activeSession
    if (!patientId) return null
    try {
      const session = await createSession(patientId)
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      return session
    } catch {
      setError('Could not initialise chat session')
      return null
    }
  }, [activeSession, patientId])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading || !patientId) return
    setError(null)

    const session = await ensureSession()
    if (!session) return

    const optimisticUser: ChatMessage = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      rag_sources: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => {
      const base = prev.filter(m => m.id !== '__welcome__')
      return [...base, optimisticUser]
    })
    setInput('')
    setLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const result = await apiSendMessage(session.id, patientId, text.trim())
      const aiMsg = result.message

      setMessages(prev => [...prev, aiMsg])

      setSessions(prev =>
        prev.map(s =>
          s.id === session.id
            ? {
              ...s,
              message_count: s.message_count + 2,
              last_message_at: new Date().toISOString(),
              ...(result.sessionTitle ? { title: result.sessionTitle } : {}),
            }
            : s
        )
      )

      if (result.sessionTitle) {
        setActiveSession(prev => prev ? { ...prev, title: result.sessionTitle! } : prev)
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to get AI response. Please try again.'
      setError(message)
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
    } finally {
      setLoading(false)
    }
  }, [loading, patientId, ensureSession])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
  }

  const showSuggested = messages.length <= 1 && messages[0]?.id === '__welcome__'

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="w-60 shrink-0 bg-white border border-surface-200 rounded-2xl shadow-card flex flex-col overflow-hidden">
          {/* Sidebar header */}
          <div className="p-3 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-surface-800">Conversations</span>
            </div>
            <button
              onClick={startNewSession}
              disabled={initialising}
              title="New chat"
              className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
            >
              {initialising ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sessions.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-xs text-surface-400">No conversations yet</p>
                <button
                  onClick={startNewSession}
                  className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Start one
                </button>
              </div>
            ) : (
              sessions.map(s => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={activeSession?.id === s.id}
                  onClick={() => loadSession(s)}
                />
              ))
            )}
          </div>

          {/* RAG status badge */}
          <div className="p-3 border-t border-surface-100">
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <Brain className="w-3 h-3 text-teal-500" />
              <span>RAG on your docs</span>
              <span className="ml-auto flex items-center gap-1 text-success-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border border-surface-200 shadow-card p-4 rounded-2xl mb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
            >
              <ChevronLeft className={clsx('w-4 h-4 transition-transform', !sidebarOpen && 'rotate-180')} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-800">RecoveryOS AI Assistant</h2>
              <p className="text-xs text-surface-400">
                {activeSession
                  ? `Session: ${activeSession.id.slice(0, 8)}…`
                  : 'Powered by Gemini 2.5 Flash · RAG-enabled'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" /> Online
            </span>
            <button
              onClick={startNewSession}
              disabled={initialising}
              title="New chat"
              className="btn-ghost text-xs p-2 flex items-center gap-1"
            >
              {initialising
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100 flex items-center gap-3 text-sm text-danger-600 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-danger-400 hover:text-danger-600 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
          {loadingSession ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-7 h-7 text-brand-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-surface-400">Loading conversation…</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
              {loading && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {showSuggested && !loading && (
          <div className="mt-3 mb-2 shrink-0">
            <p className="text-xs text-surface-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-brand-500" /> Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-xs bg-white hover:bg-surface-50 text-surface-600 hover:text-surface-800 px-3 py-1.5 rounded-xl border border-surface-200 hover:border-brand-200 hover:shadow-sm transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="mt-3 bg-white border border-surface-200 shadow-card p-3 rounded-2xl flex items-end gap-3 shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKey}
            placeholder={
              patientId
                ? 'Ask about your recovery, medications, documents…'
                : 'Please log in as a patient to chat'
            }
            disabled={!patientId || loading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-surface-700 placeholder-surface-400 resize-none outline-none"
            style={{ lineHeight: '1.5', minHeight: '24px' }}
          />
          {input && (
            <button
              onClick={() => { setInput(''); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}
              className="p-1 text-surface-400 hover:text-surface-600 shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading || !patientId}
            className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
              input.trim() && !loading && patientId
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand'
                : 'bg-surface-100 text-surface-400 cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-center text-xs text-surface-400 mt-2 shrink-0">
          AI can make mistakes. Always consult your doctor for medical decisions.
        </p>
      </div>
    </div>
  )
}
