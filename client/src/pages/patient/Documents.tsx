import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload, FileText, Image, File, Download, Trash2,
  Search, Filter, Eye, Loader2, CheckCircle2, AlertCircle,
  Sparkles, X, Tag, Clock, ChevronDown, ChevronUp, Brain,
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
  lab_report:        { label: 'Lab Report',   color: 'bg-brand-600/20 text-brand-300',     icon: FileText },
  imaging:           { label: 'Imaging',       color: 'bg-purple-600/20 text-purple-300',   icon: Image    },
  prescription:      { label: 'Prescription',  color: 'bg-success-500/20 text-success-400', icon: File     },
  discharge_summary: { label: 'Discharge',     color: 'bg-warning-500/20 text-warning-400', icon: FileText },
  consent:           { label: 'Consent',       color: 'bg-surface-700 text-slate-400',      icon: File     },
  other:             { label: 'Other',         color: 'bg-surface-700 text-slate-400',      icon: File     },
}
const ALL_TYPES: DocType[] = ['lab_report','imaging','prescription','discharge_summary','consent','other']

function fmtSize(b: number) {
  return b > 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${Math.round(b/1000)} KB`
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile]       = useState<File | null>(null)
  const [title, setTitle]     = useState('')
  const [docType, setDocType] = useState<DocType>('other')
  const [tags, setTags]       = useState('')
  const [drag, setDrag]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const mut = useMutation({
    mutationFn: () => uploadDocument(file!, { title: title || file!.name.replace(/\.[^.]+$/,''), docType, tags }),
    onSuccess: (doc) => {
      queryClient.setQueryData<DocumentRecord[]>(['documents'], (old=[]) => [doc, ...old])
      toast.success('Uploaded — AI processing started…')
      onClose()
    },
    onError: () => toast.error('Upload failed'),
  })

  const pick = (f: File) => { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/,'')) }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass max-w-md w-full p-6 rounded-2xl space-y-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400"/> Upload &amp; AI Analyse
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-slate-300"/></button>
        </div>

        <div
          onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)pick(f)}}
          onClick={()=>inputRef.current?.click()}
          className={clsx('border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
            drag?'border-brand-500 bg-brand-500/10':'border-surface-700 hover:border-brand-600')}
        >
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e=>{const f=e.target.files?.[0];if(f)pick(f)}}/>
          <Upload className={clsx('w-8 h-8 mx-auto mb-2',drag?'text-brand-400':'text-slate-600')}/>
          {file
            ? <p className="text-sm text-slate-300 font-medium">{file.name} — {fmtSize(file.size)}</p>
            : <><p className="text-sm text-slate-400">Drop PDF or image here</p>
               <p className="text-xs text-slate-600 mt-1">PDF, JPG, PNG · max 10 MB</p></>}
        </div>

        <div className="space-y-2">
          <input placeholder="Document title" value={title} onChange={e=>setTitle(e.target.value)} className="input w-full py-2.5 text-sm"/>
          <select value={docType} onChange={e=>setDocType(e.target.value as DocType)} className="input w-full py-2.5 text-sm appearance-none cursor-pointer">
            {ALL_TYPES.map(t=><option key={t} value={t}>{typeConfig[t].label}</option>)}
          </select>
          <input placeholder="Tags (comma-separated)" value={tags} onChange={e=>setTags(e.target.value)} className="input w-full py-2.5 text-sm"/>
        </div>

        <p className="text-xs text-brand-400/80 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3"/> OCR extracts text → Gemini AI generates plain-English summary
        </p>

        <div className="flex gap-2">
          <button onClick={()=>mut.mutate()} disabled={!file||mut.isPending} className="btn-primary flex-1 text-sm">
            {mut.isPending?<><Loader2 className="w-4 h-4 animate-spin"/>Uploading…</>:<><Upload className="w-4 h-4"/>Upload &amp; Analyse</>}
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
      <div className="mt-3 rounded-xl border border-surface-700 bg-surface-800/40 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-brand-400 animate-spin"/>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400">Gemini AI Processing…</p>
          <p className="text-xs text-slate-600 mt-0.5">OCR extraction + summary in progress</p>
        </div>
      </div>
    )
  }

  if (!doc.ai_summary) return null

  return (
    <div className="mt-3 rounded-xl border border-brand-500/25 bg-gradient-to-br from-brand-600/10 to-purple-600/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-brand-400"/>
        </div>
        <span className="text-xs font-semibold text-brand-400 tracking-wide uppercase">Gemini AI Summary</span>
        <CheckCircle2 className="w-3 h-3 text-success-500 ml-auto"/>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{doc.ai_summary}</p>
    </div>
  )
}

// ── Doc Card ──────────────────────────────────────────────────────────────────
function DocCard({ doc, onView, onDelete }: {
  doc: DocumentRecord; onView: (d: DocumentRecord) => void; onDelete: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const cfg  = typeConfig[doc.doc_type]
  const Icon = cfg.icon

  // Poll until processed
  useEffect(() => {
    if (doc.is_processed) return
    const id = setInterval(async () => {
      try {
        const s = await pollDocumentStatus(doc.id)
        if (s.is_processed) {
          clearInterval(id)
          queryClient.setQueryData<DocumentRecord[]>(['documents'], (old=[]) =>
            old.map(d => d.id===doc.id ? {...d, is_processed:true, ai_summary:s.ai_summary} : d))
        }
      } catch { clearInterval(id) }
    }, 4000)
    return () => clearInterval(id)
  }, [doc.id, doc.is_processed, queryClient])

  return (
    <div className="glass-hover rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.color)}>
            <Icon className="w-5 h-5"/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-200 truncate">{doc.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{doc.file_name} · {fmtSize(doc.file_size)}</p>
              </div>
              <span className={clsx('badge text-xs shrink-0', cfg.color)}>{cfg.label}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3"/>{format(new Date(doc.created_at),'d MMM yyyy')}
              </span>
              {doc.tags.length>0 && doc.tags.map(t=>(
                <span key={t} className="text-xs bg-surface-800 text-slate-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Tag className="w-2.5 h-2.5"/>#{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Summary Card — always visible inline */}
        <AISummaryCard doc={doc}/>
      </div>

      {/* Actions */}
      <div className="flex gap-0 border-t border-surface-800">
        <button onClick={()=>onView(doc)} className="btn-ghost text-xs py-2.5 flex-1 rounded-none border-r border-surface-800">
          <Eye className="w-3.5 h-3.5"/> View
        </button>
        <button onClick={()=>downloadDocument(doc.id,doc.file_name).catch(()=>toast.error('Download failed'))}
          className="btn-ghost text-xs py-2.5 flex-1 rounded-none border-r border-surface-800">
          <Download className="w-3.5 h-3.5"/> Download
        </button>
        <button onClick={()=>onDelete(doc.id)} className="btn-ghost text-xs py-2.5 px-4 text-danger-500 hover:text-danger-400 rounded-none">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  )
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ doc, onClose }: { doc: DocumentRecord; onClose: () => void }) {
  const [showOcr, setShowOcr] = useState(false)
  const cfg = typeConfig[doc.doc_type]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass max-w-xl w-full rounded-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', cfg.color)}>
              {(() => { const I = cfg.icon; return <I className="w-4 h-4"/> })()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">{doc.title}</h3>
              <p className="text-xs text-slate-500">{doc.file_name} · {fmtSize(doc.file_size)}</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-slate-300"/></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Type', cfg.label],
              ['Uploaded', format(new Date(doc.created_at),'d MMM yyyy, HH:mm')],
              ['Size', fmtSize(doc.file_size)],
              ['Status', doc.is_processed ? '✓ AI Processed' : '⏳ Processing…'],
            ].map(([k,v])=>(
              <div key={k} className="bg-surface-800/50 rounded-xl p-3">
                <p className="text-slate-500 mb-0.5">{k}</p>
                <p className="text-slate-300 font-medium">{v}</p>
              </div>
            ))}
          </div>

          {/* AI Summary — prominent card */}
          {doc.ai_summary ? (
            <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-600/15 via-purple-600/5 to-transparent p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-brand-400"/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-300">Gemini AI Summary</p>
                  <p className="text-xs text-slate-500">Plain-English clinical interpretation</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-success-500 ml-auto"/>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{doc.ai_summary}</p>
            </div>
          ) : !doc.is_processed ? (
            <div className="rounded-2xl border border-surface-700 bg-surface-800/40 p-5 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-slate-300">Generating AI Summary…</p>
                <p className="text-xs text-slate-500 mt-0.5">OCR → Gemini 2.5 Flash analysis in progress</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-700 bg-surface-800/40 p-4 text-center">
              <AlertCircle className="w-5 h-5 text-slate-600 mx-auto mb-1"/>
              <p className="text-xs text-slate-500">No summary could be generated for this document</p>
            </div>
          )}

          {/* Tags */}
          {doc.tags.length>0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map(t=>(
                <span key={t} className="text-xs bg-surface-800 text-slate-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5"/>#{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-surface-700">
          <button onClick={()=>downloadDocument(doc.id,doc.file_name).catch(()=>toast.error('Download failed'))}
            className="btn-primary flex-1 text-sm">
            <Download className="w-4 h-4"/> Download
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
  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState<DocType|'all'>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [viewing,    setViewing]    = useState<DocumentRecord|null>(null)

  const { data: docs=[], isLoading, isError } = useQuery({
    queryKey: ['documents'], queryFn: fetchDocuments, staleTime: 0,
  })

  const delMut = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_,id) => {
      queryClient.setQueryData<DocumentRecord[]>(['documents'], (old=[]) => old.filter(d=>d.id!==id))
      toast.success('Document deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    delMut.mutate(id)
  }, [delMut])

  const filtered = docs.filter(d =>
    (filterType==='all' || d.doc_type===filterType) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) ||
     d.tags.some(t=>t.toLowerCase().includes(search.toLowerCase())))
  )

  const processed = docs.filter(d=>d.is_processed).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Medical Documents</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Loading…' : `${docs.length} document${docs.length!==1?'s':''} · ${processed} AI-processed`}
          </p>
        </div>
        <button onClick={()=>setShowUpload(true)} className="btn-primary text-sm">
          <Upload className="w-4 h-4"/> Upload Document
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-2 input py-2.5">
          <Search className="w-4 h-4 text-slate-500 shrink-0"/>
          <input type="text" placeholder="Search documents or tags…" value={search}
            onChange={e=>setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none flex-1"/>
        </div>
        <div className="relative">
          <select value={filterType} onChange={e=>setFilterType(e.target.value as DocType|'all')}
            className="input py-2.5 pr-8 appearance-none cursor-pointer text-sm">
            <option value="all">All types</option>
            {ALL_TYPES.map(t=><option key={t} value={t}>{typeConfig[t].label}</option>)}
          </select>
          <Filter className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin"/> Loading documents…
        </div>
      ) : isError ? (
        <div className="glass p-6 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-danger-500 mx-auto mb-2"/>
          <p className="text-slate-400 text-sm">Failed to load documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(d=>(
            <DocCard key={d.id} doc={d} onView={setViewing} onDelete={handleDelete}/>
          ))}
          {filtered.length===0 && (
            <div className="col-span-2 glass p-12 rounded-2xl text-center">
              <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3"/>
              <p className="text-slate-500 text-sm">
                {docs.length===0 ? 'No documents yet. Upload your first medical document.' : 'No documents match your search.'}
              </p>
              {docs.length===0 && (
                <button onClick={()=>setShowUpload(true)} className="btn-primary text-sm mt-4">
                  <Upload className="w-4 h-4"/> Upload Document
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showUpload && <UploadModal onClose={()=>setShowUpload(false)}/>}
      {viewing    && <ViewModal doc={viewing} onClose={()=>setViewing(null)}/>}
    </div>
  )
}
