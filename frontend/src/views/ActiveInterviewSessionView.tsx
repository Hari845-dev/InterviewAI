import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  HelpCircle,
  Layers,
  Mic,
  MicOff,
  Send,
  StopCircle,
  XCircle,
} from 'lucide-react';

import { InterviewShell } from '../components/layout/InterviewShell';
import { sessionApi } from '../api';
import { normalizeInterviewQuestion } from '../api/interview';
import {
  AnswerFeedback,
  InterviewQuestion,
  SessionResponse,
} from '../types';

type QuestionFeedbackMap = Record<
  string,
  AnswerFeedback | null
>;

type QuestionAnswerMap = Record<
  string,
  string
>;

type FollowUpMap = Record<
  string,
  InterviewQuestion | null
>;

type FollowUpFeedbackMap = Record<
  string,
  AnswerFeedback | null
>;

const getQuestionKey = (
  question: InterviewQuestion,
  index: number
): string =>
  question.question_id ||
  question.id ||
  `q_${index}`;

export const ActiveInterviewSessionView: React.FC = () => {
  const { sessionId } =
    useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] =
    useState<SessionResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [submissionError, setSubmissionError] =
    useState<string | null>(null);

  const [followUpError, setFollowUpError] =
    useState<string | null>(null);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [userAnswers, setUserAnswers] =
    useState<QuestionAnswerMap>({});

  const [feedbackByQuestion, setFeedbackByQuestion] =
    useState<QuestionFeedbackMap>({});

  const [followUpsByQuestion, setFollowUpsByQuestion] =
    useState<FollowUpMap>({});

  const [
    followUpFeedbackByQuestion,
    setFollowUpFeedbackByQuestion,
  ] = useState<FollowUpFeedbackMap>({});

  const [skippedQuestions, setSkippedQuestions] =
    useState<Set<string>>(
      new Set()
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    isSubmittingFollowUp,
    setIsSubmittingFollowUp,
  ] = useState(false);

  const [followUpAnswer, setFollowUpAnswer] =
    useState('');

  const [showEvidence, setShowEvidence] =
    useState(false);

  const [showIdealAnswer, setShowIdealAnswer] =
    useState(false);

  const [scratchpadNotes, setScratchpadNotes] =
    useState(() =>
      sessionId
        ? sessionStorage.getItem(
            `scratchpad_${sessionId}`
          ) || ''
        : ''
    );

  const [isRecording, setIsRecording] =
    useState(false);

  const [showExitModal, setShowExitModal] =
    useState(false);

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const chatBottomRef =
    useRef<HTMLDivElement>(null);

  const recognitionRef =
    useRef<any>(null);

  const currentQuestionIdRef =
    useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/app/interview', {
        replace: true,
      });
      return;
    }

    let mounted = true;

    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          await sessionApi.getSession(
            sessionId
          );

        if (!mounted) {
          return;
        }

        setSession(data);

        if (
          data.status ===
          'completed'
        ) {
          navigate(
            `/interview/session/${sessionId}/complete`,
            {
              replace: true,
            }
          );
          return;
        }

        const storedIndex =
          Number(
            sessionStorage.getItem(
              `interview_index_${sessionId}`
            )
          );

        const serverIndex =
          Number(
            data.current_question_index || 0
          );

        const initialIndex =
          Number.isFinite(
            storedIndex
          ) &&
          storedIndex >= 0 &&
          storedIndex <
            data.questions.length
            ? storedIndex
            : Math.min(
                Math.max(
                  serverIndex,
                  0
                ),
                Math.max(
                  data.questions.length - 1,
                  0
                )
              );

        const restoredAnswers: QuestionAnswerMap =
          {};

        const restoredFeedback: QuestionFeedbackMap =
          {};

        data.responses.forEach(
          response => {
            const key =
              response.question_id;

            if (!key) {
              return;
            }

            if (
              response.user_answer
            ) {
              restoredAnswers[key] =
                response.user_answer;
            }

            if (
              response.feedback
            ) {
              restoredFeedback[key] =
                response.feedback;
            }
          }
        );

        setUserAnswers(
          restoredAnswers
        );

        setFeedbackByQuestion(
          restoredFeedback
        );

        setCurrentIndex(
          initialIndex
        );

        sessionStorage.setItem(
          `interview_index_${sessionId}`,
          String(initialIndex)
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load interview session.'
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      mounted = false;
    };
  }, [
    sessionId,
    navigate,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setElapsedSeconds(
          previous =>
            previous + 1
        );
      }, 1000);

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  useEffect(() => {
    return () => {
      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.stop();
        } catch {
          //
        }
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue =
        'Your interview is currently in progress.';
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () =>
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
  }, []);

  useEffect(() => {
    if (
      sessionId
    ) {
      sessionStorage.setItem(
        `interview_index_${sessionId}`,
        String(currentIndex)
      );
    }
  }, [
    currentIndex,
    sessionId,
  ]);

  const currentQuestion =
    session?.questions?.[
      currentIndex
    ] || null;

  const currentQuestionKey =
    currentQuestion
      ? getQuestionKey(
          currentQuestion,
          currentIndex
        )
      : null;

  useEffect(() => {
    currentQuestionIdRef.current =
      currentQuestionKey;

    setSubmissionError(null);
    setFollowUpError(null);
    setShowEvidence(false);
    setShowIdealAnswer(false);

    if (!currentQuestionKey) {
      setFollowUpAnswer('');
      return;
    }

    setFollowUpAnswer('');

    const existingAnswer =
      userAnswers[
        currentQuestionKey
      ] || '';

    const existingFollowUp =
      followUpsByQuestion[
        currentQuestionKey
      ];

    const existingFollowUpFeedback =
      followUpFeedbackByQuestion[
        currentQuestionKey
      ];

    if (
      existingFollowUp &&
      !existingFollowUpFeedback
    ) {
      setFollowUpAnswer('');
    }
  }, [
    currentIndex,
    currentQuestionKey,
  ]);

  useEffect(() => {
    if (
      feedbackByQuestion[
        currentQuestionKey || ''
      ] ||
      followUpsByQuestion[
        currentQuestionKey || ''
      ] ||
      followUpFeedbackByQuestion[
        currentQuestionKey || ''
      ]
    ) {
      chatBottomRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [
    currentQuestionKey,
    feedbackByQuestion,
    followUpsByQuestion,
    followUpFeedbackByQuestion,
  ]);

  const activeFeedback =
    currentQuestionKey
      ? feedbackByQuestion[
          currentQuestionKey
        ] || null
      : null;

  const activeFollowUp =
    currentQuestionKey
      ? followUpsByQuestion[
          currentQuestionKey
        ] || null
      : null;

  const activeFollowUpFeedback =
    currentQuestionKey
      ? followUpFeedbackByQuestion[
          currentQuestionKey
        ] || null
      : null;

  const userAnswer =
    currentQuestionKey
      ? userAnswers[
          currentQuestionKey
        ] || ''
      : '';

  const setCurrentAnswer = (
    value: string
  ) => {
    if (!currentQuestionKey) {
      return;
    }

    setUserAnswers(
      previous => ({
        ...previous,
        [currentQuestionKey]:
          value,
      })
    );
  };

  const handleScratchpadChange = (
    value: string
  ) => {
    setScratchpadNotes(
      value
    );

    if (sessionId) {
      sessionStorage.setItem(
        `scratchpad_${sessionId}`,
        value
      );
    }
  };

  const stopRecording = () => {
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch {
        //
      }
      recognitionRef.current = null;
    }

    setIsRecording(
      false
    );
  };

  const toggleRecording = () => {
    if (
      isRecording
    ) {
      stopRecording();
      return;
    }

    const SpeechRecognition =
      (window as any)
        .SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSubmissionError(
        'Voice dictation is not supported in this browser.'
      );
      return;
    }

    try {
      const recognition =
        new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        'en-US';

      recognition.onresult = (
        event: any
      ) => {
        let transcript = '';

        for (
          let index =
            event.resultIndex;
          index <
          event.results.length;
          index += 1
        ) {
          transcript +=
            event.results[index][0]
              .transcript;
        }

        if (
          transcript.trim()
        ) {
          setCurrentAnswer(
            `${userAnswer} ${transcript}`.trim()
          );
        }
      };

      recognition.onerror = () => {
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(
          false
        );
        recognitionRef.current =
          null;
      };

      recognition.start();

      recognitionRef.current =
        recognition;

      setIsRecording(
        true
      );
    } catch {
      setSubmissionError(
        'Unable to start voice dictation.'
      );
    }
  };

  const handleMainAnswerSubmit =
    async () => {
      if (
        !session ||
        !sessionId ||
        !currentQuestion ||
        !currentQuestionKey ||
        !userAnswer.trim() ||
        isSubmitting
      ) {
        return;
      }

      stopRecording();
      setSubmissionError(null);
      setIsSubmitting(true);

      try {
        const response =
          await sessionApi.submitAnswer(
            sessionId,
            {
              question_id:
                currentQuestion.question_id ||
                currentQuestion.id ||
                currentQuestionKey,
              user_answer:
                userAnswer.trim(),
            }
          );

        if (
          response.session
        ) {
          setSession(
            response.session
          );
        }

        setUserAnswers(
          previous => ({
            ...previous,
            [currentQuestionKey]:
              userAnswer.trim(),
          })
        );

        if (
          response.feedback
        ) {
          setFeedbackByQuestion(
            previous => ({
              ...previous,
              [currentQuestionKey]:
                response.feedback,
            })
          );
        } else {
          setFeedbackByQuestion(
            previous => ({
              ...previous,
              [currentQuestionKey]:
                null,
            })
          );

          setSubmissionError(
            'Your answer was submitted, but AI evaluation did not return feedback. You can continue the interview.'
          );
        }

      setFollowUpsByQuestion(
  previous => ({
    ...previous,
    [currentQuestionKey]:
      response.follow_up_question
        ? normalizeInterviewQuestion(
            response.follow_up_question
          )
        : null,
  })
);
        if (
          response.is_completed
        ) {
          await sessionApi.finalizeSession(
            sessionId
          );

          navigate(
            `/interview/session/${sessionId}/complete`
          );
        }
      } catch (err) {
        setSubmissionError(
          err instanceof Error
            ? err.message
            : 'Answer submission failed. You can skip this question or try again.'
        );
      } finally {
        setIsSubmitting(
          false
        );
      }
    };

  const handleFollowUpSubmit =
    async () => {
      if (
        !sessionId ||
        !currentQuestionKey ||
        !activeFollowUp ||
        !followUpAnswer.trim() ||
        isSubmittingFollowUp
      ) {
        return;
      }

      setFollowUpError(null);
      setIsSubmittingFollowUp(
        true
      );

      try {
        const response =
          await sessionApi.submitAnswer(
            sessionId,
            {
              question_id:
                activeFollowUp.question_id ||
                activeFollowUp.id ||
                `fu_${currentIndex}`,
              user_answer:
                followUpAnswer.trim(),
            }
          );

        if (
          response.session
        ) {
          setSession(
            response.session
          );
        }

        if (
          response.feedback
        ) {
          setFollowUpFeedbackByQuestion(
            previous => ({
              ...previous,
              [currentQuestionKey]:
                response.feedback,
            })
          );
        } else {
          setFollowUpError(
            'The follow-up was submitted, but evaluation feedback was not returned.'
          );
        }
      } catch (err) {
        setFollowUpError(
          err instanceof Error
            ? err.message
            : 'Follow-up answer failed to submit.'
        );
      } finally {
        setIsSubmittingFollowUp(
          false
        );
      }
    };

  const clearQuestionState =
    () => {
      setSubmissionError(null);
      setFollowUpError(null);
      setShowEvidence(false);
      setShowIdealAnswer(false);
      setFollowUpAnswer('');
      stopRecording();
    };

  const goToQuestion = (
    index: number
  ) => {
    if (
      !session ||
      index < 0 ||
      index >=
        session.questions.length
    ) {
      return;
    }

    setCurrentIndex(
      index
    );
    clearQuestionState();
  };

  const handleSkipQuestion = () => {
    if (
      !session ||
      !currentQuestion ||
      !currentQuestionKey
    ) {
      return;
    }

    setSkippedQuestions(
      previous => {
        const updated =
          new Set(previous);

        updated.add(
          currentQuestionKey
        );

        return updated;
      }
    );

    if (
      currentIndex >=
      session.questions.length - 1
    ) {
      sessionApi
        .finalizeSession(
          sessionId as string
        )
        .then(() => {
          navigate(
            `/interview/session/${sessionId}/complete`
          );
        })
        .catch(err => {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to finish the interview.'
          );
        });

      return;
    }

    goToQuestion(
      currentIndex + 1
    );
  };

  const handleProceedToNext =
    () => {
      if (
        !session
      ) {
        return;
      }

      if (
        currentIndex >=
        session.questions.length - 1
      ) {
        setIsSubmitting(true);

        sessionApi
          .finalizeSession(
            session.session_id
          )
          .then(() => {
            navigate(
              `/interview/session/${session.session_id}/complete`
            );
          })
          .catch(err => {
            setError(
              err instanceof Error
                ? err.message
                : 'Unable to finalize this interview.'
            );
          })
          .finally(() => {
            setIsSubmitting(
              false
            );
          });

        return;
      }

      goToQuestion(
        currentIndex + 1
      );
    };

  const handleConfirmEndInterview =
    async () => {
      if (!sessionId) {
        return;
      }

      try {
        stopRecording();

        await sessionApi.finalizeSession(
          sessionId
        );

        setShowExitModal(
          false
        );

        navigate(
          `/interview/session/${sessionId}/complete`
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to finalize this interview.'
        );

        setShowExitModal(
          false
        );
      }
    };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-mono">
          Calibrating interview environment...
        </p>
      </div>
    );
  }

  if (
    error ||
    !session ||
    !session.questions?.length ||
    !currentQuestion
  ) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 font-serif mb-2">
          Interview Session Not Found
        </h2>

        <p className="text-sm text-gray-600 max-w-md mb-6">
          {error ||
            'Could not load the requested session.'}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/app/interview'
            )
          }
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
        >
          Return to Mock Interview Setup
        </button>
      </div>
    );
  }

  const totalQuestions =
    session.questions.length;

  const answeredCount =
    Object.values(
      feedbackByQuestion
    ).filter(Boolean)
      .length;

  const skippedCount =
    skippedQuestions.size;

  const completedCount =
    new Set([
      ...Object.keys(
        feedbackByQuestion
      ).filter(
        key =>
          Boolean(
            feedbackByQuestion[key]
          )
      ),
      ...skippedQuestions,
    ]).size;

  const progressPercent =
    Math.round(
      (completedCount /
        totalQuestions) *
        100
    );

  const questionKey =
    currentQuestionKey ||
    getQuestionKey(
      currentQuestion,
      currentIndex
    );

  const isCurrentAnswered =
    Boolean(
      feedbackByQuestion[
        questionKey
      ]
    );

  const isCurrentSkipped =
    skippedQuestions.has(
      questionKey
    );

  const wordCount =
    userAnswer
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;

  const visibleError =
    submissionError ||
    followUpError;

  return (
    <InterviewShell
      sessionTitle={
        session.title ||
        'Mixed / Real Interview'
      }
      roleTitle={
        session.role ||
        'Software Engineer'
      }
      elapsedSeconds={
        elapsedSeconds
      }
      onEndInterviewClick={() =>
        setShowExitModal(
          true
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto">
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {visibleError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {visibleError}
              </span>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-[28px] p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  AI
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      AI Senior Interviewer
                    </span>

                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Evidence Grounded
                    </span>
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono">
                    Focus:{' '}
                    {currentQuestion.focus ||
                      'Technical System Proficiency'}
                  </span>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                Question{' '}
                {currentIndex + 1} of{' '}
                {totalQuestions}
              </span>
            </div>

            <div className="text-base sm:text-lg font-serif font-medium text-gray-900 leading-relaxed pt-1">
              "{currentQuestion.question}"
            </div>

            {currentQuestion.evidence && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    setShowEvidence(
                      previous =>
                        !previous
                    )
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>
                    Why am I being asked this?
                  </span>

                  {showEvidence ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showEvidence && (
                  <div className="mt-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-2 text-indigo-950">
                    <p className="font-medium">
                      {Array.isArray(
                        currentQuestion.why_asked
                      ) &&
                      currentQuestion
                        .why_asked.length
                        ? currentQuestion
                            .why_asked
                            .join('; ')
                        : 'Grounded in your resume and target role.'}
                    </p>

                    {currentQuestion
                      .evidence?.snippet && (
                      <div className="pt-2 border-t border-indigo-200/50 flex items-start gap-2 text-indigo-900">
                        <FileText className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />

                        <div>
                          <span className="font-bold text-[10px] uppercase font-mono text-indigo-700 block">
                            Matched from:{' '}
                            {currentQuestion
                              .evidence
                              .section ||
                              'Resume'}{' '}
                            (
                            {
                              currentQuestion.linked_to
                            }
                            )
                          </span>

                          <span className="italic">
                            "
                            {
                              currentQuestion
                                .evidence
                                .snippet
                            }
                            "
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!activeFeedback && (
            <div className="bg-white border border-gray-100 rounded-[28px] p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold font-mono text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  Your Response
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-gray-400">
                    {wordCount} words •{' '}
                    {userAnswer.length} chars
                  </span>

                  <button
                    type="button"
                    onClick={
                      toggleRecording
                    }
                    className={`p-1.5 rounded-full border transition-all ${
                      isRecording
                        ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900'
                    }`}
                    title={
                      isRecording
                        ? 'Stop Dictation'
                        : 'Start Voice Dictation'
                    }
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <textarea
                rows={6}
                value={
                  userAnswer
                }
                onChange={event =>
                  setCurrentAnswer(
                    event.target.value
                  )
                }
                placeholder="Structure your answer clearly. Mention key architecture choices, trade-offs, metrics, and STAR context where appropriate..."
                className="w-full p-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <span className="text-[11px] text-gray-400 font-mono">
                  {userAnswer.length <
                  30
                    ? 'Tip: Provide concrete technical specifics'
                    : 'Ready for real-time AI evaluation'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      handleSkipQuestion
                    }
                    disabled={
                      isSubmitting
                    }
                    className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Skip Question
                  </button>

                  <button
                    type="button"
                    disabled={
                      !userAnswer.trim() ||
                      isSubmitting
                    }
                    onClick={
                      handleMainAnswerSubmit
                    }
                    className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-md shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>
                          Evaluating...
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          Submit Answer
                        </span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeFeedback && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-gray-500 uppercase">
                    Your Submitted Response
                  </span>

                  <span className="text-[10px] font-mono text-gray-400">
                    {wordCount} words
                  </span>
                </div>

                <p className="text-xs text-gray-800 leading-relaxed font-sans">
                  {userAnswer}
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[28px] p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-900 font-mono uppercase">
                        AI Evaluation Breakdown
                      </h4>

                      <span className="text-[10px] text-gray-400 font-mono">
                        Performance Calibration
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-mono text-xs font-bold">
                    Score:{' '}
                    {
                      activeFeedback.score
                    }{' '}
                    / 100
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <h5 className="text-xs font-bold text-emerald-900 font-mono uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      What Went Well
                    </h5>

                    <ul className="space-y-1 text-xs text-emerald-900">
                      {activeFeedback.strengths?.map(
                        (
                          strength,
                          index
                        ) => (
                          <li
                            key={index}
                            className="flex items-start gap-1.5"
                          >
                            <span className="text-emerald-500 font-bold">
                              •
                            </span>
                            <span>
                              {strength}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                    <h5 className="text-xs font-bold text-amber-900 font-mono uppercase flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Missing Key Elements
                    </h5>

                    <ul className="space-y-1 text-xs text-amber-900">
                      {activeFeedback.missing_points?.map(
                        (
                          point,
                          index
                        ) => (
                          <li
                            key={index}
                            className="flex items-start gap-1.5"
                          >
                            <span className="text-amber-500 font-bold">
                              •
                            </span>
                            <span>
                              {point}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                {activeFeedback.ideal_answer && (
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() =>
                        setShowIdealAnswer(
                          previous =>
                            !previous
                        )
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />

                      {showIdealAnswer
                        ? 'Hide Ideal Reference Answer'
                        : 'View Ideal Reference Answer'}
                    </button>

                    {showIdealAnswer && (
                      <div className="mt-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs leading-relaxed space-y-2">
                        <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">
                          Benchmark High-Scoring Response:
                        </span>

                        <p className="text-gray-800 leading-relaxed">
                          {
                            activeFeedback.ideal_answer
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeFollowUp && (
                <div className="bg-white border-2 border-indigo-200/80 rounded-[28px] p-6 sm:p-7 shadow-sm space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      AI
                    </div>

                    <div>
                      <span className="text-xs font-bold text-indigo-950 block">
                        Interviewer Follow-Up
                      </span>

                      <span className="text-[10px] text-indigo-500 font-mono">
                        Deep-Dive Clarification
                      </span>
                    </div>
                  </div>

                  <p className="text-sm font-serif font-medium text-gray-900 leading-relaxed">
                    "{activeFollowUp.question}"
                  </p>

                  {!activeFollowUpFeedback ? (
                    <div className="space-y-3 pt-2">
                      <textarea
                        rows={3}
                        value={
                          followUpAnswer
                        }
                        onChange={event =>
                          setFollowUpAnswer(
                            event.target.value
                          )
                        }
                        placeholder="Address the follow-up question directly..."
                        className="w-full p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-sans"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={
                            !followUpAnswer.trim() ||
                            isSubmittingFollowUp
                          }
                          onClick={
                            handleFollowUpSubmit
                          }
                          className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-40"
                        >
                          {isSubmittingFollowUp
                            ? 'Evaluating...'
                            : 'Submit Follow-Up'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1.5">
                      <div className="flex items-center justify-between font-bold font-mono">
                        <span>
                          Follow-Up Evaluation
                        </span>

                        <span>
                          Score:{' '}
                          {
                            activeFollowUpFeedback.score
                          }{' '}
                          / 100
                        </span>
                      </div>

                      <p>
                        {
                          activeFollowUpFeedback
                            .strengths?.[0]
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 pb-8">
                <button
                  type="button"
                  onClick={
                    handleSkipQuestion
                  }
                  className="px-5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Skip
                </button>

                <button
                  type="button"
                  onClick={
                    handleProceedToNext
                  }
                  className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
                >
                  <span>
                    {currentIndex >=
                    totalQuestions - 1
                      ? 'Finish Interview & View Results'
                      : 'Continue to Next Question'}
                  </span>

                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!activeFeedback && (
            <div className="flex items-center justify-between pb-8">
              <button
                type="button"
                onClick={
                  handleSkipQuestion
                }
                className="px-5 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Skip Question
              </button>

              <button
                type="button"
                disabled={
                  isSubmitting
                }
                onClick={
                  handleProceedToNext
                }
                className="px-6 py-3 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-40"
              >
                <span>
                  Next Question
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Interview Progress
              </h3>

              <span className="text-xs font-mono font-bold text-indigo-600">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span>
                {answeredCount} answered
              </span>

              <span>
                {skippedCount} skipped
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
                Session Questions
              </span>

              <div className="space-y-1.5">
                {session.questions.map(
                  (
                    question,
                    index
                  ) => {
                    const key =
                      getQuestionKey(
                        question,
                        index
                      );

                    const answered =
                      Boolean(
                        feedbackByQuestion[
                          key
                        ]
                      );

                    const skipped =
                      skippedQuestions.has(
                        key
                      );

                    const current =
                      index ===
                      currentIndex;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          goToQuestion(
                            index
                          )
                        }
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between text-xs transition-all text-left ${
                          current
                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold shadow-sm'
                            : answered
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                            : skipped
                            ? 'bg-amber-50/60 border-amber-100 text-amber-900'
                            : 'bg-gray-50/60 border-gray-100 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] shrink-0 font-bold">
                            Q
                            {index +
                              1}
                          </span>

                          <span className="truncate text-xs">
                            {question.skill_tag ||
                              question.linked_to ||
                              `Question ${
                                index +
                                1
                              }`}
                          </span>
                        </div>

                        <div className="shrink-0">
                          {answered ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : skipped ? (
                            <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          ) : current ? (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping inline-block" />
                          ) : (
                            <span className="text-[10px] font-mono text-gray-400">
                              Open
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[28px] p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Candidate Scratchpad
              </h3>

              <span className="text-[10px] font-mono text-gray-400">
                Private Notes
              </span>
            </div>

            <textarea
              rows={9}
              value={
                scratchpadNotes
              }
              onChange={event =>
                handleScratchpadChange(
                  event.target.value
                )
              }
              placeholder="Use this space for notes, frameworks, formulas, or quick system architecture calculations..."
              className="w-full p-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-mono leading-relaxed resize-none"
            />

            <span className="text-[10px] text-gray-400 font-mono block">
              Notes are preserved throughout this interview session.
            </span>
          </div>
        </div>
      </div>

      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <StopCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-gray-900 font-serif">
                End this interview?
              </h3>

              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to end this interview? Your responses and evaluated performance will be finalized and saved for your review.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setShowExitModal(
                    false
                  )
                }
                className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Continue Interview
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmEndInterview
                }
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all shadow-md shadow-rose-100"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </InterviewShell>
  );
};