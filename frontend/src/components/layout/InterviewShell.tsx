import React from 'react';
import { StopCircle, Clock, AlertTriangle, Sparkles } from 'lucide-react';

interface InterviewShellProps {
  sessionTitle?: string;
  roleTitle?: string;
  elapsedSeconds: number;
  onEndInterviewClick: () => void;
  children: React.ReactNode;
}

export const InterviewShell: React.FC<InterviewShellProps> = ({
  sessionTitle = 'Mixed / Real Interview',
  roleTitle = 'Software Engineer',
  elapsedSeconds,
  onEndInterviewClick,
  children
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#121212] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Isolated Full-Width Interview Header */}
      <header className="w-full bg-[#121212] text-white border-b border-white/10 px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        {/* LEFT: Brand & Session Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm">
              I
            </div>
            <span className="font-semibold text-sm sm:text-base tracking-tight font-serif text-white">
              InterviewAI
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-white/20" />

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-white/90">
              {sessionTitle}
            </span>
            <span className="text-white/40">•</span>
            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              {roleTitle}
            </span>
          </div>
        </div>

        {/* CENTER: Live Session Timer */}
        <div className="flex items-center gap-2 bg-white/10 text-white px-3.5 py-1.5 rounded-full border border-white/10 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider">
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* RIGHT: End Interview Action */}
        <div>
          <button
            onClick={onEndInterviewClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <StopCircle className="w-4 h-4 text-rose-400" />
            <span>End Interview</span>
          </button>
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        {children}
      </main>
    </div>
  );
};
