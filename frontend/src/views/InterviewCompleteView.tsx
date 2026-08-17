import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '../types';

export const InterviewCompleteView: React.FC = () => {
  const { sessionId } =
    useParams<{ sessionId: string }>();

  const navigate = useNavigate();

  const [session, setSession] =
    useState<SessionResponse | null>(null);

  const [stats, setStats] =
    useState<SessionStatsResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [expandedQuestionIdx, setExpandedQuestionIdx] =
    useState<number | null>(0);

  /* =========================================================
     LOAD SESSION + REAL SESSION STATISTICS
     ========================================================= */

  useEffect(() => {
    if (!sessionId) {
      navigate('/app/dashboard');
      return;
    }

    const loadSession = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        /*
         * Load the session and its calculated statistics
         * independently, but in parallel.
         *
         * The session contains:
         * - questions
         * - submitted answers
         * - overall score
         *
         * The stats endpoint contains:
         * - average score
         * - technical score
         * - HR score
         * - aptitude score
         * - accuracy
         * - generation metrics
         */
        const [
          sessionData,
          statsData,
        ] = await Promise.all([
          sessionApi.getSession(
            sessionId
          ),
          sessionApi.getSessionStats(
            sessionId
          ),
        ]);

        setSession(
          sessionData
        );

        setStats(
          statsData
        );

      } catch (err) {

        const message =
          err instanceof Error
            ? err.message
            : 'Could not load the completed interview record.';

        setLoadError(
          message
        );

        /*
         * If the statistics endpoint fails but the session
         * itself can still be loaded, try to preserve the
         * session view.
         */
        try {

          const sessionData =
            await sessionApi.getSession(
              sessionId
            );

          setSession(
            sessionData
          );

        } catch {
          setSession(null);
        }

      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId, navigate]);

  /* =========================================================
     LOADING STATE
     ========================================================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center space-y-4">

        <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />

        <p className="text-sm text-gray-400 font-mono">
          Compiling interview performance telemetry...
        </p>

      </div>
    );
  }

  /* =========================================================
     ERROR / SESSION NOT FOUND
     ========================================================= */

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center">

        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 font-serif mb-2">
          Session Record Not Found
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          {loadError ||
            'Could not load the completed interview record.'}
        </p>

        <button
          onClick={() =>
            navigate('/app/dashboard')
          }
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all"
        >
          Go to Dashboard
        </button>

      </div>
    );
  }

  /* =========================================================
     REAL RESPONSES
     ========================================================= */

  const responses =
    session.responses || [];

  /*
   * Only actual submitted responses are used.
   * No fabricated fallback answers.
   */
  const scored = responses
    .map((response) =>
      Number(
        response.score ??
          response.feedback?.score
      )
    )
    .filter(
      (value) =>
        Number.isFinite(value)
    );

  /*
   * Overall score:
   *
   * Prefer the backend's saved session score.
   * If unavailable, derive it from actual responses.
   */
  const backendOverall =
    Number(
      session.overall_score
    );

  const derivedAverage =
    scored.length > 0
      ? scored.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        scored.length
      : 0;

  const averageScore =
    Number.isFinite(
      backendOverall
    ) &&
    session.overall_score !==
      null &&
    session.overall_score !==
      undefined
      ? backendOverall
      : derivedAverage;

  /*
   * IMPORTANT:
   *
   * Use the REAL backend stats whenever available.
   *
   * We only create a minimal fallback if the stats request
   * could not be loaded.
   */
  const effectiveStats:
    | SessionStatsResponse
    | null =
    stats || null;

  /*
   * If stats could not be loaded, calculate only a safe
   * overall fallback from actual responses.
   *
   * We intentionally DO NOT pretend that technical,
   * HR, or aptitude scores equal the overall score.
   */
  const displayAverage =
    effectiveStats?.average_score ??
    averageScore;

  const technicalScore =
    effectiveStats?.technical_score ??
    null;

  const hrScore =
    effectiveStats?.hr_score ??
    null;

  const aptitudeScore =
    effectiveStats?.aptitude_score ??
    null;

  const accuracyScore =
    effectiveStats?.accuracy ??
    null;

  const strongSkills =
    effectiveStats?.strong_skills ??
    [];

  const weakSkills =
    effectiveStats?.weak_skills ??
    [];

  /* =========================================================
     NUMBER FORMATTING
     ========================================================= */

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

    const numericValue =
      Number(value);

    /*
     * 25.666666666 → 25.67
     * 43.250000000 → 43.25
     * 84.000000000 → 84
     */
    return numericValue
      .toFixed(decimals)
      .replace(
        /(\.\d*?[1-9])0+$|\.0+$/,
        '$1'
      );
  };

  /* =========================================================
     QUESTION COUNTS
     ========================================================= */

  const completedCount =
    responses.length;

  const totalCount =
    Number(
      session.total_questions ||
        session.questions.length ||
        0
    );

  const completionPercentage =
    totalCount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (completedCount /
              totalCount) *
              100
          )
        )
      : 0;

  /* =========================================================
     QUESTION DATA
     ========================================================= */

  const questionRows =
    responses.length > 0
      ? responses
      : [];

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#121212] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* =====================================================
          TOP HEADER
          ===================================================== */}

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

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">

        {/* ===================================================
            HERO
            =================================================== */}

        <div className="text-center space-y-2">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold uppercase tracking-wider mb-1">

            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

            <span>
              Interview Complete
            </span>

          </div>

          <h1 className="text-2xl sm:text-4xl font-bold font-serif text-gray-900 tracking-tight">
            Here's how your interview went.
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto font-sans">
            Comprehensive evaluation grounded against your verified experience, technical depth, and response completeness.
          </p>

          {loadError && (
            <p className="text-xs text-amber-700 mt-2">
              Some detailed statistics could not be loaded. Showing the available interview data.
            </p>
          )}

        </div>

        {/* ===================================================
            PRIMARY SCORE OVERVIEW
            =================================================== */}

        <div className="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">

            {/* OVERALL SCORE */}

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

            {/* SUB SCORES */}

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">

              {/* QUESTIONS */}

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">

                <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                  Questions Attempted
                </span>

                <span className="text-xl font-bold text-gray-900 font-serif">

                  {completedCount}{' '}
                  /{' '}
                  {totalCount}

                </span>

                <span className="text-[10px] font-mono text-gray-500 block">

                  {formatScore(
                    completionPercentage,
                    1
                  )}
                  % Completed

                </span>

              </div>

              {/* TECHNICAL */}

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

                <span className="text-[10px] font-mono text-indigo-700 block">
                  Architecture Verified
                </span>

              </div>

              {/* BEHAVIORAL */}

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

                <span className="text-[10px] font-mono text-gray-500 block">
                  Structured Context
                </span>

              </div>

              {/* APTITUDE */}

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

                <span className="text-[10px] font-mono text-green-700 block">
                  Logic Evaluation
                </span>

              </div>

              {/* ACCURACY */}

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

                <span className="text-[10px] font-mono text-emerald-700 block">
                  Precision Grounded
                </span>

              </div>

              {/* SESSION TYPE */}

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">

                <span className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
                  Session Type
                </span>

                <span className="text-sm font-bold text-gray-900 font-sans truncate block">
                  {session.title ||
                    'Interview Session'}
                </span>

                <span className="text-[10px] font-mono text-gray-500 block">

                  {session.role ||
                    'General Interview'}

                </span>

              </div>

              {/* STATUS */}

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

          {/* =================================================
              STRENGTHS / WEAKNESSES
              ================================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">

              <h4 className="text-xs font-bold text-emerald-950 font-mono uppercase flex items-center gap-1.5">

                <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                What You Did Well

              </h4>

              {strongSkills.length >
              0 ? (

                <ul className="space-y-1.5 text-xs text-emerald-900">

                  {strongSkills.map(
                    (
                      skill,
                      index
                    ) => (

                      <li
                        key={index}
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

              {weakSkills.length >
              0 ? (

                <ul className="space-y-1.5 text-xs text-amber-900">

                  {weakSkills.map(
                    (
                      skill,
                      index
                    ) => (

                      <li
                        key={index}
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

        {/* ===================================================
            QUESTIONS & RESPONSES
            =================================================== */}

        <div className="space-y-4">

          <div className="flex items-center justify-between px-1">

            <h2 className="text-lg font-bold font-serif text-gray-900">
              Questions & Evaluated Responses
            </h2>

            <span className="text-xs font-mono text-gray-400">

              {responses.length}{' '}
              Questions Evaluated

            </span>

          </div>

          {questionRows.length ===
          0 ? (

            <div className="bg-white border border-dashed border-gray-200 rounded-[24px] p-10 text-center">

              <p className="text-sm font-semibold text-gray-500">
                No evaluated responses are available for this session.
              </p>

            </div>

          ) : (

            <div className="space-y-4">

              {questionRows.map(
                (
                  response,
                  index
                ) => {

                  const responseScore =
                    Number(
                      response.score ??
                        response.feedback
                          ?.score
                    );

                  const safeScore =
                    Number.isFinite(
                      responseScore
                    )
                      ? responseScore
                      : null;

                  const isExpanded =
                    expandedQuestionIdx ===
                    index;

                  return (
                    <div
                      key={
                        response.question_id ||
                        index
                      }
                      className="bg-white border border-gray-200/80 rounded-[24px] overflow-hidden shadow-xs transition-all"
                    >

                      {/* ACCORDION HEADER */}

                      <div
                        onClick={() =>
                          setExpandedQuestionIdx(
                            isExpanded
                              ? null
                              : index
                          )
                        }
                        className="p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50/60 transition-colors"
                      >

                        <div className="flex items-start gap-3 min-w-0">

                          <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            Q{index + 1}
                          </span>

                          <div>

                            <div className="flex items-center gap-2 mb-1 flex-wrap">

                              <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">

                                {response.skill_tag ||
                                  response.type ||
                                  'Technical'}

                              </span>

                              {response.is_follow_up && (

                                <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">

                                  Follow-Up

                                </span>

                              )}

                            </div>

                            <h3 className="text-sm font-serif font-bold text-gray-900 leading-snug">
                              {response.question}
                            </h3>

                          </div>

                        </div>

                        <div className="flex items-center gap-3 shrink-0">

                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">

                            {safeScore !==
                            null
                              ? `${formatScore(
                                  safeScore
                                )}/100`
                              : '—'}

                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}

                        </div>

                      </div>

                      {/* ACCORDION BODY */}

                      {isExpanded && (

                        <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-gray-100 space-y-4 bg-[#FAFAFA]">

                          {/* CANDIDATE ANSWER */}

                          <div className="space-y-1.5">

                            <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">
                              Your Submitted Response:
                            </span>

                            <div className="p-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 leading-relaxed font-sans">

                              {response.user_answer
                                ? response.user_answer
                                : 'No answer text was recorded.'}

                            </div>

                          </div>

                          {/* AI EVALUATION */}

                          {response.feedback && (

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

                              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1">

                                <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                                  What Went Well:
                                </span>

                                {response.feedback
                                  .strengths
                                  ?.length ? (

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
                                            {strength}
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

                                {response.feedback
                                  .missing_points
                                  ?.length ? (

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
                                            {point}
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

                          )}

                          {/* IDEAL ANSWER */}

                          {response.feedback
                            ?.ideal_answer && (

                            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs leading-relaxed font-sans space-y-1.5 border border-slate-800">

                              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                                Ideal Benchmark Reference:
                              </span>

                              <p>
                                {
                                  response
                                    .feedback
                                    .ideal_answer
                                }
                              </p>

                            </div>

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

        {/* ===================================================
            EXIT ACTION
            =================================================== */}

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