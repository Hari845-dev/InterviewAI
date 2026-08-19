import { apiFetch, ApiError } from './client';

import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  BackendUserResponse,
} from '../types';


export const authApi = {

  async register(
    data: RegisterRequest
  ): Promise<AuthResponse> {

    try {
      return await apiFetch<AuthResponse>(
        '/auth/register',
        {
          method: 'POST',

          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.full_name,
          }),

          skipAuth: true,
        }
      );

    } catch (error: unknown) {

      if (error instanceof ApiError) {

        if (error.status === 409) {
          throw new Error(
            'An account with this email already exists.'
          );
        }

        if (error.status === 400) {
          throw new Error(
            error.message ||
            'Unable to create your account.'
          );
        }

        if (error.status === 422) {
          throw new Error(
            error.message ||
            'Please check your registration details.'
          );
        }

        throw new Error(
          error.message ||
          'Registration failed. Please try again.'
        );
      }

      throw error;
    }
  },


  async login(
    data: LoginRequest
  ): Promise<AuthResponse> {

    try {

      return await apiFetch<AuthResponse>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(data),
          skipAuth: true,
        }
      );

    } catch (error: unknown) {

      if (error instanceof ApiError) {

        if (error.status === 404) {
          const customError =
            new Error(
              'No account found with this email.'
            );

          (
            customError as any
          ).code = 'ACCOUNT_NOT_FOUND';

          throw customError;
        }

        if (
          error.status === 401 ||
          error.message
            .toLowerCase()
            .includes('invalid')
        ) {
          const customError =
            new Error(
              'Incorrect email or password.'
            );

          (
            customError as any
          ).code = 'INVALID_PASSWORD';

          throw customError;
        }

        throw new Error(
          error.message ||
          'Login failed. Please try again.'
        );
      }

      throw error;
    }
  },


  async getCurrentUser():
    Promise<BackendUserResponse> {

    return await apiFetch<BackendUserResponse>(
      '/auth/me'
    );
  },
};