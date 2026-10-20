import React, { useState } from 'react';
import { GraduationCap, LogIn, Zap } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!rollNo.trim()) {
      setError('Please enter your Roll Number.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your Name.');
      return;
    }
    // Save to localStorage so they stay logged in
    const student = { rollNo: rollNo.trim().toUpperCase(), name: name.trim() };
    localStorage.setItem('examsprint_student', JSON.stringify(student));
    onLogin(student);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-4">
            <GraduationCap size={32} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">ExamSprint AI</h1>
          <p className="text-sm text-slate-400 mt-1">KIIT University · Exam Intelligence Platform</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Student Roll Number
            </label>
            <input
              type="text"
              value={rollNo}
              onChange={e => { setRollNo(e.target.value); setError(''); }}
              placeholder="e.g. 21052348"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Riya Sharma"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30 text-sm"
          >
            <LogIn size={16} />
            Enter ExamSprint
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Your session is saved locally · No password needed
          </p>
        </form>

        {/* Tag line */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Zap size={12} className="text-amber-400" />
          <span>Built for KIIT students · Powered by AI exam intelligence</span>
        </div>
      </div>
    </div>
  );
}
