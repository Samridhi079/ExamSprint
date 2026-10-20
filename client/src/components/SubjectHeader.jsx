import React from 'react';
import { BookOpen, FileText, Award, HelpCircle, Sparkles, GraduationCap, Laptop, Zap } from 'lucide-react';

export default function SubjectHeader({
  subjects,
  activeSubject,
  onSelectSubject,
  activeTab,
  onSelectTab,
  onOpenUpload,
  selectedBranch,
  setSelectedBranch,
  selectedSemester,
  setSelectedSemester
}) {
  const tabs = [
    { id: 'summary', label: 'Step 1: Notes Summary', icon: BookOpen, badge: 'High Yield' },
    { id: 'pyq', label: 'Step 2: PYQ Important Questions', icon: FileText, badge: 'KIIT Predicted' },
    { id: 'mock', label: 'Mock Practice Test', icon: Award, badge: '2-Min' },
    { id: 'doubts', label: 'Doubt Solver', icon: HelpCircle, badge: 'Exam Tips' }
  ];

  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="card-glass p-6 border-slate-800 space-y-5">
      {/* KIIT School & Branch Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 text-xs">
        {/* Branch Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Laptop size={13} className="text-blue-400" /> KIIT Branch:
          </span>
          {['CSE', 'CSCE', 'CSSE', 'IT', 'ETC', 'EEE'].map((branch) => (
            <button
              key={branch}
              onClick={() => setSelectedBranch(branch)}
              className={`px-2.5 py-1 rounded-md font-bold transition text-[11px] font-mono ${
                selectedBranch === branch
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {branch}
            </button>
          ))}
        </div>

        {/* Semesters: S1 to S8 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Semester:</span>
          {semesters.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center transition font-mono ${
                selectedSemester === sem
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              S{sem}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Header Info & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {activeSubject?.name || 'Operating Systems'}
            </h1>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {activeSubject?.code || 'CS-2004'}
            </span>
            <span className="badge-pill bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
              KIIT Katalog Syllabus
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {selectedBranch} • Semester {selectedSemester} • KIIT University End-Sem & Mid-Sem Question Engine
          </p>
        </div>

        {/* Quick Subject Picker & Custom Upload Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Subject:</span>
            <select
              value={activeSubject?.id || ''}
              onChange={(e) => {
                const found = subjects.find(s => s.id === e.target.value);
                if (found) onSelectSubject(found);
              }}
              className="bg-transparent text-xs font-bold text-blue-300 outline-none cursor-pointer"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onOpenUpload}
            className="btn-secondary !text-xs !py-1.5 !px-3 flex items-center gap-1.5"
          >
            <Sparkles size={13} className="text-amber-400" />
            + New Subject / Notes
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-4 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
