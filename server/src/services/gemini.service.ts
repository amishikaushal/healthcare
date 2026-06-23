import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { config } from '../config'
import { logger } from '../utils/logger'

// ── Gemini client ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(config.gemini.apiKey)

const getModel = (modelName: string = config.gemini.model): GenerativeModel =>
  genAI.getGenerativeModel({ model: modelName })

// ── Text generation ───────────────────────────────────────────────────────────
export const generateText = async (prompt: string): Promise<string> => {
  try {
    const model = getModel()
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err) {
    logger.error('Gemini generateText error', err)
    throw new Error('AI generation failed')
  }
}

// ── Chat with history ─────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export const chatWithHistory = async (
  messages: ChatMessage[],
  systemContext: string
): Promise<string> => {
  try {
    const model = getModel()
    const chat = model.startChat({
      history: messages.slice(0, -1), // all but last (the current user message)
      systemInstruction: systemContext,
    })
    const lastMsg = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMsg.parts[0].text)
    return result.response.text()
  } catch (err) {
    logger.error('Gemini chatWithHistory error', err)
    throw new Error('AI chat failed')
  }
}

// ── Embeddings ────────────────────────────────────────────────────────────────
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.embedModel })
    const result = await model.embedContent(text)
    return result.embedding.values
  } catch (err) {
    logger.error('Gemini embedding error', err)
    throw new Error('Embedding generation failed')
  }
}

// ── Weekly report generation ──────────────────────────────────────────────────
export interface WeeklyReportInput {
  patientName: string
  condition: string
  phase: string
  weekNumber: number
  avgPain: number
  avgMood: number
  avgEnergy: number
  avgSleep: number
  medicationAdherence: number
  exerciseAdherence: number
  symptoms: string[]
  logs: string[]
}

export const generateWeeklyReport = async (data: WeeklyReportInput): Promise<{
  summary: string
  highlights: string[]
  concerns: string[]
  recommendations: string[]
}> => {
  const prompt = `You are a medical AI assistant for RecoveryOS, a recovery care management platform.

Generate a structured weekly recovery report for the following patient data:

Patient: ${data.patientName}
Condition: ${data.condition}
Current Phase: ${data.phase}
Week Number: ${data.weekNumber}

Weekly Metrics:
- Average Pain Level: ${data.avgPain}/10 (lower is better)
- Average Mood Score: ${data.avgMood}/10
- Average Energy Level: ${data.avgEnergy}/10
- Average Sleep: ${data.avgSleep} hours
- Medication Adherence: ${data.medicationAdherence}%
- Exercise Adherence: ${data.exerciseAdherence}%

Symptoms reported this week: ${data.symptoms.join(', ') || 'None'}

Daily log notes:
${data.logs.map((l, i) => `Day ${i + 1}: ${l}`).join('\n')}

Return a JSON object with this exact structure:
{
  "summary": "2-3 paragraph clinical summary in markdown",
  "highlights": ["array of 2-3 positive achievements"],
  "concerns": ["array of 1-3 areas needing attention"],
  "recommendations": ["array of 2-4 specific action items for next week"]
}

Be specific, clinically appropriate, and encouraging. Use markdown formatting in summary.`

  const raw = await generateText(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      summary: raw,
      highlights: [],
      concerns: [],
      recommendations: [],
    }
  }
}

// ── Document summarisation ────────────────────────────────────────────────────
export const summariseDocument = async (
  content: string,
  docType: string,
  patientContext: string
): Promise<string> => {
  const prompt = `You are a medical AI assistant. Summarise the following ${docType} document in 2-3 sentences.
Be concise, factual, and highlight the most clinically relevant findings.
Avoid medical jargon where possible.

Patient context: ${patientContext}

Document content:
${content.slice(0, 8000)}

Return only the summary, no headers or formatting.`

  return generateText(prompt)
}

// ── Risk analysis ─────────────────────────────────────────────────────────────
export const analyseRisk = async (patientData: {
  recentLogs: any[]
  medications: any[]
  exercises: any[]
  condition: string
}): Promise<{
  riskLevel: 'low' | 'medium' | 'high'
  alerts: { type: string; severity: string; message: string }[]
  explanation: string
}> => {
  const prompt = `You are a medical AI for a recovery platform. Analyse this patient's recent data and identify risks.

Condition: ${patientData.condition}
Recent logs: ${JSON.stringify(patientData.recentLogs.slice(-7))}
Medications: ${JSON.stringify(patientData.medications)}
Exercise completion: ${JSON.stringify(patientData.exercises.slice(-7))}

Return JSON:
{
  "riskLevel": "low|medium|high",
  "alerts": [{"type": "pain_spike|missed_medication|no_activity|vitals_abnormal", "severity": "low|medium|high", "message": "..."}],
  "explanation": "Brief clinical explanation"
}`

  const raw = await generateText(prompt)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    return JSON.parse(jsonMatch[0])
  } catch {
    return { riskLevel: 'low', alerts: [], explanation: raw }
  }
}
