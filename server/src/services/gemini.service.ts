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
  } catch (err: any) {
    const msg = err?.message || 'AI generation failed'
    logger.error('Gemini generateText error', msg)
    throw new Error(`Gemini error: ${msg}`)
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
      systemInstruction: {
        role: 'user',
        parts: [{ text: systemContext }],
      },
    })
    const lastMsg = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMsg.parts[0].text)
    return result.response.text()
  } catch (err: any) {
    const msg = err?.message || 'AI chat failed'
    logger.error('Gemini chatWithHistory error', msg)
    throw new Error(`Gemini error: ${msg}`)
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
  scoreHistory: number[]
  appointments: { title: string, status: string }[]
  carePlanProgress: number // percentage
}

export const generateWeeklyReport = async (data: WeeklyReportInput): Promise<{
  summary: string
  highlights: string[]
  achievements: string[]
  areasForImprovement: string[]
  positiveTrends: string[]
  riskFactors: string[]
  recommendations: string[]
  goals: string[]
}> => {
  const prompt = `You are a medical AI assistant for RecoveryOS, a recovery care management platform.

Generate a structured weekly recovery report for the following patient data:

Patient: ${data.patientName}
Condition: ${data.condition}
Current Phase: ${data.phase} (Plan Progress: ${data.carePlanProgress}%)
Week Number: ${data.weekNumber}

Weekly Metrics:
- Average Pain Level: ${data.avgPain}/10 (lower is better)
- Average Mood Score: ${data.avgMood}/10
- Average Energy Level: ${data.avgEnergy}/10
- Average Sleep: ${data.avgSleep} hours
- Medication Adherence: ${data.medicationAdherence}%
- Exercise Adherence: ${data.exerciseAdherence}%

Recovery Score History (last 7 days): ${data.scoreHistory.join(', ') || 'N/A'}
Appointments: ${data.appointments.map(a => `${a.title} (${a.status})`).join(', ') || 'None'}

Symptoms reported this week: ${data.symptoms.join(', ') || 'None'}

Daily log notes:
${data.logs.map((l, i) => `Day ${i + 1}: ${l}`).join('\n')}

Return a JSON object with this exact structure:
{
  "summary": "2-3 paragraph clinical summary of the week",
  "highlights": ["array of 2-3 key progress highlights"],
  "achievements": ["array of 1-3 specific patient achievements"],
  "areasForImprovement": ["array of 1-3 areas needing attention"],
  "positiveTrends": ["array of 1-3 positive trends observed"],
  "riskFactors": ["array of any clinical or adherence risk factors"],
  "recommendations": ["array of 2-4 personalized action items"],
  "goals": ["array of 1-3 specific goals for next week"]
}

Be specific, clinically appropriate, and encouraging.`

  const raw = await generateText(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      summary: raw,
      highlights: [],
      achievements: [],
      areasForImprovement: [],
      positiveTrends: [],
      riskFactors: [],
      recommendations: [],
      goals: []
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

// ── Care Plan generation ──────────────────────────────────────────────────────
export interface CarePlanInput {
  patientInfo: any
  documents: any[]
  conditionHint?: string
  instructions?: string
}

export const generateCarePlan = async (data: CarePlanInput): Promise<any> => {
  const prompt = `You are a medical AI assistant for RecoveryOS. Generate a structured care plan for this patient.

Patient Info: ${JSON.stringify(data.patientInfo)}
Condition Hint: ${data.conditionHint || 'Not provided'}
Doctor's Specific Instructions: ${data.instructions || 'None'}

Recent Medical Documents (Summaries or Content):
${data.documents.map(d => `- [${d.doc_type}] ${d.title}: ${d.summary || d.content || 'No text available'}`).join('\n')}

Based on the diagnosis, condition, severity, and any restrictions found in the documents and patient info, generate a structured Care Plan.

Return a JSON object with this exact structure:
{
  "title": "String, short clear title for the care plan",
  "condition": "String, specific medical condition or procedure name",
  "durationWeeks": "Number, estimated total duration in weeks",
  "goals": ["Array of string, overall recovery goals"],
  "phases": [
    {
      "name": "String, e.g. Phase 1: Acute Recovery",
      "duration": "String, e.g. 1-2 weeks",
      "description": "String, phase summary",
      "milestones": [
        {
          "text": "String, clear milestone"
        }
      ]
    }
  ]
}

Ensure the plan is realistic, clinically sound, and does not prescribe medication directly but suggests lifestyle, recovery phases, and general milestones.`

  const raw = await generateText(prompt)
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    logger.error('Failed to parse generated care plan', err)
    throw new Error('AI could not generate a valid care plan format.')
  }
}
