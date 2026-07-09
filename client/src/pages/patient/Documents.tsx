import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, FileText, Image, File, Download, Trash2,
  Search, Filter, Eye, Loader2, CheckCircle2, AlertCircle,
  Sparkles, X, Tag, Clock, Brain,
} from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import {
  fetchDocuments, uploadDocument, deleteDocument,
  downloadDocument, pollDocumentStatus,
  DocumentRecord, DocType,
} from '@/services/document'

// ── Config ────────────────────────────────────────────────────────────────────
const typeConfig: Record<DocType, { label: string; color: string; icon: any }> = {
  lab_report: { label: 'Lab Report', color: 'bg-brand-50 text-brand-600 border border-brand-100', icon: FileText },
  imaging: { label: 'Imaging', color: 'bg-violet-50 text-violet-600 border border-violet-100', icon: Image },
  prescription: { label: 'Prescription', color: 'bg-success-50 text-success-600 border border-success-100', icon: File },
  discharge_summary: { label: 'Discharge', color: 'bg-amber-50 text-amber-600 border border-amber-100', icon: FileText },
  consent: { label: 'Consent', color: 'bg-surface-100 text-surface-600 border border-surface-200', icon: File },
  other: { label: 'Other', color: 'bg-surface-100 text-surface-600 border border-surface-200', icon: File },
}
const ALL_TYPES: DocType[] = ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'consent', 'other']

function fmtSize(b: number) {
  return b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState<DocType>('other')
  const [tags, setTags] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const mut = useMutation({
    mutationFn: () => uploadDocument(file!, { title: title || file!.name.replace(/\.[^.]+$/, ''), docType, tags }),
    onSuccess: (doc) => {
      queryClient.setQueryData<DocumentRecord[]>(['documents'], (old = []) => [doc, ...old])
      toast.success('Uploaded — AI processing started…')
      onClose()
    },
    onError: () => toast.error('Upload failed'),
  })

  const pick = (f: File) => { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, '')) }

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-surface-200 shadow-card-md max-w-md w-full p-6 rounded-2xl space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-surface-800 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-teal-600" /></div>
            Upload &amp; AI Analyse
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f) }}
          onClick={() => inputRef.current?.click()}
          className={clsx('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            drag ? 'border-brand-400 bg-brand-50' : 'border-surface-300 hover:border-brand-300 hover:bg-surface-50')}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e => { const f = e.target.files?.[0]; if (f) pick(f) }} />
          <Upload className={clsx('w-8 h-8 mx-auto mb-2', drag ? 'text-brand-500' : 'text-surface-400')} />
          {file
            ? <p className="text-sm text-surface-700 font-medium">{file.name} — {fmtSize(file.size)}</p>
            : <><p className="text-sm text-surface-500">Drop PDF or image here</p>
              <p className="text-xs text-surface-400 mt-1">PDF, JPG, PNG · max 10 MB</p></>}
        </div>

        <div className="space-y-2">
          <input placeholder="Document title" value={title} onChange={e => setTitle(e.target.value)} className="input w-full py-2.5 text-sm" />
          <select value={docType} onChange={e => setDocType(e.target.value as DocType)} className="input w-full py-2.5 text-sm appearance-none cursor-pointer">
            {ALL_TYPES.map(t => <option key={t} value={t}>{typeConfig[t].label}</option>)}
          </select>
          <input placeholder="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} className="input w-full py-2.5 text-sm" />
        </div>

        <p className="text-xs text-teal-600 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> OCR extracts text → Gemini AI generates plain-English summary
        </p>

        <div className="flex gap-2">
          <button onClick={() => mut.mutate()} disabled={!file || mut.isPending} className="btn-primary flex-1 text-sm">
            {mut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload &amp; Analyse</>}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── AI Summary Card ───────────────────────────────────────────────────────────
function AISummaryCard({ doc }: { doc: DocumentRecord }) {
  if (!doc.is_processed && !doc.ai_summary) {
    return (
      <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
        </div>
        <div>
          <p className="text-xs font-semibold text-surface-600">Gemini AI Processing…</p>
          <p className="text-xs text-surface-400 mt-0.5">OCR extraction + summary in progress</p>
        </div>
      </div>
    )
  }

  if (!doc.ai_summary) return null

  return (
    <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-teal-600" />
        </div>
        <span className="text-xs font-semibold text-teal-700">Gemini AI Summary</span>
        <CheckCircle2 className="w-3 h-3 text-success-500 ml-auto" />
      </div>
      <p className="text-sm text-surface-700 leading-relaxed">{doc.ai_summary}</p>
    </div>
  )
}

// ── Doc Card ──────────────────────────────────────────────────────────────────
function DocCard({ doc, onView, onDelete }: {
  doc: DocumentRecord; onView: (d: DocumentRecord) => void; onDelete: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const cfg = typeConfig[doc.doc_type]
  const Icon = cfg.icon

  // Poll until processed
  useEffect(() => {
    if (doc.is_processed) return
    const id = setInterval(async () => {
      try {
        const s = await pollDocumentStatus(doc.id)
        if (s.is_processed) {
          clearInterval(id)
          queryClient.setQueryData<DocumentRecord[]>(['documents'], (old = []) =>
            old.map(d => d.id === doc.id ? { ...d, is_processed: true, ai_summary: s.ai_summary } : d))
        }
      } catch { clearInterval(id) }
    }, 4000)
    return () => clearInterval(id)
  }, [doc.id, doc.is_processed, queryClient])

  return (
    <div className="card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden p-0">
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-surface-800 truncate">{doc.title}</h3>
                <p className="text-xs text-surface-400 mt-0.5">{doc.file_name} · {fmtSize(doc.file_size)}</p>
              </div>
              <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0', cfg.color)}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-surface-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />{format(new Date(doc.created_at), 'd MMM yyyy')}
              </span>
              {doc.tags.length > 0 && doc.tags.map(t => (
                <span key={t} className="text-xs bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Tag className="w-2.5 h-2.5" />#{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Summary Card — always visible inline */}
        <AISummaryCard doc={doc} />
      </div>

      {/* Actions */}
      <div className="flex gap-0 border-t border-surface-100">
        <button onClick={() => onView(doc)} className="btn-ghost text-xs py-2.5 flex-1 rounded-none border-r border-surface-100">
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button onClick={() => downloadDocument(doc.id, doc.file_name).catch(() => toast.error('Download failed'))}
          className="btn-ghost text-xs py-2.5 flex-1 rounded-none border-r border-surface-100">
          <Download className="w-3.5 h-3.5" /> Download
        </button>
        <button onClick={() => onDelete(doc.id)} className="btn-ghost text-xs py-2.5 px-4 text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-none">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const cfg = typeConfig[doc.doc_type]

  return (
    <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-surface-200 shadow-card-md max-w-xl w-full rounded-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', cfg.color)}>
              {(() => { const I = cfg.icon; return <I className="w-4 h-4" /> })()}
            </div>
            <div>
              <h3 className="font-semibold text-surface-800 text-sm">{doc.title}</h3>
              <p className="text-xs text-surface-400">{doc.file_name} · {fmtSize(doc.file_size)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 transition-colors"><X className="w-4 h-4 text-surface-400" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Type', cfg.label],
              ['Uploaded', format(new Date(doc.created_at), 'd MMM yyyy, HH:mm')],
              ['Size', fmtSize(doc.file_size)],
              ['Status', doc.is_processed ? '✓ AI Processed' : '⏳ Processing…'],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface-50 border border-surface-200 rounded-xl p-3">
                <p className="text-surface-400 mb-0.5">{k}</p>
                <p className="text-surface-700 font-semibold">{v}</p>
              </div>
            ))}
          </div>

          {/* AI Summary — prominent card */}
          {doc.ai_summary ? (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-700">Gemini AI Summary</p>
                  <p className="text-xs text-surface-400">Plain-English clinical interpretation</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-success-500 ml-auto" />
              </div>
              <p className="text-surface-700 text-sm leading-relaxed">{doc.ai_summary}</p>
            </div>
          ) : !doc.is_processed ? (
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-surface-700">Generating AI Summary…</p>
                <p className="text-xs text-surface-400 mt-0.5">OCR → Gemini 2.5 Flash analysis in progress</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-center">
              <AlertCircle className="w-5 h-5 text-surface-400 mx-auto mb-1" />
              <p className="text-xs text-surface-500">No summary could be generated for this document</p>
            </div>
          )}

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map(t => (
                <span key={t} className="text-xs bg-surface-100 text-surface-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />#{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-surface-100">
          <button onClick={() => downloadDocument(doc.id, doc.file_name).catch(() => toast.error('Download failed'))}
            className="btn-primary flex-1 text-sm">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Documents() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DocType | 'all'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [viewing, setViewing] = useState<DocumentRecord | null>(null)

  const { data: docs = [], isLoading, isError } = useQuery({
    queryKey: ['documents'], queryFn: fetchDocuments, staleTime: 0,
  })

  const delMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_, id) => {
      queryClient.setQueryData<DocumentRecord[]>(['documents'], (old = []) => old.filter(d => d.id !== id))
      toast.success('Document deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    delMut.mutate(id)
  }, [delMut])

  const filtered = docs.filter(d =>
    (filterType === 'all' || d.doc_type === filterType) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  )

  const processed = docs.filter(d => d.is_processed).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Medical Documents</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            {isLoading ? 'Loading…' : `${docs.length} document${docs.length !== 1 ? 's' : ''} · ${processed} AI-processed`}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-surface-200 rounded-xl px-3.5 py-2.5 shadow-card">
          <Search className="w-4 h-4 text-surface-400 shrink-0" />
          <input type="text" placeholder="Search documents or tags…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-surface-700 placeholder-surface-400 outline-none flex-1" />
        </div>
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value as DocType | 'all')}
            className="input py-2.5 pr-9 appearance-none cursor-pointer text-sm">
            <option value="all">All types</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{typeConfig[t].label}</option>)}
          </select>
          <Filter className="w-4 h-4 text-surface-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-surface-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> Loading documents…
        </div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2" />
          <p className="text-surface-500 text-sm">Failed to load documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(d => (
            <DocCard key={d.id} doc={d} onView={setViewing} onDelete={handleDelete} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 card p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-surface-400" />
              </div>
              <p className="text-surface-500 text-sm">
                {docs.length === 0 ? 'No documents yet. Upload your first medical document.' : 'No documents match your search.'}
              </p>
              {docs.length === 0 && (
                <button onClick={() => setShowUpload(true)} className="btn-primary text-sm mt-4">
                  <Upload className="w-4 h-4" /> Upload Document
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {viewing && <ViewModal doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
