import { openDB } from 'idb';

const DB_NAME = 'campus_connect_offline_db';
const DB_VERSION = 1;

export async function getOfflineDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Notices cache
      if (!db.objectStoreNames.contains('notices')) {
        const noticeStore = db.createObjectStore('notices', { keyPath: 'id' });
        noticeStore.createIndex('by_society', 'society_id');
        noticeStore.createIndex('by_updated', 'updated_at');
      }

      // 2. Meets cache
      if (!db.objectStoreNames.contains('meets')) {
        const meetStore = db.createObjectStore('meets', { keyPath: 'id' });
        meetStore.createIndex('by_society', 'society_id');
      }

      // 3. Chat messages cache
      if (!db.objectStoreNames.contains('chat_messages')) {
        const chatStore = db.createObjectStore('chat_messages', { keyPath: 'id' });
        chatStore.createIndex('by_society_seq', ['society_id', 'sequence_num']);
      }

      // 4. Offline sync outbox queue
      if (!db.objectStoreNames.contains('sync_outbox')) {
        const outboxStore = db.createObjectStore('sync_outbox', { keyPath: 'id' });
        outboxStore.createIndex('by_created', 'createdAt');
      }

      // 5. Metadata (last sync timestamps, user cache)
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata');
      }
    }
  });
}

// ---------------- Notices Cache & Delta Sync Helpers ----------------
export async function getCachedNotices(societyId) {
  const db = await getOfflineDb();
  const tx = db.transaction('notices', 'readonly');
  const index = tx.store.index('by_society');
  const all = await index.getAll(societyId);
  return all.filter(n => !n.deleted).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function saveNoticesToCache(notices) {
  const db = await getOfflineDb();
  const tx = db.transaction('notices', 'readwrite');
  for (const n of notices) {
    if (n.deleted) {
      await tx.store.delete(n.id);
    } else {
      await tx.store.put(n);
    }
  }
  await tx.done;
}

// ---------------- Meets Cache ----------------
export async function getCachedMeets(societyId) {
  const db = await getOfflineDb();
  const tx = db.transaction('meets', 'readonly');
  const index = tx.store.index('by_society');
  const all = await index.getAll(societyId);
  return all.filter(m => !m.deleted).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
}

export async function saveMeetsToCache(meets) {
  const db = await getOfflineDb();
  const tx = db.transaction('meets', 'readwrite');
  for (const m of meets) {
    await tx.store.put(m);
  }
  await tx.done;
}

// ---------------- Outbox Queue (Offline Operations) ----------------
export async function queueOfflineAction(actionType, endpoint, method, payload) {
  const db = await getOfflineDb();
  const item = {
    id: 'outbox_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    actionType,
    endpoint,
    method,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0
  };
  await db.put('sync_outbox', item);
  return item;
}

export async function getPendingOutbox() {
  const db = await getOfflineDb();
  return db.getAll('sync_outbox');
}

export async function removeOutboxItem(id) {
  const db = await getOfflineDb();
  return db.delete('sync_outbox', id);
}

// ---------------- Metadata (Last Sync Time) ----------------
export async function getLastSyncTime(societyId) {
  const db = await getOfflineDb();
  return db.get('metadata', `sync_notices_${societyId}`);
}

export async function setLastSyncTime(societyId, timestamp) {
  const db = await getOfflineDb();
  return db.put('metadata', timestamp, `sync_notices_${societyId}`);
}
