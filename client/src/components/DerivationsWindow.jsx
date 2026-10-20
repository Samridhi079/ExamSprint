import React, { useState } from 'react';
import { ArrowLeft, PenTool, ChevronDown, ChevronUp, LayoutTemplate } from 'lucide-react';

function DerivationCard({ der }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition ${open ? 'border-emerald-500/40' : 'border-slate-800'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <PenTool size={13} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white leading-snug">{der.title}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{der.formula}</p>
        </div>
        <span className="text-slate-500 shrink-0">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 space-y-4">
          {/* Variables */}
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Variables</p>
            <div className="bg-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-slate-300">{der.variables}</div>
          </div>
          {/* Formula highlight */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Formula</p>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 font-mono text-sm text-emerald-300 font-bold tracking-wide">
              {der.formula}
            </div>
          </div>
          {/* Steps */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Step-by-Step Derivation</p>
            <div className="space-y-1.5">
              {der.steps.map((step, i) => (
                <p key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 rounded px-1 text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </p>
              ))}
            </div>
          </div>
          {/* Marking tip */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">KIIT Marking Tip</p>
            <p className="text-xs text-amber-200/70">{der.markingTip}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DiagramCard({ diag }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition ${open ? 'border-blue-500/40' : 'border-slate-800'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <LayoutTemplate size={13} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white leading-snug">{diag.title}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{diag.diagramType}</p>
        </div>
        <span className="text-slate-500 shrink-0">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 space-y-4">
          {/* Blueprint */}
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Drawing Blueprint</p>
            <pre className="bg-slate-800 rounded-lg px-3 py-3 text-[11px] text-slate-300 font-mono whitespace-pre overflow-x-auto leading-relaxed scrollbar-none">
              {diag.visualBlueprint}
            </pre>
          </div>
          {/* Essential Labels */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Essential Labels to Include</p>
            <div className="space-y-1">
              {diag.essentialLabels.map((label, i) => (
                <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 shrink-0">✓</span> {label}
                </p>
              ))}
            </div>
          </div>
          {/* Grading criteria */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">What Gets You Full Marks</p>
            <p className="text-xs text-amber-200/70">{diag.gradingCriteria}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DerivationsWindow({ data, subject, onBack }) {
  const result = data?.derivations || {};
  const derivations = result.derivations || [];
  const diagrams = result.diagrams || [];
  const [tab, setTab] = useState('derivations');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 backdrop-blur">
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-white text-sm">📐 Derivations & Diagrams</h1>
          <p className="text-[11px] text-slate-500 truncate">{subject.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 border-b border-slate-800">
        {[
          { id: 'derivations', label: `Derivations (${derivations.length})` },
          { id: 'diagrams', label: `Diagrams (${diagrams.length})` }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px ${
              tab === t.id ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-10 space-y-3">
        {tab === 'derivations' && derivations.map(der => (
          <DerivationCard key={der.id} der={der} />
        ))}
        {tab === 'diagrams' && diagrams.map(diag => (
          <DiagramCard key={diag.id} diag={diag} />
        ))}
      </div>
    </div>
  );
}
