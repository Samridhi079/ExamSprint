import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getPendingOutbox,
  removeOutboxItem,
  getCachedNotices,
  saveNoticesToCache,
  getLastSyncTime,
  setLastSyncTime
} from '../db/indexedDb';
import {
  getNetworkMode,
  setNetworkMode as updateNetworkMode,
  subscribeNetworkMode,
  apiRequest
} from '../services/apiClient';

const OfflineSyncContext = createContext(null);

export function OfflineSyncProvider({ children }) {
  const [networkMode, setNetworkModeState] = useState(getNetworkMode());
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState(null);

  // Update pending outbox count
  async function refreshPendingCount() {
    try {
      const items = await getPendingOutbox();
      setPendingOutboxCount(items.length);
    } catch (e) {
      console.error('Failed to get pending outbox:', e);
    }
  }

  // Subscribe to network mode changes
  useEffect(() => {
    refreshPendingCount();

    const unsubscribe = subscribeNetworkMode((mode) => {
      setNetworkModeState(mode);
      if (mode === 'ONLINE') {
        // Automatically flush outbox upon returning online!
        flushOutboxAndSync();
      }
    });

    // Window online/offline events
    const handleWindowOnline = () => {
      if (getNetworkMode() !== 'OFFLINE') {
        flushOutboxAndSync();
      }
    };

    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', () => {
      setNetworkModeState('OFFLINE');
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleWindowOnline);
    };
  }, []);

  function changeNetworkMode(newMode) {
    updateNetworkMode(newMode);
    setNetworkModeState(newMode);
    if (newMode === 'ONLINE') {
      flushOutboxAndSync();
    }
  }

  // FLUSH OUTBOX AND RUN DELTA SYNC
  async function flushOutboxAndSync(activeSocietyId = null) {
    if (getNetworkMode() === 'OFFLINE' || !navigator.onLine) {
      return { success: false, reason: 'Device is offline' };
    }

    setIsSyncing(true);
    let syncedCount = 0;

    try {
      // 1. Process Outbox items
      const outboxItems = await getPendingOutbox();
      for (const item of outboxItems) {
        try {
          await apiRequest(item.endpoint, {
            method: item.method,
            body: JSON.stringify(item.payload)
          });
          // Remove processed item from IndexedDB outbox
          await removeOutboxItem(item.id);
          syncedCount++;
        } catch (err) {
          console.warn(`Failed to sync outbox item ${item.id}:`, err.message);
          // If error is not a network failure (e.g. 400), don't get stuck indefinitely
          if (err.status && err.status >= 400 && err.status < 500) {
            await removeOutboxItem(item.id);
          }
        }
      }

      // 2. Perform Notice Delta Sync if society provided
      if (activeSocietyId) {
        const lastSync = await getLastSyncTime(activeSocietyId);
        const url = lastSync
          ? `/api/notices/sync?society_id=${activeSocietyId}&since=${encodeURIComponent(lastSync)}`
          : `/api/notices/sync?society_id=${activeSocietyId}`;

        const syncRes = await apiRequest(url);
        if (syncRes && syncRes.notices) {
          await saveNoticesToCache(syncRes.notices);
          await setLastSyncTime(activeSocietyId, syncRes.serverTime);
        }
      }

      await refreshPendingCount();
      setLastSyncStatus(`Synced ${syncedCount} queued actions at ${new Date().toLocaleTimeString()}`);
      return { success: true, syncedCount };
    } catch (error) {
      console.error('Sync failed:', error);
      setLastSyncStatus(`Sync issue: ${error.message}`);
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <OfflineSyncContext.Provider
      value={{
        networkMode,
        setNetworkMode: changeNetworkMode,
        pendingOutboxCount,
        refreshPendingCount,
        isSyncing,
        lastSyncStatus,
        flushOutboxAndSync
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}
