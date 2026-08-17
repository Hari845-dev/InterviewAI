import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Layers,
  Clock,
  Award,
  Calculator,
  BookOpen,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  Target,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { aptitudeApi, sessionApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { AptitudeQuestion } from '../types';

type SetupStep =
  | 'category'
  | 'topic'
  | 'configuration';

type CategoryId =
  | 'quantitative'
  | 'logical'
  | 'verbal'
  | 'all';

interface CategoryCard {
  id: CategoryId;
  name: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: 'quantitative',
    name: 'Quantitative Ability',
    description:
      'Numbers, percentages, ratios, averages, interest, work and speed-based problems.',
    icon: Calculator,
    iconClass: 'text-indigo-600 bg-indigo-50',
  },
  {
    id: 'logical',
    name: 'Logical Reasoning',
    description:
      'Series, coding-decoding, directions, blood relations and syllogisms.',
    icon: Puzzle,
    iconClass: 'text-purple-600 bg-purple-50',
  },
  {
    id: 'verbal',
    name: 'Verbal & Comprehension',
    description:
      'Grammar, vocabulary, analogies, para jumbles and reading comprehension.',
    icon: BookOpen,
    iconClass: 'text-orange-600 bg-orange-50',
  },
  {
    id: 'all',
    name: 'Comprehensive Diagnostic',
    description:
      'A balanced assessment combining quantitative, logical and verbal reasoning.',
    icon: Layers,
    iconClass: 'text-green-600 bg-green-50',
  },
];

const TOPIC_LABELS: Record<string, string> = {
  arithmetic: 'Arithmetic',
  average: 'Averages',
  number_system: 'Number System',
  percentages: 'Percentages',
  probability: 'Probability',
  profit_loss: 'Profit & Loss',
  ratio_proportion: 'Ratio & Proportion',
  simple_compound_interest:
    'Simple & Compound Interest',
  speed_distance: 'Speed, Time & Distance',
  time_work: 'Time & Work',

  blood_relations: 'Blood Relations',
  coding_decoding: 'Coding & Decoding',
  directions: 'Directions',
  number_series: 'Number Series',
  syllogism: 'Syllogism',

  grammar: 'Grammar',
  para_jumbles: 'Para Jumbles',
  reading_comprehension:
    'Reading Comprehension',
  verbal_analogy: 'Verbal Analogy',
  vocabulary: 'Vocabulary',
};

const TOPIC_DESCRIPTIONS: Record<string, string> = {
  arithmetic:
    'Basic calculations, operations and numerical problem solving.',
  average:
    'Mean, weighted average and average-based word problems.',
  number_system:
    'Core number-system concepts and numerical properties.',
  percentages:
    'Percentage increase, decrease and percentage calculations.',
  probability:
    'Events, outcomes and basic probability calculations.',
  profit_loss:
    'Cost price, selling price, profit, loss and percentages.',
  ratio_proportion:
    'Ratios, proportions and comparison-based problems.',
  simple_compound_interest:
    'Simple interest, compound interest and amount calculations.',
  speed_distance:
    'Speed, distance, time, trains and unit conversions.',
  time_work:
    'Work rates, combined work and time-based problems.',
  blood_relations:
    'Family relationships and relationship deduction.',
  coding_decoding:
    'Letter and word coding patterns.',
  directions:
    'Direction sense and movement-based reasoning.',
  number_series:
    'Patterns and sequences of numbers.',
  syllogism:
    'Statements, conclusions and logical deduction.',
  grammar:
    'Sentence correction and grammatical usage.',
  para_jumbles:
    'Logical ordering of sentences and paragraphs.',
  reading_comprehension:
    'Understanding and interpreting written information.',
  verbal_analogy:
    'Relationship and analogy-based reasoning.',
  vocabulary:
    'Synonyms, antonyms and word meanings.',
};

const formatTopicName = (
  topic: string
) =>
  TOPIC_LABELS[topic] ||
  topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter =>
      letter.toUpperCase()
    );

export const AptitudeView: React.FC = () => {
  const navigate = useNavigate();

  const {
    activeResumeHash,
  } = useAuth();

  // ==========================================================
  // SETUP
  // ==========================================================

  const [setupStep, setSetupStep] =
    useState<SetupStep>('category');

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryId | null>(null);

  const [selectedTopic, setSelectedTopic] =
    useState<string | null>(null);

  const [availableTopics, setAvailableTopics] =
    useState<string[]>([]);

  const [topicsLoading, setTopicsLoading] =
    useState(false);

  const [
    selectedDifficulty,
    setSelectedDifficulty,
  ] = useState<
    'easy' | 'medium' | 'hard'
  >('medium');

  const [questionCount, setQuestionCount] =
    useState(5);

  // ==========================================================
  // SESSION / QUESTIONS
  // ==========================================================

  const [questions, setQuestions] =
    useState<AptitudeQuestion[]>([]);

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState<number | null>(null);

  const [
    isAnswerSubmitted,
    setIsAnswerSubmitted,
  ] = useState(false);

  const [isFinished, setIsFinished] =
    useState(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    attemptedCount,
    setAttemptedCount,
  ] = useState(0);

  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {
    if (
      !sessionId ||
      isFinished
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setElapsedSeconds(
          previous => previous + 1
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [
    sessionId,
    isFinished,
  ]);

  // ==========================================================
  // CONFETTI
  // ==========================================================

  useEffect(() => {
    if (!isFinished) {
      return;
    }

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
  }, [isFinished]);

  // ==========================================================
  // CATEGORY
  // ==========================================================

  const handleCategorySelect = async (
    category: CategoryId
  ) => {
    setLoadError(null);
    setSelectedCategory(category);
    setSelectedTopic(null);

    if (category === 'all') {
      setAvailableTopics([]);
      setSetupStep('configuration');
      return;
    }

    setTopicsLoading(true);

    try {
      const topics =
        await aptitudeApi.getTopics(
          category
        );

      setAvailableTopics(topics);

      if (topics.length === 0) {
        setLoadError(
          'No concepts are available for this category.'
        );
        return;
      }

      setSetupStep('topic');
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Failed to load aptitude concepts.'
      );
    } finally {
      setTopicsLoading(false);
    }
  };

  // ==========================================================
  // TOPIC
  // ==========================================================

  const handleTopicSelect = (
    topic: string
  ) => {
    setSelectedTopic(topic);
    setLoadError(null);
    setSetupStep('configuration');
  };

  // ==========================================================
  // BUILD SESSION QUESTIONS
  // ==========================================================

  const buildSessionQuestions = (
    aptitudeQuestions: AptitudeQuestion[]
  ) =>
    aptitudeQuestions.map(
      question => {
        const correctIndex =
          typeof question.correct_answer ===
          'number'
            ? question.correct_answer
            : -1;

        const correctOption =
          correctIndex >= 0 &&
          correctIndex <
            question.options.length
            ? question.options[
                correctIndex
              ]
            : '';

        return {
          question_id:
            question.question_id,

          category:
            question.category,

          difficulty:
            question.difficulty as
              | 'easy'
              | 'medium'
              | 'hard',

          question:
            question.question,

          suggested_answer:
            correctOption ||
            question.explanation ||
            '',

          skill_tag:
            question.topic,

          source:
            'aptitude_bank',

          evidence: {
            source: 'skill_bank',
            section: 'aptitude',
            reference:
              question.topic,
            snippet:
              `Aptitude question from ${formatTopicName(
                question.topic
              )}`,
          },

          options:
            question.options,

          correct_answer:
            correctOption || null,

          why_asked: [],

          focus:
            formatTopicName(
              question.topic
            ),

          linked_to: null,
        };
      }
    );

  // ==========================================================
  // START PRACTICE
  // ==========================================================

  const handleStartPractice =
    async () => {
      if (!activeResumeHash) {
        setLoadError(
          'Please select an active resume before starting aptitude practice.'
        );
        return;
      }

      if (!selectedCategory) {
        setLoadError(
          'Please select a category.'
        );
        return;
      }

      if (
        selectedCategory !==
          'all' &&
        !selectedTopic
      ) {
        setLoadError(
          'Please select a concept.'
        );
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const category =
          selectedCategory === 'all'
            ? undefined
            : selectedCategory;

        const topic =
          selectedCategory === 'all'
            ? undefined
            : selectedTopic ||
              undefined;

        const fetched =
          await aptitudeApi.getAptitudeQuestions(
            category,
            topic,
            selectedDifficulty,
            questionCount
          );

        if (!fetched.length) {
          throw new Error(
            'No aptitude questions are available for the selected configuration.'
          );
        }

        if (
          fetched.length <
          questionCount
        ) {
          setLoadError(
            `Only ${fetched.length} questions are currently available for this topic at ${selectedDifficulty} difficulty. The available questions will be used.`
          );
        }

        const sessionQuestions =
          buildSessionQuestions(
            fetched
          );

        const session =
          await sessionApi.createSession(
            {
              resume_hash:
                activeResumeHash,
              jd_hash: null,
              mode: 'aptitude',
              title:
                selectedTopic
                  ? `Aptitude • ${formatTopicName(
                      selectedTopic
                    )}`
                  : 'Comprehensive Aptitude Diagnostic',
              role:
                selectedTopic
                  ? formatTopicName(
                      selectedTopic
                    )
                  : 'Aptitude',
              difficulty:
                selectedDifficulty,
              total_questions:
                fetched.length,
              questions:
                sessionQuestions,
            }
          );

        setQuestions(fetched);
        setSessionId(
          session.session_id
        );
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setIsFinished(false);
        setElapsedSeconds(0);
        setAttemptedCount(0);
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Failed to start aptitude practice.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // SELECT OPTION
  // ==========================================================

  const handleSelectOption = (
    optionIndex: number
  ) => {
    if (isAnswerSubmitted) {
      return;
    }

    setSelectedAnswer(
      optionIndex
    );
  };

  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================

  const handleSubmitAnswer =
    async () => {
      if (
        selectedAnswer === null ||
        !currentQuestion ||
        !sessionId
      ) {
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const selectedText =
          currentQuestion.options[
            selectedAnswer
          ];

        await sessionApi.submitAnswer(
          sessionId,
          {
            question_id:
              currentQuestion.question_id,
            user_answer:
              selectedText,
          }
        );

        setAttemptedCount(
          previous =>
            previous + 1
        );

        setIsAnswerSubmitted(
          true
        );
      } catch (err) {
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Failed to save your answer.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // NEXT
  // ==========================================================

  const handleNextQuestion =
    () => {
      if (
        currentIndex <
        questions.length - 1
      ) {
        setCurrentIndex(
          previous =>
            previous + 1
        );
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        return;
      }

      setIsFinished(true);
    };

  // ==========================================================
  // RESET
  // ==========================================================

  const handleRestart = () => {
    setSetupStep('category');
    setSelectedCategory(null);
    setSelectedTopic(null);
    setAvailableTopics([]);
    setQuestions([]);
    setSessionId(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setIsFinished(false);
    setElapsedSeconds(0);
    setAttemptedCount(0);
    setLoadError(null);
  };

  const handleExitTest =
    () => {
      setQuestions([]);
      setSessionId(null);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setAttemptedCount(0);
      setElapsedSeconds(0);
      setLoadError(null);
      setSetupStep(
        'configuration'
      );
    };

  // ==========================================================
  // DERIVED
  // ==========================================================

  const currentQuestion =
    questions[currentIndex];

  const progressPercent =
    questions.length > 0
      ? Math.round(
          ((currentIndex + 1) /
            questions.length) *
            100
        )
      : 0;

  const formatTime = (
    seconds: number
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const remaining =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(
      2,
      '0'
    )}:${String(
      remaining
    ).padStart(
      2,
      '0'
    )}`;
  };

  // ==========================================================
  // COMPLETED
  // ==========================================================

  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-6 pb-16">
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-gray-100 shadow-sm text-center space-y-8">

          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-green-50 text-green-700 border border-green-200 uppercase">
              Aptitude Practice Complete
            </span>

            <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-3">
              Assessment Summary
            </h1>

            <p className="text-gray-500 text-sm mt-2">
              {selectedTopic
                ? formatTopicName(
                    selectedTopic
                  )
                : 'Comprehensive Diagnostic'}
              {' • '}
              {selectedDifficulty}
              {' • '}
              {questions.length}{' '}
              questions
            </p>
          </div>

          {/* ==================================================
              LIGHT RESULT SUMMARY
              ================================================== */}

          <div className="p-6 rounded-[24px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_12px_35px_rgba(75,48,52,0.06)] grid grid-cols-3 gap-4">

            <div>
              <span className="text-[10px] font-mono text-[#8E8082] uppercase block">
                Attempted
              </span>

              <span className="text-3xl font-bold font-serif text-[#C43173]">
                {attemptedCount}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#8E8082] uppercase block">
                Questions
              </span>

              <span className="text-3xl font-bold font-serif text-green-600">
                {questions.length}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#8E8082] uppercase block">
                Time
              </span>

              <span className="text-2xl font-bold font-mono text-[#2D2526]">
                {formatTime(
                  elapsedSeconds
                )}
              </span>
            </div>

          </div>

          <p className="text-xs text-gray-500">
            Your aptitude result has been saved to your interview performance history.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={
                handleRestart
              }
              className="px-6 py-3 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Practice Another Set
            </button>

            <button
              onClick={() =>
                navigate(
                  '/app/performance'
                )
              }
              className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2"
            >
              View Performance
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ACTIVE MCQ
  // ==========================================================

  if (
    sessionId &&
    questions.length > 0 &&
    currentQuestion
  ) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-16">

        {loadError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {loadError}
          </div>
        )}

        <div className="p-4 sm:p-5 rounded-[24px] bg-white border border-gray-100 shadow-sm flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <button
              onClick={
                handleExitTest
              }
              className="text-xs font-semibold text-gray-500 hover:text-gray-900"
            >
              Exit Test
            </button>

            <div className="h-4 w-px bg-gray-200" />

            <span className="text-xs font-mono font-bold text-gray-900">
              Question{' '}
              {currentIndex + 1}
              {' '}
              of{' '}
              {questions.length}
            </span>
          </div>

          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            {formatTime(
              elapsedSeconds
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6">

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-900 text-white">
                QUESTION{' '}
                {String(
                  currentIndex + 1
                ).padStart(2, '0')}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-semibold font-mono bg-indigo-50 text-indigo-700">
                {formatTopicName(
                  currentQuestion.topic
                )}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-semibold font-mono bg-amber-50 text-amber-700 capitalize">
                {currentQuestion.difficulty}
              </span>
            </div>

            {isAnswerSubmitted && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  selectedAnswer ===
                  currentQuestion.correct_answer
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {selectedAnswer ===
                currentQuestion.correct_answer
                  ? 'Correct'
                  : 'Incorrect'}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {currentQuestion.question}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map(
              (option, index) => {

                const selected =
                  selectedAnswer ===
                  index;

                const correct =
                  isAnswerSubmitted &&
                  index ===
                    currentQuestion.correct_answer;

                const wrong =
                  isAnswerSubmitted &&
                  selected &&
                  !correct;

                let styles =
                  'bg-gray-50 border-gray-100 text-gray-800 hover:bg-gray-100';

                if (
                  selected &&
                  !isAnswerSubmitted
                ) {
                  styles =
                    'bg-indigo-600 border-indigo-600 text-white';
                } else if (
                  correct
                ) {
                  styles =
                    'bg-green-50 border-green-300 text-green-900';
                } else if (
                  wrong
                ) {
                  styles =
                    'bg-red-50 border-red-300 text-red-900';
                }

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={
                      isAnswerSubmitted ||
                      loading
                    }
                    onClick={() =>
                      handleSelectOption(
                        index
                      )
                    }
                    className={`p-4 rounded-[20px] border text-left text-xs flex items-start gap-3 transition-all ${styles}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>

                    <span className="leading-snug">
                      {option}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {!isAnswerSubmitted && (
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={
                  handleSubmitAnswer
                }
                disabled={
                  selectedAnswer ===
                    null ||
                  loading
                }
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-2.5 rounded-full text-xs font-medium disabled:opacity-40 flex items-center gap-2"
              >
                {loading && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Submit Answer
              </button>
            </div>
          )}

          {isAnswerSubmitted && (
            <div className="space-y-4 pt-2 border-t border-gray-100">

              {/* =================================================
                  LIGHT SOLUTION & EXPLANATION
                  ================================================= */}

              <div className="p-4 rounded-[20px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_8px_24px_rgba(75,48,52,0.05)] text-[#2D2526]">

                <div className="font-bold text-[#C43173] uppercase font-mono text-[10px]">
                  Solution & Explanation
                </div>

                <p className="text-[#65595B] mt-2 leading-relaxed text-xs">
                  {currentQuestion.explanation ||
                    'No explanation is available.'}
                </p>

              </div>

              <div className="flex justify-end">
                <button
                  onClick={
                    handleNextQuestion
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-2.5 rounded-full text-xs font-medium flex items-center gap-2"
                >
                  {currentIndex <
                  questions.length - 1
                    ? 'Next Question'
                    : 'View Test Results'}

                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================
  // SETUP
  // ==========================================================

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-4 pb-16">

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-indigo-600" />

          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            STANDARDIZED APTITUDE & DIAGNOSTIC PRACTICE
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
          Choose what you want to practise
        </h1>

        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Select an aptitude domain, choose a focused concept, configure your assessment, and begin your practice.
        </p>
      </div>

      {/* CATEGORY */}

      {setupStep ===
        'category' && (
        <div className="space-y-6">

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              1
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Choose Assessment Category
              </h2>

              <p className="text-xs text-gray-500">
                Select the aptitude domain.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {CATEGORY_CARDS.map(
              category => {
                const Icon =
                  category.icon;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      handleCategorySelect(
                        category.id
                      )
                    }
                    disabled={
                      topicsLoading
                    }
                    className="text-left p-6 rounded-[28px] bg-white border-2 border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between">

                      <div
                        className={`w-12 h-12 rounded-2xl ${category.iconClass} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 mt-5">
                      {category.name}
                    </h3>

                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      {category.description}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* TOPIC */}

      {setupStep === 'topic' && (
        <div className="space-y-6">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Choose a Concept
                </h2>

                <p className="text-xs text-gray-500">
                  Focus on one specific aptitude concept.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSetupStep(
                  'category'
                )
              }
              className="px-3 py-2 rounded-full bg-gray-50 text-xs font-semibold text-gray-600 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>

          <div className="p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {availableTopics.map(
                topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() =>
                      handleTopicSelect(
                        topic
                      )
                    }
                    className="text-left p-4 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 mt-3">
                      {formatTopicName(
                        topic
                      )}
                    </h3>

                    <p className="text-[11px] text-gray-500 mt-1">
                      {TOPIC_DESCRIPTIONS[
                        topic
                      ] ||
                        'Practice questions focused on this concept.'}
                    </p>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURATION */}

      {setupStep ===
        'configuration' && (
        <div className="space-y-6">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {selectedCategory ===
                'all'
                  ? 2
                  : 3}
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Configure Practice
                </h2>

                <p className="text-xs text-gray-500">
                  Set difficulty and question count.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSetupStep(
                  selectedCategory ===
                    'all'
                    ? 'category'
                    : 'topic'
                )
              }
              className="px-3 py-2 rounded-full bg-gray-50 text-xs font-semibold text-gray-600 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>

          {/* ==================================================
              LIGHT SELECTED PRACTICE PANEL
              ================================================== */}

          <div className="p-6 rounded-[28px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_12px_35px_rgba(75,48,52,0.06)]">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-2xl bg-[#FAE7EF] text-[#C43173] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>

              <div>
                <p className="text-[10px] uppercase font-mono text-[#9A8C8F] tracking-wider">
                  Selected Practice
                </p>

                <h3 className="text-lg font-bold text-[#2D2526]">
                  {selectedTopic
                    ? formatTopicName(
                        selectedTopic
                      )
                    : 'Comprehensive Diagnostic'}
                </h3>
              </div>

            </div>

          </div>

          <div className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-7">

            <div>
              <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
                Difficulty Level
              </label>

              <div className="grid grid-cols-3 gap-3">

                {[
                  'easy',
                  'medium',
                  'hard',
                ].map(
                  difficulty => (
                    <button
                      key={
                        difficulty
                      }
                      type="button"
                      onClick={() =>
                        setSelectedDifficulty(
                          difficulty as
                            | 'easy'
                            | 'medium'
                            | 'hard'
                        )
                      }
                      className={`py-3 rounded-xl text-xs font-bold uppercase font-mono border ${
                        selectedDifficulty ===
                        difficulty
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {difficulty}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
                Number of Questions
              </label>

              <div className="grid grid-cols-4 gap-3">

                {[3, 5, 10, 15].map(
                  count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        setQuestionCount(
                          count
                        )
                      }
                      className={`py-3 rounded-xl text-xs font-bold font-mono border ${
                        questionCount ===
                        count
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {count}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* ==================================================
              LIGHT START PRACTICE ACTION BAR
              ================================================== */}

          <div className="p-6 rounded-[28px] bg-[#FFFDFC] border border-[#E1D6D2] shadow-[0_12px_35px_rgba(75,48,52,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">

            <div>
              <p className="text-sm font-semibold text-[#2D2526]">
                {selectedTopic
                  ? formatTopicName(
                      selectedTopic
                    )
                  : 'Comprehensive Diagnostic'}
                {' • '}
                {questionCount}{' '}
                questions
              </p>

              <p className="text-[11px] text-[#8E8082] font-mono capitalize mt-1">
                {selectedDifficulty}{' '}
                difficulty
              </p>
            </div>

            <button
              onClick={
                handleStartPractice
              }
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#C43173] hover:bg-[#A9255F] text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_24px_rgba(196,49,115,0.18)]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Start Aptitude Practice
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};