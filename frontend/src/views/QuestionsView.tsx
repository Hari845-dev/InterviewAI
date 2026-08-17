import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  HelpCircle,
  ArrowRight,
  ChevronDown,
  PlayCircle,
  Filter,
  ShieldCheck,
  Cpu,
  Sliders,
  Target,
} from 'lucide-react';

import {
  useInterview,
} from '../context/InterviewContext';

import {
  useAuth,
} from '../context/AuthContext';

import {
  InterviewQuestion,
  QuestionType,
  QuestionSetRecord,
} from '../types';

const RECENT_SETS_KEY_PREFIX =
  'interviewai_previous_question_sets';

const ACTIVE_QUESTION_SET_PREFIX =
  'interviewai_active_question_set';

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
    const key =
      getUserScopedKey(
        RECENT_SETS_KEY_PREFIX,
        userId
      );

    if (!key) {
      return [];
    }

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed as QuestionSetRecord[]
      : [];
  } catch {
    return [];
  }
}

function getStoredActiveQuestionSet(
  userId: string | null | undefined
): QuestionSetRecord | null {
  try {
    const key =
      getUserScopedKey(
        ACTIVE_QUESTION_SET_PREFIX,
        userId
      );

    if (!key) {
      return null;
    }

    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      parsed &&
      Array.isArray(
        parsed.questions
      ) &&
      parsed.questions.length > 0
    ) {
      return parsed as QuestionSetRecord;
    }

    return null;
  } catch {
    return null;
  }
}

function saveStoredActiveQuestionSet(
  userId: string | null | undefined,
  set: QuestionSetRecord
) {
  try {
    const key =
      getUserScopedKey(
        ACTIVE_QUESTION_SET_PREFIX,
        userId
      );

    if (!key) {
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify(set)
    );
  } catch {
    // Ignore storage failures.
  }
}

export const QuestionsView: React.FC = () => {
  const navigate =
    useNavigate();

  const {
    questions,
    generationSummary,
    isGenerating,
    startSession,
    activateQuestionSet,
  } = useInterview();

  const {
    user,
  } = useAuth();

  const userId =
    user?.id || null;

  const [
    expandedWhy,
    setExpandedWhy,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    selectedTypeFilter,
    setSelectedTypeFilter,
  ] = useState<string>(
    'All'
  );

  const [
    selectedDifficultyFilter,
    setSelectedDifficultyFilter,
  ] = useState<string>(
    'All'
  );

  const [
    restoredSet,
    setRestoredSet,
  ] =
    useState<QuestionSetRecord | null>(
      null
    );

  useEffect(() => {
    if (!userId) {
      setRestoredSet(null);
      return;
    }

    if (
      questions.length > 0
    ) {
      return;
    }

    const stored =
      getStoredActiveQuestionSet(
        userId
      );

    if (
      stored &&
      stored.questions.length > 0
    ) {
      setRestoredSet(
        stored
      );

      activateQuestionSet(
        stored
      );

      return;
    }

    const savedSets =
      getStoredQuestionSets(
        userId
      );

    const latest =
      savedSets[0];

    if (
      latest &&
      latest.questions?.length > 0
    ) {
      saveStoredActiveQuestionSet(
        userId,
        latest
      );

      setRestoredSet(
        latest
      );

      activateQuestionSet(
        latest
      );
    }
  }, [
    userId,
    questions.length,
    activateQuestionSet,
  ]);

  const activeQuestions =
    questions.length > 0
      ? questions
      : restoredSet?.questions ||
        [];

  const activeSummary =
    generationSummary ||
    restoredSet
      ?.generation_summary ||
    null;

  const toggleWhy = (
    id: string
  ) => {
    setExpandedWhy(
      prev => ({
        ...prev,
        [id]:
          !prev[id],
      })
    );
  };

  const filteredQuestions =
    useMemo(() => {
      return activeQuestions.filter(
        q => {
          const matchesType =
            selectedTypeFilter ===
              'All' ||
            String(
              q.category ||
                q.type ||
                ''
            ).toLowerCase() ===
              selectedTypeFilter.toLowerCase();

          const matchesDiff =
            selectedDifficultyFilter ===
              'All' ||
            q.difficulty
              .toLowerCase() ===
              selectedDifficultyFilter.toLowerCase();

          return (
            matchesType &&
            matchesDiff
          );
        }
      );
    }, [
      activeQuestions,
      selectedTypeFilter,
      selectedDifficultyFilter,
    ]);

  const handleLaunchFullInterview =
    async () => {
      if (
        activeQuestions.length ===
        0
      ) {
        return;
      }

      const sessionRes =
        await startSession(
          activeQuestions
        );

      navigate(
        `/interview/session/${sessionRes.session_id}`
      );
    };

  const handlePracticeSingle =
    async (
      question: InterviewQuestion
    ) => {
      const sessionRes =
        await startSession([
          question,
        ]);

      navigate(
        `/interview/session/${sessionRes.session_id}`
      );
    };

  const getDifficultyBadgeColor =
    (
      diff: string
    ) => {
      const value =
        diff.toLowerCase();

      if (
        value === 'easy'
      ) {
        return 'bg-green-50 text-green-700 border-green-200';
      }

      if (
        value === 'hard'
      ) {
        return 'bg-red-50 text-red-700 border-red-200';
      }

      return 'bg-amber-50 text-amber-700 border-amber-200';
    };

  const getTypeBadgeColor =
    (
      type: QuestionType
    ) => {
      switch (type) {
        case 'project':
          return 'bg-indigo-50 text-indigo-700 border-indigo-200';

        case 'technical':
          return 'bg-blue-50 text-blue-700 border-blue-200';

        case 'experience':
          return 'bg-emerald-50 text-emerald-700 border-emerald-200';

        case 'problem_solving':
          return 'bg-purple-50 text-purple-700 border-purple-200';

        case 'hr':
          return 'bg-orange-50 text-orange-700 border-orange-200';

        default:
          return 'bg-gray-50 text-gray-700 border-gray-200';
      }
    };

  const getQuestionType =
    (
      question: InterviewQuestion
    ): QuestionType => {
      const value =
        String(
          question.category ||
            question.type ||
            'technical'
        ).toLowerCase();

      const allowedTypes: QuestionType[] =
        [
          'project',
          'technical',
          'experience',
          'problem_solving',
          'hr',
        ];

      return allowedTypes.includes(
        value as QuestionType
      )
        ? value as QuestionType
        : 'technical';
    };

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              EVIDENCE-GROUNDED QUESTION GENERATOR
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
              Bank: {activeQuestions.length}{' '}
              Questions
            </span>

          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
            Personalized Interview Questions
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Grounded directly in your projects, work experience, and detected skill claims.
          </p>

        </div>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/prepare'
              )
            }
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
          >

            <Sliders className="w-3.5 h-3.5" />

            <span>
              Calibrate Setup
            </span>

          </button>

          {activeQuestions.length >
            0 && (
            <button
              type="button"
              onClick={
                handleLaunchFullInterview
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
            >

              <PlayCircle className="w-4 h-4" />

              <span>
                Start Full Mock
              </span>

            </button>
          )}

        </div>

      </div>

      {activeSummary && (
        <div className="p-6 rounded-[24px] bg-[#121212] text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">

              <Cpu className="w-5 h-5" />

            </div>

            <div>

              <h3 className="text-sm font-bold text-white">

                Interview Question Set Ready (
                {activeSummary.questions_requested}{' '}
                Questions)

              </h3>

              <p className="text-xs text-white/60 font-mono mt-0.5">

                {activeSummary.cached_questions}{' '}
                cached •{' '}
                {activeSummary.fresh_questions}{' '}
                newly generated •{' '}
                {activeSummary.cache_hit_rate}% cache hit rate •{' '}
                {activeSummary.gemini_requests}{' '}
                Gemini request

              </p>

            </div>

          </div>

          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-mono">
            FastAPI Grounded
          </span>

        </div>
      )}

      {activeQuestions.length >
        0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[24px] bg-white border border-gray-100 shadow-sm">

          <div className="flex flex-wrap items-center gap-2 text-xs">

            <span className="text-gray-400 font-mono font-semibold uppercase mr-1 flex items-center gap-1">

              <Filter className="w-3.5 h-3.5" />

              Type:

            </span>

            {[
              'All',
              'project',
              'technical',
              'experience',
              'problem_solving',
              'hr',
            ].map(
              type => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setSelectedTypeFilter(
                      type
                    )
                  }
                  className={`px-3.5 py-1.5 rounded-full font-medium transition-all text-xs ${
                    selectedTypeFilter ===
                    type
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >

                  {type ===
                  'All'
                    ? 'All Types'
                    : type.replace(
                        '_',
                        ' '
                      )}

                </button>
              )
            )}

          </div>

          <div className="flex items-center gap-2 text-xs">

            <span className="text-gray-400 font-mono font-semibold uppercase">
              Difficulty:
            </span>

            {[
              'All',
              'Easy',
              'Medium',
              'Hard',
            ].map(
              difficulty => (
                <button
                  key={
                    difficulty
                  }
                  type="button"
                  onClick={() =>
                    setSelectedDifficultyFilter(
                      difficulty
                    )
                  }
                  className={`px-3 py-1 rounded-full font-medium transition-all text-xs ${
                    selectedDifficultyFilter ===
                    difficulty
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {difficulty}
                </button>
              )
            )}

          </div>

        </div>
      )}

      {isGenerating ? (
        <div className="p-16 rounded-[32px] bg-white border border-gray-100 text-center space-y-4 shadow-sm">

          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <h3 className="text-base font-bold text-gray-900 font-serif">
            Building your personalized interview set...
          </h3>

          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Extracting project claims from your resume and generating grounded verification questions with Gemini.
          </p>

        </div>
      ) : activeQuestions.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-[32px] bg-white border border-gray-100 text-center space-y-4 shadow-sm">

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">

            <Target className="w-7 h-7" />

          </div>

          <div className="max-w-md mx-auto space-y-1">

            <h3 className="text-lg font-bold text-gray-900">
              No Question Set Active
            </h3>

            <p className="text-xs text-gray-500">
              Configure your preparation session to generate evidence-grounded questions tailored to your resume and target role.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/app/prepare'
              )
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 mx-auto"
          >

            <Sliders className="w-4 h-4" />

            <span>
              Configure & Generate Set
            </span>

          </button>

        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 rounded-[32px] bg-white border border-gray-100 text-center space-y-3 shadow-sm">

          <HelpCircle className="w-10 h-10 text-gray-400 mx-auto" />

          <h3 className="text-base font-bold text-gray-900">
            No questions match this filter
          </h3>

          <button
            type="button"
            onClick={() => {
              setSelectedTypeFilter(
                'All'
              );

              setSelectedDifficultyFilter(
                'All'
              );
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Reset Filters
          </button>

        </div>
      ) : (
        <div className="space-y-6">

          {filteredQuestions.map(
            (
              question,
              index
            ) => {
              const questionId =
                question.id ||
                question.question_id ||
                `question-${index}`;

              const isWhyOpen =
                Boolean(
                  expandedWhy[
                    questionId
                  ]
                );

              const questionType =
                getQuestionType(
                  question
                );

              return (
                <div
                  key={
                    questionId
                  }
                  className="p-6 sm:p-7 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:border-indigo-100 transition-all space-y-5"
                >

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-900 text-white">

                        QUESTION{' '}
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          '0'
                        )}

                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium uppercase font-mono border ${getTypeBadgeColor(
                          questionType
                        )}`}
                      >
                        {String(
                          question.category ||
                            question.type ||
                            'technical'
                        ).replace(
                          '_',
                          ' '
                        )}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium font-mono border ${getDifficultyBadgeColor(
                          question.difficulty
                        )}`}
                      >
                        {question.difficulty}
                      </span>

                    </div>

                    <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">

                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />

                      Resume-based

                    </span>

                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                    "{question.question}"
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">

                    {question.linked_to && (
                      <div className="flex items-center gap-1.5">

                        <span className="font-mono font-semibold text-gray-400 uppercase text-[10px]">
                          Linked Target:
                        </span>

                        <span className="font-medium text-gray-800 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
                          {question.linked_to}
                        </span>

                      </div>
                    )}

                    {question.skill_tag && (
                      <div className="flex items-center gap-1.5">

                        <span className="font-mono font-semibold text-gray-400 uppercase text-[10px]">
                          Skill:
                        </span>

                        <span className="font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {question.skill_tag}
                        </span>

                      </div>
                    )}

                  </div>

                  <div className="pt-2 border-t border-gray-100">

                    <button
                      type="button"
                      onClick={() =>
                        toggleWhy(
                          questionId
                        )
                      }
                      className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition-colors py-1.5"
                    >

                      <span className="flex items-center gap-1.5">

                        <HelpCircle className="w-4 h-4 text-indigo-600" />

                        Why was I asked this? (Evidence Grounding)

                      </span>

                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isWhyOpen
                            ? 'rotate-180 text-indigo-900'
                            : 'text-gray-400'
                        }`}
                      />

                    </button>

                    {isWhyOpen && (
                      <div className="mt-3 p-5 rounded-[24px] bg-[#121212] text-white border border-white/10 space-y-3 text-xs animate-fade-in">

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-white/10">

                          <div>
                            <span className="text-[10px] font-mono text-white/50 uppercase block">
                              Resume Mention
                            </span>

                            <span className="text-white font-medium">
                              {question.skill_tag ||
                                'Declared Competency'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-mono text-white/50 uppercase block">
                              Section Source
                            </span>

                            <span className="text-white font-medium">
                              {question.evidence?.section ||
                                question.linked_to ||
                                'Resume'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-mono text-white/50 uppercase block">
                              Evaluation Focus
                            </span>

                            <span className="text-indigo-400 font-medium">
                              {question.focus ||
                                'General'}
                            </span>
                          </div>

                        </div>

                        <div>

                          <span className="text-[10px] font-mono text-white/50 uppercase block mb-1">
                            Exact Resume Evidence Snippet
                          </span>

                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-mono text-xs italic">

                            "
                            {question.evidence?.snippet ||
                              question.why_asked?.join(
                                '; '
                              ) ||
                              'Grounded in your profile'}
                            "

                          </div>

                        </div>

                        <div className="text-[11px] text-white/60 flex items-center justify-between pt-1">

                          <span>
                            Why Asked:{' '}
                            {question.why_asked?.join(
                              '; '
                            ) ||
                              'Grounded in your profile'}
                          </span>

                          <span className="font-mono text-green-400">
                            Verifiable Grounding
                          </span>

                        </div>

                      </div>
                    )}

                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">

                    <span className="text-xs text-gray-400 font-mono">

                      Focus:{' '}

                      <strong className="text-gray-700">

                        {question.focus ||
                          'General'}

                      </strong>

                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        handlePracticeSingle(
                          question
                        )
                      }
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
                    >

                      <span>
                        Practice Answer
                      </span>

                      <ArrowRight className="w-3.5 h-3.5" />

                    </button>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
};