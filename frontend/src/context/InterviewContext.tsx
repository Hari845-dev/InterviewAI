import React, {
  createContext,
  useContext,
  useState,
} from 'react';

import {
  InterviewQuestion,
  GenerationSummary,
  SessionResponse,
  AnswerFeedback,
  SubmitAnswerResponse,
  SessionStatsResponse,
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
}

const InterviewContext =
  createContext<
    InterviewContextType | undefined
  >(undefined);

export const InterviewProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {

  /*
   * IMPORTANT:
   *
   * activeResumeProfile is treated as the source of truth for
   * the resume currently selected for NEW interview preparation.
   *
   * activeResumeHash is kept as a compatibility fallback.
   *
   * resumes lets us verify that a hash actually belongs to one
   * of the resumes currently stored for this user.
   */
  const {
    activeResumeHash,
    activeResumeProfile,
    resumes,
  } = useAuth();

  const [
    questions,
    setQuestions,
  ] = useState<InterviewQuestion[]>([]);

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

  /*
   * Stores the resume hash for which the current question set
   * was generated.
   *
   * This prevents questions generated for Resume A from being
   * accidentally used when the user has switched to Resume B.
   */
  const [
    generatedForResumeHash,
    setGeneratedForResumeHash,
  ] = useState<string | null>(null);

  /*
   * ==========================================================
   * RESOLVE CURRENT RESUME
   * ==========================================================
   */

  const getCurrentResumeHash =
    (): string | null => {

      /*
       * Prefer the actual active profile.
       */
      const profileHash =
        activeResumeProfile?.resume_hash;

      if (profileHash) {
        return profileHash;
      }

      /*
       * Compatibility fallback.
       */
      if (activeResumeHash) {
        return activeResumeHash;
      }

      return null;
    };

  /*
   * ==========================================================
   * VALIDATE RESUME HASH
   * ==========================================================
   */

  const requireResumeHash = (
    requestedHash?: string
  ): string => {

    const currentHash =
      getCurrentResumeHash();

    /*
     * If a specific hash was requested, validate it.
     */
    if (requestedHash) {

      const existsInStoredResumes =
        resumes.length === 0 ||
        resumes.some(
          (resume) =>
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

    /*
     * Otherwise use the actual currently selected resume.
     */
    if (!currentHash) {
      throw new Error(
        'Please upload and select a resume before starting interview preparation.'
      );
    }

    /*
     * Make sure the current hash belongs to a stored resume.
     *
     * If the resume list has not loaded yet, allow it.
     */
    const currentResumeExists =
      resumes.length === 0 ||
      resumes.some(
        (resume) =>
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

  /*
   * ==========================================================
   * GENERATE QUESTIONS
   * ==========================================================
   */

  const generateQuestions = async (
    resumeHash?: string,
    count = 20,
    mode:
      | 'self_based'
      | 'job_specific' = 'self_based',
    jdHash?: string | null,
  ): Promise<InterviewQuestion[]> => {

    /*
     * If a hash is explicitly supplied, validate it.
     *
     * Otherwise use the current active resume.
     */
    const hash =
      requireResumeHash(
        resumeHash
      );

    setIsGenerating(true);

    try {

      const response =
        await interviewApi.generateQuestions({
          resume_hash: hash,
          jd_hash: jdHash || null,
          mode,
          total_questions: count,
        });

      setQuestions(
        response.questions
      );

      setGenerationSummary(
        response.generation_summary
      );

      /*
       * Remember which resume produced these questions.
       */
      setGeneratedForResumeHash(
        hash
      );

      /*
       * A new generation starts a new preparation flow,
       * so clear any previous session-specific state.
       */
      setCurrentSession(
        null
      );

      setActiveQuestionIndex(
        0
      );

      setActiveFeedback(
        null
      );

      setActiveFollowUp(
        null
      );

      setSessionStats(
        null
      );

      return response.questions;

    } finally {

      setIsGenerating(false);
    }
  };

  /*
   * ==========================================================
   * START SESSION
   * ==========================================================
   */

  const startSession = async (
    questionsToUse?: InterviewQuestion[],
    mode:
      | 'self_based'
      | 'job_specific' = 'self_based',
    jdHash?: string | null,
    title?: string,
    role?: string,
  ): Promise<SessionResponse> => {

    /*
     * Always resolve the CURRENT selected resume when
     * creating a new session.
     *
     * This is the critical fix.
     */
    const currentHash =
      requireResumeHash();

    /*
     * Check whether the supplied question set was generated
     * for the same resume.
     */
    const questionsBelongToCurrentResume =
      generatedForResumeHash ===
      currentHash;

    let qs =
      questionsToUse &&
      questionsToUse.length > 0
        ? questionsToUse
        : [];

    /*
     * If there is no question set, generate one.
     */
    if (!qs.length) {

      qs =
        await generateQuestions(
          currentHash,
          6,
          mode,
          jdHash
        );

    /*
     * If the existing question set was generated for another
     * resume, DO NOT reuse it.
     */
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

    /*
     * There is a special case:
     *
     * A component may pass a question array directly before
     * generatedForResumeHash has been established.
     *
     * In that case, trust it only if it is accompanied by
     * the current generation context.
     *
     * For normal application flow, generateQuestions() sets
     * generatedForResumeHash.
     */
    if (!qs.length) {

      throw new Error(
        'No interview questions are available. Generate a question set first.'
      );
    }

    /*
     * Create the session with the SAME resume hash used
     * for the current preparation flow.
     */
    const sessionResponse =
      await sessionApi.createSession({
        resume_hash:
          currentHash,

        jd_hash:
          jdHash || null,

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

    setActiveQuestionIndex(
      0
    );

    setActiveFeedback(
      null
    );

    setActiveFollowUp(
      null
    );

    setSessionStats(
      null
    );

    return sessionResponse;
  };

  /*
   * ==========================================================
   * SUBMIT ANSWER
   * ==========================================================
   */

  const submitAnswer = async (
    questionId: string,
    answer: string
  ): Promise<SubmitAnswerResponse> => {

    if (!currentSession) {
      throw new Error(
        'No active interview session'
      );
    }

    setIsSubmittingAnswer(
      true
    );

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

  /*
   * ==========================================================
   * NEXT QUESTION
   * ==========================================================
   */

  const nextQuestion = () => {

    if (!currentSession) {
      return;
    }

    setActiveFeedback(
      null
    );

    setActiveFollowUp(
      null
    );

    if (
      activeQuestionIndex <
      currentSession.questions.length -
        1
    ) {

      setActiveQuestionIndex(
        (previous) =>
          previous + 1
      );

    } else {

      sessionApi
        .getSessionStats(
          currentSession.session_id
        )
        .then(
          setSessionStats
        )
        .catch(
          () => undefined
        );
    }
  };

  /*
   * ==========================================================
   * PREVIOUS QUESTION
   * ==========================================================
   */

  const prevQuestion = () => {

    if (
      activeQuestionIndex >
      0
    ) {

      setActiveQuestionIndex(
        (previous) =>
          previous - 1
      );

      setActiveFeedback(
        null
      );

      setActiveFollowUp(
        null
      );
    }
  };

  /*
   * ==========================================================
   * JUMP TO QUESTION
   * ==========================================================
   */

  const jumpToQuestion = (
    index: number
  ) => {

    if (
      currentSession &&
      index >= 0 &&
      index <
        currentSession.questions
          .length
    ) {

      setActiveQuestionIndex(
        index
      );

      setActiveFeedback(
        null
      );

      setActiveFollowUp(
        null
      );
    }
  };

  /*
   * ==========================================================
   * RESET SESSION
   * ==========================================================
   */

  const resetSession = () => {

    setCurrentSession(
      null
    );

    setActiveQuestionIndex(
      0
    );

    setActiveFeedback(
      null
    );

    setActiveFollowUp(
      null
    );

    setSessionStats(
      null
    );

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