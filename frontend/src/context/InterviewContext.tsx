import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  InterviewQuestion,
  GenerationSummary,
  SessionResponse,
  AnswerFeedback,
  SubmitAnswerResponse,
  SessionStatsResponse,
  QuestionSetRecord,
} from '../types';

import {
  interviewApi,
  sessionApi,
} from '../api';

import { useAuth } from './AuthContext';

interface InterviewContextType {
  questions: InterviewQuestion[];
  generationSummary: GenerationSummary | null;
  isGenerating: boolean;
  currentSession: SessionResponse | null;
  activeQuestionIndex: number;
  activeFeedback: AnswerFeedback | null;
  activeFollowUp: InterviewQuestion | null;
  isSubmittingAnswer: boolean;
  sessionStats: SessionStatsResponse | null;

  generateQuestions: (
    resumeHash?: string,
    count?: number,
    mode?: 'self_based' | 'job_specific',
    jdHash?: string | null
  ) => Promise<InterviewQuestion[]>;

  startSession: (
    questionsToUse?: InterviewQuestion[],
    mode?: 'self_based' | 'job_specific',
    jdHash?: string | null,
    title?: string,
    role?: string
  ) => Promise<SessionResponse>;

  submitAnswer: (
    questionId: string,
    answer: string
  ) => Promise<SubmitAnswerResponse>;

  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
  resetSession: () => void;

  activateQuestionSet: (
    questionSet: QuestionSetRecord
  ) => void;
}

const InterviewContext =
  createContext<
    InterviewContextType | undefined
  >(undefined);

const ACTIVE_QUESTION_SET_PREFIX =
  'interviewai_active_question_set';

function getActiveQuestionSetKey(
  userId: string | null | undefined
): string | null {
  if (!userId || !userId.trim()) {
    return null;
  }

  return `${ACTIVE_QUESTION_SET_PREFIX}_${userId}`;
}

function readStoredQuestionSet(
  userId: string | null | undefined
): QuestionSetRecord | null {
  try {
    const key =
      getActiveQuestionSetKey(userId);

    if (!key) {
      return null;
    }

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      return null;
    }

    return parsed as QuestionSetRecord;
  } catch {
    return null;
  }
}

function saveActiveQuestionSet(
  userId: string | null | undefined,
  questionSet: QuestionSetRecord
): void {
  try {
    const key =
      getActiveQuestionSetKey(userId);

    if (!key) {
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify(questionSet)
    );
  } catch {
    return;
  }
}

function removeActiveQuestionSet(
  userId: string | null | undefined
): void {
  try {
    const key =
      getActiveQuestionSetKey(userId);

    if (key) {
      localStorage.removeItem(key);
    }
  } catch {
    return;
  }
}

function normalizeQuestionSetMode(
  mode: 'self_based' | 'job_specific'
): 'self_based' | 'role_based' {
  return mode === 'job_specific'
    ? 'role_based'
    : 'self_based';
}

export const InterviewProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const {
    activeResumeHash,
    activeResumeProfile,
    resumes,
    user,
  } = useAuth();

  const userId =
    user?.id || null;

  const [
    questions,
    setQuestions,
  ] = useState<InterviewQuestion[]>(
    []
  );

  const [
    generationSummary,
    setGenerationSummary,
  ] =
    useState<GenerationSummary | null>(
      null
    );

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    currentSession,
    setCurrentSession,
  ] =
    useState<SessionResponse | null>(
      null
    );

  const [
    activeQuestionIndex,
    setActiveQuestionIndex,
  ] = useState(0);

  const [
    activeFeedback,
    setActiveFeedback,
  ] =
    useState<AnswerFeedback | null>(
      null
    );

  const [
    activeFollowUp,
    setActiveFollowUp,
  ] =
    useState<InterviewQuestion | null>(
      null
    );

  const [
    isSubmittingAnswer,
    setIsSubmittingAnswer,
  ] = useState(false);

  const [
    sessionStats,
    setSessionStats,
  ] =
    useState<SessionStatsResponse | null>(
      null
    );

  const [
    generatedForResumeHash,
    setGeneratedForResumeHash,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!userId) {
      setQuestions([]);
      setGenerationSummary(null);
      setGeneratedForResumeHash(null);
      setCurrentSession(null);
      setActiveQuestionIndex(0);
      setActiveFeedback(null);
      setActiveFollowUp(null);
      setSessionStats(null);
      return;
    }

    const stored =
      readStoredQuestionSet(userId);

    if (
      stored &&
      stored.questions.length > 0
    ) {
      setQuestions(
        stored.questions
      );

      setGenerationSummary(
        stored.generation_summary ||
          null
      );

      setGeneratedForResumeHash(
        stored.resume_hash ||
          null
      );
    }
  }, [userId]);

  const getCurrentResumeHash =
    (): string | null => {
      const profileHash =
        activeResumeProfile?.resume_hash;

      if (profileHash) {
        return profileHash;
      }

      if (activeResumeHash) {
        return activeResumeHash;
      }

      return null;
    };

  const requireResumeHash = (
    requestedHash?: string
  ): string => {
    const currentHash =
      getCurrentResumeHash();

    if (requestedHash) {
      const existsInStoredResumes =
        resumes.length === 0 ||
        resumes.some(
          resume =>
            resume.resume_hash ===
            requestedHash
        );

      if (!existsInStoredResumes) {
        throw new Error(
          'The selected resume is no longer available. Please select the resume again before starting interview preparation.'
        );
      }

      return requestedHash;
    }

    if (!currentHash) {
      throw new Error(
        'Please upload and select a resume before starting interview preparation.'
      );
    }

    const currentResumeExists =
      resumes.length === 0 ||
      resumes.some(
        resume =>
          resume.resume_hash ===
          currentHash
      );

    if (!currentResumeExists) {
      throw new Error(
        'The selected resume could not be found. Please open the Resume page and select a valid resume before continuing.'
      );
    }

    return currentHash;
  };

  const activateQuestionSet = (
    questionSet: QuestionSetRecord
  ) => {
    if (
      !questionSet.questions ||
      questionSet.questions.length === 0
    ) {
      return;
    }

    setQuestions(
      questionSet.questions
    );

    setGenerationSummary(
      questionSet.generation_summary ||
        null
    );

    setGeneratedForResumeHash(
      questionSet.resume_hash ||
        null
    );

    setCurrentSession(null);
    setActiveQuestionIndex(0);
    setActiveFeedback(null);
    setActiveFollowUp(null);
    setSessionStats(null);

    saveActiveQuestionSet(
      userId,
      questionSet
    );
  };

  const generateQuestions = async (
    resumeHash?: string,
    count = 20,
    mode:
      | 'self_based'
      | 'job_specific' = 'self_based',
    jdHash?: string | null
  ): Promise<InterviewQuestion[]> => {
    const hash =
      requireResumeHash(
        resumeHash
      );

    if (count <= 0) {
      throw new Error(
        'Question count must be greater than zero.'
      );
    }

    setIsGenerating(true);

    try {
      const response =
        await interviewApi.generateQuestions({
          resume_hash: hash,
          jd_hash: jdHash || null,
          mode,
          total_questions: count,
        });

      if (
        !response.questions ||
        response.questions.length === 0
      ) {
        throw new Error(
          'No interview questions were generated.'
        );
      }

      setQuestions(
        response.questions
      );

      setGenerationSummary(
        response.generation_summary
      );

      setGeneratedForResumeHash(
        hash
      );

      setCurrentSession(null);
      setActiveQuestionIndex(0);
      setActiveFeedback(null);
      setActiveFollowUp(null);
      setSessionStats(null);

      const questionSetMode =
        normalizeQuestionSetMode(
          mode
        );

      const generatedSet:
        QuestionSetRecord = {
        id: `active_${Date.now()}_${hash}`,

        title:
          questionSetMode ===
          'role_based'
            ? 'JD-Grounded Interview Questions'
            : 'Comprehensive Resume Grounding',

        mode:
          questionSetMode,

        date:
          new Date().toISOString(),

        questions_count:
          response.questions.length,

        difficulty:
          'medium',

        questions:
          response.questions,

        generation_summary:
          response.generation_summary,

        resume_hash:
          hash,

        jd_hash:
          jdHash ||
          undefined,
      };

      saveActiveQuestionSet(
        userId,
        generatedSet
      );

      return response.questions;
    } finally {
      setIsGenerating(false);
    }
  };

  const startSession = async (
    questionsToUse?: InterviewQuestion[],
    mode:
      | 'self_based'
      | 'job_specific' = 'self_based',
    jdHash?: string | null,
    title?: string,
    role?: string
  ): Promise<SessionResponse> => {
    const currentHash =
      requireResumeHash();

    const questionsBelongToCurrentResume =
      generatedForResumeHash ===
      currentHash;

    let qs =
      questionsToUse &&
      questionsToUse.length > 0
        ? questionsToUse
        : [];

    if (!qs.length) {
      qs =
        await generateQuestions(
          currentHash,
          6,
          mode,
          jdHash
        );
    } else if (
      generatedForResumeHash &&
      !questionsBelongToCurrentResume
    ) {
      qs =
        await generateQuestions(
          currentHash,
          6,
          mode,
          jdHash
        );
    }

    if (!qs.length) {
      throw new Error(
        'No interview questions are available. Generate a question set first.'
      );
    }

    const sessionResponse =
      await sessionApi.createSession({
        resume_hash:
          currentHash,

        jd_hash:
          jdHash ||
          null,

        mode,

        title,

        role,

        questions:
          qs,

        total_questions:
          qs.length,

        generation_summary:
          generationSummary ||
          undefined,
      });

    setCurrentSession(
      sessionResponse
    );

    setActiveQuestionIndex(0);
    setActiveFeedback(null);
    setActiveFollowUp(null);
    setSessionStats(null);

    return sessionResponse;
  };

  const submitAnswer = async (
    questionId: string,
    answer: string
  ): Promise<SubmitAnswerResponse> => {
    if (!currentSession) {
      throw new Error(
        'No active interview session'
      );
    }

    setIsSubmittingAnswer(true);

    try {
      const response =
        await sessionApi.submitAnswer(
          currentSession.session_id,
          {
            question_id:
              questionId,
            user_answer:
              answer,
          }
        );

      setCurrentSession(
        response.session
      );

      setActiveFeedback(
        response.feedback
      );

      setActiveFollowUp(
        response.follow_up_question ||
          null
      );

      if (
        response.is_completed
      ) {
        const stats =
          await sessionApi.getSessionStats(
            currentSession.session_id
          );

        setSessionStats(
          stats
        );
      }

      return response;
    } finally {
      setIsSubmittingAnswer(
        false
      );
    }
  };

  const nextQuestion = () => {
    if (!currentSession) {
      return;
    }

    setActiveFeedback(null);
    setActiveFollowUp(null);

    if (
      activeQuestionIndex <
      currentSession.questions.length -
        1
    ) {
      setActiveQuestionIndex(
        previous =>
          previous + 1
      );
      return;
    }

    sessionApi
      .getSessionStats(
        currentSession.session_id
      )
      .then(setSessionStats)
      .catch(() => undefined);
  };

  const prevQuestion = () => {
    if (
      activeQuestionIndex <= 0
    ) {
      return;
    }

    setActiveQuestionIndex(
      previous =>
        previous - 1
    );

    setActiveFeedback(null);
    setActiveFollowUp(null);
  };

  const jumpToQuestion = (
    index: number
  ) => {
    if (
      !currentSession ||
      index < 0 ||
      index >=
        currentSession.questions.length
    ) {
      return;
    }

    setActiveQuestionIndex(
      index
    );

    setActiveFeedback(null);
    setActiveFollowUp(null);
  };

  const resetSession = () => {
    setCurrentSession(null);
    setActiveQuestionIndex(0);
    setActiveFeedback(null);
    setActiveFollowUp(null);
    setSessionStats(null);
  };

  return (
    <InterviewContext.Provider
      value={{
        questions,
        generationSummary,
        isGenerating,
        currentSession,
        activeQuestionIndex,
        activeFeedback,
        activeFollowUp,
        isSubmittingAnswer,
        sessionStats,
        generateQuestions,
        startSession,
        submitAnswer,
        nextQuestion,
        prevQuestion,
        jumpToQuestion,
        resetSession,
        activateQuestionSet,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context =
    useContext(
      InterviewContext
    );

  if (!context) {
    throw new Error(
      'useInterview must be used within an InterviewProvider'
    );
  }

  return context;
};