import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [societies, setSocieties] = useState([]);
  const [activeSociety, setActiveSociety] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check me
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('campus_connect_token');
      if (token) {
        try {
          const data = await apiRequest('/api/auth/me');
          setUser(data.user);
          // Set cached user
          localStorage.setItem('campus_connect_cached_user', JSON.stringify(data.user));
        } catch (err) {
          // If offline, restore cached user
          const cached = localStorage.getItem('campus_connect_cached_user');
          if (cached) {
            setUser(JSON.parse(cached));
          }
        }
      } else {
        // Auto-login with default demo student Alex Sharma for instant experience
        await autoLoginDefaultDemoUser();
      }
      await loadSocieties();
      setLoading(false);
    }

    loadUser();
  }, []);

  async function autoLoginDefaultDemoUser() {
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'alex.cs@college.edu', password: 'campus123' })
      });
      localStorage.setItem('campus_connect_token', res.token);
      localStorage.setItem('campus_connect_cached_user', JSON.stringify(res.user));
      setUser(res.user);
    } catch (e) {
      console.warn('Auto-login notice:', e.message);
    }
  }

  async function loadSocieties() {
    try {
      const data = await apiRequest('/api/societies');
      setSocieties(data.societies || []);
      if (data.societies && data.societies.length > 0 && !activeSociety) {
        setActiveSociety(data.societies[0]);
      }
    } catch (e) {
      // Offline fallback: load cached societies if any
      const cached = localStorage.getItem('campus_connect_cached_societies');
      if (cached) {
        const parsed = JSON.parse(cached);
        setSocieties(parsed);
        if (!activeSociety && parsed.length > 0) setActiveSociety(parsed[0]);
      }
    }
  }

  // Quick switch between demo students (Alex, Priya, Rohan) for paired presentations!
  async function switchDemoUser(email) {
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'campus123' })
      });
      localStorage.setItem('campus_connect_token', res.token);
      localStorage.setItem('campus_connect_cached_user', JSON.stringify(res.user));
      setUser(res.user);
      await loadSocieties();
    } catch (e) {
      alert(`Could not switch user: ${e.message}`);
    }
  }

  const logout = () => {
    localStorage.removeItem('campus_connect_token');
    localStorage.removeItem('campus_connect_cached_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        societies,
        activeSociety,
        setActiveSociety,
        switchDemoUser,
        logout,
        loadSocieties,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
