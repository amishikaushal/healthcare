import api from './api'

export type DocType =
  | 'lab_report'
  | 'imaging'
  | 'prescription'
  | 'discharge_summary'
  | 'consent'
  | 'other'

export interface DocumentRecord {
  id: string
  title: string
  doc_type: DocType
  file_name: string
  file_size: number
  mime_type: string
  ai_summary: string | null
  is_processed: boolean
  tags: string[]
  created_at: string
}

// ── List all documents for the authenticated patient ──────────────────────────
export const fetchDocuments = (): Promise<DocumentRecord[]> =>
  api.get('/documents').then((r) => r.data.data)

// ── Upload a file (multipart/form-data) ───────────────────────────────────────
export const uploadDocument = (
  file: File,
  meta: { title: string; docType: DocType; tags: string }
): Promise<DocumentRecord> => {
  const form = new FormData()
  form.append('file', file)
  form.append('title', meta.title)
  form.append('docType', meta.docType)
  form.append('tags', meta.tags)
  return api
    .post('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.data)
}

// ── Poll for processing status (OCR + AI summary) ────────────────────────────
export const pollDocumentStatus = (
  id: string
): Promise<{ id: string; is_processed: boolean; ai_summary: string | null }> =>
  api.get(`/documents/${id}/status`).then((r) => r.data.data)

// ── Download (returns a Blob URL, open in new tab) ────────────────────────────
export const downloadDocument = async (id: string, fileName: string): Promise<void> => {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteDocument = (id: string): Promise<void> =>
  api.delete(`/documents/${id}`).then(() => undefined)
