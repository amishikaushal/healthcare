import { Router } from 'express';
import { body } from 'express-validator';
import {
  register, login, refreshToken, logout, verifyEmail, getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/),
    body('firstName').trim().isLength({ min: 1, max: 100 }),
    body('lastName').trim().isLength({ min: 1, max: 100 }),
    body('role').optional().isIn(['patient', 'caregiver', 'doctor']),
  ],
  validate,
  register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate,
  refreshToken
);

router.post('/logout', authenticate, logout);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', authenticate, getMe);

export default router;
