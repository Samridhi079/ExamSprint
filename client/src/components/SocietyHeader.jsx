import React from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiClient';
import { Users, Bell, Calendar, TrendingUp, MessageSquare, CreditCard, UserPlus } from 'lucide-react';

export default function SocietyHeader({ activeTab, setActiveTab }) {
  const { activeSociety, user, loadSocieties } = useAuth();

  if (!activeSociety) return null;

  const handleJoinSociety = async () => {
    try {
      await apiRequest(`/api/societies/${activeSociety.id}/join`, { method: 'POST' });
      await loadSocieties();
      alert(`You have officially joined ${activeSociety.name}!`);
    } catch (e) {
      alert(e.message);
    }
  };

  const tabs = [
    { id: 'notices', label: 'Notices', icon: Bell, badge: 'Offline Cache' },
    { id: 'meets', label: 'Meets & Attendance', icon: Calendar, badge: 'Rotating QR' },
    { id: 'activity', label: 'Activity & Titles', icon: TrendingUp, badge: '30d Decay' },
    { id: 'chat', label: 'Society Chat', icon: MessageSquare, badge: 'Sequenced' },
    { id: 'payments', label: 'Payments & Ledger', icon: CreditCard, badge: 'Transparent' }
  ];

  return (
    <div className="card-glass p-6 border-slate-800 space-y-5">
      {/* Society Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {activeSociety.name}
            </h1>
            <span className="badge-pill bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
              {activeSociety.category}
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {activeSociety.description}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!activeSociety.is_member && (
            <button
              onClick={handleJoinSociety}
              className="btn-primary text-xs !py-2 !px-3.5 flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Join Society
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-800/80 pt-4 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-blue-700/60 text-blue-100'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
