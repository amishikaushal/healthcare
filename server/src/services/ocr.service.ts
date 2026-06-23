import { spawn }      from 'child_process'
import { promises as fs } from 'fs'
import * as path        from 'path'
import * as os          from 'os'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config }       from '../config'
import { logger }       from '../utils/logger'

const genAI   = new GoogleGenerativeAI(config.gemini.apiKey)
const MODELS  = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
const PY_WORKER = path.join(__dirname, 'ocr_worker.py')

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Python OCR worker
// Writes buffer to a temp file, calls ocr_worker.py, returns cleaned text.
// ─────────────────────────────────────────────────────────────────────────────
async function runPythonOcr(buffer: Buffer, mimeType: string): Promise<string> {
  const ext     = mimeType === 'application/pdf' ? '.pdf' : '.png'
  const tmpFile = path.join(os.tmpdir(), `recoveryos_ocr_${Date.now()}${ext}`)

  try {
    await fs.writeFile(tmpFile, buffer)
    logger.info(`Running Python OCR on ${tmpFile} (${mimeType})`)

    return await new Promise<string>((resolve, reject) => {
      const proc   = spawn('python3', [PY_WORKER, tmpFile, mimeType])
      let stdout   = ''
      let stderr   = ''

      proc.stdout.on('data', (d) => { stdout += d.toString() })
      proc.stderr.on('data', (d) => { stderr += d.toString() })

      proc.on('close', (code) => {
        if (stderr) logger.warn('Python OCR stderr:', stderr.slice(0, 300))
        try {
          const parsed = JSON.parse(stdout.trim())
          if (parsed.success && parsed.text?.trim()) {
            logger.info(`Python OCR extracted ${parsed.text.length} chars`)
            resolve(parsed.text)
          } else {
            logger.warn('Python OCR returned no text:', parsed.error || 'unknown')
            resolve('')
          }
        } catch {
          logger.error('Failed to parse Python OCR output:', stdout.slice(0, 200))
          resolve('')
        }
      })

      proc.on('error', (err) => {
        logger.error('Python OCR spawn error:', err.message)
        reject(err)
      })
    })
  } finally {
    fs.unlink(tmpFile).catch(() => {})
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Gemini text summarisation
// Sends only the extracted text (not raw bytes) — light on tokens.
// ─────────────────────────────────────────────────────────────────────────────
async function geminiSummarise(
  ocrText:       string,
  docType:       string,
  patientContext: string
): Promise<string> {
  if (ocrText.trim().length < 20) return ''

  const prompt = `You are a medical AI assistant for RecoveryOS, a patient recovery platform.

Patient context: ${patientContext}
Document type: ${docType.replace(/_/g, ' ')}

Extracted document text:
---
${ocrText.slice(0, 6000)}
---

Write a 2-3 sentence plain-English summary of the most clinically relevant findings.
No medical jargon. Be concise and factual.
Return ONLY the summary — no headers, no labels, no extra text.`

  for (const modelName of MODELS) {
    try {
      const model   = genAI.getGenerativeModel({ model: modelName })
      const result  = await model.generateContent(prompt)
      const summary = result.response.text().trim()
      if (summary) {
        logger.info(`Gemini summary via ${modelName}: "${summary.slice(0, 80)}…"`)
        return summary
      }
    } catch (err: any) {
      const msg = (err?.message || '') as string
      if (msg.includes('429') || msg.includes('quota') || msg.includes('503')) {
        logger.warn(`${modelName} quota/unavailable, trying next model…`)
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      if (msg.includes('404')) { continue }
      logger.error(`Gemini error on ${modelName}: ${msg.slice(0, 150)}`)
    }
  }

  logger.warn('All Gemini models exhausted — no summary generated')
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — used by document.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
export async function extractAndSummarise(
  buffer:        Buffer,
  mimeType:      string,
  docType:       string,
  patientContext: string
): Promise<{ ocrText: string; aiSummary: string }> {
  const ocrText   = await runPythonOcr(buffer, mimeType).catch((err) => {
    logger.error('Python OCR failed entirely:', err.message)
    return ''
  })

  const aiSummary = await geminiSummarise(ocrText, docType, patientContext)

  return { ocrText, aiSummary }
}
