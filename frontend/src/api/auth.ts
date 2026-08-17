import { apiFetch } from './client';
import { AuthResponse, LoginRequest, RegisterRequest, User, BackendUserResponse } from '../types';

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.full_name
      }),
      skipAuth: true
    });
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      return await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true
      });
    } catch (err) {
      if (err instanceof Error && 'status' in err) {
        const apiErr = err as { status: number; message: string };
        if (apiErr.status === 404 || (apiErr.message && apiErr.message.toLowerCase().includes('not found'))) {
          const error = new Error('No account found with this email.');
          (error as any).code = 'ACCOUNT_NOT_FOUND';
          throw error;
        }

        if (apiErr.status === 401 || (apiErr.message && apiErr.message.toLowerCase().includes('invalid'))) {
          const error = new Error('Incorrect email or password.');
          (error as any).code = 'INVALID_PASSWORD';
          throw error;
        }
      }

      throw err;
    }
  },

  async getCurrentUser(): Promise<BackendUserResponse> {
    return await apiFetch<BackendUserResponse>('/auth/me');
  }
};
