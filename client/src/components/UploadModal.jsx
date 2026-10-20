import React, { useState } from 'react';
import { UploadCloud, FileText, X, Sparkles, Check } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, mode, onProcess, currentSubject }) {
  const [inputText, setInputText] = useState('');
  const [subjectName, setSubjectName] = useState(currentSubject?.name || 'Operating Systems');
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    // Read plain text / markdown files directly
    const reader = new FileReader();
    reader.onload = (event) => {
      setInputText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    if (mode === 'notes') {
      setInputText(`UNIT 1: INTRODUCTION & PROCESS MANAGEMENT
Operating system goals: convenience, efficiency, hardware abstraction.
Dual mode operation: User mode (bit 1) and Kernel mode (bit 0).
Process Control Block (PCB): contains process state, PC, registers, scheduling info.
Threads: basic execution unit sharing address space and code with peer threads.
Process scheduling algorithms: FCFS, SJF, Round Robin, Priority Scheduling.
Deadlock 4 conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.
Paging and Virtual Memory: eliminates external fragmentation, uses TLB cache.`);
    } else {
      setInputText(`UNIVERSITY END-SEMESTER EXAM 2024:
1. Define Belady's Anomaly and name the algorithm that suffers from it. (2 Marks)
2. What is a Process Control Block? (2 Marks)
3. Compare FCFS and SJF scheduling. (5 Marks)
4. Explain the Banker's Algorithm for deadlock avoidance with safe state proof. (10 Marks)
5. Explain Demand Paging and Page Fault handling step-by-step. (5 Marks)
6. What is Paging? Explain logical to physical address translation with a TLB diagram. (10 Marks)`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onProcess({ text: inputText.trim(), subjectName });
    onClose();
  };

  const isNotes = mode === 'notes';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud size={18} className="text-blue-400" />
              {isNotes ? 'Upload / Paste Course Notes (Step 1)' : 'Upload Previous Year Questions (Step 2)'}
            </h3>
            <p className="text-xs text-slate-400">
              {isNotes
                ? 'Input your lecture notes or syllabus to generate the high-yield crash sheet.'
                : 'Input your college PYQ paper to extract important repeated questions with model answers.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Subject Name</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500"
              placeholder="e.g. Operating Systems / DBMS / Computer Networks"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">
                {isNotes ? 'Course Content / Notes / Syllabus *' : 'Previous Year Questions (PYQs) Text *'}
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                <Sparkles size={12} /> Auto-fill sample data
              </button>
            </div>
            <textarea
              required
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isNotes
                  ? 'Paste lecture slides, unit notes, or syllabus chapters here...'
                  : 'Paste question paper questions, exam sets, or previous year papers...'
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none font-mono text-[11px]"
            />
          </div>

          {/* File Upload Alternative */}
          <div className="border border-dashed border-slate-700 rounded-xl p-3 text-center bg-slate-950/40">
            <label className="cursor-pointer block">
              <span className="text-blue-400 font-semibold hover:underline">
                {fileName ? `Uploaded: ${fileName}` : 'Or click to select a file (.txt, .md, .pdf notes)'}
              </span>
              <input
                type="file"
                accept=".txt,.md,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-500 mt-1">Zero file size limitations. Works entirely offline.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Check size={14} />
              {isNotes ? 'Generate Summary' : 'Cross-Reference PYQs'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
