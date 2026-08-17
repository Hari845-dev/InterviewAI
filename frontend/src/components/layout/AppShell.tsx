import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlayCircle,
  BrainCircuit,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Target,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, logout, activeResumeProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/app/prepare', label: 'Prepare', icon: Target },
    { path: '/app/resume', label: 'My Resume', icon: FileText },
    { path: '/app/jd', label: 'Job Description', icon: Briefcase },
    { path: '/app/matching', label: 'Skill Matching', icon: Sparkles },
    { path: '/app/interview', label: 'Mock Interview', icon: PlayCircle },
    { path: '/app/aptitude', label: 'Aptitude Practice', icon: BrainCircuit },
    { path: '/app/performance', label: 'Performance', icon: TrendingUp },
  ];

  /*
   * Logout behavior:
   * 1. Clear the authenticated session.
   * 2. Redirect directly to the landing page.
   *
   * Using replace prevents the user from pressing the browser
   * Back button and accidentally returning to the authenticated
   * application shell.
   */
  const handleLogout = () => {
    setMobileMenuOpen(false);
    navigate('/', { replace: true });
    logout();
  };

  return (
    <div className="min-h-screen flex bg-[#FAF0E6] text-[#232327] font-sans selection:bg-[#E1A5B9] selection:text-[#232327]">

      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}

      <aside className="hidden lg:flex flex-col w-[248px] bg-[#FFF9F3] text-[#232327] shrink-0 sticky top-0 h-screen select-none justify-between py-8 px-5 border-r border-[#D9C9C5]">

        <div>

          {/* Brand Header */}
          <NavLink
            to="/app/dashboard"
            className="flex items-center gap-2.5 mb-8 text-left group focus:outline-none px-1"
          >
            <div className="w-8 h-8 bg-[#B52C6F] rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-sm group-hover:scale-105 transition-transform">
              I
            </div>

            <div>
              <span className="text-xl font-semibold tracking-tight text-[#232327] flex items-center gap-1.5 font-serif">
                InterviewAI
              </span>
            </div>
          </NavLink>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#F5DFE8] text-[#232327] font-semibold shadow-sm border border-[#E1A5B9]'
                      : 'text-[#655D60] hover:bg-[#FDF4F7] hover:text-[#232327]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-[#B52C6F]'
                        : 'text-[#756A6C]'
                    }`}
                  />

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer & User Profile */}
        <div className="border-t border-[#E5D8D4] pt-6 space-y-4">

          <NavLink
            to="/app/settings"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              location.pathname === '/app/settings'
                ? 'bg-[#F5DFE8] text-[#232327]'
                : 'text-[#655D60] hover:bg-[#FDF4F7] hover:text-[#232327]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#756A6C]" />

            <span>
              Settings
            </span>
          </NavLink>

          {/* User info card */}
          <div className="flex items-center gap-3 px-2">

            <div className="w-10 h-10 bg-[#B52C6F] rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user?.full_name
                ? user.full_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'AH'}
            </div>

            <div className="flex flex-col min-w-0 flex-1">

              <span className="text-xs font-semibold text-[#232327] truncate">
                {user?.full_name || 'Alex Harrison'}
              </span>

              <span className="text-[10px] font-mono text-[#756A6C] truncate">
                {activeResumeProfile
                  ? 'Resume Grounded'
                  : 'FastAPI Connected'}
              </span>

            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#756A6C] hover:text-[#232327] hover:bg-[#F5DFE8] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT AREA
          ===================================================== */}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#FAF0E6]">

        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-[#232327] text-[#FFF9F3] border-b border-[#3D3A3D] p-4 sticky top-0 z-40 flex items-center justify-between">

          <NavLink
            to="/app/dashboard"
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-[#B52C6F] flex items-center justify-center font-bold text-white text-sm">
              I
            </div>

            <span className="font-semibold text-[#FFF9F3] tracking-tight font-serif">
              InterviewAI
            </span>
          </NavLink>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(!mobileMenuOpen)
            }
            className="p-2 rounded-lg text-[#E5D8D4] hover:bg-white/5 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

        </header>

        {/* ===================================================
            MOBILE DRAWER
            =================================================== */}

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-[#232327]/75 backdrop-blur-sm flex">

            <div className="w-4/5 max-w-xs bg-[#FFF9F3] text-[#232327] h-full flex flex-col p-6 shadow-2xl justify-between border-r border-[#D9C9C5]">

              <div>

                <div className="flex items-center justify-between pb-6 border-b border-[#E5D8D4]">

                  <div className="flex items-center gap-2">

                    <div className="w-7 h-7 rounded-lg bg-[#B52C6F] flex items-center justify-center font-bold text-white text-sm">
                      I
                    </div>

                    <span className="font-semibold font-serif">
                      InterviewAI
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="p-1 rounded-lg text-[#655D60] hover:text-[#232327]"
                  >
                    <X className="w-5 h-5" />
                  </button>

                </div>

                <nav className="py-6 space-y-1 overflow-y-auto">

                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path;

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() =>
                          setMobileMenuOpen(false)
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                          isActive
                            ? 'bg-[#F5DFE8] text-[#232327] font-semibold'
                            : 'text-[#655D60] hover:text-[#232327] hover:bg-[#FDF4F7]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />

                        <span>
                          {item.label}
                        </span>
                      </NavLink>
                    );
                  })}

                  <NavLink
                    to="/app/settings"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      location.pathname === '/app/settings'
                        ? 'bg-[#F5DFE8] text-[#232327] font-semibold'
                        : 'text-[#655D60] hover:text-[#232327] hover:bg-[#FDF4F7]'
                    }`}
                  >
                    <Settings className="w-4 h-4" />

                    <span>
                      Settings
                    </span>
                  </NavLink>

                </nav>
              </div>

              {/* Mobile user footer */}
              <div className="pt-4 border-t border-[#E5D8D4] flex items-center justify-between">

                <div className="flex items-center gap-2.5">

                  <div className="w-8 h-8 bg-[#B52C6F] rounded-full flex items-center justify-center font-bold text-white text-xs">
                    {user?.full_name
                      ? user.full_name[0].toUpperCase()
                      : 'AH'}
                  </div>

                  <div className="text-xs text-[#655D60]">

                    <div className="text-[#232327] font-medium">
                      {user?.full_name || 'Alex Harrison'}
                    </div>

                    <div className="text-[10px] text-[#756A6C] truncate">
                      {user?.email || 'FastAPI User'}
                    </div>

                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-[#655D60] hover:text-[#232327] hover:bg-[#F5DFE8]"
                >
                  <LogOut className="w-4 h-4" />
                </button>

              </div>

            </div>

            {/* Click outside to close */}
            <div
              className="flex-1"
              onClick={() =>
                setMobileMenuOpen(false)
              }
            />

          </div>
        )}

        {/* ===================================================
            MAIN CONTENT BODY
            =================================================== */}

        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>

      </div>
    </div>
  );
};