import React, { useState } from 'react';
import {
  ArrowLeft, BookOpen, FileQuestion, Zap, PenTool,
  UploadCloud, CheckCircle2, Loader2, FileText, ChevronRight
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';

function UploadSlot({ label, icon: Icon, color, value, onChange, placeholder }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${color}`}>
        <Icon size={13} /> {label}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none font-mono leading-relaxed transition"
      />
      {value.trim() && (
        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
          <CheckCircle2 size={10} /> {value.trim().split('\n').length} lines uploaded
        </p>
      )}
    </div>
  );
}

const ACTION_BUTTONS = [
  {
    id: 'notes',
    label: 'AI Summarized Notes',
    sub: 'Unit summaries + comparison tables + flashcards',
    icon: BookOpen,
    color: 'from-blue-600 to-blue-700',
    glow: 'shadow-blue-600/30',
    endpoint: '/api/exams/notes',
    bodyKey: 'notesText',
    needsNotes: true
  },
  {
    id: 'questions',
    label: 'Important Questions to Practice',
    sub: 'From your PYQs & handout — 2, 5 & 10-mark answers',
    icon: FileQuestion,
    color: 'from-purple-600 to-purple-700',
    glow: 'shadow-purple-600/30',
    endpoint: '/api/exams/important-questions',
    bodyKey: 'pyqText',
    needsPyq: true
  },
  {
    id: 'onemarkers',
    label: 'Last-Minute 1-Marker Bullet Points',
    sub: 'Quick-fire facts & formulas for the exam hall',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/30',
    endpoint: '/api/exams/one-markers',
    bodyKey: 'notesText',
    needsNotes: true
  },
  {
    id: 'derivations',
    label: 'Important Derivations & Diagrams',
    sub: 'Step-by-step proofs + drawing blueprints for full marks',
    icon: PenTool,
    color: 'from-emerald-600 to-teal-700',
    glow: 'shadow-emerald-600/30',
    endpoint: '/api/exams/derivations',
    bodyKey: 'notesText',
    needsNotes: true
  }
];

export default function SubjectWorkspace({ student, branch, semester, subject, onOpenWindow, onBack }) {
  const [notesText, setNotesText] = useState('');
  const [pyqText, setPyqText] = useState('');
  const [handoutText, setHandoutText] = useState('');
  const [loadingBtn, setLoadingBtn] = useState(null);
  const [error, setError] = useState('');

  const isPreloaded = subject.isPreloaded;

  async function handleAction(btn) {
    setError('');
    const needsNotes = btn.needsNotes && !notesText.trim() && !isPreloaded;
    const needsPyq = btn.needsPyq && !pyqText.trim() && !handoutText.trim() && !isPreloaded;

    if (needsNotes) {
      setError(`Please paste your Course PDF / Lecture Notes text above to use "${btn.label}".`);
      return;
    }
    if (needsPyq) {
      setError(`Please paste your PYQs or Course Handout text above to use "${btn.label}".`);
      return;
    }

    setLoadingBtn(btn.id);
    try {
      const body = {
        subjectId: subject.id,
        subjectName: subject.name,
        notesText: notesText || undefined,
        pyqText: pyqText || undefined,
        handoutText: handoutText || undefined
      };
      const res = await apiRequest(btn.endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      onOpenWindow({ type: btn.id, data: res, subject });
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoadingBtn(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 backdrop-blur">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-white text-sm truncate">{subject.name}</h1>
          <p className="text-[11px] text-slate-500">{subject.code} · {branch} · Semester {semester}</p>
        </div>
        {isPreloaded && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
            KIIT Preloaded
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-10">

        {/* Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UploadCloud size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isPreloaded ? 'Preloaded content ready · Optionally paste your own to override' : 'Step 1 — Upload Your Course Materials'}
            </p>
          </div>
          <UploadSlot
            label="Course PDF / Lecture Notes"
            icon={BookOpen}
            color="text-blue-400"
            value={notesText}
            onChange={setNotesText}
            placeholder={isPreloaded ? 'Preloaded ✓  Paste your own lecture notes here to override…' : 'Paste the text from your lecture slides or textbook here…'}
          />
          <UploadSlot
            label="Previous Year Questions (PYQs)"
            icon={FileQuestion}
            color="text-purple-400"
            value={pyqText}
            onChange={setPyqText}
            placeholder={isPreloaded ? 'Preloaded ✓  Paste additional PYQ papers here to expand…' : 'Paste your university previous year question papers here…'}
          />
          <UploadSlot
            label="Course Handout / Syllabus"
            icon={FileText}
            color="text-amber-400"
            value={handoutText}
            onChange={setHandoutText}
            placeholder="Paste your course handout or syllabus topics here…"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-slate-800" />
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">Choose what you need</p>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 4 Action Buttons */}
        <div className="space-y-3">
          {ACTION_BUTTONS.map((btn, idx) => {
            const Icon = btn.icon;
            const isLoading = loadingBtn === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => handleAction(btn)}
                disabled={!!loadingBtn}
                className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left transition group disabled:opacity-60 bg-gradient-to-r ${btn.color} shadow-lg ${btn.glow} hover:brightness-110 active:scale-[0.99]`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Icon size={18} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-white text-sm">
                    {idx + 1}. {btn.label}
                  </div>
                  <div className="text-white/60 text-[11px] mt-0.5 truncate">{btn.sub}</div>
                </div>
                <ChevronRight size={16} className="text-white/50 group-hover:text-white transition shrink-0" />
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
