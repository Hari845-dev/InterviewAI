import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Award,
  ArrowRight,
  BookOpen,
  Edit3,
  Layers,
  StopCircle,
  FileText
} from 'lucide-react';
import { InterviewShell } from '../components/layout/InterviewShell';
import { sessionApi } from '../api';
import { SessionResponse, InterviewQuestion, AnswerFeedback } from '../types';

export const ActiveInterviewSessionView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Active question and conversation state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeFeedback, setActiveFeedback] = useState<AnswerFeedback | null>(null);
  const [activeFollowUp, setActiveFollowUp] = useState<InterviewQuestion | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string>('');
  const [followUpFeedback, setFollowUpFeedback] = useState<AnswerFeedback | null>(null);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState<boolean>(false);

  // Utility states
  const [showEvidence, setShowEvidence] = useState<boolean>(false);
  const [showIdealAnswer, setShowIdealAnswer] = useState<boolean>(false);
  const [scratchpadNotes, setScratchpadNotes] = useState<string>(() => {
    return sessionStorage.getItem(`scratchpad_${sessionId}`) || '';
  });
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load session
  useEffect(() => {
    if (!sessionId) {
      navigate('/app/interview');
      return;
    }

    const fetchSession = async () => {
      setIsLoading(true);
      try {
        const data = await sessionApi.getSession(sessionId);
        setSession(data);

        // If already completed, direct to review
        if (data.status === 'completed') {
          navigate(`/interview/session/${sessionId}/complete`, { replace: true });
          return;
        }

        setCurrentIndex(data.current_question_index || 0);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load interview session.';

        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Save scratchpad
  const handleScratchpadChange = (val: string) => {
    setScratchpadNotes(val);

    if (sessionId) {
      sessionStorage.setItem(
        `scratchpad_${sessionId}`,
        val
      );
    }
  };

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        'Your interview is currently in progress. Are you sure you want to exit?';
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

  // Scroll to bottom when feedback appears
  useEffect(() => {
    if (
      activeFeedback ||
      activeFollowUp ||
      followUpFeedback
    ) {
      chatBottomRef.current?.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [
    activeFeedback,
    activeFollowUp,
    followUpFeedback
  ]);

  // Voice recording toggle (simulated / Web Speech API)
  const toggleRecording = () => {
    if (!isRecording) {
      if (
        'webkitSpeechRecognition' in window ||
        'SpeechRecognition' in window
      ) {
        try {
          const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

          const recognition =
            new SpeechRecognition();

          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            let transcript = '';

            for (
              let i = event.resultIndex;
              i < event.results.length;
              ++i
            ) {
              transcript +=
                event.results[i][0].transcript;
            }

            if (transcript) {
              setUserAnswer(
                prev => prev + ' ' + transcript
              );
            }
          };

          recognition.start();
          (window as any)._activeRecognition =
            recognition;
        } catch {
          // fallback simulated
        }
      }

      setIsRecording(true);
    } else {
      if (
        (window as any)._activeRecognition
      ) {
        (window as any)._activeRecognition.stop();
      }

      setIsRecording(false);
    }
  };

  const handleMainAnswerSubmit = async () => {
    if (
      !userAnswer.trim() ||
      !session ||
      !sessionId
    ) {
      return;
    }

    const currentQ =
      session.questions[currentIndex];

    if (!currentQ) {
      return;
    }

    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      const res =
        await sessionApi.submitAnswer(
          sessionId,
          {
            question_id:
              currentQ.question_id ||
              currentQ.id ||
              `q_${currentIndex}`,
            user_answer:
              userAnswer.trim()
          }
        );

      setActiveFeedback(
        res.feedback
      );

      if (
        res.follow_up_question
      ) {
        setActiveFollowUp(
          res.follow_up_question
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Answer submission failed. Please try again.';

      setSubmissionError(
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (
      !followUpAnswer.trim() ||
      !activeFollowUp ||
      !sessionId
    ) {
      return;
    }

    setFollowUpError(null);
    setIsSubmittingFollowUp(true);

    try {
      const res =
        await sessionApi.submitAnswer(
          sessionId,
          {
            question_id:
              activeFollowUp.question_id ||
              activeFollowUp.id ||
              `fu_${currentIndex}`,
            user_answer:
              followUpAnswer.trim()
          }
        );

      setFollowUpFeedback(
        res.feedback
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Follow-up answer failed to submit. Please try again.';

      setFollowUpError(
        message
      );
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleProceedToNext = async () => {
    if (
      !session ||
      !sessionId
    ) {
      return;
    }

    const isLastQuestion =
      currentIndex >=
      session.questions.length - 1;

    try {
      if (isLastQuestion) {
        // Finalize and navigate to complete review
        await sessionApi.finalizeSession(
          sessionId
        );

        navigate(
          `/interview/session/${sessionId}/complete`
        );
      } else {
        setCurrentIndex(
          prev => prev + 1
        );

        setUserAnswer('');
        setActiveFeedback(null);
        setActiveFollowUp(null);
        setFollowUpAnswer('');
        setFollowUpFeedback(null);
        setShowEvidence(false);
        setShowIdealAnswer(false);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to continue to the next step. Please try again.';

      setError(message);
    }
  };

  const handleConfirmEndInterview = async () => {
    if (sessionId) {
      try {
        await sessionApi.finalizeSession(
          sessionId
        );

        setShowExitModal(false);

        navigate(
          `/interview/session/${sessionId}/complete`
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to finalize this interview. Please try again.';

        setError(message);
        setShowExitModal(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />

        <p className="text-sm text-gray-400 font-mono">
          Calibrating interview environment...
        </p>
      </div>
    );
  }

  if (
    error ||
    !session ||
    !session.questions ||
    session.questions.length === 0
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
          onClick={() =>
            navigate('/app/interview')
          }
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
        >
          Return to Mock Interview Setup
        </button>
      </div>
    );
  }

  const currentQ =
    session.questions[currentIndex];

  const totalQuestions =
    session.questions.length;

  const progressPercent =
    Math.round(
      ((currentIndex + 1) /
        totalQuestions) *
        100
    );

  const wordCount =
    userAnswer
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const visibleError =
    submissionError ||
    followUpError ||
    error;

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
        setShowExitModal(true)
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto">

        {/* MAIN CONVERSATION / ACTIVE QUESTION AREA (Cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">

          {/* AI Interviewer Question Card */}
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 sm:p-7 shadow-sm space-y-5">

            {/* AI Persona Header */}
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
                    {currentQ.focus ||
                      'Technical System Proficiency'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">

                <span className="text-xs font-mono font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                  Question{' '}
                  {currentIndex + 1}{' '}
                  of{' '}
                  {totalQuestions}
                </span>

              </div>
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-serif font-medium text-gray-900 leading-relaxed pt-1">
              "{currentQ.question}"
            </div>

            {/* Why Asked / Resume Evidence Accordion */}
            {currentQ.evidence && (
              <div className="pt-2 border-t border-gray-100">

                <button
                  type="button"
                  onClick={() =>
                    setShowEvidence(
                      !showEvidence
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
                      {currentQ.why_asked.join('; ') ||
                        'Grounded in your resume and target role.'}
                    </p>

                    {currentQ.evidence.snippet && (
                      <div className="pt-2 border-t border-indigo-200/50 flex items-start gap-2 text-indigo-900">

                        <FileText className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />

                        <div>

                          <span className="font-bold text-[10px] uppercase font-mono text-indigo-700 block">
                            Matched from:{' '}
                            {currentQ.evidence.section ||
                              'Resume'}{' '}
                            ({currentQ.linked_to})
                          </span>

                          <span className="italic">
                            "{currentQ.evidence.snippet}"
                          </span>

                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Candidate Response Input Card (Before Submission) */}
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
                value={userAnswer}
                onChange={e =>
                  setUserAnswer(
                    e.target.value
                  )
                }
                placeholder="Structure your answer clearly. Mention key architecture choices, trade-offs, metrics, and STAR context where appropriate..."
                className="w-full p-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">

                <div className="text-[11px] text-gray-400 font-mono">

                  {userAnswer.length <
                  30 ? (
                    <span className="text-amber-600 font-medium">
                      Tip: Provide concrete technical specifics
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">
                      Ready for real-time AI evaluation
                    </span>
                  )}

                </div>

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
                        Evaluating Response...
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
          )}

          {/* AI Feedback Card (After Main Answer Submission) */}
          {activeFeedback && (
            <div className="space-y-6 animate-fade-in">

              {/* Submitted Answer Record */}
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

              {/* Evaluation Card */}
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
                    <span>
                      Score:{' '}
                      {activeFeedback.score}{' '}
                      / 100
                    </span>
                  </div>

                </div>

                {/* Strengths & Missing Points Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">

                  {/* Strengths */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">

                    <h5 className="text-xs font-bold text-emerald-900 font-mono uppercase flex items-center gap-1.5">

                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

                      What Went Well

                    </h5>

                    <ul className="space-y-1 text-xs text-emerald-900">

                      {activeFeedback.strengths.map(
                        (str, i) => (

                          <li
                            key={i}
                            className="flex items-start gap-1.5"
                          >

                            <span className="text-emerald-500 font-bold">
                              •
                            </span>

                            <span>
                              {str}
                            </span>

                          </li>

                        )
                      )}

                    </ul>

                  </div>

                  {/* Missing Points */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">

                    <h5 className="text-xs font-bold text-amber-900 font-mono uppercase flex items-center gap-1.5">

                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />

                      Missing Key Elements

                    </h5>

                    <ul className="space-y-1 text-xs text-amber-900">

                      {activeFeedback.missing_points.map(
                        (pt, i) => (

                          <li
                            key={i}
                            className="flex items-start gap-1.5"
                          >

                            <span className="text-amber-500 font-bold">
                              •
                            </span>

                            <span>
                              {pt}
                            </span>

                          </li>

                        )
                      )}

                    </ul>

                  </div>

                </div>

                {/* Ideal Answer Toggle */}
                {activeFeedback.ideal_answer && (
                  <div className="pt-2 border-t border-gray-100">

                    <button
                      type="button"
                      onClick={() =>
                        setShowIdealAnswer(
                          !showIdealAnswer
                        )
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >

                      <BookOpen className="w-3.5 h-3.5" />

                      <span>
                        {showIdealAnswer
                          ? 'Hide Ideal Reference Answer'
                          : 'View Ideal Reference Answer'}
                      </span>

                    </button>

                    {showIdealAnswer && (
                      <div className="mt-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-200 text-xs leading-relaxed font-sans space-y-2">

                        <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">
                          Benchmark High-Scoring Response:
                        </span>

                        <p className="text-gray-800 leading-relaxed">
                          {activeFeedback.ideal_answer}
                        </p>

                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* Follow-Up Question Interaction (If Generated) */}
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

                  {!followUpFeedback ? (
                    <div className="space-y-3 pt-2">

                      <textarea
                        rows={3}
                        value={
                          followUpAnswer
                        }
                        onChange={e =>
                          setFollowUpAnswer(
                            e.target.value
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
                          {followUpFeedback.score}{' '}
                          / 100
                        </span>

                      </div>

                      <p>
                        {followUpFeedback.strengths[0] ||
                          'Follow-up addressed the architecture edge cases successfully.'}
                      </p>

                    </div>
                  )}

                </div>
              )}

              {/* Action Button: Continue to Next Question / Finish */}
              <div className="flex items-center justify-end pt-2 pb-8">

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

          <div ref={chatBottomRef} />

        </div>

        {/* RIGHT-SIDE UTILITY PANEL (Cols 9-12): Progress & Scratchpad */}
        <div className="lg:col-span-4 space-y-6">

          {/* Progress Card */}
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

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">

              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`
                }}
              />

            </div>

            {/* Question Queue Indicator (Strictly visual indicator, NOT navigation) */}
            <div className="space-y-2 pt-1">

              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
                Session Questions
              </span>

              <div className="space-y-1.5">

                {session.questions.map(
                  (q, idx) => {

                    const isDone =
                      idx <
                        currentIndex ||
                      (
                        idx ===
                        currentIndex &&
                        activeFeedback !==
                          null
                      );

                    const isCurrent =
                      idx ===
                      currentIndex;

                    const isUpcoming =
                      idx >
                      currentIndex;

                    return (
                      <div
                        key={
                          q.id ||
                          idx
                        }
                        className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          isCurrent
                            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold shadow-xs'
                            : isDone
                            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                            : 'bg-gray-50/60 border-gray-100 text-gray-400'
                        }`}
                      >

                        <div className="flex items-center gap-2 min-w-0">

                          <span className="font-mono text-[10px] shrink-0 font-bold">
                            Q{idx + 1}
                          </span>

                          <span className="truncate text-xs">
                            {q.skill_tag ||
                              q.linked_to ||
                              `Question ${idx + 1}`}
                          </span>

                        </div>

                        <div className="shrink-0">

                          {isDone ? (

                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

                          ) : isCurrent ? (

                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />

                          ) : (

                            <span className="text-[10px] font-mono text-gray-400">
                              Upcoming
                            </span>

                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </div>

          {/* Candidate Scratchpad */}
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
              onChange={e =>
                handleScratchpadChange(
                  e.target.value
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

      {/* End Interview Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">

          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 animate-scale-up">

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