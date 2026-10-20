import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, FileQuestion, Award, Star } from 'lucide-react';

function QuestionCard({ q, accentColor, badgeColor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden ${open ? accentColor : 'border-slate-800'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition"
      >
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} mt-0.5`}>
          {q.marks}M
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-semibold leading-snug">{q.question}</p>
          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Star size={9} className="text-amber-400" /> {q.frequency}
          </p>
        </div>
        <span className="text-slate-500 shrink-0 mt-0.5">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-2">Model Answer</p>
          <pre className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">{q.modelAnswer}</pre>
        </div>
      )}
    </div>
  );
}

export default function QuestionsWindow({ data, subject, onBack }) {
  const analysis = data?.analysis || {};
  const [tab, setTab] = useState('2marks');

  const tabs = [
    { id: '2marks', label: '2-Mark Definitions', count: (analysis.sectionA_2Marks || []).length, color: 'text-blue-400' },
    { id: '5marks', label: '5-Mark Answers', count: (analysis.sectionB_5Marks || []).length, color: 'text-purple-400' },
    { id: '10marks', label: '10-Mark Full Answers', count: (analysis.sectionC_10Marks || []).length, color: 'text-emerald-400' },
    { id: 'viva', label: 'Viva Questions', count: (analysis.vivaFavoriteQuestions || []).length, color: 'text-amber-400' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 backdrop-blur">
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-white text-sm">🎯 Important Questions</h1>
          <p className="text-[11px] text-slate-500 truncate">{subject.name} · {analysis.pyqCountAnalyzed} PYQs analyzed</p>
        </div>
      </div>

      {/* Repetition Summary */}
      {analysis.repetitionSummary && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-200/80 flex items-start gap-2">
            <Award size={14} className="text-purple-400 shrink-0 mt-0.5" />
            {analysis.repetitionSummary}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 px-4 pt-3 overflow-x-auto scrollbar-none border-b border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition -mb-px ${
              tab === t.id ? `${t.color} border-current` : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 opacity-60">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-10 space-y-2">
        {tab === '2marks' && (analysis.sectionA_2Marks || []).map(q => (
          <QuestionCard key={q.id} q={q} accentColor="border-blue-500/40" badgeColor="bg-blue-500/10 text-blue-400 border-blue-500/30" />
        ))}
        {tab === '5marks' && (analysis.sectionB_5Marks || []).map(q => (
          <QuestionCard key={q.id} q={q} accentColor="border-purple-500/40" badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/30" />
        ))}
        {tab === '10marks' && (analysis.sectionC_10Marks || []).map(q => (
          <QuestionCard key={q.id} q={q} accentColor="border-emerald-500/40" badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/30" />
        ))}
        {tab === 'viva' && (analysis.vivaFavoriteQuestions || []).map((q, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
            <p className="text-sm text-white font-medium leading-snug">{q}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
