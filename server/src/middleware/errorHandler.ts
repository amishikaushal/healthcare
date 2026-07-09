import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    const body: ApiResponse = {
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected error
  logger.error(`[${req.method}] ${req.path} — ${err.message}`, { stack: err.stack });

  const isDev = process.env.NODE_ENV !== 'production'
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
  } as ApiResponse);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: 'Route not found' } as ApiResponse);
};
