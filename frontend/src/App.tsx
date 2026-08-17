import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import { AppShell } from './components/layout/AppShell';

import { LandingPage } from './views/LandingPage';
import { AuthView } from './views/AuthView';
import { OnboardingView } from './views/OnboardingView';
import { DashboardView } from './views/DashboardView';
import { ResumeView } from './views/ResumeView';
import { PreparationSetupView } from './views/PreparationSetupView';
import { QuestionsView } from './views/QuestionsView';
import { MockInterviewView } from './views/MockInterviewView';
import { AptitudeView } from './views/AptitudeView';
import { PerformanceView } from './views/PerformanceView';
import { SettingsView } from './views/SettingsView';
import { JDView } from './views/JDView';
import { MatchingView } from './views/MatchingView';
import { ActiveInterviewSessionView } from './views/ActiveInterviewSessionView';
import { InterviewCompleteView } from './views/InterviewCompleteView';

// Protected Route Component for Authenticated App Area (With AppShell & Sidebar)
const ProtectedAppRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF0E6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#E1A5B9] border-t-[#B52C6F] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#655D60]">Connecting to InterviewAI session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

// Protected Route for Full-Screen Isolated Interview Experience (NO AppShell, NO Sidebar)
const ProtectedInterviewRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#232327] text-[#FFF9F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#E1A5B9]/40 border-t-[#B52C6F] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#E5D8D4]">Loading interview session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  return <Outlet />;
};

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Authentication */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthView />} />
      <Route path="/onboarding" element={<OnboardingView />} />

      {/* Authenticated App Shell & Child Views (With Sidebar & Navigation) */}
      <Route path="/app" element={<ProtectedAppRoute />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="resume" element={<ResumeView />} />
        <Route path="jd" element={<JDView />} />
        <Route path="matching" element={<MatchingView />} />
        <Route path="prepare" element={<PreparationSetupView />} />
        <Route path="questions" element={<QuestionsView />} />
        <Route path="interview" element={<MockInterviewView />} />
        <Route path="aptitude" element={<AptitudeView />} />
        <Route path="performance" element={<PerformanceView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* Dedicated Isolated Full-Screen Mock Interview & Review (No AppShell, No Sidebar) */}
      <Route path="/interview" element={<ProtectedInterviewRoute />}>
        <Route path="session/:sessionId" element={<ActiveInterviewSessionView />} />
        <Route path="session/:sessionId/complete" element={<InterviewCompleteView />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </InterviewProvider>
    </AuthProvider>
  );
}
