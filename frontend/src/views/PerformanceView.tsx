  import React, { useEffect, useMemo, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import {
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Zap,
  } from 'lucide-react';

  import { dashboardApi } from '../api';
  import { useAuth } from '../context/AuthContext';
  import {
    DashboardMetrics,
    SessionHistoryItem,
  } from '../types';

  export const PerformanceView: React.FC = () => {
    const navigate = useNavigate();

    const {
      activeResumeProfile,
    } = useAuth();

    const [metrics, setMetrics] =
      useState<DashboardMetrics | null>(null);

    const [loading, setLoading] =
      useState<boolean>(true);

    const [loadError, setLoadError] =
      useState<string | null>(null);

    useEffect(() => {
      const fetchMetrics = async () => {
        try {
          const data =
            await dashboardApi.getDashboardMetrics();

          setMetrics(data);
          setLoadError(null);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to load performance metrics.';

          setLoadError(message);
        } finally {
          setLoading(false);
        }
      };

      fetchMetrics();
    }, []);

    /*
    * A resume must actually exist before we display
    * resume-grounded performance information.
    */
    const hasResume =
      Boolean(activeResumeProfile);

    /*
    * Merge any locally stored custom history with
    * the real backend session history.
    *
    * No fake/default sessions are created.
    */
    const history =
      useMemo<SessionHistoryItem[]>(() => {
        try {
          const customHist =
            localStorage.getItem(
              'interviewai_custom_history'
            );

          const backendHistory =
            hasResume
              ? metrics?.session_history || []
              : [];

          if (customHist) {
            const parsed =
              JSON.parse(customHist) as SessionHistoryItem[];

            if (!Array.isArray(parsed)) {
              return backendHistory;
            }

            const customIds = new Set(
              parsed.map(
                (item) =>
                  item.id ||
                  item.session_id
              )
            );

            const filteredBackend =
              backendHistory.filter(
                (item) =>
                  !customIds.has(item.id) &&
                  !customIds.has(
                    item.session_id
                  )
              );

            return [
              ...parsed,
              ...filteredBackend,
            ];
          }

          return backendHistory;
        } catch {
          return hasResume
            ? metrics?.session_history || []
            : [];
        }
      }, [metrics, hasResume]);

    /*
    * Performance analytics should only appear when
    * there is actual interview activity.
    *
    * This prevents the page from showing percentages
    * just because a user has logged in or uploaded
    * a resume.
    */
    const hasHistory =
      hasResume && history.length > 0;

    /*
    * Normalize scores without inventing fallback values.
    */
    const getScore = (
      value: number | null | undefined
    ): number | null => {
      if (!hasHistory) {
        return null;
      }

      if (
        typeof value !== 'number' ||
        Number.isNaN(value)
      ) {
        return null;
      }

      return Math.max(
        0,
        Math.min(100, value)
      );
    };

    const averageScore =
      getScore(metrics?.average_score);

    const technicalScore =
      getScore(metrics?.technical_score);

    const hrScore =
      getScore(metrics?.hr_score);

    const aptitudeScore =
      getScore(metrics?.aptitude_score);

    const accuracyScore =
      getScore(metrics?.accuracy);

    /*
    * There is no dedicated backend metric for
    * "Project Verification & Rationale".
    *
    * Therefore we intentionally do not fabricate
    * a value for it.
    */
    const projectVerificationScore:
      number | null = null;

    /*
    * Only show real skills returned by the backend.
    */
    const strongSkills =
      hasHistory &&
      Array.isArray(metrics?.strong_skills)
        ? metrics.strong_skills
        : [];

    const weakSkills =
      hasHistory &&
      Array.isArray(metrics?.weak_skills)
        ? metrics.weak_skills
        : [];

    return (
      <div className="space-y-8 animate-fade-in pb-16">

        {/* ===================================================== */}
        {/* ERROR                                                 */}
        {/* ===================================================== */}

        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {loadError}
          </div>
        )}

        {/* ===================================================== */}
        {/* HEADER                                                */}
        {/* ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              ANALYTICS & READINESS REPORT
            </span>

            <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
              Interview Performance
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              Track your score velocity, skill diagnostics, and longitudinal interview readiness.
            </p>

          </div>

          <button
            onClick={() =>
              navigate('/app/prepare')
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
          >
            <Zap className="w-4 h-4" />

            <span>
              Launch New Interview
            </span>
          </button>

        </div>

        {/* ===================================================== */}
        {/* TOP SCORE CARDS                                       */}
        {/* ===================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* AVERAGE SCORE */}

          <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-2">

            <span className="text-[10px] font-mono text-gray-400 uppercase block">
              Average Score
            </span>

            <div className="flex items-baseline gap-2">

              <span className="text-3xl font-bold text-gray-900 font-serif">

                {averageScore !== null
                  ? `${Math.round(
                      averageScore
                    )}%`
                  : '—'}

              </span>

            </div>

            <p className="text-[11px] text-gray-500">
              {hasHistory
                ? 'Across completed rounds'
                : hasResume
                ? 'No completed interview rounds yet'
                : 'Upload a resume to begin'}
            </p>

          </div>

          {/* TECHNICAL */}

          <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-2">

            <span className="text-[10px] font-mono text-gray-400 uppercase block">
              Technical Mastery
            </span>

            <div className="flex items-baseline gap-2">

              <span className="text-3xl font-bold text-indigo-600 font-serif">

                {technicalScore !== null
                  ? `${Math.round(
                      technicalScore
                    )}%`
                  : '—'}

              </span>

            </div>

            <p className="text-[11px] text-gray-500">
              {hasHistory
                ? 'Technical interview evaluation'
                : 'No technical evaluation yet'}
            </p>

          </div>

          {/* HR */}

          <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-2">

            <span className="text-[10px] font-mono text-gray-400 uppercase block">
              HR & Behavioral
            </span>

            <div className="flex items-baseline gap-2">

              <span className="text-3xl font-bold text-orange-600 font-serif">

                {hrScore !== null
                  ? `${Math.round(
                      hrScore
                    )}%`
                  : '—'}

              </span>

            </div>

            <p className="text-[11px] text-gray-500">
              {hasHistory
                ? 'Behavioral interview evaluation'
                : 'No behavioral evaluation yet'}
            </p>

          </div>

          {/* APTITUDE */}

          <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm space-y-2">

            <span className="text-[10px] font-mono text-gray-400 uppercase block">
              Aptitude & Logic
            </span>

            <div className="flex items-baseline gap-2">

              <span className="text-3xl font-bold text-green-600 font-serif">

                {aptitudeScore !== null
                  ? `${Math.round(
                      aptitudeScore
                    )}%`
                  : '—'}

              </span>

            </div>

            <p className="text-[11px] text-gray-500">
              {hasHistory
                ? 'Aptitude practice evaluation'
                : 'No aptitude evaluation yet'}
            </p>

          </div>

        </div>

        {/* ===================================================== */}
        {/* COMPETENCY + VERIFIED SKILLS                          */}
        {/* ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* =================================================== */}
          {/* CATEGORY COMPETENCY                                 */}
          {/* =================================================== */}

          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6">

            <div>

              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-wider">
                Category Competency Breakdown
              </h3>

              <p className="text-xs text-gray-500">
                Evaluated from your resume grounding and answer depth
              </p>

            </div>

            {!hasResume ? (

              <div className="h-40 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center px-6 text-center">

                <span className="text-xs text-gray-400">
                  Upload a resume to begin building your performance profile.
                </span>

              </div>

            ) : !hasHistory ? (

              <div className="h-40 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center px-6 text-center">

                <span className="text-xs text-gray-400">
                  Complete your first interview to generate competency data.
                </span>

              </div>

            ) : (

              <div className="space-y-4">

                {/* TECHNICAL */}

                <CompetencyBar
                  label="Technical Depth & Architecture"
                  score={technicalScore}
                  color="bg-indigo-600"
                />

                {/* PROJECT VERIFICATION */}

                <CompetencyBar
                  label="Project Verification & Rationale"
                  score={projectVerificationScore}
                  color="bg-blue-600"
                />

                {/* APTITUDE */}

                <CompetencyBar
                  label="Quantitative & Logical Aptitude"
                  score={aptitudeScore}
                  color="bg-green-600"
                />

                {/* BEHAVIORAL */}

                <CompetencyBar
                  label="Behavioral & Communication"
                  score={hrScore}
                  color="bg-orange-500"
                />

                {/* ACCURACY */}

                <CompetencyBar
                  label="Answer Consistency & Accuracy"
                  score={accuracyScore}
                  color="bg-purple-600"
                />

              </div>

            )}

          </div>

          {/* =================================================== */}
          {/* VERIFIED SKILLS                                      */}
          {/* =================================================== */}

          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6">

            <div>

              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-wider">
                Verified Skills Matrix
              </h3>

              <p className="text-xs text-gray-500">
                Areas with verified strength vs targeted improvement
              </p>

            </div>

            {!hasResume ? (

              <div className="h-40 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center px-6 text-center">

                <span className="text-xs text-gray-400">
                  No verified skills until a resume is uploaded.
                </span>

              </div>

            ) : !hasHistory ? (

              <div className="h-40 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 flex items-center justify-center px-6 text-center">

                <span className="text-xs text-gray-400">
                  Complete an interview to verify your strengths and improvement areas.
                </span>

              </div>

            ) : (

              <div className="space-y-6">

                {/* STRONG MASTERY */}

                <div>

                  <div className="text-xs font-bold text-green-800 flex items-center gap-1.5 mb-2 font-mono uppercase">

                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />

                    <span>
                      Strong Mastery
                    </span>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    {strongSkills.length > 0 ? (

                      strongSkills.map(
                        (skill) => (

                          <span
                            key={skill}
                            className="px-3 py-1.5 rounded-full bg-green-50 text-green-900 border border-green-200 text-xs font-medium"
                          >
                            {skill}
                          </span>

                        )
                      )

                    ) : (

                      <span className="text-xs text-gray-400">
                        No verified strengths yet.
                      </span>

                    )}

                  </div>

                </div>

                {/* NEEDS PRACTICE */}

                <div className="pt-2 border-t border-gray-100">

                  <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2 font-mono uppercase">

                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />

                    <span>
                      Needs Practice
                    </span>

                  </div>

                  <div className="space-y-2">

                    {weakSkills.length > 0 ? (

                      weakSkills.map(
                        (skill) => (

                          <div
                            key={skill}
                            className="p-3 rounded-[18px] bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs"
                          >

                            <span className="text-amber-900 font-medium">
                              {skill}
                            </span>

                            <button
                              onClick={() =>
                                navigate(
                                  '/app/prepare'
                                )
                              }
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px]"
                            >
                              Practice →
                            </button>

                          </div>

                        )
                      )

                    ) : (

                      <span className="text-xs text-gray-400">
                        No practice areas identified yet.
                      </span>

                    )}

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

        {/* ===================================================== */}
        {/* SESSION HISTORY                                       */}
        {/* ===================================================== */}

        <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-4">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-wider">
                Interview History Log
              </h3>

              <p className="text-xs text-gray-500">
                Historical performance records
              </p>

            </div>

            <span className="text-xs font-mono text-gray-400">

              {history.length} Sessions Logged

            </span>

          </div>

          <div className="overflow-x-auto">

            {!hasResume ? (

              <div className="py-12 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-center">

                <p className="text-sm text-gray-500 font-medium">
                  No interview history yet.
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Upload a resume to begin interview preparation.
                </p>

              </div>

            ) : history.length === 0 ? (

              <div className="py-12 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-center">

                <p className="text-sm text-gray-500 font-medium">
                  No interview history yet.
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Complete your first interview to start tracking performance.
                </p>

              </div>

            ) : (

              <table className="w-full text-left text-xs">

                <thead>

                  <tr className="border-b border-gray-100 text-gray-400 font-mono uppercase text-[10px]">

                    <th className="pb-3 font-semibold">
                      Session Title
                    </th>

                    <th className="pb-3 font-semibold">
                      Type
                    </th>

                    <th className="pb-3 font-semibold">
                      Date
                    </th>

                    <th className="pb-3 font-semibold">
                      Questions Attempted
                    </th>

                    <th className="pb-3 font-semibold">
                      Score
                    </th>

                    <th className="pb-3 font-semibold text-right">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {history.map(
                    (sess, idx) => {

                      const score =
                        typeof sess.score ===
                        'number'
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                sess.score
                              )
                            )
                          : null;

                      return (
                        <tr
                          key={
                            sess.id ||
                            sess.session_id ||
                            idx
                          }
                          className="hover:bg-gray-50/80 transition-colors"
                        >

                          <td className="py-3.5 font-bold text-gray-900">
                            {sess.title}
                          </td>

                          <td className="py-3.5">

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-gray-100 text-gray-700">
                              {sess.type}
                            </span>

                          </td>

                          <td className="py-3.5 text-gray-500 font-mono">
                            {sess.date}
                          </td>

                          <td className="py-3.5 text-gray-700 font-mono">
                            {sess.questions_attempted}{' '}
                            /{' '}
                            {sess.total_questions}
                          </td>

                          <td className="py-3.5">

                            <span
                              className={`font-bold font-mono px-2.5 py-0.5 rounded-full text-xs ${
                                score === null
                                  ? 'bg-gray-100 text-gray-500'
                                  : score >= 85
                                  ? 'bg-green-50 text-green-700'
                                  : score >= 75
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >

                              {score !== null
                                ? `${Math.round(
                                    score
                                  )}%`
                                : '—'}

                            </span>

                          </td>

                          <td className="py-3.5 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/interview/session/${
                                    sess.session_id ||
                                    sess.id
                                  }/complete`
                                )
                              }
                              className="px-3.5 py-1.5 rounded-full border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/60 text-indigo-700 font-semibold text-xs transition-all inline-flex items-center gap-1.5"
                            >

                              <span>
                                Review Interview
                              </span>

                              <ArrowRight className="w-3 h-3" />

                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            )}

          </div>

        </div>

      </div>
    );
  };

  /*
  * =============================================================
  * REUSABLE COMPETENCY BAR
  * =============================================================
  *
  * If score is null, we deliberately show no percentage and
  * no filled bar.
  */

  interface CompetencyBarProps {
    label: string;
    score: number | null;
    color: string;
  }

  const CompetencyBar: React.FC<
    CompetencyBarProps
  > = ({
    label,
    score,
    color,
  }) => {
    return (
      <div className="space-y-1.5">

        <div className="flex items-center justify-between text-xs font-semibold text-gray-800">

          <span>
            {label}
          </span>

          <span className="font-mono">

            {score !== null
              ? `${Math.round(score)}%`
              : '—'}

          </span>

        </div>

        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">

          {score !== null &&
            score > 0 && (

              <div
                className={`${color} h-full rounded-full transition-all duration-700`}
                style={{
                  width: `${score}%`,
                }}
              />

            )}

        </div>

      </div>
    );
  };