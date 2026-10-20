import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const MOCK_QUESTIONS = {
  'Operating Systems': [
    {
      q: "Which page replacement algorithm suffers from Belady's Anomaly?",
      options: ["Optimal (OPT)", "Least Recently Used (LRU)", "First-In, First-Out (FIFO)", "Least Frequently Used (LFU)"],
      correct: 2,
      explanation: "FIFO is not a stack algorithm, meaning the set of pages in memory for n frames is not necessarily a subset of pages for n+1 frames."
    },
    {
      q: "Which of the following is NOT a necessary condition for a deadlock to occur?",
      options: ["Mutual Exclusion", "Circular Wait", "Preemption allowed", "Hold and Wait"],
      correct: 2,
      explanation: "No Preemption is the necessary condition. If preemption is allowed, deadlocks cannot occur because resources can be reclaimed."
    },
    {
      q: "In Paging, what type of fragmentation is completely eliminated?",
      options: ["Internal Fragmentation", "External Fragmentation", "Both Internal & External", "Neither"],
      correct: 1,
      explanation: "Paging divides physical memory into fixed-size frames, allowing any frame to be allocated to any page. This eliminates external fragmentation."
    },
    {
      q: "What is the primary role of the Translation Lookaside Buffer (TLB)?",
      options: ["To store user data", "Fast associative hardware cache for page table entries", "To schedule processes", "To detect deadlocks"],
      correct: 1,
      explanation: "The TLB caches recently accessed virtual-to-physical address mappings, drastically reducing the effective memory access time (EMAT)."
    },
    {
      q: "Which CPU scheduling algorithm provides the mathematically minimum average waiting time?",
      options: ["FCFS", "Shortest Job First (SJF)", "Round Robin", "Priority Scheduling"],
      correct: 1,
      explanation: "SJF is provably optimal for minimizing average waiting time for a given set of stationary processes."
    }
  ]
};

export default function MockTestSection({ activeSubject }) {
  const subjectName = activeSubject?.name || 'Operating Systems';
  const questions = MOCK_QUESTIONS['Operating Systems'];

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) score++;
    });
    return score;
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = calculateScore();
    if (score >= 4) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const score = calculateScore();
  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass p-5 border-slate-800 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Award size={20} className="text-blue-400" />
            2-Minute Rapid Mock Exam ({subjectName})
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Test your grasp of the highest-frequency semester exam concepts before stepping into the hall.
          </p>
        </div>

        {submitted && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {score} / {questions.length}
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold">{percentage}% Score</span>
            </div>
            <button onClick={handleReset} className="btn-secondary !text-xs !py-2 !px-3 flex items-center gap-1.5">
              <RotateCcw size={13} /> Retake
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const userChoice = selectedAnswers[qIdx];
          const isAnswered = userChoice !== undefined;

          return (
            <div key={qIdx} className="card-glass p-5 border-slate-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {qIdx + 1}
                </span>
                <h3 className="font-bold text-sm text-slate-100">{q.q}</h3>
              </div>

              {/* Options */}
              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                {q.options.map((opt, optIdx) => {
                  let btnStyle = 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800';

                  if (submitted) {
                    if (optIdx === q.correct) {
                      btnStyle = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-semibold';
                    } else if (userChoice === optIdx && userChoice !== q.correct) {
                      btnStyle = 'bg-red-950/40 border-red-500/50 text-red-300';
                    } else {
                      btnStyle = 'opacity-50 border-slate-800';
                    }
                  } else if (userChoice === optIdx) {
                    btnStyle = 'bg-blue-600 text-white font-semibold border-blue-500';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`p-3 rounded-xl border text-xs text-left transition flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {submitted && optIdx === q.correct && (
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0 ml-2" />
                      )}
                      {submitted && userChoice === optIdx && userChoice !== q.correct && (
                        <XCircle size={14} className="text-red-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation upon submission */}
              {submitted && (
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-300">
                  <span className="font-bold text-blue-400">Exam Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Action */}
      {!submitted && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length === 0}
            className="btn-primary !text-xs !py-2.5 !px-5"
          >
            Submit Mock Exam & See Score
          </button>
        </div>
      )}
    </div>
  );
}
