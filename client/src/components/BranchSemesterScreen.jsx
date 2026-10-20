import React, { useState } from 'react';
import { GraduationCap, ChevronRight, Laptop, Layers } from 'lucide-react';

const BRANCHES = ['CSE', 'CSCE', 'CSSE', 'IT', 'ETC', 'EEE'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// Which semesters have preloaded content
const PRELOADED_SEMESTERS = { CSE: [1,3,4,5], CSCE: [1,3,4,5], CSSE: [1,3,4,5], IT: [1,3,4,5], ETC: [1,3], EEE: [1,3] };

export default function BranchSemesterScreen({ student, onSelect }) {
  const [branch, setBranch] = useState('CSE');
  const [semester, setSemester] = useState(null);

  const preloaded = PRELOADED_SEMESTERS[branch] || [];

  function handleContinue() {
    if (!semester) return;
    onSelect({ branch, semester });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-3">
            <GraduationCap size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Welcome, {student.name.split(' ')[0]}! 👋
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Roll No: <span className="font-mono text-slate-300">{student.rollNo}</span> · Select your branch and semester
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
          {/* Branch Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <Laptop size={12} className="text-blue-400" /> Your Branch
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BRANCHES.map(b => (
                <button
                  key={b}
                  onClick={() => { setBranch(b); setSemester(null); }}
                  className={`py-2.5 rounded-xl font-bold text-sm font-mono transition border ${
                    branch === b
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Semester Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              <Layers size={12} className="text-emerald-400" /> Your Semester
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SEMESTERS.map(sem => {
                const hasContent = preloaded.includes(sem);
                return (
                  <button
                    key={sem}
                    onClick={() => setSemester(sem)}
                    className={`py-2.5 rounded-xl font-bold text-sm transition border relative ${
                      semester === sem
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    S{sem}
                    {hasContent && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              Green dot = preloaded KIIT Katalog content available
            </p>
          </div>

          <button
            onClick={handleContinue}
            disabled={!semester}
            className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-sm ${
              semester
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            View {branch} — Semester {semester || '?'} Subjects
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
