import React from 'react';
import { ArrowLeft, Zap } from 'lucide-react';

const TAG_COLORS = {
  'Guaranteed': 'bg-red-500/10 text-red-400 border-red-500/30',
  'Formula': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Mandatory': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'Repeated 4x': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'KIIT Favorite': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'Viva Essential': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'default': 'bg-slate-700/50 text-slate-400 border-slate-600'
};

function tagColor(tag) {
  return TAG_COLORS[tag] || TAG_COLORS['default'];
}

export default function OneMarkersWindow({ data, subject, onBack }) {
  const om = data?.oneMarkers || {};
  const points = om.points || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 backdrop-blur">
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-white text-sm">⚡ Last-Minute 1-Marker Bullets</h1>
          <p className="text-[11px] text-slate-500 truncate">{subject.name} · {points.length} rapid-fire points</p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/80 flex items-center gap-2">
          <Zap size={14} className="text-amber-400 shrink-0" />
          Designed for the <strong>30 minutes before entering the exam hall</strong>. Read each point once — these are the guaranteed 1-mark answers.
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-10 space-y-2">
        {points.map((point, i) => (
          <div
            key={point.id}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-3"
          >
            <span className="text-slate-600 font-mono text-xs mt-0.5 shrink-0 w-5 text-right">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-sm text-white">{point.term}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${tagColor(point.tag)}`}>
                  {point.tag}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{point.fact}</p>
            </div>
          </div>
        ))}

        {points.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-12">
            No bullet points generated yet. Make sure course notes are uploaded on the previous screen.
          </div>
        )}
      </div>
    </div>
  );
}
