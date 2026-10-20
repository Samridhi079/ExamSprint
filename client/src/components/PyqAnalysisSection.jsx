import React, { useState } from 'react';
import { FileText, Sparkles, CheckCircle, ChevronDown, ChevronUp, AlertCircle, Award, HelpCircle, UploadCloud } from 'lucide-react';

export default function PyqAnalysisSection({ analysis, activeSubject, onUploadNewPyq, onAskDoubt }) {
  const [activeSection, setActiveSection] = useState('2marks'); // '2marks' | '5marks' | '10marks' | 'viva'
  const [expandedAnswers, setExpandedAnswers] = useState({});

  const toggleAnswer = (id) => {
    setExpandedAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!analysis) {
    return (
      <div className="card-glass p-8 text-center text-slate-400 space-y-3">
        <FileText size={32} className="mx-auto text-blue-400 opacity-60" />
        <h3 className="font-bold text-white text-base">Step 2: Upload Previous Year Questions (PYQs)</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload or paste your university's previous year question papers. The engine cross-references them against your syllabus to generate predicted questions with model answers.
        </p>
        <button
          onClick={onUploadNewPyq}
          className="btn-primary text-xs mx-auto flex items-center gap-2"
        >
          <UploadCloud size={14} /> Upload / Paste PYQ Paper
        </button>
      </div>
    );
  }

  const s2 = analysis.sectionA_2Marks || [];
  const s5 = analysis.sectionB_5Marks || [];
  const s10 = analysis.sectionC_10Marks || [];
  const viva = analysis.vivaFavoriteQuestions || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass p-5 border-slate-800 bg-gradient-to-r from-purple-950/40 via-slate-900 to-blue-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pill bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
              STEP 2: PYQ INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {analysis.pyqCountAnalyzed} PYQs Analyzed
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Important & Most Repeated Exam Questions
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            {analysis.repetitionSummary}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onUploadNewPyq}
            className="btn-secondary !text-xs !py-2 !px-3 flex items-center gap-1.5"
          >
            <UploadCloud size={14} /> Upload More PYQs
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSection('2marks')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSection === '2marks'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>Section A: 2-Mark Short Questions</span>
          <span className="bg-blue-500/20 text-blue-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {s2.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('5marks')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSection === '5marks'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>Section B: 5-Mark Conceptual</span>
          <span className="bg-amber-500/20 text-amber-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {s5.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('10marks')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSection === '10marks'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>Section C: 10-Mark Long Questions</span>
          <span className="bg-purple-500/20 text-purple-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {s10.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('viva')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeSection === 'viva'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <span>Viva Oral Questions</span>
          <span className="bg-emerald-500/20 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {viva.length}
          </span>
        </button>
      </div>

      {/* QUESTIONS LIST */}
      <div className="space-y-4">
        {activeSection === '2marks' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Mandatory short-answer questions. Keep definitions strict, accurate, and under 3 lines.
            </p>
            {s2.map((q) => (
              <QuestionCard
                key={q.id}
                item={q}
                isExpanded={!!expandedAnswers[q.id]}
                onToggle={() => toggleAnswer(q.id)}
                badgeColor="bg-blue-500/20 text-blue-300 border-blue-500/30"
              />
            ))}
          </div>
        )}

        {activeSection === '5marks' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Conceptual & analytical questions. Structure your answer with clear numbered headings and bullet points.
            </p>
            {s5.map((q) => (
              <QuestionCard
                key={q.id}
                item={q}
                isExpanded={!!expandedAnswers[q.id]}
                onToggle={() => toggleAnswer(q.id)}
                badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/30"
              />
            ))}
          </div>
        )}

        {activeSection === '10marks' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              High-weightage long questions & derivations. Follow the full 4-section model answer structure below to guarantee 9-10 marks.
            </p>
            {s10.map((q) => (
              <QuestionCard
                key={q.id}
                item={q}
                isExpanded={!!expandedAnswers[q.id]}
                onToggle={() => toggleAnswer(q.id)}
                badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/30"
              />
            ))}
          </div>
        )}

        {activeSection === 'viva' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Questions frequently asked by external examiners in lab and semester practical vivas.
            </p>
            <div className="card-glass p-5 border-slate-800 space-y-3">
              {viva.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-slate-200 py-2 border-b border-slate-800/60 last:border-0">
                  <HelpCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ item, isExpanded, onToggle, badgeColor }) {
  return (
    <div className="card-glass border-slate-800 overflow-hidden">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge-pill ${badgeColor} text-[10px]`}>
              {item.marks} Marks
            </span>
            <span className="badge-pill bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
              {item.frequency}
            </span>
          </div>
          <h3 className="font-bold text-sm text-slate-100 pt-1 leading-snug">
            {item.question}
          </h3>
        </div>

        <button
          onClick={onToggle}
          className="btn-secondary !text-xs !py-1.5 !px-3 shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
        >
          {isExpanded ? 'Hide Model Answer' : 'View Model Answer'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 bg-slate-950/70 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800/60 font-mono">
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle size={13} /> Full-Mark Scoring Blueprint
            </span>
            <span>Step-marked answer guide</span>
          </div>

          <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
            {item.modelAnswer}
          </p>
        </div>
      )}
    </div>
  );
}
