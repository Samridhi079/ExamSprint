import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, UploadCloud, ArrowLeft, CheckCircle2, FileText, Loader2, Plus } from 'lucide-react';
import { apiRequest } from '../services/apiClient';

export default function SubjectListScreen({ student, branch, semester, onSelectSubject, onBack }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiRequest(`/api/exams/subjects?branch=${branch}&semester=${semester}`);
        setSubjects(res.subjects || []);
      } catch {
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branch, semester]);

  async function handleAddSubject() {
    if (!newSubjectName.trim()) return;
    setAdding(true);
    try {
      const res = await apiRequest('/api/exams/upload-subject', {
        method: 'POST',
        body: JSON.stringify({ name: newSubjectName.trim(), branch, semester })
      });
      if (res.success) {
        setSubjects(prev => [...prev, {
          id: res.subject.id,
          name: res.subject.name,
          code: res.subject.code,
          semester,
          branch,
          hasNotes: false,
          hasPyqs: false,
          isPreloaded: false
        }]);
        setNewSubjectName('');
        setShowAddForm(false);
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-white text-sm tracking-tight">ExamSprint AI</h1>
          <p className="text-[11px] text-slate-500">{student.rollNo} · {branch} · Semester {semester}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pt-6">
        <div className="mb-2">
          <h2 className="text-lg font-extrabold text-white">
            {branch} — Semester {semester} Subjects
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a subject to upload materials and access AI study tools
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-500 text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading subjects…
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => onSelectSubject(subject)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-blue-600/50 hover:bg-slate-800/60 rounded-2xl p-4 flex items-center gap-4 text-left transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm truncate">{subject.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                    <span>{subject.code}</span>
                    {subject.isPreloaded && (
                      <span className="flex items-center gap-0.5 text-emerald-400">
                        <CheckCircle2 size={10} /> KIIT Preloaded
                      </span>
                    )}
                    {subject.hasNotes && <span className="text-blue-400 flex items-center gap-0.5"><FileText size={10} /> Notes</span>}
                    {subject.hasPyqs && <span className="text-purple-400 flex items-center gap-0.5"><FileText size={10} /> PYQs</span>}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 transition shrink-0" />
              </button>
            ))}

            {subjects.length === 0 && !showAddForm && (
              <div className="text-center py-10 text-slate-500 text-sm">
                No preloaded subjects for {branch} Semester {semester}.
                <br />
                <span className="text-xs">Add your own subject below.</span>
              </div>
            )}

            {/* Add custom subject */}
            {showAddForm ? (
              <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Add New Subject</p>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSubject}
                    disabled={adding || !newSubjectName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs py-2 rounded-xl transition"
                  >
                    {adding ? 'Adding…' : 'Add Subject'}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewSubjectName(''); }}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-xs py-2 rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full border border-dashed border-slate-700 hover:border-blue-600/50 rounded-2xl p-3.5 flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-blue-400 transition"
              >
                <Plus size={14} /> Add a subject not listed here
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
