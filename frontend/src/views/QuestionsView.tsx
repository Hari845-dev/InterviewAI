import React, { useState } from 'react';
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

import { useInterview } from '../context/InterviewContext';
import {
  InterviewQuestion,
  QuestionType,
} from '../types';

export const QuestionsView: React.FC = () => {
  const navigate = useNavigate();

  const {
    questions,
    generationSummary,
    isGenerating,
    startSession,
  } = useInterview();

  const [expandedWhy, setExpandedWhy] =
    useState<Record<string, boolean>>({});

  const [selectedTypeFilter, setSelectedTypeFilter] =
    useState<string>('All');

  const [selectedDifficultyFilter, setSelectedDifficultyFilter] =
    useState<string>('All');

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesType =
      selectedTypeFilter === 'All' ||
      String(
        q.category ||
          q.type ||
          ''
      ).toLowerCase() ===
        selectedTypeFilter.toLowerCase();

    const matchesDiff =
      selectedDifficultyFilter === 'All' ||
      q.difficulty.toLowerCase() ===
        selectedDifficultyFilter.toLowerCase();

    return matchesType && matchesDiff;
  });

  const handleLaunchFullInterview = async () => {
    const sessionRes = await startSession(questions);

    navigate(
      `/interview/session/${sessionRes.session_id}`
    );
  };

  const handlePracticeSingle = async (
    q: InterviewQuestion
  ) => {
    const sessionRes = await startSession([q]);

    navigate(
      `/interview/session/${sessionRes.session_id}`
    );
  };

  const getDifficultyBadgeColor = (
    diff: string
  ) => {
    const d = diff.toLowerCase();

    if (d === 'easy') {
      return 'bg-green-50 text-green-700 border-green-200';
    }

    if (d === 'hard') {
      return 'bg-red-50 text-red-700 border-red-200';
    }

    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getTypeBadgeColor = (
    t: QuestionType
  ) => {
    switch (t) {
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

  /*
   * Backend values are strings, so validate them against
   * the application's QuestionType union before using them.
   */
  const getQuestionType = (
    q: InterviewQuestion
  ): QuestionType => {
    const value = String(
      q.category ||
        q.type ||
        'technical'
    ).toLowerCase();

    const allowedTypes: QuestionType[] = [
      'project',
      'technical',
      'experience',
      'problem_solving',
      'hr',
    ];

    if (
      allowedTypes.includes(
        value as QuestionType
      )
    ) {
      return value as QuestionType;
    }

    return 'technical';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              EVIDENCE-GROUNDED QUESTION GENERATOR
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
              Bank: {questions.length} Questions
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
            onClick={() =>
              navigate('/app/prepare')
            }
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />

            <span>
              Calibrate Setup
            </span>
          </button>

          {questions.length > 0 && (
            <button
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

      {/* =====================================================
          GENERATION SUMMARY
          ===================================================== */}

      {generationSummary && (
        <div className="p-6 rounded-[24px] bg-[#121212] text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

          <div className="flex items-center gap-4">

            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>

            <div>

              <h3 className="text-sm font-bold text-white">
                Interview Question Set Ready (
                {generationSummary.questions_requested}{' '}
                Questions)
              </h3>

              <p className="text-xs text-white/60 font-mono mt-0.5">
                {generationSummary.cached_questions}{' '}
                cached •{' '}
                {generationSummary.fresh_questions}{' '}
                newly generated •{' '}
                {generationSummary.cache_hit_rate}% cache hit rate •{' '}
                {generationSummary.gemini_requests}{' '}
                Gemini request
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 text-xs font-mono">

            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80">
              FastAPI Grounded
            </span>

          </div>

        </div>
      )}

      {/* =====================================================
          FILTERS
          ===================================================== */}

      {questions.length > 0 && (
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
            ].map((t) => (
              <button
                key={t}
                onClick={() =>
                  setSelectedTypeFilter(t)
                }
                className={`px-3.5 py-1.5 rounded-full font-medium transition-all text-xs ${
                  selectedTypeFilter === t
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                {t === 'All'
                  ? 'All Types'
                  : t.replace(
                      '_',
                      ' '
                    )}
              </button>
            ))}

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
            ].map((d) => (
              <button
                key={d}
                onClick={() =>
                  setSelectedDifficultyFilter(d)
                }
                className={`px-3 py-1 rounded-full font-medium transition-all text-xs ${
                  selectedDifficultyFilter === d
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                {d}
              </button>
            ))}

          </div>

        </div>
      )}

      {/* =====================================================
          QUESTION LIST
          ===================================================== */}

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

      ) : questions.length === 0 ? (

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

          <div className="flex items-center justify-center gap-3 pt-2">

            <button
              onClick={() =>
                navigate('/app/prepare')
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full text-xs font-semibold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" />

              <span>
                Configure & Generate Set
              </span>
            </button>

          </div>

        </div>

      ) : filteredQuestions.length === 0 ? (

        <div className="p-12 rounded-[32px] bg-white border border-gray-100 text-center space-y-3 shadow-sm">

          <HelpCircle className="w-10 h-10 text-gray-400 mx-auto" />

          <h3 className="text-base font-bold text-gray-900">
            No questions match this filter
          </h3>

          <button
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
            (q, idx) => {

              /*
               * IMPORTANT:
               * q.id is optional in the backend type.
               * We create a guaranteed unique string ID
               * for UI state and event handlers.
               */
              const questionId =
                q.id ||
                q.question_id ||
                `question-${idx}`;

              const isWhyOpen =
                !!expandedWhy[
                  questionId
                ];

              const questionType =
                getQuestionType(q);

              return (

                <div
                  key={questionId}
                  className="p-6 sm:p-7 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:border-indigo-100 transition-all space-y-5"
                >

                  {/* =================================================
                      TOP BADGE ROW
                      ================================================= */}

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-900 text-white">
                        QUESTION{' '}
                        {String(
                          idx + 1
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
                          q.category ||
                            q.type ||
                            'technical'
                        ).replace(
                          '_',
                          ' '
                        )}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium font-mono border ${getDifficultyBadgeColor(
                          q.difficulty
                        )}`}
                      >
                        {q.difficulty}
                      </span>

                    </div>

                    <div className="flex items-center gap-2">

                      <span className="px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Resume-based
                      </span>

                    </div>

                  </div>

                  {/* =================================================
                      QUESTION TEXT
                      ================================================= */}

                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                    "{q.question}"
                  </h3>

                  {/* =================================================
                      LINKED CONTEXT
                      ================================================= */}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">

                    {q.linked_to && (
                      <div className="flex items-center gap-1.5">

                        <span className="font-mono font-semibold text-gray-400 uppercase text-[10px]">
                          Linked Target:
                        </span>

                        <span className="font-medium text-gray-800 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
                          {q.linked_to}
                        </span>

                      </div>
                    )}

                    {q.skill_tag && (
                      <div className="flex items-center gap-1.5">

                        <span className="font-mono font-semibold text-gray-400 uppercase text-[10px]">
                          Skill:
                        </span>

                        <span className="font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {q.skill_tag}
                        </span>

                      </div>
                    )}

                  </div>

                  {/* =================================================
                      WHY ASKED
                      ================================================= */}

                  <div className="pt-2 border-t border-gray-100">

                    <button
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
                              {q.skill_tag ||
                                'Declared Competency'}
                            </span>

                          </div>

                          <div>

                            <span className="text-[10px] font-mono text-white/50 uppercase block">
                              Section Source
                            </span>

                            <span className="text-white font-medium">
                              {q.evidence?.section ||
                                q.linked_to ||
                                'Resume'}
                            </span>

                          </div>

                          <div>

                            <span className="text-[10px] font-mono text-white/50 uppercase block">
                              Evaluation Focus
                            </span>

                            <span className="text-indigo-400 font-medium">
                              {q.focus}
                            </span>

                          </div>

                        </div>

                        <div>

                          <span className="text-[10px] font-mono text-white/50 uppercase block mb-1">
                            Exact Resume Evidence Snippet
                          </span>

                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-amber-300 font-mono text-xs italic">
                            "
                            {q.evidence?.snippet ||
                              q.why_asked?.join(
                                '; '
                              ) ||
                              'Grounded in your profile'}
                            "
                          </div>

                        </div>

                        <div className="text-[11px] text-white/60 flex items-center justify-between pt-1">

                          <span>
                            Why Asked:{' '}
                            {q.why_asked?.join(
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

                  {/* =================================================
                      BOTTOM ACTION
                      ================================================= */}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">

                    <span className="text-xs text-gray-400 font-mono">
                      Focus:{' '}
                      <strong className="text-gray-700">
                        {q.focus}
                      </strong>
                    </span>

                    <button
                      onClick={() =>
                        handlePracticeSingle(
                          q
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