import React, {
  useEffect,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  TrendingUp,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { jdApi } from '../api';
import { useAuth } from '../context/AuthContext';

/* =========================================================
   USER-SCOPED SELECTED JD STORAGE
   ========================================================= */

const SELECTED_JD_KEY_PREFIX =
  'interviewai_selected_jd_hash';

const LEGACY_SELECTED_JD_KEY =
  'interviewai_selected_jd_hash';

/* =========================================================
   TYPES
   ========================================================= */

interface SkillEvidence {
  skill: string;

  status:
    | 'matched'
    | 'partial'
    | 'missing';

  evidence_type: string;

  evidence: string;

  confidence: number;
}

interface MatchResult {
  resume_hash: string;

  jd_hash: string;

  matched_skills: string[];

  missing_skills: string[];

  weak_areas: string[];

  resume_skills: string[];

  jd_required_skills: string[];

  skill_evidence: SkillEvidence[];

  partial_skills: string[];

  required_match_percentage: number;
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
    /*
     * Preferred user-scoped storage.
     */
    const scopedKey =
      getSelectedJDStorageKey(
        userId
      );

    if (scopedKey) {
      const scopedHash =
        localStorage.getItem(
          scopedKey
        );

      if (
        scopedHash &&
        scopedHash.trim()
      ) {
        return scopedHash.trim();
      }
    }

    /*
     * Backward compatibility for the old global key.
     *
     * This is migrated immediately into the
     * user-specific key.
     */
    const legacyHash =
      localStorage.getItem(
        LEGACY_SELECTED_JD_KEY
      );

    if (
      legacyHash &&
      legacyHash.trim() &&
      scopedKey
    ) {
      localStorage.setItem(
        scopedKey,
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
    const scopedKey =
      getSelectedJDStorageKey(
        userId
      );

    if (!scopedKey) {
      return;
    }

    if (
      hash &&
      hash.trim()
    ) {
      localStorage.setItem(
        scopedKey,
        hash.trim()
      );
    } else {
      localStorage.removeItem(
        scopedKey
      );
    }

    /*
     * Remove old global selection.
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

export const MatchingView: React.FC = () => {
  const navigate =
    useNavigate();

  const {
    activeResumeHash,
    activeResumeProfile,
    user,
  } = useAuth();

  const userId =
    user?.id || null;

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
    Awaited<
      ReturnType<
        typeof jdApi.getJD
      >
    > | null
  >(null);

  /* =========================================================
     MATCH RESULT
     ========================================================= */

  const [
    result,
    setResult,
  ] = useState<MatchResult | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  /* =========================================================
     SYNC SELECTED JD
     ========================================================= */

  useEffect(() => {
    const syncSelectedJD =
      () => {
        const hash =
          getStoredSelectedJDHash(
            userId
          );

        setSelectedJDHash(
          hash
        );
      };

    if (!userId) {
      setSelectedJDHash(
        null
      );

      setSelectedJD(
        null
      );

      return;
    }

    syncSelectedJD();

    /*
     * Cross-tab synchronization.
     */
    window.addEventListener(
      'storage',
      syncSelectedJD
    );

    return () => {
      window.removeEventListener(
        'storage',
        syncSelectedJD
      );
    };
  }, [
    userId,
  ]);

  /* =========================================================
     FETCH MATCH
     ========================================================= */

  const fetchMatch =
    async () => {
      setError(null);
      setResult(null);
      setSelectedJD(null);

      /*
       * Resume is mandatory.
       */
      if (!activeResumeHash) {
        setError(
          'Upload and select a resume before running skill matching.'
        );

        return;
      }

      /*
       * JD is mandatory.
       */
      if (!selectedJDHash) {
        setError(
          'Select a job description from the JD page before running skill matching.'
        );

        return;
      }

      setLoading(true);

      try {
        /*
         * Always use the current active resume
         * and the currently selected JD.
         */
        const [
          matchResponse,
          jdResponse,
        ] = await Promise.all([
          jdApi.matchSkills(
            activeResumeHash,
            selectedJDHash
          ),

          jdApi.getJD(
            selectedJDHash
          ),
        ]);

        /*
         * Verify that the backend actually matched
         * the requested pair.
         */
        const match =
          matchResponse as MatchResult;

        if (
          match.resume_hash &&
          match.resume_hash !==
            activeResumeHash
        ) {
          throw new Error(
            'The backend returned a different resume for this skill match. Please refresh and try again.'
          );
        }

        if (
          match.jd_hash &&
          match.jd_hash !==
            selectedJDHash
        ) {
          throw new Error(
            'The backend returned a different job description for this skill match. Please refresh and try again.'
          );
        }

        /*
         * Keep the selection synchronized.
         */
        saveSelectedJDHash(
          userId,
          selectedJDHash
        );

        setResult(
          match
        );

        setSelectedJD(
          jdResponse
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to compute JD match.'
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================================================
     AUTOMATIC MATCH
     ========================================================= */

  useEffect(() => {
    /*
     * Only attempt matching when we have
     * both pieces of context.
     */
    if (
      !userId ||
      !activeResumeHash ||
      !selectedJDHash
    ) {
      return;
    }

    fetchMatch();

    // Intentionally triggered by resume/JD selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
    activeResumeHash,
    selectedJDHash,
  ]);

  /* =========================================================
     SCORE
     ========================================================= */

  const matchPercentage =
    result?.required_match_percentage ??
    0;

  const matchedCount =
    result?.matched_skills.length ??
    0;

  const partialCount =
    result?.partial_skills.length ??
    0;

  const missingCount =
    result?.missing_skills.length ??
    0;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            RESUME-JD FIT ANALYSIS
          </span>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
            Skill Matching
          </h1>

          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Compare your active resume against the selected job description and understand exactly why each requirement is matched, partially supported, or missing.
          </p>

        </div>

        <button
          type="button"
          onClick={fetchMatch}
          disabled={loading}
          className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >

          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh Match

        </button>

      </header>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-xs text-rose-700 flex items-start gap-3">

          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />

          <div className="space-y-2">

            <p>
              {error}
            </p>

            {!activeResumeHash && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/app/resume'
                  )
                }
                className="font-bold text-rose-800 hover:underline"
              >
                Upload / Select Resume →
              </button>
            )}

            {activeResumeHash &&
              !selectedJDHash && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/app/jd'
                    )
                  }
                  className="font-bold text-rose-800 hover:underline"
                >
                  Select Job Description →
                </button>
              )}

          </div>

        </div>
      )}

      {/* =====================================================
          CONTEXT MISSING
          ===================================================== */}

      {!loading &&
        !result &&
        activeResumeHash &&
        !selectedJDHash && (
        <div className="rounded-[32px] bg-white border border-dashed border-gray-200 p-12 text-center shadow-sm">

          <Briefcase className="w-10 h-10 text-orange-500 mx-auto" />

          <h2 className="text-base font-bold text-gray-900 mt-4">
            Select a Job Description
          </h2>

          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Skill matching compares your currently active resume with the JD selected on the Job Description page.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/jd'
              )
            }
            className="mt-5 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            Select Job Description

            <ArrowRight className="w-3.5 h-3.5" />

          </button>

        </div>
      )}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loading && (
        <div className="rounded-[32px] bg-white border border-gray-100 p-12 text-center shadow-sm">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />

          <p className="mt-4 text-sm font-medium text-gray-700">
            Computing your resume-to-JD fit...
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Comparing required skills and resume evidence.
          </p>

        </div>
      )}

      {/* =====================================================
          RESULTS
          ===================================================== */}

      {!loading &&
        result &&
        selectedJD && (

        <div className="space-y-6">

          {/* =================================================
              CONTEXT
              ================================================= */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* RESUME */}

            <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">

                  <FileText className="w-5 h-5" />

                </div>

                <div className="min-w-0">

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    Active Resume
                  </span>

                  <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">

                    {activeResumeProfile
                      ?.structured_profile
                      ?.name ||
                      'Selected Resume'}

                  </h3>

                  <p className="text-xs text-gray-500 mt-1">

                    {result.resume_skills.length}{' '}
                    indexed skills

                  </p>

                </div>

              </div>

            </div>

            {/* JD */}

            <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">

                  <Briefcase className="w-5 h-5" />

                </div>

                <div className="min-w-0">

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    Selected Job Description
                  </span>

                  <h3 className="text-sm font-bold text-gray-900 mt-1 truncate">

                    {selectedJD
                      .structured_jd
                      .job_title ||
                      selectedJD.filename ||
                      'Selected JD'}

                  </h3>

                  <p className="text-xs text-gray-500 mt-1">

                    {selectedJD
                      .structured_jd
                      .company ||
                      'Company not specified'}

                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              MATCH SCORE
              ================================================= */}

          <div className="rounded-[32px] bg-[#FFFDFC] text-[#2D2526] border border-[#E1D6D2] p-6 sm:p-8 shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

              <div className="flex flex-col items-center justify-center text-center">

                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E8082]">
                  Required Skill Match
                </span>

                <div className="relative w-36 h-36 mt-4">

                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 128 128"
                  >

                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-[#EFE6E2]"
                    />

                    {matchPercentage >
                      0 && (
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="326.73"
                        strokeDashoffset={
                          326.73 *
                          (1 -
                            Math.min(
                              Math.max(
                                matchPercentage,
                                0
                              ),
                              100
                            ) /
                              100)
                        }
                        strokeLinecap="round"
                        className="text-[#C43173] transition-all duration-700"
                      />
                    )}

                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">

                    <span className="text-3xl font-bold font-serif text-[#2D2526]">
                      {Math.round(
                        matchPercentage
                      )}
                      %
                    </span>

                    <span className="text-[9px] text-[#9A8C8F] uppercase font-mono">
                      Fit
                    </span>

                  </div>

                </div>

                <p className="text-xs text-[#75696B] mt-2">

                  {matchedCount}{' '}
                  matched •{' '}

                  {partialCount}{' '}
                  partial •{' '}

                  {missingCount}{' '}
                  missing

                </p>

              </div>

              <div className="lg:col-span-2 space-y-5">

                <div>

                  <div className="flex items-center gap-2 text-[#C43173]">

                    <Sparkles className="w-4 h-4" />

                    <span className="text-[10px] font-mono uppercase tracking-wider">
                      Role Fit Summary
                    </span>

                  </div>

                  <h2 className="text-xl font-bold mt-2 text-[#2D2526]">

                    {matchPercentage >=
                    80
                      ? 'Strong role alignment'
                      : matchPercentage >=
                        60
                      ? 'Good alignment with some gaps'
                      : matchPercentage >=
                        40
                      ? 'Moderate alignment — targeted preparation recommended'
                      : 'Significant skill gaps — preparation strongly recommended'}

                  </h2>

                  <p className="text-sm text-[#75696B] mt-2 leading-relaxed">
                    The score is based on required skills
                    extracted from the selected JD. Partial
                    evidence is reported separately so the
                    candidate can see where additional
                    preparation may be needed.
                  </p>

                </div>

                <div className="grid grid-cols-3 gap-3">

                  <MetricCard
                    label="Matched"
                    value={
                      matchedCount
                    }
                    tone="green"
                  />

                  <MetricCard
                    label="Partial"
                    value={
                      partialCount
                    }
                    tone="indigo"
                  />

                  <MetricCard
                    label="Missing"
                    value={
                      missingCount
                    }
                    tone="amber"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              EVIDENCE BREAKDOWN
              ================================================= */}

          <div className="space-y-4">

            <div>

              <h2 className="text-lg font-bold font-serif text-gray-900">
                Evidence-Based Skill Analysis
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Each requirement is evaluated against the information extracted from your resume.
              </p>

            </div>

            {result.skill_evidence.length ===
            0 ? (

              <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-8 text-center">

                <p className="text-xs text-gray-500">
                  No skill evidence is available for this match.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {result.skill_evidence.map(
                  (
                    evidence,
                    index
                  ) => {

                    const status =
                      evidence.status;

                    const statusConfig =
                      status ===
                      'matched'
                        ? {
                            label:
                              'MATCHED',

                            wrapper:
                              'bg-green-50 border-green-100',

                            badge:
                              'bg-green-100 text-green-800',

                            icon:
                              <CheckCircle2 className="w-4 h-4 text-green-600" />,

                            title:
                              'text-green-900',
                          }
                        : status ===
                          'partial'
                        ? {
                            label:
                              'PARTIAL',

                            wrapper:
                              'bg-indigo-50 border-indigo-100',

                            badge:
                              'bg-indigo-100 text-indigo-800',

                            icon:
                              <TrendingUp className="w-4 h-4 text-indigo-600" />,

                            title:
                              'text-indigo-900',
                          }
                        : {
                            label:
                              'MISSING',

                            wrapper:
                              'bg-amber-50 border-amber-100',

                            badge:
                              'bg-amber-100 text-amber-800',

                            icon:
                              <XCircle className="w-4 h-4 text-amber-600" />,

                            title:
                              'text-amber-900',
                          };

                    return (
                      <div
                        key={`${evidence.skill}-${index}`}
                        className={`rounded-[24px] border p-5 ${statusConfig.wrapper}`}
                      >

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                          <div className="flex items-start gap-3 min-w-0">

                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">

                              {
                                statusConfig.icon
                              }

                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <h3
                                  className={`text-sm font-bold ${statusConfig.title}`}
                                >
                                  {
                                    evidence.skill
                                  }
                                </h3>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${statusConfig.badge}`}
                                >
                                  {
                                    statusConfig.label
                                  }
                                </span>

                              </div>

                              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mt-1">

                                Evidence source:{' '}

                                {
                                  evidence.evidence_type
                                }

                              </p>

                            </div>

                          </div>

                          <div className="shrink-0">

                            <span className="text-[10px] font-mono text-gray-500">

                              Confidence{' '}

                              {Math.round(
                                evidence.confidence
                              )}
                              %

                            </span>

                          </div>

                        </div>

                        <div className="mt-4 p-4 rounded-xl bg-white/80 border border-white">

                          <p className="text-xs text-gray-700 leading-relaxed">

                            {
                              evidence.evidence
                            }

                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </div>

          {/* =================================================
              REQUIRED SKILL MATRIX
              ================================================= */}

          <div className="rounded-[28px] bg-white border border-gray-100 p-6 shadow-sm">

            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

              <ShieldCheck className="w-4 h-4 text-indigo-600" />

              <div>

                <h3 className="text-sm font-bold text-gray-900">
                  Required Skills Matrix
                </h3>

                <p className="text-xs text-gray-500 mt-0.5">
                  Explicitly required skills from the selected job description.
                </p>

              </div>

            </div>

            {result.jd_required_skills.length >
            0 ? (

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-5">

                {result.jd_required_skills.map(
                  (
                    skill
                  ) => {

                    const matched =
                      result.matched_skills.includes(
                        skill
                      );

                    const partial =
                      result.partial_skills.includes(
                        skill
                      );

                    return (
                      <div
                        key={skill}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          matched
                            ? 'bg-green-50 border-green-100'
                            : partial
                            ? 'bg-indigo-50 border-indigo-100'
                            : 'bg-amber-50 border-amber-100'
                        }`}
                      >

                        <span
                          className={`text-xs font-medium ${
                            matched
                              ? 'text-green-800'
                              : partial
                              ? 'text-indigo-800'
                              : 'text-amber-800'
                          }`}
                        >
                          {skill}
                        </span>

                        {matched ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        ) : partial ? (
                          <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}

                      </div>
                    );
                  }
                )}

              </div>

            ) : (

              <p className="text-xs text-gray-400 mt-5">
                No required skills were extracted from this JD.
              </p>

            )}

          </div>

          {/* =================================================
              PREPARATION ACTION
              ================================================= */}

          <div className="rounded-[28px] bg-indigo-50 border border-indigo-100 p-6 sm:p-7">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <Sparkles className="w-4 h-4 text-indigo-600" />

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700">
                    Personalized Preparation
                  </span>

                </div>

                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  Practice specifically for this role
                </h3>

                <p className="text-xs text-gray-600 mt-1 max-w-xl">
                  Generate interview questions using this exact resume and selected JD, including project, technical, problem-solving, and behavioral coverage.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/app/prepare?mode=job'
                  )
                }
                className="shrink-0 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >

                Prepare for This Role

                <ArrowRight className="w-3.5 h-3.5" />

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

/* ============================================================
   METRIC CARD
   ============================================================ */

const MetricCard: React.FC<{
  label: string;
  value: number;
  tone:
    | 'green'
    | 'amber'
    | 'indigo';
}> = ({
  label,
  value,
  tone,
}) => {
  const toneClasses =
    tone === 'green'
      ? {
          wrapper:
            'bg-green-50 border-green-100',

          label:
            'text-green-700',

          value:
            'text-green-800',
        }
      : tone === 'amber'
      ? {
          wrapper:
            'bg-amber-50 border-amber-100',

          label:
            'text-amber-700',

          value:
            'text-amber-800',
        }
      : {
          wrapper:
            'bg-indigo-50 border-indigo-100',

          label:
            'text-indigo-700',

          value:
            'text-indigo-800',
        };

  return (
    <div
      className={`p-4 rounded-2xl border ${toneClasses.wrapper}`}
    >

      <span
        className={`text-[10px] uppercase font-mono ${toneClasses.label}`}
      >
        {label}
      </span>

      <div
        className={`text-2xl font-bold font-serif mt-1 ${toneClasses.value}`}
      >
        {value}
      </div>

    </div>
  );
};