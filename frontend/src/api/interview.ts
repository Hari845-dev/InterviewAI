import { apiFetch } from './client';
import { GenerateQuestionsRequest, GenerateQuestionsResponse, InterviewQuestion, EvidenceObject } from '../types';

function normalizeQuestion(raw: any): InterviewQuestion {
  const category = raw?.category || raw?.type || 'technical';
  const whyAsked = Array.isArray(raw?.why_asked)
    ? raw.why_asked.filter((v: unknown): v is string => typeof v === 'string')
    : raw?.why_asked ? [String(raw.why_asked)] : [];

  const evidence: EvidenceObject = {
    source: raw?.evidence?.source || 'skill_bank',
    section: raw?.evidence?.section ?? null,
    reference: raw?.evidence?.reference ?? null,
    snippet: raw?.evidence?.snippet ?? null,
  };

  return {
    question_id: raw?.question_id || raw?.id,
    category,
    difficulty: String(raw?.difficulty || 'medium').toLowerCase(),
    question: raw?.question || '',
    suggested_answer: raw?.suggested_answer || raw?.expected_answer || '',
    skill_tag: raw?.skill_tag ?? null,
    evidence,
    source: raw?.source || 'cache',
    linked_to: raw?.linked_to ?? null,
    options: Array.isArray(raw?.options) ? raw.options : null,
    correct_answer: raw?.correct_answer ?? null,
    why_asked: whyAsked,
    focus: raw?.focus ?? null,
    id: raw?.question_id || raw?.id,
    type: category,
    expected_answer: raw?.suggested_answer || raw?.expected_answer || '',
  };
}

export function normalizeInterviewQuestion(raw: any): InterviewQuestion {
  return normalizeQuestion(raw);
}

export const interviewApi = {
  async generateQuestions(request: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
    const payload = {
      resume_hash: request.resume_hash,
      jd_hash: request.jd_hash || null,
      mode: request.mode || 'self_based',
      total_questions: request.total_questions || 20,
      distribution: request.distribution || undefined,
    };

    const raw = await apiFetch<any>('/interviews/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 60000,
    });

    return {
      questions: Array.isArray(raw?.questions) ? raw.questions.map(normalizeQuestion) : [],
      generation_summary: raw.generation_summary,
      resume_hash: raw.resume_hash,
      jd_hash: raw.jd_hash ?? null,
    };
  },
};
