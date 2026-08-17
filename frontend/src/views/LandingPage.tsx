import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  BrainCircuit,
  MessageSquare,
  Target,
  Zap,
  ChevronDown,
  Layers,
  BarChart3,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Instagram,
  Linkedin,
  Github,
  Twitter,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    isAuthenticated,
    hasCompletedOnboarding,
    activeResumeProfile,
  } = useAuth();

  const [demoWhyOpen, setDemoWhyOpen] =
    useState<boolean>(true);

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (
        !hasCompletedOnboarding &&
        !activeResumeProfile
      ) {
        navigate('/onboarding');
      } else {
        navigate('/app/dashboard');
      }

      return;
    }

    navigate('/auth?mode=login');
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
    } else {
      navigate('/auth?mode=login');
    }
  };

  const scrollToSection = (id: string) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <div
      className="
        min-h-screen
        bg-[#FAF0E6]
        text-[#232327]
        selection:bg-[#E1A5B9]
        selection:text-[#4A1830]
      "
    >
      {/* ====================================================== */}
      {/* NAVIGATION                                             */}
      {/* ====================================================== */}

      <header
        className="
          sticky
          top-0
          z-40
          bg-[#FAF0E6]/95
          backdrop-blur-md
          border-b
          border-[#D9C9C5]/70
        "
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">

            {/* Brand */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 shrink-0"
            >
              <div
                className="
                  w-10
                  h-10
                  rounded-xl
                  bg-[#B52C6F]
                  flex
                  items-center
                  justify-center
                  text-white
                  shadow-md
                  shadow-[#B52C6F]/10
                "
              >
                <Sparkles className="w-5 h-5" />
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className="
                    text-xl
                    font-bold
                    tracking-tight
                    text-[#232327]
                  "
                >
                  InterviewAI
                </span>

                <span
                  className="
                    hidden
                    sm:inline-block
                    text-[9px]
                    uppercase
                    tracking-[0.16em]
                    font-semibold
                    text-[#B52C6F]
                  "
                >
                  Resume Grounded
                </span>
              </div>
            </button>

            {/* Main navigation */}
            <nav
              className="
                hidden
                md:flex
                items-center
                gap-8
                text-sm
                font-medium
                text-[#655D60]
              "
            >
              <button
                type="button"
                onClick={() =>
                  scrollToSection(
                    'how-it-works'
                  )
                }
                className="
                  hover:text-[#B52C6F]
                  transition-colors
                "
              >
                How it Works
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection('practice')
                }
                className="
                  hover:text-[#B52C6F]
                  transition-colors
                "
              >
                Practice
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection(
                    'why-interviewai'
                  )
                }
                className="
                  hover:text-[#B52C6F]
                  transition-colors
                "
              >
                Why InterviewAI
              </button>

              <button
                type="button"
                onClick={() =>
                  scrollToSection('features')
                }
                className="
                  hover:text-[#B52C6F]
                  transition-colors
                "
              >
                Features
              </button>
            </nav>

            {/* Auth actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogin}
                className="
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-[#655D60]
                  hover:text-[#232327]
                  transition-colors
                "
              >
                {isAuthenticated
                  ? 'Open App'
                  : 'Login'}
              </button>

              <button
                type="button"
                onClick={handleGetStarted}
                className="
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  bg-[#B52C6F]
                  hover:bg-[#9F235F]
                  rounded-xl
                  transition-colors
                  flex
                  items-center
                  gap-2
                "
              >
                <span>
                  {isAuthenticated
                    ? 'Go to Dashboard'
                    : 'Get Started'}
                </span>

                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>

        {/* ====================================================== */}
        {/* CENTERED HERO                                          */}
        {/* ====================================================== */}

        <section
          className="
            border-b
            border-[#D9C9C5]/70
          "
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
            "
          >
            <div
              className="
                py-24
                sm:py-28
                lg:py-32
                text-center
              "
            >

              {/* Eyebrow */}
              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-3
                  mb-8
                "
              >
                <span
                  className="
                    h-px
                    w-10
                    bg-[#B52C6F]/55
                  "
                />

                <span
                  className="
                    text-[10px]
                    sm:text-[11px]
                    font-bold
                    uppercase
                    tracking-[0.26em]
                    text-[#B52C6F]
                  "
                >
                  AI-powered interview intelligence
                </span>

                <span
                  className="
                    h-px
                    w-10
                    bg-[#B52C6F]/55
                  "
                />
              </div>

             {/* Hero headline */}
              <h1
                className="
                  font-serif
                  text-[52px]
                  sm:text-[68px]
                  md:text-[80px]
                  lg:text-[92px]
                  xl:text-[104px]
                  leading-[0.9]
                  tracking-[-0.004em]
                  text-[#232327]
                  max-w-6xl
                  mx-auto
                "
              >
                Turn your{' '}

                <span className="italic text-[#B52C6F]">
                  resume
                </span>

                <br />

                Into a Personal AI
                <br />

                Interviewer.
              </h1>
              {/* Description */}
              <p
                className="
                  max-w-3xl
                  mx-auto
                  text-base
                  sm:text-lg
                  text-[#655D60]
                  leading-7
                  sm:leading-8
                  mt-8
                "
              >
                Upload your resume, get role-specific
                questions grounded in your real projects
                and skills, practise adaptively, and
                discover exactly what to improve.
              </p>

              {/* CTA */}
              <div
                className="
                  flex
                  flex-col
                  sm:flex-row
                  items-center
                  justify-center
                  gap-3
                  mt-9
                "
              >

                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="
                    w-full
                    sm:w-auto
                    px-7
                    py-3.5
                    rounded-xl
                    bg-[#232327]
                    hover:bg-[#B52C6F]
                    text-white
                    text-sm
                    font-bold
                    transition-colors
                    flex
                    items-center
                    justify-center
                    gap-2
                    shadow-sm
                  "
                >
                  <span>
                    Start your AI interview
                  </span>

                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    scrollToSection(
                      'how-it-works'
                    )
                  }
                  className="
                    w-full
                    sm:w-auto
                    px-7
                    py-3.5
                    rounded-xl
                    bg-[#FFF9F3]
                    border
                    border-[#D7C6C2]
                    hover:border-[#B52C6F]/40
                    hover:bg-white
                    text-[#3F393B]
                    text-sm
                    font-semibold
                    transition-colors
                  "
                >
                  See how it works
                </button>

              </div>

              {/* Supporting labels */}
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-center
                  gap-x-5
                  gap-y-2
                  mt-7
                  text-[10px]
                  uppercase
                  tracking-[0.18em]
                  text-[#8C8082]
                "
              >

                <span>
                  Resume-grounded
                </span>

                <span
                  className="
                    w-1
                    h-1
                    rounded-full
                    bg-[#B52C6F]
                  "
                />

                <span>
                  Adaptive practice
                </span>

                <span
                  className="
                    w-1
                    h-1
                    rounded-full
                    bg-[#B52C6F]
                  "
                />

                <span>
                  Skill-gap analysis
                </span>

              </div>

            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* PRACTICE                                               */}
        {/* ====================================================== */}

        <section
          id="practice"
          className="scroll-mt-24"
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
              py-20
              sm:py-24
            "
          >

            <div
              className="
                grid
                lg:grid-cols-[0.72fr_1.28fr]
                gap-12
                lg:gap-20
                items-start
              "
            >

              {/* Intro */}
              <div className="lg:pt-8">

                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    font-bold
                    text-[#B52C6F]
                  "
                >
                  Practice
                </span>

                <h2
                  className="
                    font-serif
                    text-4xl
                    sm:text-5xl
                    lg:text-6xl
                    leading-[0.97]
                    tracking-[-0.04em]
                    mt-4
                    text-[#232327]
                  "
                >
                  Questions that
                  <br />

                  <span className="italic text-[#B52C6F]">
                    know
                  </span>{' '}
                  your resume.
                </h2>

                <p
                  className="
                    text-sm
                    sm:text-base
                    leading-7
                    text-[#655D60]
                    mt-6
                    max-w-md
                  "
                >
                  InterviewAI does more than produce
                  generic questions. Each question can be
                  connected to a project, skill, experience,
                  or claim from your resume.
                </p>

                <div className="mt-8 space-y-5">

                  <div className="flex items-start gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                        mt-0.5
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Resume evidence
                      </h3>

                      <p className="text-xs leading-5 text-[#756A6C] mt-1">
                        Questions can reference specific
                        projects, technologies, experience,
                        and supporting details.
                      </p>
                    </div>

                  </div>

                  <div className="flex items-start gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                        mt-0.5
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Interviewer-style follow-ups
                      </h3>

                      <p className="text-xs leading-5 text-[#756A6C] mt-1">
                        Practise explaining decisions,
                        trade-offs, architecture, and
                        measurable outcomes.
                      </p>
                    </div>

                  </div>

                  <div className="flex items-start gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                        mt-0.5
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Actionable feedback
                      </h3>

                      <p className="text-xs leading-5 text-[#756A6C] mt-1">
                        Understand what was strong,
                        what was missing, and what to
                        improve next.
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              {/* Product preview */}
              <div
                className="
                  bg-[#FFF9F3]
                  border
                  border-[#D9C9C5]
                  shadow-[0_20px_55px_rgba(45,37,38,0.08)]
                "
              >

                <div
                  className="
                    px-5
                    sm:px-7
                    py-4
                    border-b
                    border-[#E5D8D4]
                    flex
                    items-center
                    justify-between
                  "
                >

                  <div className="flex items-center gap-2">

                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8C9C7]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8C9C7]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8C9C7]" />
                    </div>

                    <span
                      className="
                        ml-2
                        text-[10px]
                        uppercase
                        tracking-[0.16em]
                        text-[#8C8082]
                      "
                    >
                      Interview simulation
                    </span>

                  </div>

                  <span
                    className="
                      hidden
                      sm:inline
                      text-[10px]
                      uppercase
                      tracking-[0.14em]
                      text-[#B52C6F]
                      font-bold
                    "
                  >
                    Resume grounded
                  </span>

                </div>

                <div className="p-5 sm:p-8">

                  <div className="flex flex-wrap items-center gap-2 mb-6">

                    <span
                      className="
                        px-2.5
                        py-1
                        bg-[#232327]
                        text-white
                        text-[10px]
                        uppercase
                        tracking-wider
                        font-bold
                      "
                    >
                      Question 04
                    </span>

                    <span
                      className="
                        px-2.5
                        py-1
                        bg-[#F8EFE8]
                        border
                        border-[#E5D8D4]
                        text-[#675D60]
                        text-[10px]
                        uppercase
                        tracking-wider
                        font-semibold
                      "
                    >
                      Technical
                    </span>

                    <span
                      className="
                        px-2.5
                        py-1
                        bg-[#FAE9D4]
                        border
                        border-[#EFD7B8]
                        text-[#9A6328]
                        text-[10px]
                        uppercase
                        tracking-wider
                        font-semibold
                      "
                    >
                      Medium
                    </span>

                  </div>

                  <h3
                    className="
                      font-serif
                      text-2xl
                      sm:text-3xl
                      leading-[1.18]
                      tracking-[-0.025em]
                      text-[#232327]
                    "
                  >
                    You mentioned building an
                    object-detection application
                    using YOLOv8 and Flask.
                    Why did you choose YOLOv8
                    over other detection models,
                    and how did you minimise
                    latency?
                  </h3>

                  <div className="mt-7 pt-5 border-t border-[#E5D8D4]">

                    <button
                      type="button"
                      onClick={() =>
                        setDemoWhyOpen(
                          !demoWhyOpen
                        )
                      }
                      className="
                        w-full
                        flex
                        items-center
                        justify-between
                        text-[10px]
                        uppercase
                        tracking-[0.16em]
                        font-bold
                        text-[#B52C6F]
                      "
                    >

                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Why was I asked this?
                      </span>

                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          demoWhyOpen
                            ? 'rotate-180'
                            : ''
                        }`}
                      />

                    </button>

                    {demoWhyOpen && (
                      <div
                        className="
                          mt-5
                          grid
                          sm:grid-cols-3
                          gap-5
                          border-l-2
                          border-[#E1A5B9]
                          pl-5
                        "
                      >

                        <div>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                            Detected skill
                          </span>

                          <p className="text-xs font-semibold text-[#232327] mt-1.5">
                            YOLOv8 &
                            Computer Vision
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                            Resume evidence
                          </span>

                          <p className="text-xs leading-5 text-[#756A6C] mt-1.5">
                            Object detection and
                            real-time model
                            optimisation.
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                            Interview focus
                          </span>

                          <p className="text-xs leading-5 text-[#756A6C] mt-1.5">
                            Architecture, latency,
                            and trade-offs.
                          </p>
                        </div>

                      </div>
                    )}

                  </div>

                  <div
                    className="
                      mt-7
                      pt-5
                      border-t
                      border-[#E5D8D4]
                      flex
                      flex-col
                      sm:flex-row
                      items-start
                      sm:items-center
                      justify-between
                      gap-4
                    "
                  >

                    <div>

                      <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                        Example evaluation
                      </span>

                      <p className="text-xs text-[#675D60] mt-1.5">
                        Strong architecture reasoning;
                        more detail needed on
                        latency trade-offs.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={handleGetStarted}
                      className="
                        px-5
                        py-2.5
                        rounded-xl
                        bg-[#232327]
                        hover:bg-[#B52C6F]
                        text-white
                        text-xs
                        font-semibold
                        transition-colors
                        flex
                        items-center
                        gap-2
                        shrink-0
                      "
                    >
                      Practice full session
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* HOW IT WORKS                                           */}
        {/* ====================================================== */}

        <section
          id="how-it-works"
          className="
            scroll-mt-24
            bg-[#FFF9F3]
            border-y
            border-[#D9C9C5]/70
          "
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
              py-20
              sm:py-24
            "
          >

            <div
              className="
                grid
                lg:grid-cols-[0.55fr_1.45fr]
                gap-12
                lg:gap-20
              "
            >

              <div>

                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    font-bold
                    text-[#B52C6F]
                  "
                >
                  The loop
                </span>

                <h2
                  className="
                    font-serif
                    text-4xl
                    sm:text-5xl
                    lg:text-6xl
                    leading-[0.95]
                    tracking-[-0.04em]
                    mt-4
                    text-[#232327]
                  "
                >
                  Not just
                  <br />
                  question
                  <br />
                  generation.
                </h2>

                <p className="text-sm leading-6 text-[#756A6C] max-w-sm mt-6">
                  InterviewAI is designed around a
                  preparation loop: understand your
                  profile, practise against it, learn
                  from the feedback, and return
                  stronger.
                </p>

              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">

                {[
                  {
                    step: '01',
                    title: 'Upload your resume',
                    desc: 'Bring your PDF or DOCX and let the system build a structured candidate profile.',
                    icon: FileCheck,
                  },
                  {
                    step: '02',
                    title: 'Understand your profile',
                    desc: 'Skills, projects, experience, education, and evidence become interview context.',
                    icon: Layers,
                  },
                  {
                    step: '03',
                    title: 'Generate grounded questions',
                    desc: 'Questions are tied to technologies and claims that appear in your resume.',
                    icon: BrainCircuit,
                  },
                  {
                    step: '04',
                    title: 'Practise your answers',
                    desc: 'Move from individual questions into complete mock interview rounds.',
                    icon: MessageSquare,
                  },
                  {
                    step: '05',
                    title: 'Get evaluated',
                    desc: 'See scores, strengths, weaknesses, missing points, and suggested improvements.',
                    icon: Target,
                  },
                  {
                    step: '06',
                    title: 'Track progress',
                    desc: 'Performance analytics show where your readiness is improving.',
                    icon: BarChart3,
                  },
                ].map(item => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.step}
                      className="
                        border-t
                        border-[#D9C9C5]
                        pt-5
                      "
                    >

                      <div className="flex items-center justify-between">

                        <div
                          className="
                            w-9
                            h-9
                            rounded-xl
                            bg-[#F5DFE8]
                            text-[#B52C6F]
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <span className="text-[10px] uppercase tracking-[0.16em] text-[#978A8C]">
                          Step {item.step}
                        </span>

                      </div>

                      <h3 className="text-sm font-bold text-[#232327] mt-5">
                        {item.title}
                      </h3>

                      <p className="text-xs leading-5 text-[#756A6C] mt-2 max-w-sm">
                        {item.desc}
                      </p>

                    </div>
                  );
                })}

              </div>

            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* WHY INTERVIEWAI                                       */}
        {/* ====================================================== */}

        <section
          id="why-interviewai"
          className="scroll-mt-24"
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
              py-20
              sm:py-24
            "
          >

            <div
              className="
                grid
                lg:grid-cols-2
                gap-14
                lg:gap-20
                items-center
              "
            >

              <div>

                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-[0.22em]
                    font-bold
                    text-[#B52C6F]
                  "
                >
                  Why InterviewAI
                </span>

                <h2
                  className="
                    font-serif
                    text-4xl
                    sm:text-5xl
                    lg:text-6xl
                    leading-[0.97]
                    tracking-[-0.04em]
                    mt-4
                    text-[#232327]
                  "
                >
                  Your interview
                  <br />
                  should sound
                  <br />

                  <span className="italic text-[#B52C6F]">
                    like you.
                  </span>
                </h2>

                <p className="text-sm sm:text-base leading-7 text-[#655D60] max-w-xl mt-7">
                  Generic practice can teach you concepts.
                  It cannot prepare you for the questions
                  an interviewer may ask about the project
                  you personally built.
                </p>

                <div className="mt-8 space-y-5">

                  <div className="flex gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Resume evidence
                      </h3>

                      <p className="text-xs text-[#756A6C] leading-5 mt-1">
                        Questions are grounded in actual
                        sections of your resume.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Role-aware preparation
                      </h3>

                      <p className="text-xs text-[#756A6C] leading-5 mt-1">
                        Compare your profile against
                        the requirements of a target role.
                      </p>
                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div
                      className="
                        w-6
                        h-6
                        rounded-full
                        bg-[#F5DFE8]
                        border
                        border-[#E1A5B9]
                        text-[#B52C6F]
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#232327]">
                        Clear performance signals
                      </h3>

                      <p className="text-xs text-[#756A6C] leading-5 mt-1">
                        Turn practice sessions into
                        concrete strengths and
                        improvement areas.
                      </p>
                    </div>

                  </div>

                </div>

              </div>

              {/* Evidence panel */}
              <div
                className="
                  bg-[#232327]
                  text-[#FAF0E6]
                  p-6
                  sm:p-8
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    border-b
                    border-white/10
                    pb-6
                  "
                >

                  <div>

                    <span className="text-[9px] uppercase tracking-[0.18em] text-[#E1A5B9]">
                      Evidence grounding
                    </span>

                    <h3 className="font-serif text-3xl leading-tight mt-2 text-[#FFF9F3]">
                      From resume
                      <br />
                      claim to question
                    </h3>

                  </div>

                  <Cpu className="w-5 h-5 text-[#E1A5B9]" />

                </div>

                <div className="py-7">

                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/40">
                    Resume evidence
                  </span>

                  <p className="font-serif italic text-lg leading-7 text-[#FFF9F3] mt-2">
                    "Reduced average database query
                    execution time using composite
                    indexes."
                  </p>

                </div>

                <div className="border-y border-white/10 py-7">

                  <span className="text-[9px] uppercase tracking-[0.16em] text-[#E1A5B9]">
                    Interview question
                  </span>

                  <p className="font-serif text-xl leading-7 text-white mt-2">
                    What changed in the query execution
                    plan after the index refactor, and
                    how did you validate the improvement?
                  </p>

                </div>

                <div className="pt-7">

                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/40">
                    Interview focus
                  </span>

                  <p className="text-xs leading-6 text-white/60 mt-2">
                    Query execution internals,
                    indexing decisions, measurement
                    discipline, and technical reasoning.
                  </p>

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* FEATURES                                               */}
        {/* ====================================================== */}

        <section
          id="features"
          className="
            scroll-mt-24
            bg-[#FFF9F3]
            border-t
            border-[#D9C9C5]/70
          "
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
              py-20
              sm:py-24
            "
          >

            <div className="max-w-2xl">

              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.22em]
                  font-bold
                  text-[#B52C6F]
                "
              >
                Everything in one place
              </span>

              <h2
                className="
                  font-serif
                  text-4xl
                  sm:text-5xl
                  lg:text-6xl
                  leading-[0.97]
                  tracking-[-0.04em]
                  mt-4
                  text-[#232327]
                "
              >
                One preparation system,
                <br />

                <span className="italic text-[#B52C6F]">
                  not another chatbot.
                </span>
              </h2>

            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 mt-14">

              {[
                {
                  number: '01',
                  title: 'Resume Intelligence',
                  desc: 'Build a structured profile from your resume and keep the evidence behind important details.',
                  icon: FileCheck,
                },
                {
                  number: '02',
                  title: 'Job Matching',
                  desc: 'Compare your resume against a selected job description and understand where you align.',
                  icon: ShieldCheck,
                },
                {
                  number: '03',
                  title: 'Mock Interviews',
                  desc: 'Run realistic technical, behavioral, mixed, and interview simulations.',
                  icon: MessageSquare,
                },
                {
                  number: '04',
                  title: 'Aptitude Practice',
                  desc: 'Work through quantitative, logical, and verbal reasoning with focused practice.',
                  icon: Zap,
                },
              ].map(item => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.number}
                    className="
                      border-t
                      border-[#D9C9C5]
                      pt-5
                      pb-8
                    "
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#978A8C]">
                        {item.number}
                      </span>

                      <Icon className="w-5 h-5 text-[#B52C6F]" />

                    </div>

                    <h3 className="font-serif text-2xl leading-tight text-[#232327] mt-14">
                      {item.title}
                    </h3>

                    <p className="text-xs leading-5 text-[#756A6C] mt-3">
                      {item.desc}
                    </p>

                  </div>
                );
              })}

            </div>

            {/* Capability row */}
            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-4
                gap-6
                border-t
                border-[#D9C9C5]
                pt-8
                mt-8
              "
            >

              <div>
                <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                  Practice
                </span>

                <p className="text-sm font-semibold text-[#40393B] mt-1">
                  Question-by-question
                </p>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                  Feedback
                </span>

                <p className="text-sm font-semibold text-[#40393B] mt-1">
                  Strengths & gaps
                </p>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                  Matching
                </span>

                <p className="text-sm font-semibold text-[#40393B] mt-1">
                  Resume vs JD
                </p>
              </div>

              <div>
                <span className="text-[9px] uppercase tracking-[0.16em] text-[#978A8C]">
                  Analytics
                </span>

                <p className="text-sm font-semibold text-[#40393B] mt-1">
                  Readiness tracking
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ====================================================== */}
        {/* FINAL CTA                                              */}
        {/* ====================================================== */}

        <section
          className="
            bg-[#B52C6F]
            text-white
          "
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-4
              sm:px-6
              lg:px-8
              py-20
              sm:py-24
            "
          >

            <div className="max-w-4xl mx-auto text-center">

              <span
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.22em]
                  font-bold
                  text-white/75
                "
              >
                Start here
              </span>

              <h2
                className="
                  font-serif
                  text-4xl
                  sm:text-5xl
                  lg:text-6xl
                  leading-[0.97]
                  tracking-[-0.04em]
                  mt-4
                "
              >
                Your next interview
                deserves more than
                generic preparation.
              </h2>

              <p className="text-sm sm:text-base leading-7 text-white/75 max-w-2xl mx-auto mt-6">
                Upload your resume, understand your
                profile, and start practising against
                questions that actually matter.
              </p>

              <button
                type="button"
                onClick={handleGetStarted}
                className="
                  mt-8
                  px-7
                  py-3.5
                  rounded-xl
                  bg-[#FFF9F3]
                  text-[#232327]
                  hover:bg-white
                  text-sm
                  font-bold
                  transition-colors
                  inline-flex
                  items-center
                  gap-2
                "
              >
                Start your preparation

                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>
        </section>

      </main>

      {/* ====================================================== */}
      {/* FOOTER                                                 */}
      {/* ====================================================== */}

      <footer
        className="
          bg-[#FAF0E6]
          border-t
          border-[#D9C9C5]/70
        "
      >

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div
            className="
              py-8
              flex
              flex-col
              sm:flex-row
              items-center
              justify-between
              gap-5
            "
          >

            {/* Brand */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3"
            >
              <div
                className="
                  w-8
                  h-8
                  rounded-lg
                  bg-[#B52C6F]
                  flex
                  items-center
                  justify-center
                  text-white
                "
              >
                <Sparkles className="w-4 h-4" />
              </div>

              <span className="text-base font-bold tracking-tight text-[#232327]">
                InterviewAI
              </span>
            </button>

            {/* Social */}
            <div className="flex items-center gap-2 text-[#756A6C]">

              <a
                href="#instagram"
                onClick={event =>
                  event.preventDefault()
                }
                aria-label="Instagram"
                className="
                  p-2
                  rounded-lg
                  hover:bg-[#F3E5DF]
                  hover:text-[#232327]
                  transition-colors
                "
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a
                href="#linkedin"
                onClick={event =>
                  event.preventDefault()
                }
                aria-label="LinkedIn"
                className="
                  p-2
                  rounded-lg
                  hover:bg-[#F3E5DF]
                  hover:text-[#232327]
                  transition-colors
                "
              >
                <Linkedin className="w-4 h-4" />
              </a>

              <a
                href="#github"
                onClick={event =>
                  event.preventDefault()
                }
                aria-label="GitHub"
                className="
                  p-2
                  rounded-lg
                  hover:bg-[#F3E5DF]
                  hover:text-[#232327]
                  transition-colors
                "
              >
                <Github className="w-4 h-4" />
              </a>

              <a
                href="#twitter"
                onClick={event =>
                  event.preventDefault()
                }
                aria-label="Twitter"
                className="
                  p-2
                  rounded-lg
                  hover:bg-[#F3E5DF]
                  hover:text-[#232327]
                  transition-colors
                "
              >
                <Twitter className="w-4 h-4" />
              </a>

            </div>

            {/* Legal */}
            <div
              className="
                flex
                items-center
                gap-5
                text-xs
                font-medium
                text-[#756A6C]
              "
            >

              <a
                href="#privacy"
                onClick={event =>
                  event.preventDefault()
                }
                className="hover:text-[#B52C6F] transition-colors"
              >
                Privacy
              </a>

              <a
                href="#terms"
                onClick={event =>
                  event.preventDefault()
                }
                className="hover:text-[#B52C6F] transition-colors"
              >
                Terms
              </a>

              <a
                href="#contact"
                onClick={event =>
                  event.preventDefault()
                }
                className="hover:text-[#B52C6F] transition-colors"
              >
                Contact
              </a>

            </div>

          </div>

        </div>

      </footer>
    </div>
  );
};
