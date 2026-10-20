import React, { useState } from 'react';
import { BookOpen, Sparkles, Layers, Table, CheckCircle2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function SummarySection({ summary, onGoToPyq, onUploadNotes }) {
  const [activeTab, setActiveTab] = useState('takeaways'); // 'takeaways' | 'comparisons' | 'flashcards'
  const [flippedCards, setFlippedCards] = useState({});
  const [expandedUnit, setExpandedUnit] = useState(0);

  if (!summary) {
    return (
      <div className="card-glass p-8 text-center text-slate-400 text-xs">
        Loading syllabus summary...
      </div>
    );
  }

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Navigation */}
      <div className="card-glass p-5 border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-pill bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
              STEP 1: SUMMARIZED CONTEXT
            </span>
            <span className="text-xs text-slate-400 font-mono">High-Yield Exam Crash Sheet</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {summary.subjectTitle} — Rapid Revision
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Essential concepts, comparison tables, and quick-revision flashcards condensed for rapid exam preparation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onUploadNotes}
            className="btn-secondary !text-xs !py-2 !px-3"
          >
            Paste Custom Notes
          </button>
          <button
            onClick={onGoToPyq}
            className="btn-primary !text-xs !py-2 !px-3.5 shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-amber-300" />
            Proceed to Step 2: Upload PYQs →
          </button>
        </div>
      </div>

      {/* Mode Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('takeaways')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'takeaways'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <BookOpen size={14} /> Core Concepts
        </button>

        <button
          onClick={() => setActiveTab('comparisons')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'comparisons'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Table size={14} /> "Difference Between" Tables
          <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {summary.comparisonTables?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'flashcards'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Layers size={14} /> Rapid Flashcards
          <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
            {summary.flashcards?.length || 0}
          </span>
        </button>
      </div>

      {/* TAB 1: CORE CONCEPTS */}
      {activeTab === 'takeaways' && (
        <div className="space-y-4">
          {summary.units?.map((unit, idx) => (
            <div key={idx} className="card-glass border-slate-800 overflow-hidden">
              <button
                onClick={() => setExpandedUnit(expandedUnit === idx ? -1 : idx)}
                className="w-full p-4 text-left flex items-center justify-between bg-slate-900/60 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm text-slate-100">{unit.title}</span>
                </div>
                {expandedUnit === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {expandedUnit === idx && (
                <div className="p-4 space-y-2.5 text-xs text-slate-300 bg-slate-950/40">
                  {unit.takeaways.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2.5 leading-relaxed">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Examiner Pro-Tips */}
          <div className="card-glass p-4 border-amber-500/30 bg-amber-950/10 space-y-2">
            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Lightbulb size={14} className="text-amber-400" /> University Examiner Scoring Tips:
            </h4>
            <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
              {summary.examTips?.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: DIFFERENCE BETWEEN COMPARISON TABLES */}
      {activeTab === 'comparisons' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            University examiners love "Difference between X and Y" questions. Write these exact tables to guarantee full marks!
          </p>

          {summary.comparisonTables?.map((table, tIdx) => (
            <div key={tIdx} className="card-glass p-5 border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Table size={16} className="text-purple-400" /> {table.title}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                      <th className="p-3 w-1/4">Basis of Comparison</th>
                      <th className="p-3 w-3/8 text-blue-300 font-bold">{table.itemA.name}</th>
                      <th className="p-3 w-3/8 text-purple-300 font-bold">{table.itemB.name}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                    {table.basis.map((b, bIdx) => (
                      <tr key={bIdx} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 font-semibold text-slate-400 bg-slate-900/30">{b}</td>
                        <td className="p-3 text-slate-200">{table.itemA.values[bIdx]}</td>
                        <td className="p-3 text-slate-200">{table.itemB.values[bIdx]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: RAPID-FIRE FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Click any card to flip between Question and Answer.</span>
            <span>{summary.flashcards?.length} Flashcards</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {summary.flashcards?.map((card) => {
              const isFlipped = !!flippedCards[card.id];
              return (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className={`card-glass p-5 cursor-pointer min-h-[160px] flex flex-col justify-between border-slate-800 transition-all transform hover:-translate-y-1 ${
                    isFlipped ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-slate-900/70 hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge-pill bg-blue-500/20 text-blue-300 text-[10px]">
                      {card.tag}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {isFlipped ? 'Answer (Click to flip)' : 'Question (Click to flip)'}
                    </span>
                  </div>

                  <div className="my-auto">
                    {!isFlipped ? (
                      <h4 className="font-bold text-sm text-slate-100 leading-snug">
                        {card.question}
                      </h4>
                    ) : (
                      <p className="text-xs text-emerald-300 whitespace-pre-line leading-relaxed font-medium">
                        {card.answer}
                      </p>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                    {isFlipped ? '✓ Mastered concept' : 'Tap to reveal model answer'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
