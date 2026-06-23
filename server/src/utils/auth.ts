import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { JwtPayload, AuthTokens } from '../types';

// ── JWT ─────────────────────────────────────────────────────────────────────

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
    issuer: 'recoveryos',
    audience: 'recoveryos-client',
  });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
    issuer: 'recoveryos',
    audience: 'recoveryos-client',
  });

export const generateEmailVerifyToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email, purpose: 'email_verify' }, config.jwt.emailVerifySecret, {
    expiresIn: config.jwt.emailVerifyExpires as any,
  });

export const generateResetToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email, purpose: 'reset_password', jti: uuidv4() }, config.jwt.resetPasswordSecret, {
    expiresIn: config.jwt.resetPasswordExpires as any,
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;

export const verifyEmailToken = (token: string): { userId: string; email: string } =>
  jwt.verify(token, config.jwt.emailVerifySecret) as any;

export const verifyResetToken = (token: string): { userId: string; email: string } =>
  jwt.verify(token, config.jwt.resetPasswordSecret) as any;

export const generateTokenPair = (payload: JwtPayload): AuthTokens => ({
  accessToken: generateAccessToken(payload),
  refreshToken: generateRefreshToken(payload),
  expiresIn: 15 * 60, // 15 minutes in seconds
});

// ── Password ─────────────────────────────────────────────────────────────────

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, config.bcrypt.saltRounds);

export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
