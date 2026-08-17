import { apiFetch } from './client';

import {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  InterviewQuestion,
  EvidenceObject,
} from '../types';

function normalizeQuestion(
  raw: any
): InterviewQuestion {
  const category =
    raw?.category ||
    raw?.type ||
    'technical';

  const whyAsked =
    Array.isArray(
      raw?.why_asked
    )
      ? raw.why_asked.filter(
          (
            value: unknown
          ): value is string =>
            typeof value ===
            'string'
        )
      : raw?.why_asked
      ? [String(raw.why_asked)]
      : [];

  const evidence: EvidenceObject = {
    source:
      raw?.evidence?.source ||
      'skill_bank',

    section:
      raw?.evidence?.section ??
      null,

    reference:
      raw?.evidence?.reference ??
      null,

    snippet:
      raw?.evidence?.snippet ??
      null,
  };

  const suggestedAnswer =
    raw?.suggested_answer ||
    raw?.expected_answer ||
    '';

  const questionId =
    raw?.question_id ||
    raw?.id ||
    '';

  return {
    question_id:
      questionId,

    category,

    difficulty:
      String(
        raw?.difficulty ||
          'medium'
      ).toLowerCase(),

    question:
      raw?.question ||
      '',

    suggested_answer:
      suggestedAnswer,

    skill_tag:
      raw?.skill_tag ??
      null,

    evidence,

    source:
      raw?.source ||
      'cache',

    linked_to:
      raw?.linked_to ??
      null,

    options:
      Array.isArray(
        raw?.options
      )
        ? raw.options
        : null,

    correct_answer:
      raw?.correct_answer ??
      null,

    why_asked:
      whyAsked,

    focus:
      raw?.focus ??
      null,

    id:
      questionId,

    type:
      category,

    expected_answer:
      suggestedAnswer,
  };
}

export function normalizeInterviewQuestion(
  raw: any
): InterviewQuestion {
  return normalizeQuestion(raw);
}

export const interviewApi = {
  async generateQuestions(
    request: GenerateQuestionsRequest
  ): Promise<GenerateQuestionsResponse> {
    const requestedCount =
      Number(
        request.total_questions
      );

    const totalQuestions =
      Number.isFinite(
        requestedCount
      ) &&
      requestedCount > 0
        ? requestedCount
        : 20;

    const payload = {
      resume_hash:
        request.resume_hash,

      jd_hash:
        request.jd_hash ||
        null,

      mode:
        request.mode ||
        'self_based',

      total_questions:
        totalQuestions,

      distribution:
        request.distribution ||
        undefined,
    };

    const raw =
      await apiFetch<any>(
        '/interviews/generate',
        {
          method: 'POST',
          body: JSON.stringify(
            payload
          ),
          timeout: 60000,
        }
      );

    const questions =
      Array.isArray(
        raw?.questions
      )
        ? raw.questions.map(
            normalizeQuestion
          )
        : [];

    return {
      questions,
      generation_summary:
        raw?.generation_summary || {
          questions_requested:
            totalQuestions,
          cached_questions: 0,
          fresh_questions:
            questions.length,
          cache_hit_rate: 0,
          gemini_requests: 0,
        },
      resume_hash:
        raw?.resume_hash ||
        request.resume_hash,
      jd_hash:
        raw?.jd_hash ??
        request.jd_hash ??
        null,
    };
  },
};