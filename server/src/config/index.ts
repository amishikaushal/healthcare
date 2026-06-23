import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  db: {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    name:     process.env.DB_NAME || 'recoveryos',
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl:      process.env.DB_SSL === 'true',
    poolMin:  parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax:  parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  jwt: {
    accessSecret:        process.env.JWT_ACCESS_SECRET  || 'change_me_access',
    refreshSecret:       process.env.JWT_REFRESH_SECRET || 'change_me_refresh',
    accessExpiresIn:     process.env.JWT_ACCESS_EXPIRES  || '15m',
    refreshExpiresIn:    process.env.JWT_REFRESH_EXPIRES || '7d',
    emailVerifySecret:   process.env.JWT_EMAIL_SECRET   || 'change_me_email',
    emailVerifyExpires:  '24h',
    resetPasswordSecret: process.env.JWT_RESET_SECRET   || 'change_me_reset',
    resetPasswordExpires:'1h',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs:   15 * 60 * 1000,
    max:        100,
    authMax:    10,
  },

  gemini: {
    apiKey:    process.env.GEMINI_API_KEY || '',
    model:     process.env.GEMINI_MODEL   || 'gemini-2.5-flash',
    embedModel: 'gemini-embedding-001',
  },

  qdrant: {
    url:        process.env.QDRANT_URL        || 'http://localhost:6333',
    apiKey:     process.env.QDRANT_API_KEY    || '',
    collection: process.env.QDRANT_COLLECTION || 'recoveryos_docs',
  },

  email: {
    host:    process.env.SMTP_HOST     || 'smtp.gmail.com',
    port:    parseInt(process.env.SMTP_PORT || '587', 10),
    user:    process.env.SMTP_USER     || '',
    pass:    process.env.SMTP_PASS     || '',
    from:    process.env.EMAIL_FROM    || 'noreply@recoveryos.com',
  },

  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_MB || '10', 10),
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg','image/png','image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};
