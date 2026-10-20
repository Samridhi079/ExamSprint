import React, { useState } from 'react';
import { HelpCircle, Send, Sparkles, Lightbulb, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../services/apiClient';

export default function DoubtSolverSection({ activeSubject }) {
  const [question, setQuestion] = useState('');
  const [conversations, setConversations] = useState([
    {
      question: "How should I structure a 10-mark answer for Deadlock Avoidance?",
      answer: `Full-Mark Exam Blueprint for Deadlock:
1. Definition (1 Mark): Define Deadlock & safe state.
2. Necessary Conditions (2 Marks): State all 4 Coffman conditions.
3. Banker's Algorithm Data Structures (3 Marks): Define Available, Max, Allocation, Need matrices.
4. Safety Algorithm Steps (3 Marks): Write Work = Available initialization and iterative check.
5. Example & Complexity (1 Mark): Draw a 3-process allocation matrix and state O(m * n^2) complexity.`,
      examTip: 'Draw the matrices in neat tabular grid boxes to get full step marks.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const q = question.trim();
    setQuestion('');
    setLoading(true);

    try {
      const res = await apiRequest('/api/exams/ask-doubt', {
        method: 'POST',
        body: JSON.stringify({ question: q, subjectName: activeSubject?.name })
      });

      setConversations(prev => [
        {
          question: q,
          answer: res.answer,
          examTip: res.examTip
        },
        ...prev
      ]);
    } catch (err) {
      alert(`Could not resolve doubt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass p-5 border-slate-800 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <HelpCircle size={20} className="text-emerald-400" />
          Night-Before-Exam Doubt Solver
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Ask any concept, numerical, or derivation. Get formatted, bulleted exam responses designed to maximize step marks.
        </p>
      </div>

      {/* Input Box */}
      <form onSubmit={handleAsk} className="card-glass p-4 border-slate-800 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask an exam question (e.g. 'Differentiate between Paging and Segmentation', 'EMAT formula derivation')..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="btn-primary !text-xs !py-2.5 !px-4 flex items-center gap-1.5"
        >
          <Send size={13} />
          {loading ? 'Solving...' : 'Get Exam Answer'}
        </button>
      </form>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 text-[11px] font-semibold">Try Quick Questions:</span>
        {[
          "Difference between Mutex and Semaphore?",
          "How to calculate EMAT with TLB hit ratio?",
          "Explain ACID properties with real example",
          "What is Belady's Anomaly and who suffers from it?"
        ].map((sample, idx) => (
          <button
            key={idx}
            onClick={() => setQuestion(sample)}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] transition text-left"
          >
            {sample}
          </button>
        ))}
      </div>

      {/* Conversations Stream */}
      <div className="space-y-4">
        {conversations.map((item, idx) => (
          <div key={idx} className="card-glass p-5 border-slate-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="bg-blue-600/20 text-blue-400 font-bold px-2 py-0.5 rounded text-xs shrink-0">
                Q
              </span>
              <h3 className="font-bold text-sm text-slate-100">{item.question}</h3>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
              {item.answer}
            </div>

            {item.examTip && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg font-medium">
                <Lightbulb size={13} className="text-amber-400 shrink-0" />
                <span>Examiner Tip: {item.examTip}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
