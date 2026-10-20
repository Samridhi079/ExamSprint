import React from 'react';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, Activity, RefreshCw, Smartphone } from 'lucide-react';

export default function NetworkSimulator() {
  const { networkMode, setNetworkMode, pendingOutboxCount, isSyncing, flushOutboxAndSync, lastSyncStatus } = useOfflineSync();
  const { activeSociety } = useAuth();

  const handleManualSync = () => {
    flushOutboxAndSync(activeSociety?.id);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
      {/* Network mode pills */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <Smartphone size={13} className="text-blue-400" /> Network Simulation:
        </span>

        <button
          onClick={() => setNetworkMode('ONLINE')}
          className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            networkMode === 'ONLINE'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Normal high-speed internet"
        >
          <Wifi size={12} className={networkMode === 'ONLINE' ? 'text-emerald-400' : ''} />
          Online
        </button>

        <button
          onClick={() => setNetworkMode('FLAKY_2G')}
          className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            networkMode === 'FLAKY_2G'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Simulate 2G/EDGE network: high latency (1200ms) and dropped packets"
        >
          <Activity size={12} className={networkMode === 'FLAKY_2G' ? 'text-amber-400' : ''} />
          Flaky 2G
        </button>

        <button
          onClick={() => setNetworkMode('OFFLINE')}
          className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
            networkMode === 'OFFLINE'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="100% Offline Airplane mode: operations stored in IndexedDB outbox"
        >
          <WifiOff size={12} className={networkMode === 'OFFLINE' ? 'text-red-400' : ''} />
          Airplane Mode (Offline)
        </button>
      </div>

      {/* Sync and Outbox status */}
      <div className="flex items-center gap-3">
        {pendingOutboxCount > 0 ? (
          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            {pendingOutboxCount} {pendingOutboxCount === 1 ? 'action' : 'actions'} in IndexedDB Outbox
          </span>
        ) : (
          <span className="text-slate-400 hidden sm:inline">All local writes in sync</span>
        )}

        <button
          onClick={handleManualSync}
          disabled={networkMode === 'OFFLINE' || isSyncing}
          className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1.5"
          title="Trigger immediate delta sync and drain pending outbox"
        >
          <RefreshCw size={11} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}
