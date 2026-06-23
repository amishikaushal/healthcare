import { QdrantClient } from '@qdrant/js-client-rest'
import { config } from '../config'
import { logger } from '../utils/logger'
import { generateEmbedding } from './gemini.service'
import { db } from '../database/db'
import { v4 as uuidv4 } from 'uuid'

const client = new QdrantClient({
  url: config.qdrant.url,
  ...(config.qdrant.apiKey ? { apiKey: config.qdrant.apiKey } : {}),
})

const VECTOR_SIZE = 768 // text-embedding-004 dimensions
const COLLECTION  = config.qdrant.collection

// ── Init collection ───────────────────────────────────────────────────────────
export const initCollection = async (): Promise<void> => {
  try {
    const collections = await client.getCollections()
    const exists = collections.collections.some(c => c.name === COLLECTION)
    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
        replication_factor: 1,
      })
      logger.info(`✅ Qdrant collection "${COLLECTION}" created`)
    } else {
      logger.info(`✅ Qdrant collection "${COLLECTION}" already exists`)
    }
  } catch (err) {
    logger.error('Qdrant initCollection error', err)
    throw err
  }
}

// ── Upsert document chunks ────────────────────────────────────────────────────
export const upsertDocumentChunks = async (
  documentId: string,
  patientId: string,
  chunks: { content: string; index: number; metadata?: Record<string, any> }[]
): Promise<void> => {
  const points = await Promise.all(
    chunks.map(async (chunk) => {
      const embedding = await generateEmbedding(chunk.content)
      const pointId   = uuidv4()

      // Store chunk reference in PostgreSQL
      await db.query(
        `INSERT INTO document_chunks (id, document_id, patient_id, chunk_index, content, token_count, qdrant_point_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [pointId, documentId, patientId, chunk.index,
         chunk.content, Math.ceil(chunk.content.length / 4), pointId, JSON.stringify(chunk.metadata || {})]
      )

      return {
        id:      pointId,
        vector:  embedding,
        payload: {
          documentId, patientId,
          content:    chunk.content,
          chunkIndex: chunk.index,
          ...chunk.metadata,
        },
      }
    })
  )

  await client.upsert(COLLECTION, { wait: true, points })
  logger.info(`Upserted ${points.length} chunks for doc ${documentId}`)
}

// ── Semantic search ───────────────────────────────────────────────────────────
export interface SearchResult {
  id: string
  content: string
  score: number
  documentId: string
  metadata: Record<string, any>
}

export const semanticSearch = async (
  query: string,
  patientId: string,
  limit: number = 5
): Promise<SearchResult[]> => {
  try {
    const queryEmbedding = await generateEmbedding(query)

    const results = await client.search(COLLECTION, {
      vector:      queryEmbedding,
      limit,
      filter: {
        must: [{ key: 'patientId', match: { value: patientId } }],
      },
      with_payload: true,
      score_threshold: 0.6,
    })

    return results.map(r => ({
      id:         r.id as string,
      content:    (r.payload?.content as string) || '',
      score:      r.score,
      documentId: (r.payload?.documentId as string) || '',
      metadata:   r.payload as Record<string, any>,
    }))
  } catch (err) {
    logger.error('Qdrant search error', err)
    return []
  }
}

// ── Delete patient vectors ────────────────────────────────────────────────────
export const deletePatientVectors = async (patientId: string): Promise<void> => {
  await client.delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: 'patientId', match: { value: patientId } }] },
  })
}
