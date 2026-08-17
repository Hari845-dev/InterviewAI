import { apiFetch } from './client';
import { DashboardMetrics } from '../types';

export const dashboardApi = {
  async getDashboardMetrics(
    resumeHash?: string | null
  ): Promise<DashboardMetrics> {
    const query =
      resumeHash
        ? `?resume_hash=${encodeURIComponent(resumeHash)}`
        : '';

    return await apiFetch<DashboardMetrics>(
      `/dashboard${query}`
    );
  },
};