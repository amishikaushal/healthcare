export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
  caregiverId?: string;
}

export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  roleId?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
