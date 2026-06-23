import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { db } from '../database/db';
import { UserRole, RequestUser } from '../types';
import { ApiError } from '../utils/errors';

// ── Authenticate ─────────────────────────────────────────────────────────────

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const { rows } = await db.query(
      `SELECT id, email, role, is_active FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [payload.userId]
    );

    if (!rows[0]) throw new ApiError(401, 'User not found');
    if (!rows[0].is_active) throw new ApiError(403, 'Account is deactivated');

    req.user = {
      userId:     payload.userId,
      email:      payload.email,
      role:       payload.role,
      patientId:  payload.patientId,
      doctorId:   payload.doctorId,
    };

    next();
  } catch (err: any) {
    if (err instanceof ApiError) return next(err);
    if (err.name === 'TokenExpiredError') return next(new ApiError(401, 'Token expired'));
    if (err.name === 'JsonWebTokenError') return next(new ApiError(401, 'Invalid token'));
    next(new ApiError(401, 'Authentication failed'));
  }
};

// ── Authorise (RBAC) ─────────────────────────────────────────────────────────

export const authorize = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };

// ── Patient ownership guard ───────────────────────────────────────────────────

export const ownPatientOrDoctor = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req;
    if (!user) return next(new ApiError(401, 'Not authenticated'));

    const patientId = req.params.patientId || req.body.patientId;

    if (user.role === 'admin') return next();

    if (user.role === 'patient') {
      if (user.patientId !== patientId) {
        return next(new ApiError(403, 'Access denied'));
      }
      return next();
    }

    if (user.role === 'doctor') {
      const { rows } = await db.query(
        `SELECT id FROM care_plans
         WHERE patient_id = $1 AND doctor_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [patientId, user.doctorId]
      );
      if (!rows[0]) return next(new ApiError(403, 'Not your patient'));
      return next();
    }

    if (user.role === 'caregiver') {
      const { rows } = await db.query(
        `SELECT id FROM caregivers
         WHERE user_id = $1 AND patient_id = $2 AND deleted_at IS NULL`,
        [user.userId, patientId]
      );
      if (!rows[0]) return next(new ApiError(403, 'Not an authorised caregiver'));
      return next();
    }

    next(new ApiError(403, 'Access denied'));
  } catch (err) {
    next(err);
  }
};

// ── Optional auth (for public+private routes) ─────────────────────────────────

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      req.user = {
        userId:    payload.userId,
        email:     payload.email,
        role:      payload.role,
        patientId: payload.patientId,
        doctorId:  payload.doctorId,
      };
    }
  } catch {
    // ignore — optional
  }
  next();
};
