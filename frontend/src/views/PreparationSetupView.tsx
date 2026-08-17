import React, { useState, useEffect } from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowRight,
  Briefcase,
  Layers,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Target,
  Cpu,
  ChevronRight,
  PlayCircle,
  FolderOpen,
  MapPin,
  Building2,
  Clock,
  ShieldCheck,
  GraduationCap,
  Award,
  Tag,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useInterview } from '../context/InterviewContext';
import { QuestionSetRecord } from '../types';
import { jdApi } from '../api';

const RECENT_SETS_KEY_PREFIX =
  'interviewai_previous_question_sets';

const SELECTED_JD_KEY_PREFIX =
  'interviewai_selected_jd_hash';

function getUserScopedKey(
  prefix: string,
  userId: string | null | undefined
): string | null {
  if (!userId || !userId.trim()) {
    return null;
  }

  return `${prefix}_${userId}`;
}

function getStoredQuestionSets(
  userId: string | null | undefined
): QuestionSetRecord[] {
  try {
    const storageKey = getUserScopedKey(
      RECENT_SETS_KEY_PREFIX,
      userId
    );

    if (!storageKey) {
      return [];
    }

    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as QuestionSetRecord[])
      : [];
  } catch {
    return [];
  }
}

function saveStoredQuestionSet(
  userId: string | null | undefined,
  record: QuestionSetRecord
) {
  try {
    const storageKey = getUserScopedKey(
      RECENT_SETS_KEY_PREFIX,
      userId
    );

    if (!storageKey) {
      return;
    }

    const list = getStoredQuestionSets(userId);

    const updated = [
      record,
      ...list.filter(
        item => item.id !== record.id
      ),
    ].slice(0, 10);

    localStorage.setItem(
      storageKey,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore localStorage failures.
  }
}

function getSelectedJDStorageKey(
  userId: string | null | undefined
): string | null {
  return getUserScopedKey(
    SELECTED_JD_KEY_PREFIX,
    userId
  );
}

function getStoredSelectedJDHash(
  userId: string | null | undefined
): string | null {
  try {
    const storageKey =
      getSelectedJDStorageKey(userId);

    if (!storageKey) {
      return null;
    }

    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function saveStoredSelectedJDHash(
  userId: string | null | undefined,
  hash: string | null
) {
  try {
    const storageKey =
      getSelectedJDStorageKey(userId);

    if (!storageKey) {
      return;
    }

    if (hash && hash.trim()) {
      localStorage.setItem(
        storageKey,
        hash.trim()
      );
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // Ignore localStorage failures.
  }
}

export const PreparationSetupView: React.FC =
  () => {
    const navigate = useNavigate();

    const [searchParams] =
      useSearchParams();

    const {
      activeResumeHash,
      activeResumeProfile,
      user,
    } = useAuth();

    const userId = user?.id || null;

    const {
      isGenerating,
      generateQuestions,
    } = useInterview();

    const initialMode =
      searchParams.get('mode') === 'job'
        ? 'role_based'
        : 'self_based';

    const [
      prepMode,
      setPrepMode,
    ] = useState<
      'self_based' | 'role_based'
    >(initialMode);

    const [
      selectedJDHash,
      setSelectedJDHash,
    ] = useState<string | null>(
      () =>
        getStoredSelectedJDHash(userId)
    );

    const [
      selectedJD,
      setSelectedJD,
    ] = useState<
      Awaited<
        ReturnType<typeof jdApi.getJD>
      > | null
    >(null);

    const [
      loadingJD,
      setLoadingJD,
    ] = useState(false);

    const [
      jobTitle,
      setJobTitle,
    ] = useState('');

    const [
      companyName,
      setCompanyName,
    ] = useState('');

    const [
      jobDescription,
      setJobDescription,
    ] = useState('');

    const [
      questionCount,
      setQuestionCount,
    ] = useState(10);

    const [
      difficulty,
      setDifficulty,
    ] = useState<
      'easy' | 'medium' | 'hard'
    >('medium');

    const [
      focusCategories,
      setFocusCategories,
    ] = useState({
      project: true,
      technical: true,
      experience: true,
      problem_solving: true,
      hr: true,
    });

    const [
      isStartingMockDirectly,
      setIsStartingMockDirectly,
    ] = useState(false);

    const [
      generationError,
      setGenerationError,
    ] = useState<string | null>(null);

    const [
      previousSets,
      setPreviousSets,
    ] = useState<QuestionSetRecord[]>(
      []
    );

    useEffect(() => {
      setPreviousSets(
        getStoredQuestionSets(userId)
      );
    }, [userId]);

    useEffect(() => {
      const storedHash =
        getStoredSelectedJDHash(userId);

      setSelectedJDHash(storedHash);
      setSelectedJD(null);
      setJobTitle('');
      setCompanyName('');
      setJobDescription('');
      setGenerationError(null);
    }, [userId]);

    const loadSelectedJD = async (
      hash?: string | null
    ) => {
      const resolvedHash =
        hash ||
        getStoredSelectedJDHash(userId);

      if (!resolvedHash) {
        setSelectedJDHash(null);
        setSelectedJD(null);
        setJobTitle('');
        setCompanyName('');
        setJobDescription('');
        return;
      }

      setLoadingJD(true);
      setGenerationError(null);

      try {
        const response =
          await jdApi.getJD(
            resolvedHash
          );

        setSelectedJDHash(
          resolvedHash
        );

        setSelectedJD(response);

        saveStoredSelectedJDHash(
          userId,
          resolvedHash
        );

        const profile =
          response.structured_jd;

        setJobTitle(
          profile.job_title || ''
        );

        setCompanyName(
          profile.company || ''
        );

        const descriptionParts: string[] =
          [];

        if (profile.summary) {
          descriptionParts.push(
            `Summary:\n${profile.summary}`
          );
        }

        if (
          profile.required_skills?.length
        ) {
          descriptionParts.push(
            `Required Skills:\n${profile.required_skills.join(
              ', '
            )}`
          );
        }

        if (
          profile.preferred_skills?.length
        ) {
          descriptionParts.push(
            `Preferred Skills:\n${profile.preferred_skills.join(
              ', '
            )}`
          );
        }

        if (
          profile.responsibilities?.length
        ) {
          descriptionParts.push(
            `Responsibilities:\n${profile.responsibilities
              .map(
                item => `- ${item}`
              )
              .join('\n')}`
          );
        }

        if (
          profile.qualifications?.length
        ) {
          descriptionParts.push(
            `Qualifications:\n${profile.qualifications
              .map(
                item => `- ${item}`
              )
              .join('\n')}`
          );
        }

        if (
          profile.education_requirements?.length
        ) {
          descriptionParts.push(
            `Education:\n${profile.education_requirements
              .map(
                item => `- ${item}`
              )
              .join('\n')}`
          );
        }

        if (
          profile.certifications?.length
        ) {
          descriptionParts.push(
            `Certifications:\n${profile.certifications
              .map(
                item => `- ${item}`
              )
              .join('\n')}`
          );
        }

        setJobDescription(
          descriptionParts.join(
            '\n\n'
          )
        );
      } catch (err) {
        setSelectedJD(null);

        setGenerationError(
          err instanceof Error
            ? err.message
            : 'Unable to load the selected job description.'
        );
      } finally {
        setLoadingJD(false);
      }
    };

    useEffect(() => {
      if (
        prepMode === 'role_based'
      ) {
        loadSelectedJD();
      }
    }, [
      prepMode,
      userId,
    ]);

    const toggleCategory = (
      category:
        | keyof typeof focusCategories
    ) => {
      setFocusCategories(
        previous => ({
          ...previous,
          [category]:
            !previous[category],
        })
      );
    };

    const handleGenerateQuestionBank =
      async () => {
        setGenerationError(null);
        setIsStartingMockDirectly(
          false
        );

        try {
          if (!userId) {
            throw new Error(
              'Your session is not available. Please log in again before generating questions.'
            );
          }

          if (!activeResumeHash) {
            throw new Error(
              'Please upload and select a resume before generating questions.'
            );
          }

          let jdHash: string | null =
            null;

          if (
            prepMode === 'role_based'
          ) {
            if (!selectedJDHash) {
              throw new Error(
                'Please select a job description from the JD page before generating job-specific questions.'
              );
            }

            if (!selectedJD) {
              await loadSelectedJD(
                selectedJDHash
              );
            }

            jdHash = selectedJDHash;
          }

          const generated =
            await generateQuestions(
              activeResumeHash,
              questionCount,
              prepMode === 'role_based'
                ? 'job_specific'
                : 'self_based',
              jdHash
            );

          const newSet:
            QuestionSetRecord = {
            id: `set_${Date.now()}_user_${userId}`,

            title:
              prepMode === 'role_based'
                ? `${jobTitle || 'Target Role'}${
                    companyName
                      ? ` (${companyName})`
                      : ''
                  }`
                : 'Comprehensive Resume Grounding',

            role:
              prepMode === 'role_based'
                ? jobTitle || undefined
                : undefined,

            company:
              prepMode === 'role_based'
                ? companyName ||
                  undefined
                : undefined,

            mode: prepMode,

            date:
              new Date().toISOString(),

            questions_count:
              generated.length,

            difficulty,

            questions: generated,

            resume_hash:
              activeResumeHash ||
              undefined,

            jd_hash:
              jdHash ||
              undefined,
          };

          saveStoredQuestionSet(
            userId,
            newSet
          );

          setPreviousSets(
            getStoredQuestionSets(
              userId
            )
          );

          navigate('/app/questions');
        } catch (err) {
          setGenerationError(
            err instanceof Error
              ? err.message
              : 'Failed to generate questions. Please try again.'
          );
        }
      };

    const handleLaunchMockInterview =
      () => {
        setGenerationError(null);

        if (!activeResumeHash) {
          setGenerationError(
            'Please upload and select a resume before starting a mock interview.'
          );
          return;
        }

        if (
          prepMode === 'role_based' &&
          !selectedJDHash
        ) {
          setGenerationError(
            'Please select a job description before starting job-specific mock interview preparation.'
          );
          return;
        }

        setIsStartingMockDirectly(
          false
        );

        if (
          prepMode === 'role_based' &&
          selectedJDHash
        ) {
          saveStoredSelectedJDHash(
            userId,
            selectedJDHash
          );
        }

        const params =
          new URLSearchParams();

        params.set(
          'mode',
          prepMode === 'role_based'
            ? 'job'
            : 'self'
        );

        params.set(
          'difficulty',
          difficulty
        );

        params.set(
          'questions',
          String(questionCount)
        );

        if (
          jobTitle.trim()
        ) {
          params.set(
            'role',
            jobTitle.trim()
          );
        }

        if (
          prepMode === 'role_based' &&
          selectedJDHash
        ) {
          params.set(
            'jd',
            selectedJDHash
          );
        }

        navigate(
          `/app/interview?${params.toString()}`
        );
      };

    const handleOpenPreviousSet =
      async (
        questionSet: QuestionSetRecord,
        startMock = false
      ) => {
        try {
          if (!userId) {
            setGenerationError(
              'Your session is not available. Please log in again.'
            );
            return;
          }

          if (
            !questionSet.questions ||
            questionSet.questions.length === 0
          ) {
            setGenerationError(
              'This saved question set does not contain questions. Please generate a new set.'
            );
            return;
          }

          setPrepMode(
            questionSet.mode ===
              'role_based'
              ? 'role_based'
              : 'self_based'
          );

          if (
            questionSet.mode ===
              'role_based' &&
            questionSet.jd_hash
          ) {
            setSelectedJDHash(
              questionSet.jd_hash
            );

            saveStoredSelectedJDHash(
              userId,
              questionSet.jd_hash
            );

            await loadSelectedJD(
              questionSet.jd_hash
            );
          }

          if (!startMock) {
            localStorage.setItem(
              `interviewai_active_question_set_${userId}`,
              JSON.stringify(
                questionSet
              )
            );

            navigate(
              '/app/questions'
            );

            return;
          }

          const params =
            new URLSearchParams();

          params.set(
            'mode',
            questionSet.mode ===
              'role_based'
              ? 'job'
              : 'self'
          );

          params.set(
            'difficulty',
            questionSet.difficulty ||
              'medium'
          );

          params.set(
            'questions',
            String(
              questionSet.questions_count ||
                questionSet.questions.length
            )
          );

          if (
            questionSet.role
          ) {
            params.set(
              'role',
              questionSet.role
            );
          }

          if (
            questionSet.jd_hash
          ) {
            params.set(
              'jd',
              questionSet.jd_hash
            );
          }

          navigate(
            `/app/interview?${params.toString()}`
          );
        } catch (err) {
          setGenerationError(
            err instanceof Error
              ? err.message
              : 'Unable to open the saved question set.'
          );
        }
      };

    const candidateName =
      activeResumeProfile
        ?.structured_profile
        ?.name ||
      'Candidate';

    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-16">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              PREPARATION WORKSPACE & CALIBRATION HUB
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
            How do you want to prepare today?
          </h1>

          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Choose a tailored preparation path, configure your selected role requirements, or resume practice from saved question sets.
          </p>
        </div>

        {!activeResumeProfile ? (
          <div className="p-6 rounded-[28px] bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  No Active Resume Selected
                </h4>

                <p className="text-xs text-amber-800/80">
                  Upload your resume first to unlock exact project grounding and verified snippet citations.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/app/resume')
              }
              className="px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm shrink-0 transition-colors"
            >
              Upload / Select Resume
            </button>
          </div>
        ) : (
          <div className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                <FileText className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Active Resume: {candidateName}
                </h4>

                <p className="text-xs text-gray-500 font-mono">
                  {activeResumeProfile
                    .structured_profile
                    ?.projects
                    ?.length || 0}{' '}
                  projects detected •{' '}
                  {Array.isArray(
                    activeResumeProfile
                      .structured_profile
                      ?.skills
                  )
                    ? activeResumeProfile
                        .structured_profile
                        .skills.length
                    : 0}{' '}
                  skills indexed
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/app/resume')
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>
                Manage Resumes
              </span>

              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
            1. Choose Preparation Pathway
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setPrepMode(
                  'role_based'
                );
                setGenerationError(null);
              }}
              className={`p-7 rounded-[32px] border-2 cursor-pointer transition-all ${
                prepMode === 'role_based'
                  ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-100/50 ring-4 ring-indigo-600/10'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>

                {prepMode === 'role_based' && (
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SELECTED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Specific Job Preparation
              </h3>

              <p className="text-xs text-gray-600 leading-relaxed">
                Prepare for a particular role using your stored job description. Evaluates technical stack overlap, role-specific requirements, project relevance, and required competencies.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-mono text-orange-900">
                  JD Overlap Matching
                </span>

                <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-mono text-orange-900">
                  Role Calibration
                </span>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setPrepMode(
                  'self_based'
                );
                setGenerationError(null);
              }}
              className={`p-7 rounded-[32px] border-2 cursor-pointer transition-all ${
                prepMode === 'self_based'
                  ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-100/50 ring-4 ring-indigo-600/10'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>

                {prepMode === 'self_based' && (
                  <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    SELECTED
                  </span>
                )}
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Self-Paced Comprehensive Prep
              </h3>

              <p className="text-xs text-gray-600 leading-relaxed">
                Practice based on your resume, skills, projects, and work history. Generates a balanced mix of architecture, problem-solving, project, and behavioral questions.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-mono text-indigo-900">
                  All Projects
                </span>

                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-mono text-indigo-900">
                  Core Stack
                </span>

                <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-mono text-indigo-900">
                  STAR Leadership
                </span>
              </div>
            </div>
          </div>
        </div>

        {prepMode === 'role_based' && (
          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />

                <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">
                  2. Selected Job Description
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/app/jd')
                }
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Manage Job Descriptions
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingJD ? (
              <div className="p-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                  Loading selected job description...
                </div>
              </div>
            ) : !selectedJD ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 text-center">
                <Briefcase className="w-8 h-8 text-orange-500 mx-auto mb-3" />

                <h4 className="text-sm font-bold text-gray-900">
                  No Job Description Selected
                </h4>

                <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
                  Go to the JD page, select a stored job description, then return here to generate role-specific interview questions.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/app/jd')
                  }
                  className="mt-4 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  Select Job Description
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">
                      {selectedJD
                        .structured_jd
                        .job_title ||
                        selectedJD.filename ||
                        'Selected Role'}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                      {selectedJD
                        .structured_jd
                        .company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {
                            selectedJD
                              .structured_jd
                              .company
                          }
                        </span>
                      )}

                      {selectedJD
                        .structured_jd
                        .location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {
                            selectedJD
                              .structured_jd
                              .location
                          }
                        </span>
                      )}

                      {selectedJD
                        .structured_jd
                        .employment_type && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {
                            selectedJD
                              .structured_jd
                              .employment_type
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="self-start px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    STORED JD
                  </span>
                </div>

                {selectedJD
                  .structured_jd
                  .summary && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">
                      Role Summary
                    </p>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {
                        selectedJD
                          .structured_jd
                          .summary
                      }
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedJD
                    .structured_jd
                    .experience_required && (
                    <InfoMiniCard
                      icon={
                        <Clock className="w-3.5 h-3.5" />
                      }
                      label="Experience"
                      value={
                        selectedJD
                          .structured_jd
                          .experience_required
                      }
                    />
                  )}

                  {selectedJD
                    .structured_jd
                    .education_requirements
                    ?.length > 0 && (
                    <InfoMiniCard
                      icon={
                        <GraduationCap className="w-3.5 h-3.5" />
                      }
                      label="Education"
                      value={`${selectedJD.structured_jd.education_requirements.length} requirement${
                        selectedJD
                          .structured_jd
                          .education_requirements
                          .length === 1
                          ? ''
                          : 's'
                      }`}
                    />
                  )}

                  {selectedJD
                    .structured_jd
                    .certifications
                    ?.length > 0 && (
                    <InfoMiniCard
                      icon={
                        <Award className="w-3.5 h-3.5" />
                      }
                      label="Certifications"
                      value={`${selectedJD.structured_jd.certifications.length} listed`}
                    />
                  )}
                </div>

                {selectedJD
                  .structured_jd
                  .required_skills
                  ?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-indigo-600" />

                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                        Required Skills
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedJD
                        .structured_jd
                        .required_skills
                        .map(
                          skill => (
                            <span
                              key={skill}
                              className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100 text-xs font-medium"
                            >
                              {skill}
                            </span>
                          )
                        )}
                    </div>
                  </div>
                )}

                {selectedJD
                  .structured_jd
                  .responsibilities
                  ?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />

                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                        Responsibilities
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {selectedJD
                        .structured_jd
                        .responsibilities
                        .slice(0, 5)
                        .map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={index}
                              className="text-xs text-gray-600 flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span>
                                {item}
                              </span>
                            </li>
                          )
                        )}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-2">
                    Selected JD Context
                  </label>

                  <textarea
                    rows={6}
                    readOnly
                    value={jobDescription}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-700 leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Sliders className="w-4 h-4 text-indigo-600" />

            <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">
              {prepMode === 'role_based'
                ? '3.'
                : '2.'}{' '}
              Calibration Parameters
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
                Question Count:{' '}
                <strong className="text-gray-900 font-mono">
                  {questionCount}{' '}
                  Questions
                </strong>
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[5, 10, 15, 20, 25, 30].map(
                  count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        setQuestionCount(
                          count
                        )
                      }
                      className={`py-2.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                        questionCount === count
                          ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {count}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
                Difficulty Tier
              </label>

              <div className="flex items-center gap-2">
                {(
                  [
                    'easy',
                    'medium',
                    'hard',
                  ] as const
                ).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setDifficulty(level)
                    }
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase font-mono border transition-all ${
                      difficulty === level
                        ? level === 'hard'
                          ? 'bg-red-600 text-white border-red-600'
                          : level === 'easy'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
              Question Category Distribution
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                {
                  key: 'project',
                  label: 'Projects & Code',
                },
                {
                  key: 'technical',
                  label: 'Architecture',
                },
                {
                  key: 'experience',
                  label: 'Work History',
                },
                {
                  key: 'problem_solving',
                  label: 'System Scaling',
                },
                {
                  key: 'hr',
                  label: 'Behavioral STAR',
                },
              ].map(category => {
                const active =
                  focusCategories[
                    category.key as keyof typeof focusCategories
                  ];

                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() =>
                      toggleCategory(
                        category.key as keyof typeof focusCategories
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[11px] leading-tight">
                        {category.label}
                      </span>

                      <span
                        className={`w-2 h-2 rounded-full ${
                          active
                            ? 'bg-indigo-600'
                            : 'bg-gray-300'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {generationError && (
          <div className="p-4 rounded-[20px] bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span>
              {generationError}
            </span>

            <button
              type="button"
              onClick={() =>
                setGenerationError(
                  null
                )
              }
              className="font-bold text-red-900"
            >
              ✕
            </button>
          </div>
        )}

        <div className="p-6 sm:p-7 rounded-[28px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_12px_35px_rgba(75,48,52,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Cpu className="w-4 h-4 text-[#C43173]" />

              <h4 className="text-sm font-bold text-[#2D2526]">
                Ready to continue to your mock interview setup
              </h4>
            </div>

            <p className="text-xs text-[#75696B] font-mono">
              {prepMode === 'role_based'
                ? 'Selected JD + active resume • configure the interview round next'
                : 'Active resume • configure the interview round next'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={
                handleGenerateQuestionBank
              }
              disabled={
                isGenerating ||
                (prepMode ===
                  'role_based' &&
                  !selectedJDHash)
              }
              className="flex-1 sm:flex-initial px-6 py-3 rounded-full bg-[#F7F1E8] hover:bg-[#EFE3DE] text-[#5D5355] text-xs font-semibold border border-[#E1D6D2] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating &&
              !isStartingMockDirectly ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-[#D8C9C7] border-t-[#C43173] rounded-full animate-spin" />
                  <span>
                    Generating...
                  </span>
                </span>
              ) : (
                <span>
                  Generate Question Bank
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={
                handleLaunchMockInterview
              }
              disabled={
                !activeResumeHash ||
                (prepMode ===
                  'role_based' &&
                  !selectedJDHash)
              }
              className="flex-1 sm:flex-initial px-7 py-3 rounded-full bg-[#C43173] hover:bg-[#A9255F] text-white text-xs font-bold shadow-[0_10px_24px_rgba(196,49,115,0.18)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>
                Launch Mock Interview
              </span>

              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />

              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                Previous Question Sets (
                {previousSets.length}
                )
              </h2>
            </div>
          </div>

          {previousSets.length === 0 ? (
            <div className="p-8 rounded-[24px] bg-white border border-gray-100 text-center text-xs text-gray-500">
              No previous preparation sets yet. Generate your first set above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previousSets.map(
                questionSet => (
                  <div
                    key={
                      questionSet.id
                    }
                    className="p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-all space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                        <span className="uppercase font-semibold">
                          {questionSet.mode ===
                          'role_based'
                            ? 'Job Description'
                            : 'Resume Grounded'}
                        </span>

                        <span>
                          {new Date(
                            questionSet.date
                          ).toLocaleDateString(
                            'en-US',
                            {
                              month:
                                'short',
                              day:
                                'numeric',
                            }
                          )}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900">
                        {
                          questionSet.title
                        }
                      </h3>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700">
                          {
                            questionSet.questions_count
                          }{' '}
                          Questions
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 text-amber-700 capitalize">
                          {
                            questionSet.difficulty
                          }
                        </span>

                        {questionSet.jd_hash && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-50 text-orange-700">
                            JD Linked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenPreviousSet(
                            questionSet,
                            false
                          )
                        }
                        className="px-3.5 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-all"
                      >
                        View Questions
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenPreviousSet(
                            questionSet,
                            true
                          )
                        }
                        className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>
                          Practice Mock
                        </span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

const InfoMiniCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
      <div className="flex items-center gap-1.5 text-indigo-600">
        {icon}

        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400">
          {label}
        </span>
      </div>

      <p className="text-xs font-semibold text-gray-900 mt-2">
        {value}
      </p>
    </div>
  );
};