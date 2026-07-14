import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { hashPassword, comparePassword, generateTokenPair,
         generateEmailVerifyToken, generateResetToken,
         verifyEmailToken, verifyResetToken, verifyRefreshToken } from '../utils/auth';
import { ApiError } from '../utils/errors';
import { ApiResponse, JwtPayload } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ── Register ─────────────────────────────────────────────────────────────────
export const register = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role = 'patient', phone } = req.body;

    const exists = await db.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]
    );
    if (exists.rows[0]) throw new ApiError(409, 'Email already registered');

    const passwordHash = await hashPassword(password);

    const result = await db.transaction(async (client) => {

      const { rows: [user] } = await client.query(
        `INSERT INTO users
           (id, email, phone, password_hash, role, first_name, last_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, email, role, first_name, last_name`,
        [uuidv4(), email, phone || null, passwordHash, role, firstName, lastName]
      );

     
      if (role === 'patient') {
        await client.query(
          'INSERT INTO patients (id, user_id) VALUES ($1, $2)',
          [uuidv4(), user.id]
        );
      } else if (role === 'doctor') {
        await client.query(
          'INSERT INTO doctors (id, user_id, license_number) VALUES ($1, $2, $3)',
          [uuidv4(), user.id, req.body.licenseNumber || 'PENDING']
        );
      }

      return user;
    });

    // Email verification token
    const verifyToken = generateEmailVerifyToken(result.id, result.email);
    await db.query(
      'UPDATE users SET email_verify_token = $1 WHERE id = $2',
      [verifyToken, result.id]
    );



    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: { userId: result.id, email: result.email, role: result.role },
    } as ApiResponse);
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { rows: [user] } = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
              u.is_email_verified, u.failed_login_count, u.locked_until,
              u.first_name, u.last_name,
              p.id AS patient_id, d.id AS doctor_id
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id AND p.deleted_at IS NULL
       LEFT JOIN doctors  d ON d.user_id = u.id AND d.deleted_at IS NULL
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email]
    );

    if (!user) throw new ApiError(401, 'Invalid credentials');
    if (!user.is_active) throw new ApiError(403, 'Account deactivated');

  
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new ApiError(423, 'Account locked. Try again later');
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      const fails = (user.failed_login_count || 0) + 1;
      const lockUntil = fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await db.query(
        'UPDATE users SET failed_login_count=$1, locked_until=$2 WHERE id=$3',
        [fails, lockUntil, user.id]
      );
      throw new ApiError(401, 'Invalid credentials');
    }

    // Reset failed logins
    await db.query(
      `UPDATE users SET failed_login_count=0, locked_until=NULL,
       last_login_at=NOW(), login_count=login_count+1 WHERE id=$1`,
      [user.id]
    );

    const payload: JwtPayload = {
      userId:    user.id,
      email:     user.email,
      role:      user.role,
      patientId: user.patient_id,
      doctorId:  user.doctor_id,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token hash
    await db.query(
      'UPDATE users SET refresh_token=$1 WHERE id=$2',
      [tokens.refreshToken, user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id, email: user.email, role: user.role,
          firstName: user.first_name, lastName: user.last_name,
          patientId: user.patient_id, doctorId: user.doctor_id,
          isEmailVerified: user.is_email_verified,
        },
        ...tokens,
      },
    } as ApiResponse);
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
export const refreshToken = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new ApiError(400, 'Refresh token required');

    const payload = verifyRefreshToken(token);

    const { rows: [user] } = await db.query(
      `SELECT id, email, role, refresh_token, is_active,
              (SELECT id FROM patients WHERE user_id=users.id AND deleted_at IS NULL) AS patient_id,
              (SELECT id FROM doctors  WHERE user_id=users.id AND deleted_at IS NULL) AS doctor_id
       FROM users WHERE id=$1 AND deleted_at IS NULL`,
      [payload.userId]
    );

    if (!user || !user.is_active) throw new ApiError(401, 'Invalid session');
    if (user.refresh_token !== token) throw new ApiError(401, 'Token reuse detected');

    const newPayload: JwtPayload = {
      userId: user.id, email: user.email, role: user.role,
      patientId: user.patient_id, doctorId: user.doctor_id,
    };
    const tokens = generateTokenPair(newPayload);

    await db.query('UPDATE users SET refresh_token=$1 WHERE id=$2', [tokens.refreshToken, user.id]);

    res.json({ success: true, data: tokens } as ApiResponse);
  } catch (err) { next(err); }
};


export const logout = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.userId) {
      await db.query('UPDATE users SET refresh_token=NULL WHERE id=$1', [req.user.userId]);
    }
    res.json({ success: true, message: 'Logged out' } as ApiResponse);
  } catch (err) { next(err); }
};

// ── Verify Email ──────────────────────────────────────────────────────────────
export const verifyEmail = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const { userId } = verifyEmailToken(token);

    const { rows: [user] } = await db.query(
      'SELECT id, email_verify_token FROM users WHERE id=$1', [userId]
    );
    if (!user || user.email_verify_token !== token)
      throw new ApiError(400, 'Invalid or expired verification link');

    await db.query(
      'UPDATE users SET is_email_verified=TRUE, email_verify_token=NULL WHERE id=$1',
      [userId]
    );

    res.json({ success: true, message: 'Email verified successfully' } as ApiResponse);
  } catch (err) { next(err); }
};

// ── Me ────────────────────────────────────────────────────────────────────────
export const getMe = async (
  req: Request, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const { rows: [user] } = await db.query(
      `SELECT u.id, u.email, u.phone, u.role, u.first_name, u.last_name,
              u.avatar_url, u.is_email_verified, u.last_login_at, u.created_at,
              p.id AS patient_id, d.id AS doctor_id, d.specialty
       FROM users u
       LEFT JOIN patients p ON p.user_id=u.id AND p.deleted_at IS NULL
       LEFT JOIN doctors  d ON d.user_id=u.id AND d.deleted_at IS NULL
       WHERE u.id=$1 AND u.deleted_at IS NULL`,
      [req.user!.userId]
    );
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ success: true, data: user } as ApiResponse);
  } catch (err) { next(err); }
};
