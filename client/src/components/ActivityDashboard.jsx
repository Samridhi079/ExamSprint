import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiClient';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Users,
  Flame,
  CalendarCheck,
  Zap,
  Info
} from 'lucide-react';

export default function ActivityDashboard() {
  const { activeSociety } = useAuth();
  const [activityData, setActivityData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_score'); // 'my_score' | 'society_roster'

  const loadData = async () => {
    if (!activeSociety) return;
    try {
      setLoading(true);
      const [actRes, memRes] = await Promise.all([
        apiRequest(`/api/activity/${activeSociety.id}/me`),
        apiRequest(`/api/societies/${activeSociety.id}/members`)
      ]);
      setActivityData(actRes);
      setMembers(memRes.members || []);
    } catch (e) {
      console.warn('Could not load activity data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSociety]);

  if (loading && !activityData) {
    return <div className="text-center py-12 text-slate-500 text-xs">Computing activity score...</div>;
  }

  const score = activityData?.score || 0;
  const status = activityData?.status || 'Active';
  const nudge = activityData?.nudge;
  const titles = activityData?.titles || [];
  const eventLog = activityData?.eventLog || [];

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" /> Activity, Inactivity & Titles
          </h2>
          <p className="text-xs text-slate-400">
            30-day rolling activity score with exponential time-decay and earned badges.
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('my_score')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'my_score'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            My Activity & Titles
          </button>
          <button
            onClick={() => setActiveTab('society_roster')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'society_roster'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Society Roster ({members.length})
          </button>
        </div>
      </div>

      {activeTab === 'my_score' ? (
        <div className="space-y-6">
          {/* Status Nudge Alert if At Risk or Inactive */}
          {nudge && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                nudge.severity === 'warning'
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-red-950/30 border-red-500/40 text-red-200'
              }`}
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <h4 className="font-bold text-sm mb-1">{nudge.headline}</h4>
                <p className="text-slate-300 leading-relaxed">{nudge.suggestion}</p>
              </div>
            </div>
          )}

          {/* Activity Score Metric Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Score Gauge */}
            <div className="card-glass p-6 md:col-span-1 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                30-Day Activity Score
              </span>

              <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      status === 'Active'
                        ? 'text-emerald-500'
                        : status === 'At Risk'
                        ? 'text-amber-500'
                        : 'text-red-500'
                    }
                    strokeDasharray={`${Math.min(score, 100)}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-white">{score}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">/ 100</span>
                </div>
              </div>

              <span
                className={`badge-pill text-xs font-bold ${
                  status === 'Active'
                    ? 'badge-active'
                    : status === 'At Risk'
                    ? 'badge-at-risk'
                    : 'badge-inactive'
                }`}
              >
                {status === 'Active' && <CheckCircle size={12} />}
                {status === 'At Risk' && <AlertTriangle size={12} />}
                Status: {status}
              </span>

              <p className="text-[11px] text-slate-400 mt-3">
                Based on meet attendance, chat engagement, and dues.
              </p>
            </div>

            {/* Titles & Earned Badges */}
            <div className="card-glass p-6 md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-3">
                  <Award size={18} className="text-purple-400" /> Earned Society Badges & Titles
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Titles are awarded automatically through the rule engine or assigned by society officers.
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {titles.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No badges earned yet. Attend meets and post notices to unlock badges!</div>
                  ) : (
                    titles.map((t, idx) => (
                      <span
                        key={idx}
                        className="badge-pill badge-title px-3 py-1.5 text-xs shadow-sm"
                        title={`Awarded: ${new Date(t.awarded_at).toLocaleDateString()}`}
                      >
                        <span className="text-base">{t.badge_icon}</span> {t.title}
                        <span className="text-[9px] opacity-60 ml-1">({t.source})</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Formula Explainer Box (Great for interview!) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1 font-mono">
                <div className="text-slate-300 font-bold flex items-center gap-1.5 text-[11px]">
                  <Info size={13} className="text-blue-400" /> Time-Decay Scoring Formula:
                </div>
                <div className="text-blue-300 text-[11px]">
                  Score = Σ (BaseWeight × e^(-0.05 × daysAgo))
                </div>
                <div className="text-[10px] text-slate-500">
                  Meets (+40) • Dues (+25) • Notices (+20) • RSVP (+10) • Chat (+5)
                </div>
              </div>
            </div>
          </div>

          {/* Event Breakdown */}
          <div className="card-glass p-5">
            <h3 className="font-bold text-slate-200 text-sm mb-3">Recent 30-Day Activity Events</h3>
            {eventLog.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No recent events recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Event</th>
                      <th className="pb-2">Base Weight</th>
                      <th className="pb-2">Time Ago</th>
                      <th className="pb-2">Occurred At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {eventLog.map((ev, i) => (
                      <tr key={i} className="text-slate-300">
                        <td className="py-2 font-medium flex items-center gap-1.5">
                          <Zap size={13} className="text-amber-400" /> {ev.type.replace('_', ' ')}
                        </td>
                        <td className="py-2 text-emerald-400 font-semibold">+{ev.weight}</td>
                        <td className="py-2 text-slate-400">{ev.days_ago} days ago</td>
                        <td className="py-2 text-slate-500 font-mono text-[11px]">
                          {new Date(ev.occurred_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Society Roster Tab */
        <div className="card-glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Users size={16} className="text-blue-400" /> Member Directory & Activity Status
            </h3>
            <span className="text-xs text-slate-400">
              {members.filter(m => m.activity_status === 'Active').length} Active •{' '}
              {members.filter(m => m.activity_status === 'At Risk').length} At Risk •{' '}
              {members.filter(m => m.activity_status === 'Inactive').length} Inactive
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Activity Score</th>
                  <th className="pb-2">Earned Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((m) => (
                  <tr key={m.id} className="text-slate-300">
                    <td className="py-3 font-semibold text-slate-100">
                      <div>{m.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{m.branch} • {m.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`badge-pill text-[10px] ${
                          m.activity_status === 'Active'
                            ? 'badge-active'
                            : m.activity_status === 'At Risk'
                            ? 'badge-at-risk'
                            : 'badge-inactive'
                        }`}
                      >
                        {m.activity_status}
                      </span>
                    </td>
                    <td className="py-3 font-mono font-bold text-blue-400">
                      {m.activity_score}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.titles && m.titles.length > 0 ? (
                          m.titles.map((t, idx) => (
                            <span key={idx} className="badge-pill badge-title text-[9px] px-1.5 py-0.5" title={t.title}>
                              {t.icon} {t.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
