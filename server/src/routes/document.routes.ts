import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth'
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  getDocumentStatus,
} from '../controllers/document.controller'
import { config } from '../config'

const router = Router()
router.use(authenticate)

// Memory storage — we store the binary in Postgres directly (no disk dependency)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`))
    }
  },
})

router.get ('/',              listDocuments)
router.post('/',              upload.single('file'), uploadDocument)
router.get ('/:id/download',  downloadDocument)
router.get ('/:id/status',    getDocumentStatus)
router.delete('/:id',         deleteDocument)

export default router
