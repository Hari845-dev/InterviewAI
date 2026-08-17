import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Layers,
  RefreshCw,
  X,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resumeApi } from '../api';
import { ResumeProfileResponse } from '../types';

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, updatePreferences, setHasCompletedOnboarding, setActiveResume, user } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [focusChoice, setFocusChoice] = useState<'interview_prep' | 'aptitude_tests'>(preferences.focus || 'interview_prep');
  const [targetRole, setTargetRole] = useState<string>(preferences.targetRole || 'Software Engineering');
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(preferences.experienceLevel || 'Intermediate');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(preferences.difficulty || 'Medium');

  // Step 3 Resume Upload & Extraction State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressStage, setUploadProgressStage] = useState<string>('');
  const [uploadedProfile, setUploadedProfile] = useState<ResumeProfileResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const roles = [
    'Software Engineering',
    'Product Management',
    'Data Engineering',
    'AI / Machine Learning',
    'Cybersecurity',
    'Not sure'
  ];

  const handleStep1Submit = () => {
    updatePreferences({ focus: focusChoice });
    setStep(2);
  };

  const handleStep2Submit = () => {
    updatePreferences({
      targetRole,
      experienceLevel,
      difficulty
    });
    setStep(3);
  };

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsUploading(true);
    setUploadError(null);
    setUploadedProfile(null);

    // Progressive stage animations
    const stages = [
      'Uploading resume...',
      'Extracting information...',
      'Understanding projects...',
      'Identifying skills...',
      'Building your interview profile...'
    ];

    let stageIdx = 0;
    setUploadProgressStage(stages[0]);
    const interval = setInterval(() => {
      stageIdx++;
      if (stageIdx < stages.length) {
        setUploadProgressStage(stages[stageIdx]);
      }
    }, 700);

    try {
      const response = await resumeApi.uploadResume(selectedFile);
      clearInterval(interval);
      setUploadedProfile(response);
      setActiveResume(response.resume_hash, response);
    } catch (err: any) {
      clearInterval(interval);
      setUploadError(err.message || 'Failed to upload and parse resume. You can retry or skip for now.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFinishOnboarding = () => {
    setHasCompletedOnboarding(true);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FBF9F5] text-slate-900 font-sans selection:bg-violet-200 selection:text-violet-900">
      {/* Left Sidebar */}
      <aside className="lg:w-80 bg-[#0B1120] text-slate-300 p-6 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-10 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4 h-4 text-violet-200" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              InterviewAI
            </span>
          </div>

          {/* Stepper */}
          <div className="space-y-6">
            {[
              { num: 1, title: 'Focus Diagnostic', desc: 'Define your prep priority' },
              { num: 2, title: 'Career Context', desc: 'Target role & experience' },
              { num: 3, title: 'Resume Evidence', desc: 'Ground questions in your profile' },
            ].map(s => {
              const isCurrent = step === s.num;
              const isPast = step > s.num;

              return (
                <div key={s.num} className="flex items-start gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-violet-600 text-white ring-4 ring-violet-600/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-semibold ${
                        isCurrent ? 'text-white' : isPast ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Value Prop Card in Sidebar */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
            <span>Evidence-Grounded AI</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            We ground every technical and project question directly in your resume snippets so you practice what interviewers actually ask.
          </p>
        </div>
      </aside>

      {/* Right Content Area (Warm Cream) */}
      <main className="flex-1 flex flex-col justify-center p-6 sm:p-10 lg:p-16 max-w-4xl mx-auto w-full">
        {/* STEP 1 — FOCUS */}
        {step === 1 && (
          <div className="space-y-8 max-w-2xl animate-fade-in">
            <div>
              <div className="text-xs font-mono font-bold text-violet-700 tracking-wider uppercase mb-2">
                FOCUS DIAGNOSTIC
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif leading-tight">
                Welcome to InterviewAI. What do you want to prepare for?
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Option 1 */}
              <button
                type="button"
                onClick={() => setFocusChoice('interview_prep')}
                className={`p-6 rounded-2xl border text-left transition-all ${
                  focusChoice === 'interview_prep'
                    ? 'border-violet-600 bg-white shadow-xl shadow-violet-900/5 ring-2 ring-violet-600/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  {focusChoice === 'interview_prep' && (
                    <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  I'm not ready for interviews
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Practice interview answers, technical concepts and role-specific questions.
                </p>
              </button>

              {/* Option 2 */}
              <button
                type="button"
                onClick={() => setFocusChoice('aptitude_tests')}
                className={`p-6 rounded-2xl border text-left transition-all ${
                  focusChoice === 'aptitude_tests'
                    ? 'border-violet-600 bg-white shadow-xl shadow-violet-900/5 ring-2 ring-violet-600/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  {focusChoice === 'aptitude_tests' && (
                    <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  I need to pass aptitude tests
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Practice quantitative, verbal and logical aptitude questions.
                </p>
              </button>
            </div>

            <div className="pt-4">
              <button
                onClick={handleStep1Submit}
                className="px-8 py-4 bg-slate-900 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 group"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — CAREER CONTEXT */}
        {step === 2 && (
          <div className="space-y-8 max-w-2xl animate-fade-in">
            <div>
              <div className="text-xs font-mono font-bold text-violet-700 tracking-wider uppercase mb-2">
                STEP 2 OF 3
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif leading-tight">
                Tell us about yourself.
              </h1>
              <p className="text-slate-600 mt-2">
                We'll tune the questions to match your desired discipline and complexity level.
              </p>
            </div>

            {/* Target Role */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Target Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {roles.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className={`py-3 px-3.5 rounded-xl text-xs font-medium border text-center transition-all ${
                      targetRole === r
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Experience Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperienceLevel(lvl)}
                    className={`py-3 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      experienceLevel === lvl
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Interview Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-3 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      difficulty === d
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 text-slate-600 hover:text-slate-900 font-semibold text-sm"
              >
                Back
              </button>
              <button
                onClick={handleStep2Submit}
                className="px-8 py-4 bg-slate-900 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 group"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — RESUME (INLINE ANALYSIS) */}
        {step === 3 && (
          <div className="space-y-6 max-w-3xl animate-fade-in">
            <div>
              <div className="text-xs font-mono font-bold text-violet-700 tracking-wider uppercase mb-2">
                STEP 3 OF 3 — RESUME EVIDENCE
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif leading-tight">
                Would you like to upload your resume?
              </h1>
              <p className="text-slate-600 mt-2 text-sm sm:text-base">
                We'll use your resume to create questions based on your actual projects, skills and experience.
              </p>
            </div>

            {/* If no profile uploaded yet: Show Dropzone or Processing state */}
            {!uploadedProfile && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all bg-white ${
                  isUploading
                    ? 'border-violet-500 bg-violet-50/50 cursor-wait'
                    : 'border-slate-300 hover:border-violet-500 hover:bg-violet-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {isUploading ? (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-violet-600 text-white mx-auto flex items-center justify-center animate-bounce">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-mono">
                        {uploadProgressStage}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        FastAPI is extracting candidate entities and projects via Gemini.
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-violet-600 h-full rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 mx-auto flex items-center justify-center">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Drag and drop your resume here
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports <span className="font-mono font-semibold">PDF</span> and{' '}
                        <span className="font-mono font-semibold">DOCX</span> (up to 10MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      Browse File
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="font-semibold text-rose-900 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* INLINE STRUCTURED PROFILE DISPLAY */}
            {uploadedProfile && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {uploadedProfile.structured_profile.name || 'Extracted Profile'}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Hash: {uploadedProfile.resume_hash.slice(0, 16)}... •{' '}
                        {uploadedProfile.cached ? 'Loaded from Fast Cache' : 'Freshly Analyzed'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setUploadedProfile(null);
                      setFile(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Replace Resume</span>
                  </button>
                </div>

                {/* Skills Detected */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Extracted Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(uploadedProfile.structured_profile.skills) ? (
                      uploadedProfile.structured_profile.skills.map((sk: string) => (
                        <span
                          key={sk}
                          className="px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-200/80 rounded-lg text-xs font-medium"
                        >
                          {sk}
                        </span>
                      ))
                    ) : (
                      Object.entries(uploadedProfile.structured_profile.skills || {}).flatMap(([cat, list]) =>
                        (list as string[]).map(sk => (
                          <span
                            key={sk}
                            className="px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-200/80 rounded-lg text-xs font-medium"
                          >
                            {sk}
                          </span>
                        ))
                      )
                    )}
                  </div>
                </div>

                {/* Projects Detected */}
                {uploadedProfile.structured_profile.projects?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Extracted Projects ({uploadedProfile.structured_profile.projects.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uploadedProfile.structured_profile.projects.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                        >
                          <div className="font-bold text-slate-900 mb-1">{p.title}</div>
                          <p className="text-slate-600 line-clamp-2 mb-2 text-[11px]">
                            {p.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {p.tech_stack?.slice(0, 3).map(t => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={handleFinishOnboarding}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Skip for now
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Back
                </button>
                <button
                  onClick={handleFinishOnboarding}
                  className="px-8 py-3.5 bg-slate-900 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 group"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
