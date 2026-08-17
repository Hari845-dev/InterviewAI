import React from 'react';
import {
  StopCircle,
  Clock,
} from 'lucide-react';

interface InterviewShellProps {
  sessionTitle?: string;
  roleTitle?: string;
  elapsedSeconds: number;
  onEndInterviewClick: () => void;
  children: React.ReactNode;
}

export const InterviewShell: React.FC<
  InterviewShellProps
> = ({
  sessionTitle = 'Mixed / Real Interview',
  roleTitle = 'Software Engineer',
  elapsedSeconds,
  onEndInterviewClick,
  children,
}) => {
  const formatTime = (
    secs: number
  ) => {
    const mins =
      Math.floor(secs / 60);

    const remainder =
      secs % 60;

    return `${mins
      .toString()
      .padStart(2, '0')}:${remainder
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF0E6] text-[#232327] flex flex-col font-sans selection:bg-[#E1A5B9] selection:text-[#232327]">

      <header className="w-full bg-[#FFF9F3] text-[#232327] border-b border-[#D9C9C5] px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-sm">

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2">

            <div className="w-7 h-7 bg-[#B52C6F] rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm">
              I
            </div>

            <span className="font-semibold text-sm sm:text-base tracking-tight font-serif text-[#232327]">
              InterviewAI
            </span>

          </div>

          <div className="hidden sm:block h-4 w-px bg-[#D9C9C5]" />

          <div className="hidden sm:flex items-center gap-2">

            <span className="text-xs font-medium text-[#655D60]">
              {sessionTitle}
            </span>

            <span className="text-[#B8A9A5]">
              •
            </span>

            <span className="text-[11px] font-mono text-[#6B3FA0] bg-[#F2EAFB] border border-[#DED0EF] px-2 py-0.5 rounded-full">
              {roleTitle}
            </span>

          </div>

        </div>

        <div className="flex items-center gap-2 bg-[#F7F1E8] text-[#3E3738] px-3.5 py-1.5 rounded-full border border-[#E1D6D2] shadow-sm">

          <Clock className="w-3.5 h-3.5 text-[#6B4EFF] animate-pulse" />

          <span className="text-xs font-mono font-bold tracking-wider">
            {formatTime(
              elapsedSeconds
            )}
          </span>

        </div>

        <div>

          <button
            type="button"
            onClick={
              onEndInterviewClick
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-rose-200"
          >

            <StopCircle className="w-4 h-4 text-rose-600" />

            <span>
              End Interview
            </span>

          </button>

        </div>

      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        {children}
      </main>

    </div>
  );
};