import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Sparkles, UserCheck, ChevronDown, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { user, switchDemoUser } = useAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const demoAccounts = [
    { email: 'alex.cs@college.edu', name: 'Alex Sharma', role: 'CSE 3rd Year', branch: 'Semester 5' },
    { email: 'priya.ece@college.edu', name: 'Priya Patel', role: 'ECE 4th Year', branch: 'Semester 7' },
    { email: 'rohan.mech@college.edu', name: 'Rohan Gupta', role: 'Mech 2nd Year', branch: 'Semester 3' }
  ];

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-[41px] z-40">
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              ExamSprint AI
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest font-mono">
                PYQ Engine
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Fast-Track College Semester Exam & PYQ Preparation</p>
          </div>
        </div>
      </div>

      {/* User profile & Demo switcher */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowSwitchModal(!showSwitchModal)}
              className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 transition text-left"
              title="Click to switch student accounts"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs">
                {user.fullName ? user.fullName[0] : 'S'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-200 leading-tight flex items-center gap-1">
                  {user.fullName}
                  <ChevronDown size={12} className="text-slate-400" />
                </div>
                <div className="text-[10px] text-blue-400 font-medium">
                  {user.branch || 'CSE'} Student
                </div>
              </div>
            </button>

            {/* Account Switcher Dropdown */}
            {showSwitchModal && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1 flex items-center gap-1.5">
                  <UserCheck size={12} className="text-blue-400" /> Switch Student Profile:
                </div>
                {demoAccounts.map(account => (
                  <button
                    key={account.email}
                    onClick={() => {
                      switchDemoUser(account.email);
                      setShowSwitchModal(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition flex flex-col gap-0.5 ${
                      user.email === account.email
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">{account.name}</span>
                    <span className="text-[10px] text-slate-400">{account.role} • {account.branch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400">Loading student...</div>
        )}
      </div>
    </header>
  );
}
