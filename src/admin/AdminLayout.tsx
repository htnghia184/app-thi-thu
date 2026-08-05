import React from 'react';
import { LogOut, User, Shield, BookOpen, Users, School, GraduationCap, Headphones } from 'lucide-react';

type TabType = 'exams' | 'students' | 'classes' | 'profile' | 'grading' | 'speaking_grading';

interface AdminLayoutProps {
  children: React.ReactNode;
  onBackToStudent?: () => void;
  user?: any;
  userRole?: string | null;
  onLogout?: () => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  viewMode?: 'admin' | 'teacher';
  onViewProfile?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children, onBackToStudent, user, userRole, onLogout,
  activeTab = 'exams', onTabChange, viewMode = 'admin',
  onViewProfile,
}) => {
  const isTeacher = viewMode === 'teacher';

  const tabs: { key: TabType; label: string; icon: any }[] = [];
  if (isTeacher) {
    tabs.push({ key: 'exams', label: 'Exams', icon: BookOpen });
    tabs.push({ key: 'grading', label: 'Grade Writing', icon: GraduationCap });
    tabs.push({ key: 'speaking_grading', label: 'Grade Speaking', icon: Headphones });
  } else {
    tabs.push({ key: 'exams', label: 'Exams', icon: BookOpen });
    tabs.push({ key: 'classes', label: 'Classes', icon: School });
  }
  tabs.push({ key: 'students', label: 'Students', icon: Users });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Shield size={24} className="md:size-[28px] flex-shrink-0" />
            <h1 className="text-base md:text-xl font-bold truncate">
              {isTeacher ? 'E-Master Teacher Dashboard' : 'E-Master Admin Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-indigo-200 text-sm">
                <User size={16} />
                <span className="max-w-[120px] lg:max-w-[180px] truncate">{user.email}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  userRole === 'admin'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {userRole === 'admin' ? 'Admin' : 'Teacher'}
                </span>
              </div>
            )}
            {onViewProfile && (
              <button onClick={onViewProfile} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors">
                <User size={16} />
                <span className="hidden md:inline">Profile</span>
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors">
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </button>
            )}
            {!isTeacher && onBackToStudent && (
              <button
                onClick={onBackToStudent}
                className="bg-white text-indigo-700 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all text-xs md:text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Back to Student View</span>
                <span className="sm:hidden">Student</span>
              </button>
            )}
          </div>
        </div>
        {/* Tabs - horizontally scrollable on small screens */}
        {onTabChange && (
          <div className="flex gap-1 px-4 md:px-8 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-2 px-3 md:px-5 py-2.5 md:py-3 rounded-t-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'bg-indigo-800/30 text-indigo-200 hover:bg-indigo-700/50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
};
