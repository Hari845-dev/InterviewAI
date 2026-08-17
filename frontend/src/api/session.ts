import { apiFetch } from './client';
import { CreateSessionRequest, SessionAnswerRequest, SessionResponse, SessionStatsResponse, SubmitAnswerResponse } from '../types';
import { normalizeInterviewQuestion } from './interview';

function normalizeResponse(raw: any) {
  return {
    question_id: raw.question_id,
    question: raw.question || '',
    category: raw.category || raw.type || 'technical',
    skill_tag: raw.skill_tag ?? null,
    evidence: raw.evidence || undefined,
    user_answer: raw.user_answer || '',
    feedback: raw.ai_feedback || raw.feedback || null,
    is_follow_up: Boolean(raw.is_follow_up),
    submitted_at: raw.submitted_at,
    score: raw.score ?? null,
    is_correct: raw.is_correct ?? null,
    type: raw.category || raw.type || 'technical',
  };
}

export function normalizeSession(raw: any): SessionResponse {
  const served = Array.isArray(raw?.questions_served) ? raw.questions_served : (raw?.questions || []);
  const answers = Array.isArray(raw?.answers) ? raw.answers : (raw?.responses || []);
  return {
    session_id: raw.session_id,
    user_id: raw.user_id,
    resume_hash: raw.resume_hash,
    jd_hash: raw.jd_hash ?? null,
    mode: raw.mode || 'self_based',
    status: raw.status,
    current_question_index: Number(raw.current_question_index || 0),
    questions: served.map((q: any) => normalizeInterviewQuestion(q)),
    responses: answers.map(normalizeResponse),
    overall_score: raw.overall_score ?? null,
    started_at: raw.started_at,
    completed_at: raw.completed_at ?? null,
    created_at: raw.created_at || raw.started_at,
    title: raw.title ?? null,
    role: raw.role ?? null,
    difficulty: raw.difficulty ?? null,
    total_questions: raw.total_questions ?? served.length,
  };
}

export const sessionApi = {
  async getSessions(limit = 20, skip = 0): Promise<SessionResponse[]> {
    const raw = await apiFetch<any[]>(`/sessions?limit=${limit}&skip=${skip}`);
    return raw.map(normalizeSession);
  },

  async createSession(payload: CreateSessionRequest): Promise<SessionResponse> {
    const raw = await apiFetch<any>('/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSession(raw);
  },

  async getSession(sessionId: string): Promise<SessionResponse> {
    const raw = await apiFetch<any>(`/sessions/${sessionId}`);
    return normalizeSession(raw);
  },

  async submitAnswer(sessionId: string, data: SessionAnswerRequest): Promise<SubmitAnswerResponse> {
    const raw = await apiFetch<any>(`/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      feedback: raw.feedback || null,
      is_correct: raw.is_correct ?? null,
      follow_up_question: raw.follow_up_question ? normalizeInterviewQuestion(raw.follow_up_question) : null,
      next_question: raw.next_question ? normalizeInterviewQuestion(raw.next_question) : null,
      is_completed: Boolean(raw.is_completed),
      current_score: raw.current_score ?? null,
      session: normalizeSession(raw.session),
    };
  },

  async finalizeSession(sessionId: string): Promise<SessionResponse> {
    const raw = await apiFetch<any>(`/sessions/${sessionId}`, { method: 'PATCH' });
    return normalizeSession(raw);
  },

  async getSessionStats(sessionId: string): Promise<SessionStatsResponse> {
    return await apiFetch<SessionStatsResponse>(`/sessions/${sessionId}/stats`);
  },
};
