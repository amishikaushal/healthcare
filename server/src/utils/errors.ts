export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (resource = 'Resource') =>
  new ApiError(404, `${resource} not found`);

export const badRequest = (message: string, errors?: Record<string, string[]>) =>
  new ApiError(400, message, errors);

export const forbidden = (message = 'Access denied') =>
  new ApiError(403, message);
