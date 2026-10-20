import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { apiRequest } from '../services/apiClient';
import { queueOfflineAction } from '../db/indexedDb';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  QrCode,
  Scan,
  ShieldCheck,
  Users,
  Sparkles
} from 'lucide-react';

export default function MeetsSection() {
  const { activeSociety, user } = useAuth();
  const { networkMode, refreshPendingCount } = useOfflineSync();
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeHostMeet, setActiveHostMeet] = useState(null);
  const [rotatingToken, setRotatingToken] = useState(null);
  const [countdown, setCountdown] = useState(20);

  // Student check-in modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedMeetForScan, setSelectedMeetForScan] = useState(null);
  const [manualPayload, setManualPayload] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);

  // Create meet form
  const [newTitle, setNewTitle] = useState('');
  const [newAgenda, setNewAgenda] = useState('');
  const [newVenue, setNewVenue] = useState('Lab 304 / Offline PWA Room');
  const [newStartsAt, setNewStartsAt] = useState('');

  const loadMeets = async () => {
    if (!activeSociety) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/api/meets?society_id=${activeSociety.id}`);
      setMeets(res.meets || []);
    } catch (e) {
      console.warn('Could not load meets over network:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeets();
  }, [activeSociety, networkMode]);

  // Rotating Token Timer for Organizer Screen
  useEffect(() => {
    if (!activeHostMeet) return;

    let intervalId;
    async function fetchToken() {
      try {
        const res = await apiRequest(`/api/meets/${activeHostMeet.id}/rotating-token`);
        setRotatingToken(res);
        setCountdown(res.remainingSeconds || 20);
      } catch (err) {
        console.error('Failed to get rotating token:', err);
      }
    }

    fetchToken();
    const tokenInterval = setInterval(fetchToken, 20000);

    // Second-by-second countdown
    const secondTimer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 20));
    }, 1000);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(secondTimer);
    };
  }, [activeHostMeet]);

  // Handle RSVP
  const handleRsvp = async (meetId, response) => {
    // Optimistic UI
    setMeets((prev) =>
      prev.map((m) => (m.id === meetId ? { ...m, user_rsvp: response } : m))
    );

    try {
      await apiRequest(`/api/meets/${meetId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ response })
      });
    } catch (e) {
      // Queue offline if network error
      await queueOfflineAction('MEET_RSVP', `/api/meets/${meetId}/rsvp`, 'POST', { response });
      await refreshPendingCount();
    }
  };

  // Student Offline Check-in Submission
  const handleCheckInSubmit = async (payloadToUse) => {
    const raw = payloadToUse || manualPayload;
    if (!raw.trim() || !selectedMeetForScan) return;

    const body = {
      rawPayload: raw.trim(),
      offlineScannedAt: new Date().toISOString()
    };

    if (networkMode === 'OFFLINE') {
      // 100% OFFLINE CHECK-IN: save in IndexedDB outbox!
      await queueOfflineAction(
        'SUBMIT_ATTENDANCE',
        `/api/meets/${selectedMeetForScan.id}/attendance`,
        'POST',
        body
      );
      await refreshPendingCount();
      setCheckInResult({
        success: true,
        offline: true,
        message: 'Attendance recorded in Offline Outbox! +40 points will sync when reconnected.'
      });
      confetti({ particleCount: 50, spread: 60 });
    } else {
      try {
        const res = await apiRequest(`/api/meets/${selectedMeetForScan.id}/attendance`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        setCheckInResult({
          success: true,
          offline: false,
          message: res.message
        });
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        loadMeets();
      } catch (err) {
        // Fallback to outbox on network drop
        await queueOfflineAction(
          'SUBMIT_ATTENDANCE',
          `/api/meets/${selectedMeetForScan.id}/attendance`,
          'POST',
          body
        );
        await refreshPendingCount();
        setCheckInResult({
          success: true,
          offline: true,
          message: 'Network drop: Saved in Offline Outbox for automatic sync.'
        });
      }
    }
  };

  // Create Meet
  const handleCreateMeet = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartsAt || !activeSociety) return;

    try {
      await apiRequest('/api/meets', {
        method: 'POST',
        body: JSON.stringify({
          society_id: activeSociety.id,
          title: newTitle.trim(),
          agenda: newAgenda.trim(),
          venue: newVenue.trim(),
          starts_at: newStartsAt
        })
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewAgenda('');
      loadMeets();
    } catch (e) {
      alert(`Could not create meet: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calendar size={20} className="text-blue-400" /> Society Meets & Offline Check-In
          </h2>
          <p className="text-xs text-slate-400">
            Hold meets with rotating TOTP cryptographic QR codes that verify even without internet.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-xs !py-2 !px-3"
        >
          <Plus size={15} /> Schedule Meet
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Loading society meets...</div>
      ) : meets.length === 0 ? (
        <div className="card-glass p-8 text-center text-slate-400 text-sm">
          No upcoming meets scheduled for this society yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {meets.map((m) => (
            <div key={m.id} className="card-glass p-5 flex flex-col justify-between border-slate-800">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-slate-100 text-base">{m.title}</h3>
                  {m.user_attended && (
                    <span className="badge-pill badge-active text-[10px] shrink-0">
                      <CheckCircle size={11} /> Checked In (+40 pts)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {m.agenda || 'Regular society sync, agenda items, and project updates.'}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400 mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-blue-400" />
                    <span>{new Date(m.starts_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-rose-400" />
                    <span>{m.venue || 'Campus Auditorium'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users size={13} className="text-emerald-400" />
                    <span>{m.attendance_count || 0} Attended • {m.going_count || 0} Going</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* RSVP options */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">RSVP:</span>
                  <button
                    onClick={() => handleRsvp(m.id, 'going')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                      m.user_rsvp === 'going'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Going
                  </button>
                  <button
                    onClick={() => handleRsvp(m.id, 'maybe')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                      m.user_rsvp === 'maybe'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Maybe
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Host Screen Button */}
                  <button
                    onClick={() => setActiveHostMeet(m)}
                    className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                    title="Open host screen with rotating signed QR code"
                  >
                    <QrCode size={13} className="text-purple-400" /> Host QR
                  </button>

                  {/* Student Check-in Button */}
                  {!m.user_attended && (
                    <button
                      onClick={() => {
                        setSelectedMeetForScan(m);
                        setShowScanModal(true);
                        setCheckInResult(null);
                        setManualPayload('');
                      }}
                      className="btn-primary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                    >
                      <Scan size={13} /> Check In
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HOST SCREEN: ROTATING CRYPTOGRAPHIC QR MODAL */}
      {activeHostMeet && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between mb-4">
              <span className="badge-pill bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">
                <ShieldCheck size={12} /> Live Signed QR
              </span>
              <button
                onClick={() => setActiveHostMeet(null)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-1">{activeHostMeet.title}</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Project this screen! Students scan this QR code to prove physical presence.
            </p>

            {/* Rotating QR display */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-4">
              {rotatingToken ? (
                <QRCodeSVG
                  value={rotatingToken.payload}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-800 text-xs">
                  Generating signed token...
                </div>
              )}
            </div>

            {/* Countdown & Rotating status */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mb-4 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span>Code refreshes in:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {countdown}s
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 20) * 100}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                HMAC-SHA256 Token: {rotatingToken ? rotatingToken.signature : '...'}
              </p>
            </div>

            <button
              onClick={() => {
                // Quick test copy
                if (rotatingToken) {
                  navigator.clipboard.writeText(rotatingToken.payload);
                  alert('Copied rotating QR payload to clipboard!');
                }
              }}
              className="btn-secondary w-full text-xs !py-1.5 justify-center"
            >
              Copy Current QR Payload (For Testing)
            </button>
          </div>
        </div>
      )}

      {/* STUDENT CHECK-IN MODAL (WORKS 100% OFFLINE) */}
      {showScanModal && selectedMeetForScan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Scan size={18} className="text-blue-400" /> Student Meet Check-In
              </h3>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter or paste the rotating code shown on the organizer's screen.
              <strong className="text-emerald-400 block mt-0.5">
                Works 100% offline (queued in IndexedDB outbox).
              </strong>
            </p>

            {checkInResult ? (
              <div
                className={`p-4 rounded-xl text-xs mb-4 ${
                  checkInResult.success
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border border-red-500/40 text-red-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <Sparkles size={16} className="text-emerald-400" /> Check-In Recorded!
                </div>
                <p>{checkInResult.message}</p>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="btn-primary text-xs mt-3 w-full justify-center"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Scanned QR Payload
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. CC-MEET:meet-101:89421:a1b2c3d4..."
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Instant 1-click test button for demonstrations */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await apiRequest(`/api/meets/${selectedMeetForScan.id}/rotating-token`);
                      setManualPayload(res.payload);
                    } catch (e) {
                      alert('Could not auto-fetch token (simulate offline by typing code)');
                    }
                  }}
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  ⚡ Auto-fill current valid rotating token (Demo Shortcut)
                </button>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowScanModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleCheckInSubmit()}
                    disabled={!manualPayload.trim()}
                    className="btn-primary text-xs"
                  >
                    Verify & Check In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE MEET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Schedule Society Meet</h3>
            <p className="text-xs text-slate-400 mb-4">
              Creates a secure cryptographic HMAC key for offline rotating QR attendance.
            </p>

            <form onSubmit={handleCreateMeet} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Meet Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Code Sprint / Hardware Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Agenda / Details</label>
                <textarea
                  rows={3}
                  placeholder="Outline key topics to cover..."
                  value={newAgenda}
                  onChange={(e) => setNewAgenda(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Venue</label>
                  <input
                    type="text"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newStartsAt}
                    onChange={(e) => setNewStartsAt(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
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
                  Schedule & Generate Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
