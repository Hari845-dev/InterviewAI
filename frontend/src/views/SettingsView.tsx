import React, { useState } from 'react';
import {
  Settings,
  User,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Info,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

type ThemeOption =
  | 'light'
  | 'dark'
  | 'system';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();

  const [theme, setTheme] =
    useState<ThemeOption>('light');

  const [statusFeedback, setStatusFeedback] =
    useState<string | null>(null);

  // ==========================================================
  // RESET LOCAL DATA
  // ==========================================================

  const handleResetCache = () => {
    const confirmed = window.confirm(
      'Clear your local InterviewAI session data? Your stored account data, resumes, and job descriptions on the server will not be deleted.'
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      'interviewai_active_resume_hash'
    );

    localStorage.removeItem(
      'interviewai_active_resume_profile'
    );

    localStorage.removeItem(
      'interviewai_onboarding_done'
    );

    localStorage.removeItem(
      'interviewai_selected_jd_hash'
    );

    localStorage.removeItem(
      'interviewai_custom_api_url'
    );

    sessionStorage.clear();

    setStatusFeedback(
      'Local session data cleared. Reloading InterviewAI...'
    );

    window.setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  // ==========================================================
  // THEME
  // ==========================================================

  const handleThemeChange = (
    nextTheme: ThemeOption
  ) => {
    if (nextTheme !== 'light') {
      setStatusFeedback(
        nextTheme === 'dark'
          ? 'Dark mode is planned for a future release.'
          : 'System theme is planned for a future release.'
      );

      return;
    }

    setTheme('light');

    setStatusFeedback(
      'Light theme is active.'
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-16">

      {/* ====================================================
          HEADER
          ==================================================== */}

      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />

          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            ACCOUNT & PREFERENCES
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif italic text-gray-900 mt-1">
          Settings
        </h1>

        <p className="text-gray-500 text-sm mt-1 max-w-2xl">
          Manage your InterviewAI account, appearance,
          and local session preferences.
        </p>
      </div>

      {/* ====================================================
          FEEDBACK
          ==================================================== */}

      {statusFeedback && (
        <div className="p-4 rounded-[20px] bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between animate-fade-in">
          <span>{statusFeedback}</span>

          <button
            type="button"
            onClick={() =>
              setStatusFeedback(null)
            }
            className="font-bold text-indigo-700 hover:text-indigo-900"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* ====================================================
          APPEARANCE
          ==================================================== */}

      <section className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-6">

        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Sun className="w-5 h-5 text-indigo-600" />

          <div>
            <h2 className="text-base font-bold text-gray-900 font-serif">
              Appearance
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Choose how InterviewAI should look.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-gray-500 uppercase mb-3">
            Theme
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* LIGHT */}

            <button
              type="button"
              onClick={() =>
                handleThemeChange('light')
              }
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between">

                <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-indigo-600" />
                </div>

                {theme === 'light' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                )}
              </div>

              <h3 className="text-sm font-bold text-gray-900 mt-3">
                Light
              </h3>

              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Use the current InterviewAI light interface.
              </p>

              {theme === 'light' && (
                <span className="inline-block mt-3 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-mono font-bold uppercase">
                  Active
                </span>
              )}
            </button>

            {/* DARK */}

            <button
              type="button"
              onClick={() =>
                handleThemeChange('dark')
              }
              className="p-4 rounded-2xl border-2 border-gray-200 bg-white text-left hover:border-gray-300 transition-all"
            >
              <div className="flex items-center justify-between">

                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-gray-700" />
                </div>

                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-mono font-bold uppercase">
                  Soon
                </span>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mt-3">
                Dark
              </h3>

              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                A dark interface optimized for low-light use.
              </p>
            </button>

            {/* SYSTEM */}

            <button
              type="button"
              onClick={() =>
                handleThemeChange('system')
              }
              className="p-4 rounded-2xl border-2 border-gray-200 bg-white text-left hover:border-gray-300 transition-all"
            >
              <div className="flex items-center justify-between">

                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-gray-700" />
                </div>

                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-mono font-bold uppercase">
                  Soon
                </span>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mt-3">
                System
              </h3>

              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Follow your operating system appearance.
              </p>
            </button>

          </div>
        </div>
      </section>

      {/* ====================================================
          ACCOUNT
          ==================================================== */}

      <section className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-5">

        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

          <User className="w-5 h-5 text-indigo-600" />

          <div>
            <h2 className="text-base font-bold text-gray-900 font-serif">
              Account
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Your InterviewAI account information.
            </p>
          </div>

        </div>

        <div className="space-y-3">

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Name
            </span>

            <p className="text-sm font-semibold text-gray-900 mt-1">
              {user?.full_name || 'Candidate'}
            </p>

          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Email
            </span>

            <p className="text-sm font-semibold text-gray-900 mt-1 break-all">
              {user?.email || 'Not available'}
            </p>

          </div>

        </div>
      </section>

      {/* ====================================================
          DATA & PRIVACY
          ==================================================== */}

      <section className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-5">

        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

          <ShieldCheck className="w-5 h-5 text-indigo-600" />

          <div>
            <h2 className="text-base font-bold text-gray-900 font-serif">
              Data & Privacy
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Manage data stored locally in this browser.
            </p>
          </div>

        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">

          <p className="text-xs text-amber-900 leading-relaxed">
            Clearing local session data removes
            browser-side InterviewAI state such as
            the active resume selection and session
            cache. Your account, uploaded resumes,
            job descriptions, and interview history
            stored on the server are not deleted.
          </p>

        </div>

        <button
          type="button"
          onClick={handleResetCache}
          className="px-5 py-2.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />

          <span>
            Clear Local Session Data
          </span>
        </button>

      </section>

      {/* ====================================================
          ABOUT
          ==================================================== */}

      <section className="p-6 sm:p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-4">

        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">

          <Info className="w-5 h-5 text-indigo-600" />

          <div>
            <h2 className="text-base font-bold text-gray-900 font-serif">
              About InterviewAI
            </h2>

            <p className="text-xs text-gray-500 mt-0.5">
              Application information.
            </p>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Version
            </span>

            <p className="text-sm font-semibold text-gray-900 mt-1">
              1.0.0
            </p>

          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
              Platform
            </span>

            <p className="text-sm font-semibold text-gray-900 mt-1">
              InterviewAI
            </p>

          </div>

        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          InterviewAI helps candidates prepare for
          interviews using resume-grounded questions,
          job-specific preparation, aptitude practice,
          and performance feedback.
        </p>

      </section>

    </div>
  );
};