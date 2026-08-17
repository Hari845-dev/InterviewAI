import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { jdApi } from '../api';

type JDRecord =
  Awaited<
    ReturnType<typeof jdApi.getJDs>
  >[number];

type JDStructuredProfile =
  JDRecord['structured_jd'];

/*
 * ============================================================
 * USER-SCOPED SELECTED JD STORAGE
 * ============================================================
 */

const SELECTED_JD_KEY_PREFIX =
  'interviewai_selected_jd_hash';

const LEGACY_SELECTED_JD_KEY =
  'interviewai_selected_jd_hash';

function getSelectedJDStorageKey(
  userId: string | null | undefined
): string | null {
  if (!userId || !userId.trim()) {
    return null;
  }

  return `${SELECTED_JD_KEY_PREFIX}_${userId}`;
}

function getStoredSelectedJDHash(
  userId: string | null | undefined
): string | null {
  try {
    /*
     * First use the same user-scoped key that
     * PreparationSetupView uses.
     */
    const userScopedKey =
      getSelectedJDStorageKey(
        userId
      );

    if (userScopedKey) {
      const scopedValue =
        localStorage.getItem(
          userScopedKey
        );

      if (
        scopedValue &&
        scopedValue.trim()
      ) {
        return scopedValue.trim();
      }
    }

    /*
     * Backward compatibility:
     *
     * Older versions stored the JD using:
     *
     * interviewai_selected_jd_hash
     *
     * If found, migrate it to the user-scoped key.
     */
    const legacyValue =
      localStorage.getItem(
        LEGACY_SELECTED_JD_KEY
      );

    if (
      legacyValue &&
      legacyValue.trim() &&
      userScopedKey
    ) {
      localStorage.setItem(
        userScopedKey,
        legacyValue.trim()
      );

      return legacyValue.trim();
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
     * Remove the old global key so different users
     * can never accidentally inherit this JD.
     */
    localStorage.removeItem(
      LEGACY_SELECTED_JD_KEY
    );
  } catch {
    // Ignore localStorage errors.
  }
}

export const JDView: React.FC = () => {
  const navigate = useNavigate();

  const {
    activeResumeHash,
    user,
  } = useAuth();

  /*
   * ==========================================================
   * USER
   * ==========================================================
   */

  const userId =
    user?.id || null;

  /*
   * ==========================================================
   * FILE INPUT
   * ==========================================================
   */

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [
    jds,
    setJDs,
  ] = useState<JDRecord[]>([]);

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
    loading,
    setLoading,
  ] = useState<boolean>(true);

  const [
    uploading,
    setUploading,
  ] = useState<boolean>(false);

  const [
    deletingHash,
    setDeletingHash,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null
  );

  /*
   * ==========================================================
   * RESET SELECTED JD WHEN USER CHANGES
   * ==========================================================
   */

  useEffect(() => {
    const storedHash =
      getStoredSelectedJDHash(
        userId
      );

    setSelectedJDHash(
      storedHash
    );
  }, [
    userId,
  ]);

  /*
   * ==========================================================
   * SELECTED JD
   * ==========================================================
   */

  const selectedJD =
    useMemo<JDRecord | undefined>(
      () => {
        if (!selectedJDHash) {
          return undefined;
        }

        return jds.find(
          (jd) =>
            jd.jd_hash ===
            selectedJDHash
        );
      },
      [
        jds,
        selectedJDHash,
      ]
    );

  const selectedProfile =
    selectedJD?.structured_jd;

  /*
   * ==========================================================
   * LOAD ALL JDS
   * ==========================================================
   */

  const loadJDs = async (
    preferredHash?: string | null
  ) => {
    setLoading(true);
    setError(null);

    try {
      const records =
        await jdApi.getJDs();

      setJDs(
        records
      );

      /*
       * Priority:
       *
       * 1. Explicit preferred hash
       * 2. Current React state
       * 3. User-scoped localStorage
       */
      const savedHash =
        preferredHash ||
        selectedJDHash ||
        getStoredSelectedJDHash(
          userId
        );

      const selectedStillExists =
        Boolean(
          savedHash &&
          records.some(
            (jd) =>
              jd.jd_hash ===
              savedHash
          )
        );

      if (
        selectedStillExists &&
        savedHash
      ) {
        setSelectedJDHash(
          savedHash
        );

        saveSelectedJDHash(
          userId,
          savedHash
        );
      } else if (
        records.length > 0
      ) {
        /*
         * If nothing was selected yet, select
         * the newest stored JD so job preparation
         * remains immediately usable.
         */
        const firstHash =
          records[0].jd_hash;

        setSelectedJDHash(
          firstHash
        );

        saveSelectedJDHash(
          userId,
          firstHash
        );
      } else {
        setSelectedJDHash(
          null
        );

        saveSelectedJDHash(
          userId,
          null
        );
      }

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load stored job descriptions.';

      setError(
        message
      );
    } finally {
      setLoading(
        false
      );
    }
  };

  /*
   * IMPORTANT:
   *
   * Reload after user identity is available.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    loadJDs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userId,
  ]);

  /*
   * ==========================================================
   * SELECT JD
   * ==========================================================
   */

  const handleSelectJD = (
    jdHash: string
  ) => {
    setSelectedJDHash(
      jdHash
    );

    saveSelectedJDHash(
      userId,
      jdHash
    );

    setSuccessMessage(
      'Job description selected for job-specific preparation.'
    );

    window.setTimeout(() => {
      setSuccessMessage(
        null
      );
    }, 3000);
  };

  /*
   * ==========================================================
   * UPLOAD JD
   * ==========================================================
   */

  const handleUpload = async (
    file: File | null
  ) => {
    if (!file) {
      return;
    }

    setUploading(
      true
    );

    setError(
      null
    );

    setSuccessMessage(
      null
    );

    try {
      const response =
        await jdApi.uploadJD(
          file
        );

      const records =
        await jdApi.getJDs();

      setJDs(
        records
      );

      const uploadedHash =
        response.jd_hash;

      /*
       * Automatically select the newly uploaded JD.
       */
      setSelectedJDHash(
        uploadedHash
      );

      saveSelectedJDHash(
        userId,
        uploadedHash
      );

      setSuccessMessage(
        response.cached
          ? 'This job description already existed. It has been selected.'
          : 'Job description uploaded and analyzed successfully.'
      );

      window.setTimeout(() => {
        setSuccessMessage(
          null
        );
      }, 3500);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to upload JD.'
      );
    } finally {
      setUploading(
        false
      );

      /*
       * Allow the same file to be selected again.
       */
      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    }
  };

  /*
   * ==========================================================
   * DELETE JD
   * ==========================================================
   */

  const handleDelete = async (
    jd: JDRecord
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${jd.filename || jd.structured_jd?.job_title || 'this job description'}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingHash(
      jd.jd_hash
    );

    setError(
      null
    );

    setSuccessMessage(
      null
    );

    try {
      await jdApi.deleteJD(
        jd.jd_hash
      );

      const remaining =
        jds.filter(
          (item) =>
            item.jd_hash !==
            jd.jd_hash
        );

      setJDs(
        remaining
      );

      if (
        selectedJDHash ===
        jd.jd_hash
      ) {
        /*
         * Automatically select another remaining JD.
         */
        const nextJD =
          remaining[0];

        if (nextJD) {
          setSelectedJDHash(
            nextJD.jd_hash
          );

          saveSelectedJDHash(
            userId,
            nextJD.jd_hash
          );
        } else {
          setSelectedJDHash(
            null
          );

          saveSelectedJDHash(
            userId,
            null
          );
        }
      }

      setSuccessMessage(
        'Job description deleted successfully.'
      );

      window.setTimeout(() => {
        setSuccessMessage(
          null
        );
      }, 3000);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete JD.'
      );
    } finally {
      setDeletingHash(
        null
      );
    }
  };

  /*
   * ==========================================================
   * DISPLAY HELPERS
   * ==========================================================
   */

  const profile =
    selectedProfile;

  const requiredSkills =
    Array.isArray(
      profile?.required_skills
    )
      ? profile.required_skills
      : [];

  const preferredSkills =
    Array.isArray(
      profile?.preferred_skills
    )
      ? profile.preferred_skills
      : [];

  const responsibilities =
    Array.isArray(
      profile?.responsibilities
    )
      ? profile.responsibilities
      : [];

  const qualifications =
    Array.isArray(
      profile?.qualifications
    )
      ? profile.qualifications
      : [];

  const educationRequirements =
    Array.isArray(
      profile?.education_requirements
    )
      ? profile.education_requirements
      : [];

  const certifications =
    Array.isArray(
      profile?.certifications
    )
      ? profile.certifications
      : [];

  const niceToHave =
    Array.isArray(
      profile?.nice_to_have
    )
      ? profile.nice_to_have
      : [];

  const otherRequirements =
    Array.isArray(
      profile?.other_requirements
    )
      ? profile.other_requirements
      : [];

  const formatDate = (
    isoString?: string | null
  ) => {
    if (!isoString) {
      return 'Recent';
    }

    try {
      return new Date(
        isoString
      ).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );
    } catch {
      return 'Recent';
    }
  };

  /*
   * ==========================================================
   * EMPTY STATE
   * ==========================================================
   */

  if (
    !loading &&
    jds.length === 0
  ) {
    return (
      <div className="space-y-8 animate-fade-in pb-16">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <div className="flex items-center gap-2">

              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                JOB & ROLE MANAGEMENT
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                0 Job Descriptions
              </span>

            </div>

            <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
              My Job Descriptions
            </h1>

            <p className="text-gray-500 text-sm mt-1 max-w-2xl">
              Store multiple target roles, inspect extracted requirements, and use any selected JD for job-specific interview preparation.
            </p>

          </div>

        </div>

        {error && (
          <ErrorBanner
            message={error}
          />
        )}

        <div className="p-12 rounded-[32px] bg-white border-2 border-dashed border-gray-200 text-center space-y-5 shadow-sm">

          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto">

            <h2 className="text-lg font-bold text-gray-900">
              No Job Descriptions Stored Yet
            </h2>

            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Upload a job description and InterviewAI will extract the role, company, skills, responsibilities, qualifications, and other requirements for personalized preparation.
            </p>

          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={(event) =>
              handleUpload(
                event.target.files?.[0] ||
                null
              )
            }
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-full text-xs font-bold shadow-lg shadow-indigo-100 transition-all inline-flex items-center gap-2"
          >

            <Plus className="w-4 h-4" />

            {uploading
              ? 'Processing JD...'
              : 'Upload Job Description'}

          </button>

        </div>

      </div>
    );
  }

  /*
   * ==========================================================
   * MAIN PAGE
   * ==========================================================
   */

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              JOB & ROLE MANAGEMENT
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
              {jds.length}{' '}
              {jds.length === 1
                ? 'Job'
                : 'Jobs'} Stored
            </span>

          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
            My Job Descriptions
          </h1>

          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Manage your target roles, inspect extracted requirements, and select the job description for your next job-specific interview.
          </p>

        </div>

        <div className="flex items-center gap-3">

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={(event) =>
              handleUpload(
                event.target.files?.[0] ||
                null
              )
            }
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >

            <Plus className="w-3.5 h-3.5 text-indigo-600" />

            <span>
              {uploading
                ? 'Processing...'
                : 'Upload New JD'}
            </span>

          </button>

          {activeResumeHash && (
            <button
              type="button"
              disabled={!selectedJDHash}
              onClick={() =>
                navigate(
                  '/app/prepare?mode=job'
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
            >

              <Briefcase className="w-3.5 h-3.5" />

              <span>
                Start Job Prep
              </span>

              <ArrowRight className="w-3.5 h-3.5" />

            </button>
          )}

        </div>

      </header>

      {error && (
        <ErrorBanner
          message={error}
        />
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">

          <CheckCircle2 className="w-4 h-4 shrink-0" />

          <span>
            {successMessage}
          </span>

        </div>
      )}

      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
            Stored Job Descriptions
          </h2>

          <span className="text-[10px] text-gray-400 font-mono">
            Select one to inspect its full profile
          </span>

        </div>

        {loading ? (

          <div className="p-10 rounded-[28px] bg-white border border-gray-100 shadow-sm flex items-center justify-center">

            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">

              <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />

              Loading stored job descriptions...

            </div>

          </div>

        ) : (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {jds.map(
              (jd) => {

                const isSelected =
                  jd.jd_hash ===
                  selectedJDHash;

                const jdProfile =
                  jd.structured_jd;

                return (
                  <div
                    key={jd.jd_hash}
                    className={`p-5 rounded-[24px] bg-white border shadow-sm transition-all ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">

                        <Briefcase className="w-5 h-5" />

                      </div>

                      {isSelected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100 flex items-center gap-1">

                          <Check className="w-3 h-3" />

                          Selected

                        </span>
                      )}

                    </div>

                    <h3 className="text-sm font-bold text-gray-900 mt-4 leading-snug">

                      {jdProfile?.job_title ||
                        jd.filename ||
                        'Job Description'}

                    </h3>

                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">

                      {jdProfile?.company ||
                        'Company not specified'}

                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">

                      {jdProfile?.location && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">

                          <MapPin className="w-3 h-3" />

                          {jdProfile.location}

                        </span>
                      )}

                      {jdProfile?.employment_type && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">

                          <Briefcase className="w-3 h-3" />

                          {jdProfile.employment_type}

                        </span>
                      )}

                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-mono">

                      <Clock className="w-3 h-3" />

                      <span>
                        {formatDate(
                          jd.created_at
                        )}
                      </span>

                      <span>
                        •
                      </span>

                      <span>
                        {jdProfile?.required_skills?.length || 0}{' '}
                        required skills
                      </span>

                    </div>

                    <div className="flex items-center gap-2 mt-4">

                      <button
                        type="button"
                        onClick={() =>
                          handleSelectJD(
                            jd.jd_hash
                          )
                        }
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >

                        {isSelected
                          ? 'Selected'
                          : 'Use This JD'}

                      </button>

                      <button
                        type="button"
                        disabled={
                          deletingHash ===
                          jd.jd_hash
                        }
                        onClick={() =>
                          handleDelete(
                            jd
                          )
                        }
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete JD"
                      >

                        {deletingHash ===
                        jd.jd_hash ? (

                          <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />

                        ) : (

                          <Trash2 className="w-4 h-4" />

                        )}

                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

      {selectedJD && (
        <section className="space-y-6 pt-4 border-t border-gray-100">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            <div>

              <div className="flex items-center gap-2">

                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                  SELECTED ROLE PROFILE
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">

                  <ShieldCheck className="w-3 h-3" />

                  Stored & Verified

                </span>

              </div>

              <h2 className="text-2xl sm:text-3xl font-serif italic text-gray-900 mt-1">

                {profile?.job_title ||
                  selectedJD.filename ||
                  'Job Description'}

              </h2>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">

                {profile?.company && (
                  <span className="flex items-center gap-1">

                    <Building2 className="w-3.5 h-3.5" />

                    {profile.company}

                  </span>
                )}

                {profile?.location && (
                  <span className="flex items-center gap-1">

                    <MapPin className="w-3.5 h-3.5" />

                    {profile.location}

                  </span>
                )}

                {profile?.employment_type && (
                  <span className="flex items-center gap-1">

                    <Briefcase className="w-3.5 h-3.5" />

                    {profile.employment_type}

                  </span>
                )}

                <span className="flex items-center gap-1">

                  <Clock className="w-3.5 h-3.5" />

                  Uploaded{' '}
                  {formatDate(
                    selectedJD.created_at
                  )}

                </span>

              </div>

            </div>

            <button
              type="button"
              disabled={!activeResumeHash}
              onClick={() =>
                navigate(
                  '/app/prepare?mode=job'
                )
              }
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 self-start"
            >

              <Sparkles className="w-3.5 h-3.5" />

              {activeResumeHash
                ? 'Prepare for This Role'
                : 'Upload Resume First'}

              <ArrowRight className="w-3.5 h-3.5" />

            </button>

          </div>

          {profile?.summary && (
            <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-gray-100 shadow-sm">

              <div className="flex items-center gap-2 mb-3">

                <FileText className="w-4 h-4 text-indigo-600" />

                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Job Summary
                </h3>

              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                {profile.summary}
              </p>

            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {profile?.experience_required && (
              <InfoCard
                icon={
                  <Briefcase className="w-4 h-4" />
                }
                label="Experience"
                value={
                  profile.experience_required
                }
              />
            )}

            {profile?.salary_range && (
              <InfoCard
                icon={
                  <Tag className="w-4 h-4" />
                }
                label="Compensation"
                value={
                  profile.salary_range
                }
              />
            )}

            {profile?.education_requirements &&
              profile.education_requirements.length >
                0 && (
                <InfoCard
                  icon={
                    <GraduationCap className="w-4 h-4" />
                  }
                  label="Education"
                  value={`${profile.education_requirements.length} requirement${
                    profile.education_requirements.length === 1
                      ? ''
                      : 's'
                  }`}
                />
              )}

            {certifications.length > 0 && (
              <InfoCard
                icon={
                  <Award className="w-4 h-4" />
                }
                label="Certifications"
                value={`${certifications.length} listed`}
              />
            )}

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <TagSection
              title="Required Skills"
              icon={
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              }
              items={requiredSkills}
              tone="indigo"
              emptyText="No required skills were extracted."
            />

            <TagSection
              title="Preferred Skills"
              icon={
                <Sparkles className="w-4 h-4 text-orange-500" />
              }
              items={preferredSkills}
              tone="orange"
              emptyText="No preferred skills were extracted."
            />

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <ListSection
              title="Responsibilities"
              icon={
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              }
              items={responsibilities}
              emptyText="No responsibilities were extracted."
            />

            <ListSection
              title="Qualifications"
              icon={
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              }
              items={qualifications}
              emptyText="No qualifications were extracted."
            />

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <ListSection
              title="Education Requirements"
              icon={
                <GraduationCap className="w-4 h-4 text-indigo-600" />
              }
              items={educationRequirements}
              emptyText="No specific education requirements were extracted."
            />

            <ListSection
              title="Certifications"
              icon={
                <Award className="w-4 h-4 text-orange-500" />
              }
              items={certifications}
              emptyText="No certification requirements were extracted."
            />

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <ListSection
              title="Nice to Have"
              icon={
                <Sparkles className="w-4 h-4 text-indigo-600" />
              }
              items={niceToHave}
              emptyText="No nice-to-have requirements were extracted."
            />

            <ListSection
              title="Other Requirements"
              icon={
                <FileText className="w-4 h-4 text-gray-500" />
              }
              items={otherRequirements}
              emptyText="No additional requirements were extracted."
            />

          </div>

          <div className="bg-[#FFFDFC] text-[#2D2526] border border-[#E1D6D2] p-6 sm:p-7 rounded-[28px] shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2 text-[#C43173]">

                  <Sparkles className="w-4 h-4" />

                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    Resume / JD Matching
                  </span>

                </div>

                <h3 className="text-lg font-semibold mt-2 text-[#2D2526]">

                  {activeResumeHash
                    ? 'Ready to compare this role against your active resume'
                    : 'Upload a resume to enable role matching'}

                </h3>

                <p className="mt-1 text-sm text-[#75696B]">

                  {activeResumeHash
                    ? 'The selected JD can be matched against your resume to identify matched skills, missing requirements, and preparation gaps.'
                    : 'Once a resume is active, you can use this job description for targeted preparation.'}

                </p>

              </div>

              <button
                type="button"
                disabled={!activeResumeHash}
                onClick={() =>
                  navigate(
                    '/app/prepare?mode=job'
                  )
                }
                className="shrink-0 px-5 py-2.5 rounded-full bg-[#2D2526] text-white hover:bg-[#C43173] disabled:opacity-40 text-xs font-bold transition-all inline-flex items-center gap-2"
              >

                <span>
                  Start Job Preparation
                </span>

                <ArrowRight className="w-3.5 h-3.5" />

              </button>

            </div>

          </div>

        </section>
      )}

    </div>
  );
};


/* ============================================================
   ERROR BANNER
   ============================================================ */

const ErrorBanner: React.FC<{
  message: string;
}> = ({
  message,
}) => {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center gap-2">

      <AlertCircle className="w-4 h-4 shrink-0" />

      <span>
        {message}
      </span>

    </div>
  );
};


/* ============================================================
   INFO CARD
   ============================================================ */

const InfoCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm">

      <div className="flex items-center gap-2 text-indigo-600">

        {icon}

        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>

      </div>

      <p className="text-sm font-semibold text-gray-900 mt-3 leading-relaxed">
        {value}
      </p>

    </div>
  );
};


/* ============================================================
   TAG SECTION
   ============================================================ */

const TagSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: 'indigo' | 'orange';
  emptyText: string;
}> = ({
  title,
  icon,
  items,
  tone,
  emptyText,
}) => {

  const toneClass =
    tone === 'indigo'
      ? 'bg-indigo-50 border-indigo-100 text-indigo-900'
      : 'bg-orange-50 border-orange-100 text-orange-900';

  return (
    <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm">

      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

        {icon}

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
          {title}
        </h3>

      </div>

      {items.length > 0 ? (

        <div className="flex flex-wrap gap-2 mt-4">

          {items.map(
            (
              item,
              index
            ) => (

              <span
                key={`${item}-${index}`}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium ${toneClass}`}
              >
                {item}
              </span>

            )
          )}

        </div>

      ) : (

        <p className="text-xs text-gray-400 mt-4">
          {emptyText}
        </p>

      )}

    </div>
  );
};


/* ============================================================
   LIST SECTION
   ============================================================ */

const ListSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText: string;
}> = ({
  title,
  icon,
  items,
  emptyText,
}) => {
  return (
    <div className="p-6 rounded-[28px] bg-white border border-gray-100 shadow-sm">

      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

        {icon}

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
          {title}
        </h3>

      </div>

      {items.length > 0 ? (

        <ul className="space-y-2 mt-4">

          {items.map(
            (
              item,
              index
            ) => (

              <li
                key={`${item}-${index}`}
                className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed"
              >

                <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />

                <span>
                  {item}
                </span>

              </li>

            )
          )}

        </ul>

      ) : (

        <p className="text-xs text-gray-400 mt-4">
          {emptyText}
        </p>

      )}

    </div>
  );
};