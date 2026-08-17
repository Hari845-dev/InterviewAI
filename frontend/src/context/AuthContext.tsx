import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  User,
  OnboardingPreferences,
  ResumeProfileResponse,
  StoredResumeItem,
} from '../types';

import {
  authApi,
  resumeApi,
  getStoredToken,
  setStoredToken,
  getBaseApiUrl,
  setCustomApiUrl,
} from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  hasCompletedOnboarding: boolean;

  resumes: StoredResumeItem[];

  activeResumeHash: string | null;
  activeResumeProfile: ResumeProfileResponse | null;

  preferences: OnboardingPreferences;

  backendConnected: boolean;
  backendUrl: string;

  login: (
    email: string,
    pass: string
  ) => Promise<void>;

  register: (
    email: string,
    pass: string,
    fullName: string
  ) => Promise<void>;

  logout: () => void;

  setHasCompletedOnboarding: (
    val: boolean
  ) => void;

  setActiveResume: (
    hash: string,
    profile?: ResumeProfileResponse
  ) => void;

  switchActiveResume: (
    hash: string
  ) => Promise<void>;

  deleteResume: (
    hash: string
  ) => Promise<void>;

  refreshResumes: () => Promise<void>;

  updatePreferences: (
    prefs: Partial<OnboardingPreferences>
  ) => void;

  setBackendUrl: (
    url: string | null
  ) => void;

  checkBackendHealth: () => Promise<boolean>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

const DEFAULT_PREFERENCES: OnboardingPreferences =
  {
    focus: 'interview_prep',
    targetRole: 'Software Engineering',
    experienceLevel: 'Intermediate',
    difficulty: 'Medium',
  };

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] =
    useState<User | null>(() => {
      try {
        const saved =
          localStorage.getItem(
            'interviewai_user'
          );

        return saved
          ? JSON.parse(saved)
          : null;
      } catch {
        localStorage.removeItem(
          'interviewai_user'
        );

        return null;
      }
    });

  const [token, setToken] =
    useState<string | null>(() =>
      getStoredToken()
    );

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [backendConnected, setBackendConnected] =
    useState<boolean>(false);

  const [backendUrl, setBackendUrlState] =
    useState<string>(() =>
      getBaseApiUrl()
    );

  const [
    hasCompletedOnboarding,
    setHasCompletedOnboardingState,
  ] = useState<boolean>(() => {
    return (
      localStorage.getItem(
        'interviewai_onboarding_done'
      ) === 'true'
    );
  });

  const [resumes, setResumes] =
    useState<StoredResumeItem[]>([]);

  const [activeResumeHash, setActiveResumeHash] =
    useState<string | null>(() => {
      return localStorage.getItem(
        'interviewai_active_resume_hash'
      );
    });

  const [
    activeResumeProfile,
    setActiveResumeProfile,
  ] =
    useState<ResumeProfileResponse | null>(
      () => {
        try {
          const saved =
            localStorage.getItem(
              'interviewai_active_resume_profile'
            );

          return saved
            ? JSON.parse(saved)
            : null;
        } catch {
          localStorage.removeItem(
            'interviewai_active_resume_profile'
          );

          return null;
        }
      }
    );

  const [preferences, setPreferences] =
    useState<OnboardingPreferences>(() => {
      try {
        const saved =
          localStorage.getItem(
            'interviewai_preferences'
          );

        return saved
          ? JSON.parse(saved)
          : DEFAULT_PREFERENCES;
      } catch {
        localStorage.removeItem(
          'interviewai_preferences'
        );

        return DEFAULT_PREFERENCES;
      }
    });

  /*
   * ============================================================
   * REFRESH USER RESUMES
   * ============================================================
   */

  const refreshResumes =
    useCallback(async () => {
      try {
        const list =
          await resumeApi.getUserResumes();

        setResumes(list);

        let currentActive =
          localStorage.getItem(
            'interviewai_active_resume_hash'
          );

        /*
         * If there is no locally stored active resume,
         * use the first resume returned by the backend.
         */
        if (
          !currentActive &&
          list.length > 0
        ) {
          currentActive =
            list[0].resume_hash;

          localStorage.setItem(
            'interviewai_active_resume_hash',
            currentActive
          );
        }

        setActiveResumeHash(
          currentActive || null
        );

        /*
         * Restore the active resume profile
         * from the backend list.
         */
        if (currentActive) {
          const found =
            list.find(
              resume =>
                resume.resume_hash ===
                currentActive
            );

          if (found) {
            const profile: ResumeProfileResponse =
              {
                resume_hash:
                  found.resume_hash,

                structured_profile:
                  found.structured_profile,

                cached: true,

                created_at:
                  found.created_at,

                filename:
                  found.filename,
              };

            setActiveResumeProfile(
              profile
            );

            localStorage.setItem(
              'interviewai_active_resume_profile',
              JSON.stringify(profile)
            );
          } else {
            /*
             * The locally stored active resume
             * no longer exists.
             */
            setActiveResumeHash(null);

            setActiveResumeProfile(
              null
            );

            localStorage.removeItem(
              'interviewai_active_resume_hash'
            );

            localStorage.removeItem(
              'interviewai_active_resume_profile'
            );
          }
        } else {
          setActiveResumeProfile(null);

          localStorage.removeItem(
            'interviewai_active_resume_profile'
          );
        }
      } catch (error) {
        console.error(
          'Failed to load resumes list:',
          error
        );
      }
    }, []);

  /*
   * ============================================================
   * SWITCH ACTIVE RESUME
   * ============================================================
   */

  const switchActiveResume =
    async (hash: string) => {
      await resumeApi.setActiveResume(
        hash
      );

      setActiveResumeHash(hash);

      localStorage.setItem(
        'interviewai_active_resume_hash',
        hash
      );

      const profile =
        await resumeApi.getResumeByHash(
          hash
        );

      setActiveResumeProfile(
        profile
      );

      localStorage.setItem(
        'interviewai_active_resume_profile',
        JSON.stringify(profile)
      );

      await refreshResumes();
    };

  /*
   * ============================================================
   * DELETE RESUME
   * ============================================================
   */

  const deleteResume =
    async (hash: string) => {
      await resumeApi.deleteResume(
        hash
      );

      /*
       * If deleting the currently active
       * resume, clear the cached selection.
       */
      if (
        activeResumeHash === hash
      ) {
        setActiveResumeHash(null);
        setActiveResumeProfile(
          null
        );

        localStorage.removeItem(
          'interviewai_active_resume_hash'
        );

        localStorage.removeItem(
          'interviewai_active_resume_profile'
        );
      }

      await refreshResumes();
    };

  /*
   * ============================================================
   * BACKEND HEALTH
   * ============================================================
   */

  const checkBackendHealth =
    useCallback(
      async (): Promise<boolean> => {
        try {
          const url =
            getBaseApiUrl();

          const response =
            await fetch(
              `${url}/health`,
              {
                method: 'GET',
                signal:
                  AbortSignal.timeout(
                    3000
                  ),
              }
            );

          const ok =
            response.ok;

          setBackendConnected(
            ok
          );

          return ok;
        } catch {
          /*
           * Fallback check against /docs.
           */
          try {
            const url =
              getBaseApiUrl();

            const response =
              await fetch(
                `${url}/docs`,
                {
                  method: 'GET',
                  signal:
                    AbortSignal.timeout(
                      3000
                    ),
                }
              );

            const ok =
              response.ok;

            setBackendConnected(
              ok
            );

            return ok;
          } catch {
            setBackendConnected(
              false
            );

            return false;
          }
        }
      },
      []
    );

  /*
   * ============================================================
   * BACKEND HEALTH POLLING
   * ============================================================
   */

  useEffect(() => {
    checkBackendHealth();

    const interval =
      setInterval(
        checkBackendHealth,
        30000
      );

    return () =>
      clearInterval(interval);
  }, [
    checkBackendHealth,
  ]);

  /*
   * ============================================================
   * RESTORE EXISTING LOGIN SESSION
   * ============================================================
   */

  useEffect(() => {
    const initializeSession =
      async () => {
        /*
         * No token means the user is not
         * authenticated.
         */
        if (!token) {
          setUser(null);
          setResumes([]);
          setActiveResumeHash(
            null
          );
          setActiveResumeProfile(
            null
          );
          setIsLoading(false);

          return;
        }

        try {
          const backendUser =
            await authApi.getCurrentUser();

          const normalizedUser: User =
            {
              id:
                backendUser?.user_id,

              email:
                backendUser?.email ??
                user?.email ??
                '',

              full_name:
                backendUser?.name ??
                backendUser?.full_name ??
                '',

              created_at:
                backendUser?.created_at,
            };

          setUser(
            normalizedUser
          );

          localStorage.setItem(
            'interviewai_user',
            JSON.stringify(
              normalizedUser
            )
          );

          await refreshResumes();
        } catch (error) {
          console.warn(
            'Stored session token is invalid or expired. Logging out.',
            error
          );

          logout();
        } finally {
          setIsLoading(false);
        }
      };

    initializeSession();
  }, [
    token,
    refreshResumes,
  ]);

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const login = async (
    email: string,
    pass: string
  ) => {
    const normalizedEmail =
      email.trim();

    if (!normalizedEmail) {
      throw new Error(
        'Email is required.'
      );
    }

    if (!pass) {
      throw new Error(
        'Password is required.'
      );
    }

    const response =
      await authApi.login({
        email:
          normalizedEmail,
        password: pass,
      });

    /*
     * Only successful login stores the JWT.
     */
    setStoredToken(
      response.access_token
    );

    setToken(
      response.access_token
    );

    const backendUser =
      response.user ?? {
        id:
          response.user_id,

        email:
          response.email ??
          normalizedEmail,

        full_name:
          response.name ??
          normalizedEmail
            .split('@')[0]
            .replace(
              /[._]/g,
              ' '
            )
            .replace(
              /\b\w/g,
              letter =>
                letter.toUpperCase()
            ),
      };

    const normalizedUser: User =
      {
        id:
          backendUser.id,

        email:
          backendUser.email,

        full_name:
          backendUser.full_name,

        created_at:
          backendUser.created_at,
      };

    setUser(
      normalizedUser
    );

    localStorage.setItem(
      'interviewai_user',
      JSON.stringify(
        normalizedUser
      )
    );

    /*
     * Load resumes after successful
     * authentication.
     */
    await refreshResumes();
  };

  /*
   * ============================================================
   * REGISTER
   * ============================================================
   *
   * IMPORTANT:
   *
   * Registration DOES NOT log the user in.
   *
   * The backend may return a token for
   * compatibility, but we deliberately
   * discard it here.
   *
   * AuthView should redirect the user
   * back to the login screen after this
   * promise resolves.
   * ============================================================
   */

  const register = async (
    email: string,
    pass: string,
    fullName: string
  ) => {
    const normalizedEmail =
      email.trim();

    const normalizedName =
      fullName.trim();

    if (!normalizedName) {
      throw new Error(
        'Full name is required.'
      );
    }

    if (!normalizedEmail) {
      throw new Error(
        'Email is required.'
      );
    }

    if (!pass) {
      throw new Error(
        'Password is required.'
      );
    }

    /*
     * Call backend registration.
     *
     * We intentionally DO NOT save the
     * access_token returned from register().
     */
    await authApi.register({
      email:
        normalizedEmail,

      password:
        pass,

      full_name:
        normalizedName,
    });

    /*
     * Explicitly guarantee that registration
     * leaves the application unauthenticated.
     */
    setStoredToken(null);
    setToken(null);
    setUser(null);

    setResumes([]);

    setActiveResumeHash(
      null
    );

    setActiveResumeProfile(
      null
    );

    localStorage.removeItem(
      'interviewai_user'
    );

    localStorage.removeItem(
      'interviewai_active_resume_hash'
    );

    localStorage.removeItem(
      'interviewai_active_resume_profile'
    );

    /*
     * A newly registered user has not completed
     * onboarding yet.
     *
     * This value is ready for the next
     * successful login.
     */
    setHasCompletedOnboardingState(
      false
    );

    localStorage.setItem(
      'interviewai_onboarding_done',
      'false'
    );
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const logout = () => {
    setStoredToken(null);

    setToken(null);

    setUser(null);

    setResumes([]);

    setActiveResumeHash(
      null
    );

    setActiveResumeProfile(
      null
    );

    /*
     * Remove authentication/session state.
     */
    localStorage.removeItem(
      'interviewai_user'
    );

    localStorage.removeItem(
      'interviewai_active_resume_hash'
    );

    localStorage.removeItem(
      'interviewai_active_resume_profile'
    );
  };

  /*
   * ============================================================
   * ONBOARDING
   * ============================================================
   */

  const setHasCompletedOnboarding =
    (value: boolean) => {
      setHasCompletedOnboardingState(
        value
      );

      localStorage.setItem(
        'interviewai_onboarding_done',
        value
          ? 'true'
          : 'false'
      );
    };

  /*
   * ============================================================
   * ACTIVE RESUME
   * ============================================================
   */

  const setActiveResume = (
    hash: string,
    profile?: ResumeProfileResponse
  ) => {
    setActiveResumeHash(
      hash
    );

    localStorage.setItem(
      'interviewai_active_resume_hash',
      hash
    );

    if (profile) {
      setActiveResumeProfile(
        profile
      );

      localStorage.setItem(
        'interviewai_active_resume_profile',
        JSON.stringify(
          profile
        )
      );
    }
  };

  /*
   * ============================================================
   * PREFERENCES
   * ============================================================
   */

  const updatePreferences =
    (
      prefs: Partial<OnboardingPreferences>
    ) => {
      const updated =
        {
          ...preferences,
          ...prefs,
        };

      setPreferences(
        updated
      );

      localStorage.setItem(
        'interviewai_preferences',
        JSON.stringify(
          updated
        )
      );
    };

  /*
   * ============================================================
   * BACKEND URL
   * ============================================================
   */

  const setBackendUrl =
    (url: string | null) => {
      setCustomApiUrl(
        url
      );

      const resolved =
        getBaseApiUrl();

      setBackendUrlState(
        resolved
      );

      checkBackendHealth();
    };

  /*
   * ============================================================
   * CONTEXT
   * ============================================================
   */

  return (
    <AuthContext.Provider
      value={{
        user,

        token,

        isAuthenticated:
          Boolean(token),

        isLoading,

        hasCompletedOnboarding,

        resumes,

        activeResumeHash,

        activeResumeProfile,

        preferences,

        backendConnected,

        backendUrl,

        login,

        register,

        logout,

        setHasCompletedOnboarding,

        setActiveResume,

        switchActiveResume,

        deleteResume,

        refreshResumes,

        updatePreferences,

        setBackendUrl,

        checkBackendHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth =
  () => {
    const context =
      useContext(
        AuthContext
      );

    if (!context) {
      throw new Error(
        'useAuth must be used within an AuthProvider'
      );
    }

    return context;
  };