import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/errors';

export const validate = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().reduce<Record<string, string[]>>((acc, err: any) => {
      const field = err.path || 'general';
      if (!acc[field]) acc[field] = [];
      acc[field].push(err.msg);
      return acc;
    }, {});
    return next(new ApiError(400, 'Validation failed', formatted));
  }
  next();
};
