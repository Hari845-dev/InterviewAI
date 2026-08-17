import React, {
  useEffect,
  useState,
} from 'react';

import {
  useParams,
  useNavigate,
} from 'react-router-dom';

import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { sessionApi } from '../api';

import {
  SessionResponse,
  SessionStatsResponse,
  SubmittedResponseRecord,
  SessionQuestion,
} from '../types';

interface QuestionResult {
  question: SessionQuestion;
  response: SubmittedResponseRecord | null;
  attempted: boolean;
  score: number | null;
}

export const InterviewCompleteView: React.FC =
  () => {
    const {
      sessionId,
    } = useParams<{
      sessionId: string;
    }>();

    const navigate =
      useNavigate();

    const [
      session,
      setSession,
    ] = useState<SessionResponse | null>(
      null
    );

    const [
      stats,
      setStats,
    ] = useState<SessionStatsResponse | null>(
      null
    );

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      loadError,
      setLoadError,
    ] =
      useState<string | null>(
        null
      );

    const [
      expandedQuestionIdx,
      setExpandedQuestionIdx,
    ] =
      useState<number | null>(
        0
      );

    useEffect(() => {
      if (!sessionId) {
        navigate(
          '/app/dashboard',
          {
            replace: true,
          }
        );

        return;
      }

      let cancelled = false;

      const loadSession =
        async () => {
          setIsLoading(true);
          setLoadError(null);

          try {
            const [
              sessionData,
              statsData,
            ] =
              await Promise.all([
                sessionApi.getSession(
                  sessionId
                ),
                sessionApi.getSessionStats(
                  sessionId
                ),
              ]);

            if (cancelled) {
              return;
            }

            setSession(
              sessionData
            );

            setStats(
              statsData
            );
          } catch (err) {
            if (cancelled) {
              return;
            }

            const message =
              err instanceof Error
                ? err.message
                : 'Could not load the completed interview record.';

            setLoadError(
              message
            );

            try {
              const sessionData =
                await sessionApi.getSession(
                  sessionId
                );

              if (!cancelled) {
                setSession(
                  sessionData
                );
              }
            } catch {
              if (!cancelled) {
                setSession(null);
              }
            }
          } finally {
            if (!cancelled) {
              setIsLoading(false);
            }
          }
        };

      loadSession();

      return () => {
        cancelled = true;
      };
    }, [
      sessionId,
      navigate,
    ]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#FBFBFA] text-[#121212] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />

            <p className="text-sm text-gray-500 font-mono">
              Compiling interview performance telemetry...
            </p>
          </div>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center">

          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 font-serif mb-2">
            Session Record Not Found
          </h2>

          <p className="text-sm text-gray-600 mb-6 max-w-md">
            {loadError ||
              'Could not load the completed interview record.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/dashboard'
              )
            }
            className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
          >
            Go to Dashboard
          </button>

        </div>
      );
    }

    const responses =
      session.responses || [];

    const responseMap =
      new Map<
        string,
        SubmittedResponseRecord
      >();

    responses.forEach(
      response => {
        if (
          response.question_id
        ) {
          responseMap.set(
            response.question_id,
            response
          );
        }
      }
    );

    const questionResults:
      QuestionResult[] =
      (session.questions || []).map(
        question => {
          const questionId =
            question.question_id ||
            question.id ||
            '';

          const response =
            questionId
              ? responseMap.get(
                  questionId
                ) || null
              : null;

          const rawScore =
            response?.score ??
            response?.feedback?.score;

          const numericScore =
            Number(rawScore);

          return {
            question,
            response,
            attempted:
              Boolean(response),
            score:
              response &&
              Number.isFinite(
                numericScore
              )
                ? numericScore
                : null,
          };
        }
      );

    const completedCount =
      questionResults.filter(
        item =>
          item.attempted
      ).length;

    const totalCount =
      questionResults.length;

    const skippedCount =
      Math.max(
        totalCount -
          completedCount,
        0
      );

    const scoredValues =
      questionResults
        .map(
          item =>
            item.score
        )
        .filter(
          (
            value
          ): value is number =>
            value !== null &&
            Number.isFinite(
              value
            )
        );

    const derivedAverage =
      scoredValues.length > 0
        ? scoredValues.reduce(
            (
              sum,
              value
            ) =>
              sum + value,
            0
          ) /
          scoredValues.length
        : 0;

    const backendOverall =
      Number(
        session.overall_score
      );

    const averageScore =
      session.overall_score !==
        null &&
      session.overall_score !==
        undefined &&
      Number.isFinite(
        backendOverall
      )
        ? backendOverall
        : derivedAverage;

    const displayAverage =
      stats?.average_score ??
      averageScore;

    const technicalScore =
      stats?.technical_score ??
      null;

    const hrScore =
      stats?.hr_score ??
      null;

    const aptitudeScore =
      stats?.aptitude_score ??
      null;

    const accuracyScore =
      stats?.accuracy ??
      null;

    const strongSkills =
      stats?.strong_skills ??
      [];

    const weakSkills =
      stats?.weak_skills ??
      [];

    const completionPercentage =
      totalCount > 0
        ? (
            completedCount /
            totalCount
          ) *
          100
        : 0;

    const formatScore = (
      value:
        | number
        | null
        | undefined,
      decimals = 2
    ): string => {
      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
          Number(value)
        )
      ) {
        return '—';
      }

      return Number(value)
        .toFixed(decimals)
        .replace(
          /(\.\d*?[1-9])0+$|\.0+$/,
          '$1'
        );
    };

    const getSuggestedAnswer =
      (
        question: SessionQuestion
      ): string => {
        const answer =
          question.suggested_answer ||
          question.expected_answer ||
          '';

        return answer.trim();
      };

    return (
      <div className="min-h-screen bg-[#FBFBFA] text-[#121212] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

        <header className="w-full bg-[#121212] text-white border-b border-white/10 px-4 sm:px-8 py-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm">
              I
            </div>

            <span className="font-semibold text-sm sm:text-base tracking-tight font-serif text-white">
              InterviewAI
            </span>

            <div className="hidden sm:block h-4 w-px bg-white/20" />

            <span className="hidden sm:inline text-xs text-white/60 font-mono">
              Completed Interview Performance Report
            </span>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/dashboard'
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            <span>
              Exit to Dashboard
            </span>

            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">

          <div className="text-center space-y-2">

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold uppercase tracking-wider">

              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

              <span>
                Interview Complete
              </span>

            </div>

            <h1 className="text-2xl sm:text-4xl font-bold font-serif text-gray-900 tracking-tight">
              Here's how your interview went.
            </h1>

            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
              Comprehensive evaluation grounded against your verified experience, technical depth, and response completeness.
            </p>

            {loadError && (
              <p className="text-xs text-amber-700 mt-2">
                Some detailed statistics could not be loaded. Showing the available interview data.
              </p>
            )}

          </div>

          <div className="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">

              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 text-center">

                <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 tracking-wider">
                  Overall Score
                </span>

                <div className="text-4xl sm:text-5xl font-bold font-serif text-indigo-950 mt-1">

                  {formatScore(
                    displayAverage
                  )}

                  <span className="text-lg sm:text-xl text-indigo-400 font-sans font-normal">
                    /100
                  </span>

                </div>

                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-bold mt-2">

                  {displayAverage >= 85
                    ? 'Excellent Performance'
                    : displayAverage >= 70
                    ? 'Strong Performance'
                    : displayAverage >= 50
                    ? 'Developing Performance'
                    : 'Needs Improvement'}

                </span>

              </div>

              <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Questions Attempted
                  </span>

                  <span className="text-xl font-bold text-gray-900 font-serif">
                    {completedCount} / {totalCount}
                  </span>

                  <span className="text-[10px] font-mono text-gray-500 block">
                    {formatScore(
                      completionPercentage,
                      1
                    )}
                    % Completed
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Not Attempted
                  </span>

                  <span className="text-xl font-bold text-amber-600 font-serif">
                    {skippedCount}
                  </span>

                  <span className="text-[10px] font-mono text-amber-700 block">
                    Questions skipped
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Technical Depth
                  </span>

                  <span className="text-xl font-bold text-indigo-600 font-serif">
                    {formatScore(
                      technicalScore
                    )}
                    {technicalScore !==
                      null &&
                      '%'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Behavioral / STAR
                  </span>

                  <span className="text-xl font-bold text-gray-900 font-serif">
                    {formatScore(
                      hrScore
                    )}
                    {hrScore !==
                      null &&
                      '%'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Aptitude & Logic
                  </span>

                  <span className="text-xl font-bold text-green-600 font-serif">
                    {formatScore(
                      aptitudeScore
                    )}
                    {aptitudeScore !==
                      null &&
                      '%'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Response Accuracy
                  </span>

                  <span className="text-xl font-bold text-emerald-600 font-serif">
                    {formatScore(
                      accuracyScore
                    )}
                    {accuracyScore !==
                      null &&
                      '%'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Session Type
                  </span>

                  <span className="text-sm font-bold text-gray-900 truncate block">
                    {session.title ||
                      'Interview Session'}
                  </span>

                  <span className="text-[10px] font-mono text-gray-500 block">
                    {session.role ||
                      'General Interview'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                    Status
                  </span>

                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                    {String(
                      session.status ||
                        ''
                    ).toUpperCase() ||
                      'COMPLETED'}
                  </span>

                  <span className="text-[10px] font-mono text-gray-400 block">
                    Saved in History
                  </span>
                </div>

              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">

                <h4 className="text-xs font-bold text-emerald-950 font-mono uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  What You Did Well
                </h4>

                {strongSkills.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-emerald-900">
                    {strongSkills.map(
                      (
                        skill,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                          className="flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>
                            {skill}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-800/60">
                    No specific strengths were recorded for this session.
                  </p>
                )}

              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">

                <h4 className="text-xs font-bold text-amber-950 font-mono uppercase flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Areas to Reinforce
                </h4>

                {weakSkills.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-amber-900">
                    {weakSkills.map(
                      (
                        skill,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                          className="flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                          <span>
                            {skill}
                          </span>
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-800/60">
                    No specific improvement areas were recorded for this session.
                  </p>
                )}

              </div>

            </div>

          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between px-1">

              <h2 className="text-lg font-bold font-serif text-gray-900">
                Questions & Evaluated Responses
              </h2>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-600">
                  {completedCount} Attempted
                </span>

                <span className="text-gray-300">
                  •
                </span>

                <span className="text-amber-600">
                  {skippedCount} Not Attempted
                </span>
              </div>

            </div>

            {questionResults.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-[24px] p-10 text-center">
                <p className="text-sm font-semibold text-gray-500">
                  No interview questions were stored for this session.
                </p>
              </div>
            ) : (
              <div className="space-y-4">

                {questionResults.map(
                  (
                    item,
                    index
                  ) => {
                    const {
                      question,
                      response,
                      attempted,
                      score,
                    } = item;

                    const isExpanded =
                      expandedQuestionIdx ===
                      index;

                    const suggestedAnswer =
                      getSuggestedAnswer(
                        question
                      );

                    return (
                      <div
                        key={
                          question.question_id ||
                          question.id ||
                          `question-${index}`
                        }
                        className={`bg-white border rounded-[24px] overflow-hidden shadow-xs transition-all ${
                          attempted
                            ? 'border-gray-200/80'
                            : 'border-amber-200'
                        }`}
                      >

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionIdx(
                              isExpanded
                                ? null
                                : index
                            )
                          }
                          className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 hover:bg-gray-50/60 transition-colors"
                        >

                          <div className="flex items-start gap-3 min-w-0">

                            <span
                              className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                attempted
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              Q{index + 1}
                            </span>

                            <div className="min-w-0">

                              <div className="flex items-center gap-2 mb-1 flex-wrap">

                                <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                  {question.skill_tag ||
                                    question.category ||
                                    question.type ||
                                    'Technical'}
                                </span>

                                {attempted ? (
                                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    Attempted
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                    Not Attempted
                                  </span>
                                )}

                              </div>

                              <h3 className="text-sm font-serif font-bold text-gray-900 leading-snug">
                                {question.question}
                              </h3>

                            </div>

                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            {attempted ? (
                              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                                {score !==
                                null
                                  ? `${formatScore(
                                      score
                                    )}/100`
                                  : 'Evaluated'}
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                                Not Attempted
                              </span>
                            )}

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}

                          </div>

                        </button>

                        {isExpanded && (
                          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-100 space-y-4 bg-[#FAFAFA]">

                            <div className="space-y-1.5">

                              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                                Question:
                              </span>

                              <div className="p-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 leading-relaxed">
                                {question.question}
                              </div>

                            </div>

                            {attempted &&
                            response ? (
                              <>
                                <div className="space-y-1.5">

                                  <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                                    Your Submitted Response:
                                  </span>

                                  <div className="p-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {response.user_answer ||
                                      'No answer text was recorded.'}
                                  </div>

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">

                                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                                      What Went Well:
                                    </span>

                                    {response.feedback?.strengths?.length ? (
                                      <ul className="text-xs text-emerald-900 space-y-1">
                                        {response.feedback.strengths.map(
                                          (
                                            strength,
                                            strengthIndex
                                          ) => (
                                            <li
                                              key={
                                                strengthIndex
                                              }
                                              className="flex items-start gap-1.5"
                                            >
                                              <span className="text-emerald-500 font-bold">
                                                •
                                              </span>

                                              <span>
                                                {
                                                  strength
                                                }
                                              </span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-emerald-800/60">
                                        No specific strengths recorded.
                                      </p>
                                    )}

                                  </div>

                                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 space-y-1">

                                    <span className="text-[10px] font-mono uppercase font-bold text-amber-800 block">
                                      Missing Key Points:
                                    </span>

                                    {response.feedback?.missing_points?.length ? (
                                      <ul className="text-xs text-amber-900 space-y-1">
                                        {response.feedback.missing_points.map(
                                          (
                                            point,
                                            pointIndex
                                          ) => (
                                            <li
                                              key={
                                                pointIndex
                                              }
                                              className="flex items-start gap-1.5"
                                            >
                                              <span className="text-amber-500 font-bold">
                                                •
                                              </span>

                                              <span>
                                                {
                                                  point
                                                }
                                              </span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-amber-800/60">
                                        No missing points recorded.
                                      </p>
                                    )}

                                  </div>

                                </div>

                                {response.feedback?.weaknesses?.length ? (
                                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 space-y-1">

                                    <span className="text-[10px] font-mono uppercase font-bold text-rose-800 block">
                                      Areas to Improve:
                                    </span>

                                    <ul className="text-xs text-rose-900 space-y-1">

                                      {response.feedback.weaknesses.map(
                                        (
                                          weakness,
                                          weaknessIndex
                                        ) => (
                                          <li
                                            key={
                                              weaknessIndex
                                            }
                                            className="flex items-start gap-1.5"
                                          >
                                            <span className="text-rose-500 font-bold">
                                              •
                                            </span>

                                            <span>
                                              {
                                                weakness
                                              }
                                            </span>
                                          </li>
                                        )
                                      )}

                                    </ul>

                                  </div>
                                ) : null}

                                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs leading-relaxed space-y-2 border border-slate-800">

                                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                                    Ideal Benchmark Reference
                                  </span>

                                  <p>
                                    {response.feedback?.ideal_answer ||
                                      suggestedAnswer ||
                                      'No benchmark answer is available for this question.'}
                                  </p>

                                </div>
                              </>
                            ) : (
                              <>
                                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">

                                  <div className="flex items-center gap-2">

                                    <AlertCircle className="w-4 h-4 text-amber-600" />

                                    <span className="text-xs font-bold text-amber-900">
                                      Not Attempted
                                    </span>

                                  </div>

                                  <p className="text-xs text-amber-800 mt-2">
                                    The candidate ended the interview before submitting an answer to this question.
                                  </p>

                                </div>

                                <div className="space-y-1.5">

                                  <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block">
                                    Submitted Answer
                                  </span>

                                  <div className="p-4 rounded-xl bg-white border border-amber-100 text-xs text-gray-400 italic">
                                    No answer submitted
                                  </div>

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                  <div className="p-4 rounded-xl bg-white border border-gray-200">

                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                                      What Went Well
                                    </span>

                                    <p className="text-xs text-gray-400 mt-1">
                                      Not evaluated
                                    </p>

                                  </div>

                                  <div className="p-4 rounded-xl bg-white border border-gray-200">

                                    <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                                      Missing Key Points
                                    </span>

                                    <p className="text-xs text-gray-400 mt-1">
                                      Not evaluated
                                    </p>

                                  </div>

                                </div>

                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">

                                  <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 block">
                                    Suggested / Ideal Benchmark Answer
                                  </span>

                                  <p className="text-xs text-indigo-950 mt-2 leading-relaxed whitespace-pre-wrap">
                                    {suggestedAnswer ||
                                      'No suggested answer is available for this question.'}
                                  </p>

                                </div>
                              </>
                            )}

                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          <div className="pt-6 pb-12 flex flex-col sm:flex-row items-center justify-center gap-4">

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/app/dashboard'
                )
              }
              className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              <span>
                Go to Dashboard
              </span>

              <ArrowRight className="w-4 h-4" />
            </button>

          </div>

        </main>

      </div>
    );
  };