// Network Modes: 'ONLINE' | 'FLAKY_2G' | 'OFFLINE'
let currentNetworkMode = 'ONLINE';
const listeners = new Set();

export function setNetworkMode(mode) {
  currentNetworkMode = mode;
  listeners.forEach(fn => fn(mode));
}

export function getNetworkMode() {
  return currentNetworkMode;
}

export function subscribeNetworkMode(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Custom fetch wrapper that enforces network condition simulations
 */
export async function apiRequest(endpoint, options = {}) {
  // If simulated offline (Airplane mode) or browser is navigator.onLine === false
  if (currentNetworkMode === 'OFFLINE' || (!navigator.onLine && currentNetworkMode === 'ONLINE')) {
    const error = new Error('NETWORK_OFFLINE: Device is currently offline or in Airplane Mode.');
    error.isOffline = true;
    throw error;
  }

  // If Flaky 2G mode: simulate high latency (800ms - 1500ms)
  if (currentNetworkMode === 'FLAKY_2G') {
    const delay = Math.floor(Math.random() * 700) + 800;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 10% packet drop rate
    if (Math.random() < 0.10) {
      const dropError = new Error('NETWORK_TIMEOUT: Request timed out due to high 2G packet loss.');
      dropError.isFlakyDrop = true;
      throw dropError;
    }
  }

  const token = localStorage.getItem('campus_connect_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
