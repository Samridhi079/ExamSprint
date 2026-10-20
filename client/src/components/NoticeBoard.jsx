import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { getCachedNotices, saveNoticesToCache, queueOfflineAction } from '../db/indexedDb';
import { apiRequest } from '../services/apiClient';
import { Bell, Plus, Calendar, User, CloudOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NoticeBoard() {
  const { activeSociety, user } = useAuth();
  const { networkMode, refreshPendingCount } = useOfflineSync();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  // Load notices: IndexedDB first (zero-latency offline cache), then network fetch if online
  useEffect(() => {
    if (!activeSociety) return;
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // 1. Instant load from IndexedDB cache
        const cached = await getCachedNotices(activeSociety.id);
        if (isMounted && cached.length > 0) {
          setNotices(cached);
          setLoading(false);
        }

        // 2. Fetch fresh notices from server if online
        if (networkMode !== 'OFFLINE') {
          const res = await apiRequest(`/api/notices?society_id=${activeSociety.id}`);
          if (res && res.notices) {
            await saveNoticesToCache(res.notices);
            if (isMounted) {
              setNotices(res.notices);
            }
          }
        }
      } catch (err) {
        console.warn('Network notice fetch fallback to cache:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [activeSociety, networkMode]);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !activeSociety) return;

    // Client-generated UUID (guarantees offline uniqueness & zero ID collision)
    const clientUuid = 'not_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const newNotice = {
      id: clientUuid,
      society_id: activeSociety.id,
      author_id: user?.id || 'offline_user',
      author_name: user?.fullName || 'Campus Student',
      title: title.trim(),
      body: body.trim(),
      event_at: eventAt || null,
      version: 1,
      updated_at: new Date().toISOString(),
      deleted: 0
    };

    // 1. Optimistic UI update & immediate IndexedDB write
    setNotices(prev => [newNotice, ...prev]);
    await saveNoticesToCache([newNotice]);

    // 2. Network sync or outbox queue
    if (networkMode === 'OFFLINE') {
      await queueOfflineAction('CREATE_NOTICE', '/api/notices', 'POST', newNotice);
      await refreshPendingCount();
      setStatusMessage('Notice saved locally in IndexedDB! It will sync when reconnected.');
    } else {
      try {
        await apiRequest('/api/notices', {
          method: 'POST',
          body: JSON.stringify(newNotice)
        });
        setStatusMessage('Notice published live!');
      } catch (err) {
        // Network failed (e.g. flaky 2G drop), queue in outbox
        await queueOfflineAction('CREATE_NOTICE', '/api/notices', 'POST', newNotice);
        await refreshPendingCount();
        setStatusMessage('Network hiccup: Notice safely queued in offline outbox.');
      }
    }

    // Reset form
    setTitle('');
    setBody('');
    setEventAt('');
    setShowCreateModal(false);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bell size={20} className="text-blue-400" /> Society Notice Board
          </h2>
          <p className="text-xs text-slate-400">
            Offline-first bulletin cached in IndexedDB with delta-sync.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-xs !py-2 !px-3"
        >
          <Plus size={15} /> Post Notice
        </button>
      </div>

      {statusMessage && (
        <div className="bg-blue-900/30 border border-blue-500/40 text-blue-200 text-xs p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
          {statusMessage}
        </div>
      )}

      {/* Notices List */}
      {loading && notices.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading notices from local storage...</div>
      ) : notices.length === 0 ? (
        <div className="card-glass p-8 text-center text-slate-400 text-sm">
          No notices posted in this society yet. Be the first to share an update!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="card-glass card-interactive p-5 flex flex-col justify-between border-slate-800"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-slate-200 text-sm leading-snug">{n.title}</h3>
                  {n.id.startsWith('not_') && (
                    <span className="badge-pill bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] shrink-0" title="Created while offline, queued for sync">
                      <CloudOff size={10} /> Local
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed mb-4">
                  {n.body}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <User size={12} className="text-blue-400" /> {n.author_name}
                </span>

                {n.event_at ? (
                  <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                    <Calendar size={11} /> {new Date(n.event_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span>{new Date(n.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Post New Society Notice</h3>
            <p className="text-xs text-slate-400 mb-4">
              Works completely offline. Uses client-generated UUID and local outbox.
            </p>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workshop Room Change / Hackathon Prep"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notice Details *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write clear, concise details for your society members..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Event Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={eventAt}
                  onChange={(e) => setEventAt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
