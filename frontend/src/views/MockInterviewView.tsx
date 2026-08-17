import React, {
  useEffect,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  PlayCircle,
  FileText,
  ArrowRight,
  Shield,
  History,
  Briefcase,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  sessionApi,
  dashboardApi,
  interviewApi,
  jdApi,
} from '../api';

import {
  SessionHistoryItem,
} from '../types';

/* =========================================================
   USER-SCOPED SELECTED JD STORAGE
   ========================================================= */

const SELECTED_JD_KEY_PREFIX =
  'interviewai_selected_jd_hash';

const LEGACY_SELECTED_JD_KEY =
  'interviewai_selected_jd_hash';

/* =========================================================
   SELECTED JD TYPES
   ========================================================= */

interface SelectedJD {
  jd_hash: string;
  filename?: string | null;
  structured_jd?: {
    job_title?: string | null;
    company?: string | null;
    location?: string | null;
    employment_type?: string | null;
  };
}

/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function getSelectedJDStorageKey(
  userId: string | null | undefined
): string | null {
  if (
    !userId ||
    !userId.trim()
  ) {
    return null;
  }

  return `${SELECTED_JD_KEY_PREFIX}_${userId}`;
}

function getStoredSelectedJDHash(
  userId: string | null | undefined
): string | null {
  try {
    const userScopedKey =
      getSelectedJDStorageKey(
        userId
      );

    /*
     * Preferred storage format.
     */
    if (userScopedKey) {
      const scopedHash =
        localStorage.getItem(
          userScopedKey
        );

      if (
        scopedHash &&
        scopedHash.trim()
      ) {
        return scopedHash.trim();
      }
    }

    /*
     * Backward compatibility with the older
     * global storage key.
     */
    const legacyHash =
      localStorage.getItem(
        LEGACY_SELECTED_JD_KEY
      );

    if (
      legacyHash &&
      legacyHash.trim() &&
      userScopedKey
    ) {
      localStorage.setItem(
        userScopedKey,
        legacyHash.trim()
      );

      localStorage.removeItem(
        LEGACY_SELECTED_JD_KEY
      );

      return legacyHash.trim();
    }

    return null;
  } catch {
    return null;
  }
}

function saveSelectedJDHash(
  userId: string | null | undefined,
  hash: string | null
) {
  try {
    const userScopedKey =
      getSelectedJDStorageKey(
        userId
      );

    if (!userScopedKey) {
      return;
    }

    if (
      hash &&
      hash.trim()
    ) {
      localStorage.setItem(
        userScopedKey,
        hash.trim()
      );
    } else {
      localStorage.removeItem(
        userScopedKey
      );
    }

    /*
     * Remove legacy global value so another
     * authenticated user cannot inherit it.
     */
    localStorage.removeItem(
      LEGACY_SELECTED_JD_KEY
    );
  } catch {
    // Ignore localStorage failures.
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export const MockInterviewView: React.FC = () => {
  const navigate =
    useNavigate();

  const {
    activeResumeProfile,
    activeResumeHash,
    user,
  } = useAuth();

  const userId =
    user?.id || null;

  /* =========================================================
     INTERVIEW SETTINGS
     ========================================================= */

  const [
    selectedType,
    setSelectedType,
  ] = useState<
    'mixed' |
    'technical' |
    'behavioral' |
    'scaling'
  >('mixed');

  const [
    selectedDifficulty,
    setSelectedDifficulty,
  ] = useState<
    'easy' |
    'medium' |
    'hard'
  >('medium');

  const [
    questionCount,
    setQuestionCount,
  ] = useState<number>(5);

  const [
    targetRole,
    setTargetRole,
  ] = useState<string>(
    'Software Engineer'
  );

  /* =========================================================
     SELECTED JD
     ========================================================= */

  const [
    selectedJDHash,
    setSelectedJDHash,
  ] = useState<string | null>(
    () =>
      getStoredSelectedJDHash(
        userId
      )
  );

  const [
    selectedJD,
    setSelectedJD,
  ] = useState<
    SelectedJD | null
  >(null);

  /* =========================================================
     HISTORY / STATUS
     ========================================================= */

  const [
    pastSessions,
    setPastSessions,
  ] = useState<
    SessionHistoryItem[]
  >([]);

  const [
    isStarting,
    setIsStarting,
  ] = useState<boolean>(
    false
  );

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState<boolean>(
    false
  );

  const [
    loadError,
    setLoadError,
  ] = useState<
    string | null
  >(null);

  const [
    startError,
    setStartError,
  ] = useState<
    string | null
  >(null);

  /* =========================================================
     LOAD SELECTED JD
     ========================================================= */

  const loadSelectedJD =
    async (
      preferredHash?: string | null
    ) => {
      setLoadError(
        null
      );

      const hash =
        preferredHash ||
        getStoredSelectedJDHash(
          userId
        );

      /*
       * No selected JD.
       */
      if (!hash) {
        setSelectedJDHash(
          null
        );

        setSelectedJD(
          null
        );

        return;
      }

      /*
       * Keep state + storage synchronized.
       */
      setSelectedJDHash(
        hash
      );

      saveSelectedJDHash(
        userId,
        hash
      );

      try {
        const jd =
          await jdApi.getJD(
            hash
          );

        /*
         * Confirm the backend actually returned
         * the requested JD.
         */
        if (
          !jd ||
          !jd.jd_hash
        ) {
          throw new Error(
            'Selected job description could not be loaded.'
          );
        }

        setSelectedJD({
          jd_hash:
            jd.jd_hash,

          filename:
            jd.filename,

          structured_jd: {
            job_title:
              typeof jd
                .structured_jd
                ?.job_title ===
              'string'
                ? jd
                    .structured_jd
                    .job_title
                : null,

            company:
              typeof jd
                .structured_jd
                ?.company ===
              'string'
                ? jd
                    .structured_jd
                    .company
                : null,

            location:
              typeof jd
                .structured_jd
                ?.location ===
              'string'
                ? jd
                    .structured_jd
                    .location
                : null,

            employment_type:
              typeof jd
                .structured_jd
                ?.employment_type ===
              'string'
                ? jd
                    .structured_jd
                    .employment_type
                : null,
          },
        });

        /*
         * If the JD has a title, use it as the
         * target role automatically.
         */
        const loadedRole =
          jd
            .structured_jd
            ?.job_title;

        if (
          typeof loadedRole ===
            'string' &&
          loadedRole.trim()
        ) {
          setTargetRole(
            loadedRole.trim()
          );
        }
      } catch (err) {
        setSelectedJD(
          null
        );

        /*
         * Remove an invalid selected hash.
         */
        setSelectedJDHash(
          null
        );

        saveSelectedJDHash(
          userId,
          null
        );

        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load the selected job description.'
        );
      }
    };

  /* =========================================================
     LOAD SESSION HISTORY
     ========================================================= */

  const fetchHistory =
    async () => {
      setIsLoadingHistory(
        true
      );

      setLoadError(
        null
      );

      try {
        const sessions =
          await sessionApi.getSessions(
            20,
            0
          );

        const history:
          SessionHistoryItem[] =
          sessions
            .filter(
              (session) =>
                session.status ===
                'completed'
            )
            .map(
              (session) => ({
                id:
                  session.session_id,

                session_id:
                  session.session_id,

                title:
                  session.title ||
                  'Mock Interview',

                date:
                  session.started_at
                    ? new Date(
                        session.started_at
                      ).toLocaleString()
                    : '',

                score:
                  typeof session.overall_score ===
                  'number'
                    ? session.overall_score
                    : 0,

                questions_attempted:
                  session.responses
                    ?.length ||
                  0,

                total_questions:
                  session.total_questions ||
                  session.questions
                    ?.length ||
                  0,

                type:
                  session.mode ||
                  'self_based',

                mode:
                  session.mode ||
                  'self_based',

                status:
                  'completed',

                overall_score:
                  session.overall_score,

                started_at:
                  session.started_at,
              })
            );

        setPastSessions(
          history
        );
      } catch (err) {
        /*
         * Dashboard history remains
         * the fallback.
         */
        try {
          const metrics =
            await dashboardApi.getDashboardMetrics();

          setPastSessions(
            metrics.session_history ||
              []
          );

          setLoadError(
            null
          );
        } catch (fallbackError) {
          setLoadError(
            fallbackError instanceof Error
              ? fallbackError.message
              : err instanceof Error
              ? err.message
              : 'Failed to load interview history.'
          );
        }
      } finally {
        setIsLoadingHistory(
          false
        );
      }
    };

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    /*
     * Wait for authenticated user identity
     * before loading user-scoped JD state.
     */
    if (!userId) {
      setSelectedJDHash(
        null
      );

      setSelectedJD(
        null
      );

      return;
    }

    loadSelectedJD();
    fetchHistory();

    const syncJD = () => {
      loadSelectedJD();
    };

    /*
     * This handles changes made by another
     * tab/window.
     */
    window.addEventListener(
      'storage',
      syncJD
    );

    return () => {
      window.removeEventListener(
        'storage',
        syncJD
      );
    };
  }, [
    userId,
  ]);

  /* =========================================================
     START INTERVIEW
     ========================================================= */

  const handleStartInterview =
    async () => {
      setIsStarting(
        true
      );

      setStartError(
        null
      );

      try {
        if (!activeResumeHash) {
          throw new Error(
            'Please upload and select a resume before starting an interview.'
          );
        }

        /*
         * Only the Mixed / Real Interview currently
         * uses both Resume + JD.
         *
         * Other interview types remain resume-grounded.
         */
        const isJobSpecific =
          selectedType ===
            'mixed' &&
          Boolean(
            selectedJDHash
          );

        const mode =
          isJobSpecific
            ? 'job_specific'
            : 'self_based';

        const typeTitles:
          Record<
            string,
            string
          > = {
            mixed:
              isJobSpecific
                ? 'JD-Grounded Mixed Interview'
                : 'Mixed Technical & Resume-Grounded Round',

            technical:
              'Deep Distributed & Technical Architecture',

            behavioral:
              'STAR Behavioral & Engineering Leadership',

            scaling:
              'High-Scale Concurrency & System Scaling',
          };

        /*
         * =====================================================
         * GENERATE QUESTIONS
         * =====================================================
         */

        const generated =
          await interviewApi.generateQuestions(
            {
              resume_hash:
                activeResumeHash,

              jd_hash:
                isJobSpecific
                  ? selectedJDHash
                  : null,

              mode,

              total_questions:
                questionCount,
            }
          );

        if (
          !generated.questions ||
          generated.questions
            .length === 0
        ) {
          throw new Error(
            'No interview questions were generated. Please try again.'
          );
        }

        /*
         * =====================================================
         * CREATE SESSION
         * =====================================================
         */

        const sessionRes =
          await sessionApi.createSession(
            {
              resume_hash:
                activeResumeHash,

              jd_hash:
                isJobSpecific
                  ? selectedJDHash
                  : null,

              mode,

              title:
                typeTitles[
                  selectedType
                ] ||
                'Mock Interview Round',

              role:
                isJobSpecific &&
                selectedJD
                  ?.structured_jd
                  ?.job_title
                  ? selectedJD
                      .structured_jd
                      .job_title
                  : targetRole,

              difficulty:
                selectedDifficulty,

              total_questions:
                generated
                  .questions
                  .length,

              questions:
                generated.questions,

              generation_summary:
                generated.generation_summary,
            }
          );

        /*
         * Refresh history after session creation.
         */
        await fetchHistory();

        /*
         * Go to the actual interview screen.
         */
        navigate(
          `/interview/session/${sessionRes.session_id}`
        );
      } catch (err) {
        setStartError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize mock interview session.'
        );
      } finally {
        setIsStarting(
          false
        );
      }
    };

  /* =========================================================
     INTERVIEW TYPES
     ========================================================= */

  const interviewTypes = [
    {
      id:
        'mixed' as const,

      title:
        'Mixed / Real Interview',

      description:
        'Balanced technical, project, and behavioral questions. Uses the selected JD when available.',

      tag:
        selectedJDHash
          ? 'JD + Resume'
          : 'Recommended',
    },

    {
      id:
        'technical' as const,

      title:
        'Deep Technical & Coding',

      description:
        'System fundamentals, language internals, database concepts, APIs, and technical problem solving.',

      tag:
        'Technical',
    },

    {
      id:
        'behavioral' as const,

      title:
        'Behavioral & Leadership',

      description:
        'STAR methodology, conflict resolution, collaboration, communication, and leadership scenarios.',

      tag:
        'STAR Focus',
    },

    {
      id:
        'scaling' as const,

      title:
        'System Scaling & Fault Tolerance',

      description:
        'Distributed systems, concurrency, queues, caching, resilience, and high-scale architecture.',

      tag:
        'High Scale',
    },
  ];

  /* =========================================================
     DISPLAY DATA
     ========================================================= */

  const resumeName =
    activeResumeProfile
      ?.structured_profile
      ?.name ||
    'No resume selected';

  const resumeFilename =
    activeResumeProfile
      ?.filename ||
    null;

  const jdTitle =
    selectedJD
      ?.structured_jd
      ?.job_title ||
    selectedJD
      ?.filename ||
    'No JD selected';

  const jdCompany =
    selectedJD
      ?.structured_jd
      ?.company ||
    null;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">

      {/* =====================================================
          ERROR AREA
          ===================================================== */}

      {(loadError ||
        startError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-start gap-2">

          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />

          <span>
            {startError ||
              loadError}
          </span>

        </div>
      )}

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">

        <div>

          <div className="flex items-center gap-2 mb-1">

            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Full-Screen Simulation
            </span>

          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Mock Interview
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Start a realistic interview session using your active resume and, when selected, your target job description.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          {resumeFilename && (
            <div className="flex items-center gap-2 text-xs font-mono bg-white px-3.5 py-2 rounded-full border border-gray-200 text-gray-700 shadow-xs">

              <FileText className="w-3.5 h-3.5 text-indigo-600" />

              <span>
                {resumeFilename}
              </span>

            </div>
          )}

          <button
            type="button"
            onClick={() =>
              loadSelectedJD()
            }
            className="p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
            title="Refresh selected JD"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* =====================================================
          ACTIVE CONTEXT
          ===================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* RESUME */}

        <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">

              <FileText className="w-5 h-5" />

            </div>

            <div className="min-w-0">

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                Active Resume
              </span>

              <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">
                {resumeName}
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                {activeResumeHash
                  ? 'Ready for interview grounding'
                  : 'Upload a resume first'}
              </p>

            </div>

          </div>

        </div>

        {/* JD */}

        <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">

          <div className="flex items-start justify-between gap-3">

            <div className="flex items-start gap-3 min-w-0">

              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">

                <Briefcase className="w-5 h-5" />

              </div>

              <div className="min-w-0">

                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  Selected Job Description
                </span>

                <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">
                  {jdTitle}
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  {selectedJDHash
                    ? jdCompany ||
                      'Target role selected'
                    : 'No JD selected'}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/app/jd'
                )
              }
              className="text-[10px] font-semibold text-indigo-600 hover:underline shrink-0"
            >
              Manage
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          SETUP CARD
          ===================================================== */}

      <div className="bg-white border border-gray-100 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-8">

        {/* STEP 1 */}

        <div className="space-y-4">

          <label className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wider flex items-center gap-2">

            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
              1
            </span>

            <span>
              Select Interview Round Type
            </span>

          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {interviewTypes.map(
              type => (

                <div
                  key={type.id}
                  onClick={() =>
                    setSelectedType(
                      type.id
                    )
                  }
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    selectedType ===
                    type.id
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >

                  <div className="flex items-center justify-between gap-2">

                    <span className="text-xs font-bold text-gray-900">
                      {type.title}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {type.tag}
                    </span>

                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {type.description}
                  </p>

                  <div className="flex items-center text-[11px] font-semibold text-indigo-600 pt-1">
                    {selectedType ===
                    type.id
                      ? 'Selected'
                      : 'Select Round'}
                  </div>

                </div>
              )
            )}

          </div>

        </div>

        {/* STEP 2 */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-gray-100">

          {/* TARGET ROLE */}

          <div className="space-y-2">

            <label className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wider block">
              Target Role
            </label>

            <input
              type="text"
              value={
                selectedJD
                  ?.structured_jd
                  ?.job_title ||
                targetRole
              }
              onChange={e =>
                setTargetRole(
                  e.target.value
                )
              }
              placeholder="e.g. Software Engineer"
              disabled={
                Boolean(
                  selectedJD
                    ?.structured_jd
                    ?.job_title
                )
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-70"
            />

          </div>

          {/* DIFFICULTY */}

          <div className="space-y-2">

            <label className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wider block">
              Difficulty Tier
            </label>

            <div className="grid grid-cols-3 gap-2">

              {(
                [
                  'easy',
                  'medium',
                  'hard',
                ] as const
              ).map(
                diff => (

                  <button
                    key={diff}
                    type="button"
                    onClick={() =>
                      setSelectedDifficulty(
                        diff
                      )
                    }
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      selectedDifficulty ===
                      diff
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {diff}
                  </button>

                )
              )}

            </div>

          </div>

          {/* QUESTION COUNT */}

          <div className="space-y-2">

            <label className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wider block">
              Question Count
            </label>

            <div className="grid grid-cols-3 gap-2">

              {[3, 5, 8].map(
                count => (

                  <button
                    key={count}
                    type="button"
                    onClick={() =>
                      setQuestionCount(
                        count
                      )
                    }
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      questionCount ===
                      count
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {count}
                  </button>

                )
              )}

            </div>

          </div>

        </div>

        {/* JOB MODE NOTICE */}

        {selectedType ===
          'mixed' && (
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">

            <div className="flex items-start gap-3">

              <Briefcase className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />

              <div>

                <p className="text-xs font-bold text-orange-900">
                  {selectedJDHash
                    ? 'JD-grounded mock interview'
                    : 'Resume-grounded mock interview'}
                </p>

                <p className="text-[11px] text-orange-800/80 mt-1">
                  {selectedJDHash
                    ? 'Your questions will use both the active resume and the selected job description.'
                    : 'Select a JD on the Job Description page to include role-specific questions.'}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            LAUNCH BAR
            ================================================= */}

        <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">

              <Shield className="w-5 h-5" />

            </div>

            <div>

              <h4 className="text-xs font-bold text-indigo-950 font-serif">
                Isolated Distraction-Free Environment
              </h4>

              <p className="text-[11px] text-indigo-800">
                {selectedJDHash
                  ? 'Resume + JD grounded interview • AI evaluation • performance report'
                  : 'Resume grounded interview • AI evaluation • performance report'}
              </p>

            </div>

          </div>

          <button
            type="button"
            disabled={
              isStarting ||
              !activeResumeHash
            }
            onClick={
              handleStartInterview
            }
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >

            {isStarting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                <span>
                  Launching Simulation...
                </span>
              </>
            ) : (
              <>
                <span>
                  Start Mock Interview
                </span>

                <PlayCircle className="w-4 h-4" />
              </>
            )}

          </button>

        </div>

      </div>

      {/* =====================================================
          HISTORY
          ===================================================== */}

      <div className="space-y-4">

        <div className="flex items-center justify-between px-1">

          <div className="flex items-center gap-2">

            <History className="w-4 h-4 text-gray-500" />

            <h2 className="text-base font-bold font-serif text-gray-900">
              Completed Interview History
            </h2>

          </div>

          <button
            type="button"
            onClick={() =>
              fetchHistory()
            }
            disabled={
              isLoadingHistory
            }
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >

            <RefreshCw
              className={`w-3 h-3 ${
                isLoadingHistory
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh

          </button>

        </div>

        <div className="bg-white border border-gray-100 rounded-[28px] overflow-hidden shadow-sm divide-y divide-gray-100">

          {pastSessions.length ===
          0 ? (

            <div className="p-10 text-center">

              <p className="text-sm font-semibold text-gray-500">
                No completed mock interviews yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Start your first mock interview above.
              </p>

            </div>

          ) : (

            pastSessions
              .slice(
                0,
                6
              )
              .map(
                sess => (

                  <div
                    key={
                      sess.id ||
                      sess.session_id
                    }
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >

                    <div className="space-y-1 min-w-0">

                      <div className="flex items-center gap-2 flex-wrap">

                        <span className="text-xs font-bold text-gray-900 font-serif">
                          {sess.title ||
                            'Mock Interview'}
                        </span>

                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Completed
                        </span>

                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-gray-400">

                        <span>
                          {sess.date ||
                            'Unknown date'}
                        </span>

                        <span>
                          •
                        </span>

                        <span>
                          {
                            sess.questions_attempted
                          }{' '}
                          Questions
                        </span>

                        <span>
                          •
                        </span>

                        <span>
                          {sess.type ||
                            sess.mode ||
                            'Interview'}
                        </span>

                      </div>

                    </div>

                    <div className="flex items-center gap-4">

                      <div className="text-right">

                        <span className="text-xs font-mono font-bold text-gray-900 block">
                          Score:{' '}
                          {typeof sess.score ===
                          'number'
                            ? `${Math.round(
                                sess.score
                              )}%`
                            : '—'}
                        </span>

                        <span className="text-[10px] font-mono text-emerald-600">
                          Evaluated
                        </span>

                      </div>

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
                        className="px-4 py-2 rounded-full border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-700 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0"
                      >

                        <span>
                          Review
                        </span>

                        <ArrowRight className="w-3 h-3" />

                      </button>

                    </div>

                  </div>

                )
              )

          )}

        </div>

      </div>

    </div>
  );
};