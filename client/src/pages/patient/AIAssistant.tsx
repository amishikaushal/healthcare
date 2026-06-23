import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Paperclip, Sparkles, RefreshCw, X } from 'lucide-react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

const SUGGESTED = [
  'What should I expect in week 3 of knee recovery?',
  'My knee is more swollen today — is this normal?',
  'Can I take ibuprofen with naproxen?',
  'How do I do a proper quad set exercise?',
  'What foods help with post-surgery recovery?',
]

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'assistant',
    content: `Hello! I'm your **RecoveryOS AI Assistant** 👋\n\nI'm here to help you with:\n- Understanding your recovery plan and progress\n- Answering questions about your medications and exercises\n- Interpreting your symptoms\n- Providing general recovery guidance\n\nI have access to your care plan, medical documents, and recovery logs. How can I help you today?`,
    timestamp: new Date(),
  },
]

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        isUser ? 'bg-brand-600' : 'bg-surface-700 border border-surface-600'
      )}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-brand-400" />}
      </div>
      <div className={clsx('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-none'
            : 'glass text-slate-300 rounded-tl-none'
        )}>
          {isUser
            ? msg.content
            : <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.sources.map((s, i) => (
              <span key={i} className="text-xs bg-surface-800 border border-surface-700 text-slate-500 px-2 py-0.5 rounded-full">
                📄 {s}
              </span>
            ))}
          </div>
        )}
        <span className="text-xs text-slate-600 px-1">
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-brand-400" />
      </div>
      <div className="glass px-4 py-3 rounded-2xl rounded-tl-none">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: text.trim(), timestamp: new Date(),
    }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)

    // TODO: replace with api.post('/chat/message', { sessionId, content: text })
    await new Promise(r => setTimeout(r, 1500))

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(), role: 'assistant',
      content: `Great question! Based on your current care plan (Week 3, Phase 2) and your recent recovery logs, here's what I can tell you:\n\n**Regarding "${text.trim()}"**\n\nYour recovery is progressing well. Your pain levels have decreased from 7 to 3 over the past week, which is excellent progress.\n\n> ⚕️ *Always consult Dr. Priya Sharma before making changes to your medication or exercise routine.*\n\nIs there anything specific about this you'd like me to elaborate on?`,
      timestamp: new Date(),
      sources: ['Care Plan - Week 3', 'Recovery Log - Jun 16'],
    }
    setMessages(p => [...p, aiMsg])
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const clearChat = () => setMessages(INITIAL_MESSAGES)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="glass p-4 rounded-2xl mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">RecoveryOS AI Assistant</h2>
            <p className="text-xs text-slate-500">Powered by Gemini · Knows your care plan & medical history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-success-500">
            <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" /> Online
          </span>
          <button onClick={clearChat} className="btn-ghost text-xs p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map(m => <ChatMessage key={m.id} msg={m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 1 && (
        <div className="mt-3 mb-2">
          <p className="text-xs text-slate-600 mb-2">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                className="text-xs bg-surface-800 hover:bg-surface-700 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl border border-surface-700 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 glass p-3 rounded-2xl flex items-end gap-3">
        <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <textarea
          ref={textareaRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your recovery, medications, exercises…"
          rows={1}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 resize-none outline-none max-h-32"
          style={{ lineHeight: '1.5' }}
        />
        {input && (
          <button onClick={() => setInput('')} className="p-1 text-slate-600 hover:text-slate-400 shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          className={clsx(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
            input.trim() && !loading
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25'
              : 'bg-surface-800 text-slate-600 cursor-not-allowed'
          )}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-center text-xs text-slate-700 mt-2">
        AI can make mistakes. Always consult your doctor for medical decisions.
      </p>
    </div>
  )
}
