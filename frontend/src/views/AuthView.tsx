
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const AuthView: React.FC = () => {
  const navigate = useNavigate();

  const {
    login,
    register,
    hasCompletedOnboarding,
    activeResumeProfile,
  } = useAuth();

  /*
   * LOGIN IS ALWAYS THE DEFAULT VIEW.
   */
  const [isLogin, setIsLogin] =
    useState<boolean>(true);

  const [fullName, setFullName] =
    useState<string>('');

  const [email, setEmail] =
    useState<string>('');

  const [password, setPassword] =
    useState<string>('');

  /*
   * Password visibility state.
   *
   * false -> password hidden
   * true  -> password visible
   */
  const [showPassword, setShowPassword] =
    useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] =
    useState<boolean>(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [
    isAccountNotFoundError,
    setIsAccountNotFoundError,
  ] = useState<boolean>(false);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  /*
   * ============================================================
   * CLEAR FORM
   * ============================================================
   */

  const clearCredentials = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  /*
   * ============================================================
   * SWITCH TO SIGN UP
   * ============================================================
   */

  const switchToSignup = () => {
    setIsLogin(false);

    setFullName('');

    clearCredentials();

    setErrorMsg(null);

    setIsAccountNotFoundError(
      false
    );

    setSuccessMsg(null);
  };

  /*
   * ============================================================
   * SWITCH TO LOGIN
   * ============================================================
   *
   * IMPORTANT:
   * When switching to login manually, the user must enter
   * both email and password again.
   * ============================================================
   */

  const switchToLogin = () => {
    setIsLogin(true);

    setFullName('');

    clearCredentials();

    setErrorMsg(null);

    setIsAccountNotFoundError(
      false
    );

    setSuccessMsg(null);
  };

  /*
   * ============================================================
   * HANDLE FORM SUBMISSION
   * ============================================================
   */

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setErrorMsg(null);

    setIsAccountNotFoundError(
      false
    );

    setSuccessMsg(null);

    /*
     * Basic client-side validation.
     */
    if (!isLogin) {
      if (!fullName.trim()) {
        setErrorMsg(
          'Please enter your full name.'
        );
        return;
      }
    }

    if (!email.trim()) {
      setErrorMsg(
        'Please enter your email address.'
      );
      return;
    }

    if (!password) {
      setErrorMsg(
        'Please enter your password.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * ========================================================
       * LOGIN
       * ========================================================
       */

      if (isLogin) {
        await login(
          email.trim(),
          password
        );

        /*
         * Successful authentication.
         *
         * New users who have not completed onboarding
         * are sent to onboarding.
         *
         * Existing users who already completed onboarding
         * go directly to the dashboard.
         */
        if (
          !hasCompletedOnboarding &&
          !activeResumeProfile
        ) {
          navigate(
            '/onboarding',
            {
              replace: true,
            }
          );
        } else {
          navigate(
            '/app/dashboard',
            {
              replace: true,
            }
          );
        }

        return;
      }

      /*
       * ========================================================
       * REGISTRATION
       * ========================================================
       */

      await register(
        email.trim(),
        password,
        fullName.trim()
      );

      /*
       * IMPORTANT:
       *
       * Registration does NOT automatically log the user in.
       *
       * The AuthContext.register() implementation deliberately
       * discards the registration token.
       *
       * Now return the user to the LOGIN screen.
       */
      setIsLogin(true);

      /*
       * The user must manually enter credentials after
       * registration.
       */
      setFullName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);

      setErrorMsg(null);

      setIsAccountNotFoundError(
        false
      );

      setSuccessMsg(
        'Account created successfully. Please sign in with your email and password.'
      );

      /*
       * Keep the URL explicitly in login mode.
       */
      navigate(
        '/auth?mode=login',
        {
          replace: true,
        }
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Authentication failed. Please check your credentials.';

      setErrorMsg(message);

      /*
       * Detect account-not-found errors.
       */
      const errorWithCode =
        error as {
          code?: string;
        };

      if (
        errorWithCode.code ===
          'ACCOUNT_NOT_FOUND' ||
        message
          .toLowerCase()
          .includes(
            'no account found'
          ) ||
        message
          .toLowerCase()
          .includes(
            'user not found'
          ) ||
        message
          .toLowerCase()
          .includes(
            'account not found'
          )
      ) {
        setIsAccountNotFoundError(
          true
        );
      } else {
        setIsAccountNotFoundError(
          false
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#FAF0E6] text-[#232327] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden selection:bg-[#E1A5B9] selection:text-[#232327] font-sans">
      {/* ====================================================== */}
      {/* BACKGROUND FLOWS                                        */}
      {/* ====================================================== */}

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5DFE8] rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#E1A5B9]/30 rounded-full blur-[100px] pointer-events-none" />

      {/* ====================================================== */}
      {/* BACK TO HOME                                           */}
      {/* ====================================================== */}

      <button
        type="button"
        onClick={() =>
          navigate('/')
        }
        className="absolute top-6 left-6 text-[#655D60] hover:text-[#232327] flex items-center gap-2 text-xs font-medium bg-[#FFF9F3] hover:bg-[#FDF4F7] border border-[#D9C9C5] px-3.5 py-2 rounded-xl transition-all"
      >
        <ArrowLeft className="w-4 h-4" />

        <span>
          Back to Home
        </span>
      </button>

      {/* ====================================================== */}
      {/* MAIN CARD                                              */}
      {/* ====================================================== */}

      <div className="w-full max-w-md bg-[#FFF9F3] border border-[#D9C9C5] rounded-3xl p-8 sm:p-10 shadow-[0_20px_55px_rgba(45,37,38,0.08)] relative z-10">
        {/* ==================================================== */}
        {/* BRAND / HEADING                                      */}
        {/* ==================================================== */}

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#B52C6F] mx-auto flex items-center justify-center text-white shadow-sm mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#232327] tracking-tight font-serif">
            {isLogin
              ? 'Welcome back to InterviewAI'
              : 'Create your account'}
          </h1>

          <p className="text-sm text-[#655D60] mt-2">
            {isLogin
              ? 'Sign in to continue your personalized interview practice.'
              : 'Join InterviewAI to turn your resume into personalized questions.'}
          </p>
        </div>

        {/* ==================================================== */}
        {/* SUCCESS MESSAGE                                      */}
        {/* ==================================================== */}

        {successMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#EAF7F0] border border-[#A8D5B4] text-[#1E4D3C] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#2B7A4B] shrink-0 mt-0.5" />

            <div className="flex-1 font-medium">
              {successMsg}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* ERROR MESSAGE                                        */}
        {/* ==================================================== */}

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#FDECEF] border border-[#E7B7C3] text-[#7A2B40] text-xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#B52C6F] shrink-0 mt-0.5" />

              <div className="flex-1">
                {errorMsg}
              </div>
            </div>

            {isAccountNotFoundError &&
              isLogin && (
                <div className="pl-6 pt-1">
                  <button
                    type="button"
                    onClick={
                      switchToSignup
                    }
                    className="text-[#B52C6F] hover:text-[#9F235F] font-semibold underline decoration-[#B52C6F] underline-offset-2 transition-colors inline-flex items-center gap-1"
                  >
                    <span>
                      Create an account
                    </span>

                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
          </div>
        )}

        {/* ==================================================== */}
        {/* AUTH FORM                                            */}
        {/* ==================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-4"
        >
          {/* ================================================== */}
          {/* FULL NAME                                           */}
          {/* ================================================== */}

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-[#655D60] mb-1.5 font-mono uppercase tracking-wider">
                Full Name
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#756A6C]">
                  <User className="w-4 h-4" />
                </div>

                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={event =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Alex Chen"
                  className="w-full bg-[#FFF9F3] border border-[#D9C9C5] rounded-xl pl-10 pr-4 py-3 text-sm text-[#232327] placeholder-[#978A8C] focus:outline-none focus:border-[#B52C6F] transition-all"
                />
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* EMAIL                                               */}
          {/* ================================================== */}

          <div>
            <label className="block text-xs font-medium text-[#655D60] mb-1.5 font-mono uppercase tracking-wider">
              Email
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#756A6C]">
                <Mail className="w-4 h-4" />
              </div>

              <input
                type="email"
                required
                autoComplete={
                  isLogin
                    ? 'email'
                    : 'email'
                }
                value={email}
                onChange={event =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="name@example.com"
                className="w-full bg-[#FFF9F3] border border-[#D9C9C5] rounded-xl pl-10 pr-4 py-3 text-sm text-[#232327] placeholder-[#978A8C] focus:outline-none focus:border-[#B52C6F] transition-all"
              />
            </div>
          </div>

          {/* ================================================== */}
          {/* PASSWORD                                            */}
          {/* ================================================== */}

          <div>
            <label className="block text-xs font-medium text-[#655D60] mb-1.5 font-mono uppercase tracking-wider">
              Password
            </label>

            <div className="relative">
              {/* Left lock icon */}
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#756A6C]">
                <Lock className="w-4 h-4" />
              </div>

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                required
                autoComplete={
                  isLogin
                    ? 'current-password'
                    : 'new-password'
                }
                value={password}
                onChange={event =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                className="w-full bg-[#FFF9F3] border border-[#D9C9C5] rounded-xl pl-10 pr-12 py-3 text-sm text-[#232327] placeholder-[#978A8C] focus:outline-none focus:border-[#B52C6F] transition-all"
              />

              {/* Password visibility toggle */}
              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    previous =>
                      !previous
                  )
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                title={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-[#756A6C] hover:text-[#232327] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ================================================== */}
          {/* SUBMIT BUTTON                                       */}
          {/* ================================================== */}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#B52C6F] hover:bg-[#9F235F] active:bg-[#8A1E51] text-white font-semibold text-sm shadow-[0_15px_40px_rgba(45,37,38,0.08)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                <span>
                  {isLogin
                    ? 'Signing in...'
                    : 'Creating account...'}
                </span>
              </span>
            ) : (
              <>
                <span>
                  {isLogin
                    ? 'Continue to InterviewAI'
                    : 'Create Account'}
                </span>

                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* ==================================================== */}
        {/* LOGIN / SIGNUP TOGGLE                                */}
        {/* ==================================================== */}

        <div className="mt-6 text-center text-xs text-[#655D60]">
          {isLogin ? (
            <span>
              New to InterviewAI?{' '}

              <button
                type="button"
                onClick={
                  switchToSignup
                }
                className="text-[#B52C6F] hover:text-[#9F235F] font-semibold transition-colors underline underline-offset-2 ml-1"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}

              <button
                type="button"
                onClick={
                  switchToLogin
                }
                className="text-[#B52C6F] hover:text-[#9F235F] font-semibold transition-colors underline underline-offset-2 ml-1"
              >
                Sign in
              </button>
            </span>
          )}
        </div>

        {/* ==================================================== */}
        {/* BACKEND NOTE                                         */}
        {/* ==================================================== */}
      </div>
    </div>
  );
};