import React, { useState } from 'react';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, Table2,
  Layers, Send, Loader2, Zap, MessageCircle
} from 'lucide-react';
import { apiRequest } from '../services/apiClient';

// ── Comparison Table ──────────────────────────────────────────────────────
function ComparisonTable({ table }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-800">
            <th className="text-left px-3 py-2 text-slate-400 font-semibold border border-slate-700 w-1/3">Basis</th>
            <th className="text-left px-3 py-2 text-blue-400 font-semibold border border-slate-700">{table.itemA.name}</th>
            <th className="text-left px-3 py-2 text-purple-400 font-semibold border border-slate-700">{table.itemB.name}</th>
          </tr>
        </thead>
        <tbody>
          {table.basis.map((b, i) => (
            <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/40 transition">
              <td className="px-3 py-2 text-slate-400 font-medium border border-slate-800">{b}</td>
              <td className="px-3 py-2 text-slate-200 border border-slate-800">{table.itemA.values[i]}</td>
              <td className="px-3 py-2 text-slate-200 border border-slate-800">{table.itemB.values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Flashcard ──────────────────────────────────────────────────────────────
function Flashcard({ card }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className={`w-full rounded-xl border p-4 text-left transition ${
        flipped
          ? 'bg-blue-600/10 border-blue-500/30'
          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-mono">{card.tag}</span>
        <span className="text-[10px] text-slate-500">{flipped ? 'Tap to hide ↑' : 'Tap to reveal ↓'}</span>
      </div>
      <p className="text-sm font-semibold text-white">{card.question}</p>
      {flipped && (
        <p className="text-xs text-blue-200 mt-3 leading-relaxed whitespace-pre-line border-t border-blue-500/20 pt-3">
          {card.answer}
        </p>
      )}
    </button>
  );
}

// ── Chat Box ───────────────────────────────────────────────────────────────
function ChatBox({ subject }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(isEli10 = false) {
    const q = input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: 'user', text: isEli10 ? `${q} (Explain like I'm 10)` : q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await apiRequest('/api/exams/chat', {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          subjectId: subject.id,
          subjectName: subject.name,
          isEli10
        })
      });
      const c = res.chat;
      const reply = isEli10 && c.analogyTitle
        ? `${c.analogyTitle}\n\n${c.answer}`
        : c.answer;
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, could not answer right now. Try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <MessageCircle size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Chat with your Notes</span>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">
            Ask anything about {subject.name} · Use "ELI10" to get simple analogies
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
              m.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin text-blue-400" />
              <span className="text-xs text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(false)}
          placeholder="Ask a topic from your notes…"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
        />
        <button
          onClick={() => sendMessage(true)}
          title="Explain like I'm 10 years old"
          className="px-2.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-bold hover:bg-amber-500/20 transition shrink-0"
        >
          ELI10
        </button>
        <button
          onClick={() => sendMessage(false)}
          disabled={loading || !input.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl transition"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Main NotesWindow ────────────────────────────────────────────────────────
export default function NotesWindow({ data, subject, onBack }) {
  const summary = data?.summary || {};
  const [activeTab, setActiveTab] = useState('units');
  const [expandedUnit, setExpandedUnit] = useState(0);

  const tabs = [
    { id: 'units', label: 'Unit Notes', icon: BookOpen },
    { id: 'compare', label: 'Difference Tables', icon: Table2 },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'chat', label: 'Chat with Notes', icon: MessageCircle }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 backdrop-blur">
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-white text-sm truncate">📝 AI Summarized Notes</h1>
          <p className="text-[11px] text-slate-500 truncate">{subject.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 overflow-x-auto scrollbar-none border-b border-slate-800 pb-0">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border-b-2 transition -mb-px ${
                activeTab === t.id
                  ? 'text-blue-400 border-blue-500'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="max-w-3xl mx-auto p-4 pb-10 space-y-4">

        {/* Exam Tips Banner */}
        {summary.examTips && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">✨ KIIT Exam Tips</p>
            {summary.examTips.map((tip, i) => (
              <p key={i} className="text-[11px] text-amber-200/70 flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">→</span> {tip}
              </p>
            ))}
          </div>
        )}

        {/* Units Tab */}
        {activeTab === 'units' && (
          <div className="space-y-2">
            {(summary.units || []).map((unit, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedUnit(expandedUnit === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/60 transition"
                >
                  <span className="font-bold text-sm text-white">{unit.title}</span>
                  <span className="text-slate-500">
                    {expandedUnit === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {expandedUnit === i && (
                  <div className="px-4 pb-4 space-y-1.5 border-t border-slate-800">
                    {unit.takeaways.map((t, j) => (
                      <p key={j} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                        {t}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Comparison Tables Tab */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            {(summary.comparisonTables || []).map((table, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="font-bold text-sm text-white">{table.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">3-column format · Use in exam for full marks</p>
                </div>
                <div className="p-4">
                  <ComparisonTable table={table} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="space-y-2">
            {(summary.flashcards || []).map(card => (
              <Flashcard key={card.id} card={card} />
            ))}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && <ChatBox subject={subject} />}
      </div>
    </div>
  );
}
