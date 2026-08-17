import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useNavigate,
} from 'react-router-dom';

import {
  ArrowRight,
  Layers,
  ChevronRight,
  RefreshCw,
  Target,
  FileText,
  History,
  BarChart3,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api';

import {
  DashboardMetrics,
  StoredResumeItem,
} from '../types';

type PerformanceScope =
  'overall' | 'resume';

interface DashboardSessionHistory {
  id?: string;
  session_id?: string;
  title?: string;
  score?: number;
  date?: string;
  started_at?: string;
  type?: string;
}

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();

  const {
    user,
    resumes,
    activeResumeProfile,
    activeResumeHash,
  } = useAuth();

  const [
    metrics,
    setMetrics,
  ] = useState<DashboardMetrics | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState<boolean>(
    true
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState<boolean>(
    false
  );

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null
  );

  /*
   * ----------------------------------------------------------
   * PERFORMANCE SCOPE
   * ----------------------------------------------------------
   *
   * overall:
   *   all interview sessions across all resumes
   *
   * resume:
   *   only sessions belonging to the selected resume
   *
   * This remains separate from activeResumeHash.
   */
  const [
    performanceScope,
    setPerformanceScope,
  ] = useState<PerformanceScope>(
    'overall'
  );

  const [
    selectedPerformanceResumeHash,
    setSelectedPerformanceResumeHash,
  ] = useState<string | null>(
    activeResumeHash || null
  );

  /*
   * ----------------------------------------------------------
   * SELECTED PERFORMANCE RESUME
   * ----------------------------------------------------------
   */

  const selectedPerformanceResume =
    useMemo<
      StoredResumeItem | undefined
    >(() => {
      if (
        !selectedPerformanceResumeHash
      ) {
        return undefined;
      }

      return resumes.find(
        resume =>
          resume.resume_hash ===
          selectedPerformanceResumeHash
      );
    }, [
      resumes,
      selectedPerformanceResumeHash,
    ]);

  /*
   * ----------------------------------------------------------
   * RESUME USED FOR DISPLAY
   * ----------------------------------------------------------
   */

  const displayResumeProfile =
    performanceScope === 'resume'
      ? selectedPerformanceResume?.structured_profile
      : activeResumeProfile?.structured_profile;

  const hasResume =
    Boolean(
      performanceScope === 'resume'
        ? selectedPerformanceResume
        : activeResumeProfile
    );

  /*
   * ----------------------------------------------------------
   * DISPLAY NAME
   * ----------------------------------------------------------
   */

  const candidateName =
    displayResumeProfile?.name ||
    user?.full_name ||
    'Candidate';

  const structured =
    displayResumeProfile;

  /*
   * ----------------------------------------------------------
   * LOAD DASHBOARD
   * ----------------------------------------------------------
   */

  const fetchMetrics = async (
    resumeHash?: string | null
  ) => {
    try {
      setLoadError(null);
      setRefreshing(true);

      /*
       * Clear old metrics while switching scope/resume.
       */
      setMetrics(null);

      const data =
        await dashboardApi.getDashboardMetrics(
          resumeHash || null
        );

      setMetrics(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard metrics.';

      setLoadError(message);
      setMetrics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * Initial dashboard = OVERALL performance.
   */
  useEffect(() => {
    fetchMetrics(null);
  }, []);

  /*
   * ----------------------------------------------------------
   * SWITCH TO OVERALL
   * ----------------------------------------------------------
   */

  const showOverallPerformance =
    () => {
      setPerformanceScope(
        'overall'
      );

      setSelectedPerformanceResumeHash(
        activeResumeHash || null
      );

      setLoading(true);

      fetchMetrics(null);
    };

  /*
   * ----------------------------------------------------------
   * SWITCH TO RESUME PERFORMANCE
   * ----------------------------------------------------------
   */

  const showResumePerformance =
    (
      resumeHash?: string | null
    ) => {
      const hash =
        resumeHash ||
        selectedPerformanceResumeHash ||
        activeResumeHash ||
        resumes[0]?.resume_hash ||
        null;

      setPerformanceScope(
        'resume'
      );

      setSelectedPerformanceResumeHash(
        hash
      );

      setLoading(true);

      if (hash) {
        fetchMetrics(hash);
      } else {
        setMetrics(null);
        setLoading(false);
      }
    };

  /*
   * ----------------------------------------------------------
   * SELECT PREVIOUS/CURRENT RESUME
   * ----------------------------------------------------------
   */

  const selectPerformanceResume =
    (
      resumeHash: string
    ) => {
      setPerformanceScope(
        'resume'
      );

      setSelectedPerformanceResumeHash(
        resumeHash
      );

      setLoading(true);

      fetchMetrics(resumeHash);
    };

  /*
   * ----------------------------------------------------------
   * GREETING
   * ----------------------------------------------------------
   */

  const getGreeting = () => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 18) {
      return 'Good afternoon';
    }

    return 'Good evening';
  };

  /*
   * ----------------------------------------------------------
   * USABLE METRICS
   * ----------------------------------------------------------
   */

  const usableMetrics =
    hasResume
      ? metrics
      : null;

  /*
   * ----------------------------------------------------------
   * SESSION HISTORY
   * ----------------------------------------------------------
   */

  const sessionHistory =
    usableMetrics &&
    'session_history' in
      usableMetrics &&
    Array.isArray(
      (
        usableMetrics as DashboardMetrics & {
          session_history?: unknown[];
        }
      ).session_history
    )
      ? (
          usableMetrics as DashboardMetrics & {
            session_history?: DashboardSessionHistory[];
          }
        ).session_history ?? []
      : [];

  const hasPerformanceHistory =
    sessionHistory.length > 0;

  /*
   * ----------------------------------------------------------
   * SCORE HELPERS
   * ----------------------------------------------------------
   */

  const averageScore =
    typeof usableMetrics?.average_score ===
    'number'
      ? Math.max(
          0,
          Math.min(
            100,
            usableMetrics.average_score
          )
        )
      : null;

  const technicalScore =
    typeof usableMetrics?.technical_score ===
    'number'
      ? Math.max(
          0,
          Math.min(
            100,
            usableMetrics.technical_score
          )
        )
      : null;

  const hrScore =
    typeof usableMetrics?.hr_score ===
    'number'
      ? Math.max(
          0,
          Math.min(
            100,
            usableMetrics.hr_score
          )
        )
      : null;

  const aptitudeScore =
    typeof usableMetrics?.aptitude_score ===
    'number'
      ? Math.max(
          0,
          Math.min(
            100,
            usableMetrics.aptitude_score
          )
        )
      : null;

  const weakSkills =
    hasResume &&
    Array.isArray(
      usableMetrics?.weak_skills
    )
      ? usableMetrics?.weak_skills ??
        []
      : [];

  /*
   * ----------------------------------------------------------
   * PREVIOUS RESUMES
   * ----------------------------------------------------------
   */

  const previousResumes =
    performanceScope ===
    'resume'
      ? resumes.filter(
          resume =>
            resume.resume_hash !==
            selectedPerformanceResumeHash
        )
      : [];

  return (
    <div className="space-y-6 animate-fade-in pb-12 bg-transparent">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="flex flex-col gap-5">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          <div>

            <h1 className="text-3xl sm:text-4xl font-serif italic text-[#2D2526]">

              {getGreeting()},{' '}
              {candidateName.split(' ')[0]}.

            </h1>

            <p className="text-[#6C6062] text-sm sm:text-base mt-1">

              {!hasResume ? (
                'Upload a resume to start building your interview readiness profile.'
              ) : averageScore !==
                null ? (
                performanceScope ===
                'overall'
                  ? `Your overall readiness score is ${Math.round(
                      averageScore
                    )}%.`
                  : `Your readiness score for ${
                      structured?.name ||
                      'this resume'
                    } is ${Math.round(
                      averageScore
                    )}%.`
              ) : (
                performanceScope ===
                'overall'
                  ? 'Complete interview preparation to build your overall readiness score.'
                  : 'Complete an interview using this resume to build its performance profile.'
              )}

            </p>

          </div>

          <div className="flex items-center gap-3">

            {loadError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 max-w-md">
                {loadError}
              </div>
            )}

            <button
              onClick={() => {
                setRefreshing(true);

                if (
                  performanceScope ===
                  'overall'
                ) {
                  fetchMetrics(null);
                } else {
                  fetchMetrics(
                    selectedPerformanceResumeHash
                  );
                }
              }}
              disabled={
                refreshing ||
                loading
              }
              className="px-4 py-2.5 rounded-full bg-[#FFFDFC] border border-[#E1D6D2] text-[#5D5355] text-xs font-semibold hover:bg-white transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >

              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              <span>
                Sync
              </span>

            </button>

            <button
              onClick={() =>
                navigate(
                  '/app/prepare'
                )
              }
              className="bg-[#C43173] hover:bg-[#A9255F] text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-[0_10px_24px_rgba(196,49,115,0.18)] flex items-center gap-2 transition-all"
            >

              <Target className="w-4 h-4" />

              <span>
                Start Preparation
              </span>

              <ArrowRight className="w-4 h-4" />

            </button>

          </div>

        </div>

        {/* ====================================================
            PERFORMANCE SCOPE TOGGLE
            ==================================================== */}

        <div className="flex items-center">

          <div className="inline-flex items-center p-1 rounded-full bg-[#EFE5E1] border border-[#E1D6D2]">

            <button
              type="button"
              onClick={
                showOverallPerformance
              }
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                performanceScope ===
                'overall'
                  ? 'bg-[#FFFDFC] text-[#2D2526] shadow-sm'
                  : 'text-[#75696B] hover:text-[#2D2526]'
              }`}
            >
              Overall
            </button>

            <button
              type="button"
              onClick={() =>
                showResumePerformance()
              }
              disabled={
                resumes.length ===
                0
              }
              className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                performanceScope ===
                'resume'
                  ? 'bg-[#C43173] text-white shadow-sm'
                  : 'text-[#75696B] hover:text-[#2D2526]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Resume Performance
            </button>

          </div>

        </div>

      </header>

      {/* ======================================================
          RESUME PERFORMANCE SELECTOR
          ====================================================== */}

      {performanceScope ===
        'resume' && (

        <div className="space-y-4">

          {/* CURRENT SELECTED RESUME */}

          <div className="bg-[#FFFDFC] border border-[#E1D6D2] rounded-[28px] p-5 shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-2xl bg-[#F8E7EE] text-[#C43173] flex items-center justify-center">

                  <FileText className="w-5 h-5" />

                </div>

                <div>

                  <span className="text-[10px] font-bold text-[#C43173] uppercase tracking-wider font-mono">
                    Viewing Performance For
                  </span>

                  <h3 className="text-sm font-bold text-[#2D2526] mt-0.5">

                    {selectedPerformanceResume?.filename ||
                      selectedPerformanceResume?.structured_profile?.name ||
                      'Selected Resume'}

                  </h3>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <span className="text-[10px] text-[#978A8C] font-mono">

                  {selectedPerformanceResume
                    ? `${selectedPerformanceResume.projects_count ?? 0} projects • ${
                        selectedPerformanceResume.experience_count ?? 0
                      } roles`
                    : ''}

                </span>

              </div>

            </div>

          </div>

          {/* PREVIOUS RESUMES */}

          {previousResumes.length >
            0 && (

            <div>

              <div className="flex items-center gap-2 mb-3">

                <History className="w-4 h-4 text-[#978A8C]" />

                <h3 className="text-xs font-mono font-bold text-[#978A8C] uppercase tracking-wider">
                  Previous Resumes
                </h3>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                {previousResumes.map(
                  resume => {

                    const isActivePreparationResume =
                      resume.resume_hash ===
                      activeResumeHash;

                    return (
                      <button
                        key={
                          resume.resume_hash
                        }
                        type="button"
                        onClick={() =>
                          selectPerformanceResume(
                            resume.resume_hash
                          )
                        }
                        className="text-left p-4 rounded-[22px] bg-[#FFFDFC] border border-[#E1D6D2] hover:border-[#D78AAA] hover:shadow-sm transition-all group"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="w-9 h-9 rounded-xl bg-[#F7F1E8] group-hover:bg-[#F8E7EE] text-[#75696B] group-hover:text-[#C43173] flex items-center justify-center shrink-0 transition-colors">

                            <FileText className="w-4 h-4" />

                          </div>

                          <ChevronRight className="w-4 h-4 text-[#D6CBC7] group-hover:text-[#C43173] transition-colors" />

                        </div>

                        <h4 className="text-sm font-bold text-[#2D2526] mt-3 line-clamp-2">

                          {resume.filename ||
                            'Resume'}

                        </h4>

                        <p className="text-[10px] text-[#978A8C] font-mono mt-1">

                          {resume.structured_profile
                            ?.name ||
                            'Candidate'}

                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-3">

                          <span className="text-[10px] text-[#75696B] font-mono">

                            {resume.projects_count ??
                              0}{' '}
                            projects

                          </span>

                          <span className="text-[10px] text-[#D0C3BF]">
                            •
                          </span>

                          <span className="text-[10px] text-[#75696B] font-mono">

                            {resume.experience_count ??
                              0}{' '}
                            roles

                          </span>

                          {isActivePreparationResume && (

                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-semibold">

                              Active for Prep

                            </span>

                          )}

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

          )}

          {previousResumes.length ===
            0 &&
            resumes.length ===
              1 && (

            <div className="text-xs text-[#978A8C] font-mono">

              No previous resumes. This is your first stored resume.

            </div>

          )}

        </div>

      )}

      {/* ======================================================
          MAIN GRID
          ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ====================================================
            LEFT 2 COLUMNS
            ==================================================== */}

        <div className="lg:col-span-2 space-y-6">

          {/* ==================================================
              CURRENT PROFILE
              ================================================== */}

          <div className="bg-[#FFFDFC] border border-[#E1D6D2] p-8 rounded-[32px] shadow-[0_14px_40px_rgba(75,48,52,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">

            <div className="relative z-10 max-w-lg">

              <span className="text-xs font-bold text-[#C43173] uppercase tracking-widest mb-2 block">
                {performanceScope ===
                'overall'
                  ? 'Current Profile'
                  : 'Selected Resume Profile'}
              </span>

              <h2 className="text-2xl font-semibold text-[#2D2526] mb-2">

                {!hasResume
                  ? 'No active resume'
                  : structured?.name ||
                    'Resume Profile'}

              </h2>

              {hasResume &&
                structured?.skills &&
                Array.isArray(
                  structured.skills
                ) &&
                structured.skills.length >
                  0 && (

                  <div className="flex flex-wrap gap-2 mt-4">

                    {structured.skills
                      .slice(0, 5)
                      .map(
                        (
                          skill: string
                        ) => (

                          <span
                            key={skill}
                            className="px-3 py-1 bg-[#F7F1E8] rounded-full text-xs text-[#5D5355] border border-[#E1D6D2] font-medium"
                          >
                            {skill}
                          </span>

                        )
                      )}

                  </div>

                )}

              <div className="mt-6 text-sm text-[#6C6062] flex items-center gap-2">

                <span>
                  Resume:
                </span>

                <button
                  onClick={() =>
                    navigate(
                      '/app/resume'
                    )
                  }
                  className="text-[#C43173] font-medium hover:underline flex items-center gap-1"
                >

                  <span>

                    {!hasResume
                      ? 'Upload CV'
                      : performanceScope ===
                        'resume'
                      ? 'View Resume'
                      : 'View Active Resume'}

                  </span>

                  <ChevronRight className="w-3.5 h-3.5" />

                </button>

              </div>

            </div>

            {/* READINESS CIRCLE */}

            <div className="w-32 h-32 relative z-10 shrink-0 self-center md:self-auto">

              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 128 128"
              >

                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-[#EEE3DF]"
                />

                {averageScore !==
                  null &&
                  averageScore > 0 && (

                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="339.29"
                    strokeDashoffset={
                      339.29 *
                      (1 -
                        averageScore /
                          100)
                    }
                    strokeLinecap="round"
                    className="text-[#C43173] transition-all duration-1000 ease-out"
                  />

                )}

              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">

                <span className="text-2xl font-bold text-[#2D2526] font-serif">

                  {loading ? (
                    <span className="text-lg text-[#D0C3BF]">
                      ...
                    </span>
                  ) : averageScore !==
                    null ? (
                    `${Math.round(
                      averageScore
                    )}%`
                  ) : (
                    '—'
                  )}

                </span>

                <span className="text-[10px] text-[#978A8C] uppercase font-mono tracking-wider font-semibold">
                  Readiness
                </span>

              </div>

            </div>

            <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-[#F8E7EE]/70 rounded-full blur-3xl pointer-events-none" />

          </div>

          {/* ==================================================
              QUICK PREPARATION
              ================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div
              onClick={() =>
                navigate(
                  '/app/prepare?mode=job'
                )
              }
              className="p-5 rounded-[24px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_10px_25px_rgba(75,48,52,0.04)] hover:border-[#E7B4C8] cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
            >

              <div className="flex items-start justify-between">

                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>

                <span className="text-[10px] font-mono font-bold bg-orange-50 text-orange-800 px-2 py-0.5 rounded-full uppercase">
                  Job Match
                </span>

              </div>

              <div>

                <h3 className="text-sm font-bold text-[#2D2526] group-hover:text-[#C43173] transition-colors">
                  Prepare for Specific Job
                </h3>

                <p className="text-xs text-[#75696B] mt-1">
                  Calibrate questions and practice directly with a target job description.
                </p>

              </div>

              <div className="flex items-center text-xs font-semibold text-[#C43173] pt-1">
                <span>
                  Configure Position →
                </span>
              </div>

            </div>

            <div
              onClick={() =>
                navigate(
                  '/app/prepare'
                )
              }
              className="p-5 rounded-[24px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_10px_25px_rgba(75,48,52,0.04)] hover:border-[#D8B5C5] cursor-pointer transition-all flex flex-col justify-between space-y-3 group"
            >

              <div className="flex items-start justify-between">

                <div className="w-10 h-10 rounded-xl bg-[#F8E7EE] text-[#C43173] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>

                <span className="text-[10px] font-mono font-bold bg-[#F5DFE8] text-[#A3265D] px-2 py-0.5 rounded-full uppercase">
                  Resume-Grounded
                </span>

              </div>

              <div>

                <h3 className="text-sm font-bold text-[#2D2526] group-hover:text-[#C43173] transition-colors">
                  Self-Paced Comprehensive Prep
                </h3>

                <p className="text-xs text-[#75696B] mt-1">
                  Practice questions tailored across your projects, stack, and experience.
                </p>

              </div>

              <div className="flex items-center text-xs font-semibold text-[#C43173] pt-1">
                <span>
                  Start Practice →
                </span>
              </div>

            </div>

          </div>

          {/* ==================================================
              RECENT PERFORMANCE
              ================================================== */}

          <div className="bg-[#FFFDFC] border border-[#E1D6D2] p-6 rounded-[24px] shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <div className="flex items-center justify-between mb-4">

              <div className="flex items-center gap-2">

                <h3 className="text-sm font-semibold text-[#978A8C] uppercase tracking-wider">
                  Recent Performance
                </h3>

                <BarChart3 className="w-3.5 h-3.5 text-[#D0C3BF]" />

              </div>

              <button
                onClick={() =>
                  navigate(
                    '/app/performance'
                  )
                }
                className="text-xs font-semibold text-[#C43173] hover:underline"
              >
                Details →
              </button>

            </div>

            {hasPerformanceHistory ? (

              <div className="space-y-4">

                {/* INTERACTIVE BARS */}

                <div className="flex justify-between items-end h-28 gap-2 px-2 pt-2">

                  {sessionHistory
                    .slice(0, 6)
                    .map(
                      (
                        session,
                        index
                      ) => {

                        const score =
                          typeof session.score ===
                          'number'
                            ? Math.max(
                                0,
                                Math.min(
                                  100,
                                  session.score
                                )
                              )
                            : 0;

                        const sessionDate =
                          session.date ||
                          session.started_at;

                        const dateLabel =
                          sessionDate
                            ? new Date(
                                sessionDate
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month:
                                    'short',
                                  day:
                                    'numeric',
                                }
                              )
                            : 'Date unavailable';

                        const title =
                          session.title ||
                          'Interview';

                        const sessionType =
                          session.type ||
                          'Interview';

                        const sessionId =
                          session.session_id ||
                          session.id;

                        return (
                          <button
                            key={
                              sessionId ||
                              index
                            }
                            type="button"
                            onClick={() => {

                              if (
                                sessionId
                              ) {
                                navigate(
                                  `/interview/session/${sessionId}/complete`
                                );
                              }

                            }}
                            className="group relative flex-1 h-full flex items-end justify-center min-w-0 focus:outline-none"
                            aria-label={`${title}, ${score}%, ${dateLabel}`}
                          >

                            {/* TOOLTIP */}

                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 z-20 w-44">

                              <div className="bg-[#2D2526] text-[#F7F1E8] rounded-xl px-3 py-2 shadow-xl text-left">

                                <p className="text-[10px] font-bold truncate">
                                  {title}
                                </p>

                                <p className="text-[10px] text-white/70 mt-0.5">
                                  {dateLabel}
                                </p>

                                <div className="flex items-center justify-between mt-1.5">

                                  <span className="text-[9px] text-white/50 uppercase">
                                    {sessionType}
                                  </span>

                                  <span className="text-xs font-bold text-green-300">
                                    {score}%
                                  </span>

                                </div>

                              </div>

                            </div>

                            {/* BAR */}

                            <div
                              className={`w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover:opacity-80 group-focus:opacity-80 ${
                                index ===
                                0
                                  ? 'bg-[#C43173]'
                                  : 'bg-[#D8CDCA]'
                              }`}
                              style={{
                                height: `${Math.max(
                                  5,
                                  score
                                )}%`,
                              }}
                            />

                          </button>
                        );
                      }
                    )}

                </div>

                {/* SCORE LABELS */}

                <div className="flex justify-between gap-2 px-2">

                  {sessionHistory
                    .slice(0, 6)
                    .map(
                      (
                        session,
                        index
                      ) => {

                        const score =
                          typeof session.score ===
                          'number'
                            ? Math.round(
                                session.score
                              )
                            : null;

                        return (
                          <div
                            key={`score-${index}`}
                            className="flex-1 text-center"
                          >

                            <span className="text-[9px] font-mono text-[#978A8C]">
                              {score !==
                              null
                                ? `${score}`
                                : '—'}
                            </span>

                          </div>
                        );
                      }
                    )}

                </div>

                {/* LAST SESSION */}

                <div className="mt-2 pt-3 border-t border-[#E8DEDA] text-xs text-[#6C6062] flex items-center justify-between">

                  <span className="truncate pr-3">

                    Last Round:{' '}

                    <strong className="text-[#2D2526]">
                      {sessionHistory[0]
                        ?.title ||
                        'Interview'}
                    </strong>

                  </span>

                  <span className="font-semibold text-emerald-600 shrink-0">

                    {typeof sessionHistory[0]
                      ?.score ===
                    'number'
                      ? `${Math.round(
                          sessionHistory[0]
                            .score
                        )}/100`
                      : '—'}

                  </span>

                </div>

              </div>

            ) : (

              <div className="space-y-3">

                <div className="h-28 rounded-xl border border-dashed border-[#D9CDCA] bg-[#FAF3ED]/70 flex items-center justify-center px-4 text-center">

                  <span className="text-xs text-[#978A8C]">

                    {performanceScope ===
                    'overall'
                      ? 'No interview performance data yet.'
                      : 'No interview performance for this resume yet.'}

                  </span>

                </div>

                <div className="pt-3 border-t border-[#E8DEDA] text-xs text-[#978A8C]">

                  {!hasResume
                    ? 'Upload a resume to begin interview preparation.'
                    : performanceScope ===
                      'resume'
                    ? 'Complete an interview using this resume to see its performance here.'
                    : 'Complete an interview to see your overall performance here.'}

                </div>

              </div>

            )}

          </div>

        </div>

        {/* ====================================================
            RIGHT SIDEBAR
            ==================================================== */}

        <div className="space-y-6">

          {/* ==================================================
              SKILL ANALYSIS
              ================================================== */}

          <div className="bg-[#FFFDFC] border border-[#E1D6D2] p-6 rounded-[32px] shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <h3 className="text-lg font-semibold text-[#2D2526] mb-4">
              Skill Analysis
            </h3>

            {hasResume ? (

              <div className="space-y-4">

                {/* TECHNICAL */}

                <ScoreBar
                  label="Technical Accuracy"
                  score={technicalScore}
                  color="bg-[#C43173]"
                />

                {/* HR */}

                <ScoreBar
                  label="HR & Behavioral"
                  score={hrScore}
                  color="bg-orange-500"
                />

                {/* APTITUDE */}

                <ScoreBar
                  label="Aptitude Logic"
                  score={aptitudeScore}
                  color="bg-green-500"
                />

              </div>

            ) : (

              <div className="h-28 rounded-2xl border border-dashed border-[#D9CDCA] bg-[#FAF3ED]/70 flex items-center justify-center px-6 text-center">

                <span className="text-xs text-[#978A8C]">

                  {performanceScope ===
                  'resume'
                    ? 'Select a stored resume to view its performance.'
                    : 'Upload a resume to generate your skill analysis.'}

                </span>

              </div>

            )}

            {/* NEEDS PRACTICE */}

            <div className="mt-8">

              <h4 className="text-xs font-bold text-[#978A8C] uppercase tracking-widest mb-3">
                Needs Practice
              </h4>

              {hasResume &&
              weakSkills.length >
                0 ? (

                <div className="space-y-2">

                  {weakSkills
                    .slice(0, 2)
                    .map(
                      skill => (

                        <div
                          key={skill}
                          className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl"
                        >

                          <span className="text-xs font-medium text-rose-700">
                            {skill}
                          </span>

                          <button
                            onClick={() =>
                              navigate(
                                '/app/prepare'
                              )
                            }
                            className="text-[10px] font-bold text-rose-700 hover:underline"
                          >
                            Practice →
                          </button>

                        </div>

                      )
                    )}

                </div>

              ) : (

                <p className="text-xs text-[#978A8C]">

                  {!hasResume
                    ? 'No practice areas until a resume is uploaded.'
                    : 'No improvement areas identified yet.'}

                </p>

              )}

            </div>

          </div>

          {/* ==================================================
              NEXT MOCK SESSION
              ================================================== */}

          <div className="bg-orange-50 border border-orange-100 p-6 rounded-[32px] space-y-3">

            <h3 className="text-sm font-bold text-orange-800">

              {hasResume
                ? 'Next Mock Session'
                : 'Start Your Preparation'}

            </h3>

            <p className="text-xs text-orange-700/80 leading-relaxed">

              {hasResume
                ? performanceScope ===
                  'resume'
                  ? `Configure a personalized mock interview using ${
                      structured?.name ||
                      'this resume'
                    }.`
                  : 'Configure a personalized mock interview based on your active resume and preparation goals.'
                : 'Upload a resume first so InterviewAI can personalize your interview preparation.'}

            </p>

            <button
              onClick={() =>
                navigate(
                  hasResume
                    ? '/app/prepare'
                    : '/app/resume'
                )
              }
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >

              {hasResume
                ? 'Configure & Start Prep'
                : 'Upload Resume'}

            </button>

          </div>

        </div>

      </div>

      {/* ======================================================
          OVERALL / RESUME MODE INFO
          ====================================================== */}

      {performanceScope ===
        'overall' &&
        resumes.length > 0 && (

        <div className="p-4 rounded-[22px] bg-[#F8E7EE]/70 border border-[#E7B4C8] flex items-start gap-3">

          <BarChart3 className="w-4 h-4 text-[#C43173] mt-0.5 shrink-0" />

          <div>

            <p className="text-xs font-semibold text-[#5E3343]">
              Overall performance
            </p>

            <p className="text-[11px] text-[#8B5268] mt-0.5">
              This view combines your completed interviews across all stored resumes. Switch to Resume Performance to inspect one resume independently.
            </p>

          </div>

        </div>

      )}

    </div>
  );
};

/* ============================================================
   SCORE BAR
   ============================================================ */

interface ScoreBarProps {
  label: string;
  score: number | null;
  color: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  color,
}) => {
  return (
    <div>

      <div className="flex justify-between text-xs mb-1.5">

        <span className="font-medium text-[#5D5355]">
          {label}
        </span>

        <span className="font-bold text-[#2D2526] font-mono">

          {score !== null
            ? `${Math.round(
                score
              )}%`
            : '—'}

        </span>

      </div>

      <div className="w-full h-1.5 bg-[#EEE3DF] rounded-full overflow-hidden">

        {score !== null &&
          score > 0 && (

            <div
              className={`h-full ${color} rounded-full transition-all duration-500`}
              style={{
                width: `${score}%`,
              }}
            />

          )}

      </div>

    </div>
  );
};