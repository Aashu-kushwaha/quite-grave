import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { VALID_REASON_TAGS } from '../data/mockData';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const GravequitContext = createContext(null);

export const GravequitProvider = ({ children }) => {
  // ─── Auth State ──────────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('gravequit_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gravequit_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
  const [activeQuitItem, setActiveQuitItem] = useState(null);

  const [patternData, setPatternData] = useState(null);
  
  const [settings, setSettings] = useState({
    userEmail: user?.email || '',
    weeklyDigest: user?.email_opt_in ?? true,
    reminderNudges: user?.reminder_opt_in ?? false,
    anonymizedAdvisorOptIn: true
  });

  // Auth Header helper
  const getAuthHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // ─── Load items from real API ────────────────────────────────────
  const fetchPatternsSummary = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/patterns/summary`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setPatternData(data);
      }
    } catch (err) {
      console.error('Failed to load patterns summary:', err);
    }
  }, [token, getAuthHeaders]);

  const fetchItems = useCallback(async () => {
    if (!token) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/items`, {
        headers: getAuthHeaders()
      });
      if (res.status === 401) {
        // Token expired or invalid
        logout();
        return;
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      
      // Helper for DD-MM-YYYY formatting
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}-${month}-${year}`;
      };

      // Normalize API fields
      const normalized = data.map((item) => {
        let riskScore = 20;
        let riskReason = 'Calculated from history';
        if (item.status === 'active' && item.risk_percentage !== undefined && item.risk_percentage !== null) {
          riskScore = Math.round(item.risk_percentage);
          riskReason = item.driving_factor || riskReason;
        }
        return {
          ...item,
          id: String(item.id),
          started_at: formatDate(item.started_at),
          ended_at: formatDate(item.ended_at),
          riskScore,
          riskBadge: riskScore > 60 ? 'High Risk' : riskScore > 30 ? 'Moderate Risk' : 'Low Risk',
          riskReason,
          reason_tag: item.quit_reason?.reason_tag ?? null,
          reason_text: item.quit_reason?.reason_text ?? null,
          voice_transcript: item.quit_reason?.voice_transcript ?? null,
          durationDays: item.started_at && item.ended_at
            ? Math.max(1, Math.ceil((new Date(item.ended_at) - new Date(item.started_at)) / (1000 * 60 * 60 * 24)))
            : null,
        };
      });
      setItems(normalized);
      setApiError(null);
    } catch (err) {
      console.error('Failed to load items from API:', err);
      setApiError('Could not connect to the backend.');
    } finally {
      setIsLoading(false);
    }
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (token) {
      fetchItems();
      fetchPatternsSummary();
    }
  }, [token, fetchItems, fetchPatternsSummary]);

  // ─── Authentication Handlers ─────────────────────────────────────
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed. Please check your credentials.');
      }
      
      localStorage.setItem('gravequit_token', data.access_token);
      localStorage.setItem('gravequit_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      setSettings(prev => ({
        ...prev,
        userEmail: data.user.email,
        weeklyDigest: data.user.email_opt_in ?? true,
        reminderNudges: data.user.reminder_opt_in ?? false,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationCode = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send verification code.');
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, code) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Signup failed.');
      }
      
      localStorage.setItem('gravequit_token', data.access_token);
      localStorage.setItem('gravequit_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      setSettings(prev => ({
        ...prev,
        userEmail: data.user.email,
        weeklyDigest: data.user.email_opt_in ?? true,
        reminderNudges: data.user.reminder_opt_in ?? false,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Google sign-in failed.');
      }

      localStorage.setItem('gravequit_token', data.access_token);
      localStorage.setItem('gravequit_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      setSettings(prev => ({
        ...prev,
        userEmail: data.user.email,
        weeklyDigest: data.user.email_opt_in ?? true,
        reminderNudges: data.user.reminder_opt_in ?? false,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gravequit_token');
    localStorage.removeItem('gravequit_user');
    setToken(null);
    setUser(null);
    setItems([]);
    setPatternData(null);
  };

  // ─── Calculate pattern stats from real items ──────────────────────
  const patternStats = useMemo(() => {
    const quitItems = items.filter(i => i.status === 'quit');
    const totalQuitEvents = quitItems.length;

    const activeItems = items.filter(i => i.status === 'active');
    const completedItems = items.filter(i => i.status === 'completed');
    
    let baseMomentum = 50;
    baseMomentum += activeItems.length * 5;
    baseMomentum += completedItems.length * 15;
    
    quitItems.forEach(i => {
      const days = i.durationDays || 1;
      if (days < 7) baseMomentum -= 5;
      else if (days <= 14) baseMomentum -= 2;
    });
    
    const calculatedMomentum = Math.max(10, Math.min(100, Math.round(baseMomentum)));

    if (totalQuitEvents === 0) {
      return {
        id: patternData?.id,
        averageDaysToQuit: 0,
        totalQuitEvents: 0,
        momentumScore: calculatedMomentum,
        aiSummaryText: patternData?.ai_summary ?? "You haven't paused or let go of any items yet. As you observe your journeys, gentle pattern insights will form here.",
        tagBreakdown: VALID_REASON_TAGS.map(tag => ({ tag, count: 0, percentage: 0 })),
        clusters: patternData?.clusters,
        similar_entries: patternData?.similar_entries,
        risk_explanation: patternData?.risk_explanation
      };
    }

    const totalDays = quitItems.reduce((acc, curr) => acc + (curr.durationDays || 14), 0);
    const averageDaysToQuit = Math.round(totalDays / totalQuitEvents);

    const counts = {};
    VALID_REASON_TAGS.forEach(tag => { counts[tag] = 0; });
    quitItems.forEach(i => {
      if (i.reason_tag && VALID_REASON_TAGS.includes(i.reason_tag)) {
        counts[i.reason_tag] += 1;
      } else {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });

    const tagBreakdown = VALID_REASON_TAGS.map(tag => ({
      tag,
      count: counts[tag] || 0,
      percentage: Math.round(((counts[tag] || 0) / totalQuitEvents) * 100)
    }));

    const topTagObj = [...tagBreakdown].sort((a, b) => b.count - a.count)[0];
    const topTag = topTagObj ? topTagObj.tag : 'No Deadline';

    const aiSummaryText = patternData?.ai_summary
      ?? `Across your ${totalQuitEvents} past observations, your primary closure driver is '${topTag}'. Average commitment duration is ${averageDaysToQuit} days before pausing.`;

    return {
      id: patternData?.id,
      averageDaysToQuit,
      totalQuitEvents,
      momentumScore: calculatedMomentum,
      aiSummaryText,
      tagBreakdown,
      clusters: patternData?.clusters,
      similar_entries: patternData?.similar_entries,
      risk_explanation: patternData?.risk_explanation
    };
  }, [items, patternData]);

  // ─── Add item via real API ────────────────────────────────────────
  const addItem = async (itemData) => {
    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: itemData.title,
          category: itemData.category || 'Skill',
          note: itemData.note || null
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setIsAddItemModalOpen(false);
      await fetchItems();
      await fetchPatternsSummary();
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('Could not save item. Please ensure you are signed in.');
    }
  };

  // ─── Delete item via real API ─────────────────────────────────────
  const deleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      await fetchItems();
      await fetchPatternsSummary();
      return true;
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Could not delete item.');
      return false;
    }
  };

  // ─── Quit modal helpers ───────────────────────────────────────────
  const openQuitModal = (item) => {
    setActiveQuitItem(item);
    setIsQuitModalOpen(true);
  };

  const closeQuitModal = () => {
    setActiveQuitItem(null);
    setIsQuitModalOpen(false);
  };

  // ─── Submit quit event via real API ──────────────────────────────
  const submitQuitEvent = async ({ itemId, reason_tag, reason_text, voice_transcript, ended_at }) => {
    const validTag = VALID_REASON_TAGS.includes(reason_tag) ? reason_tag : 'Other';
    try {
      const res = await fetch(`${API_BASE}/items/${itemId}/quit`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reason_tag: validTag,
          reason_text: reason_text || '',
          voice_transcript: voice_transcript || null,
          ended_at: ended_at || null
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      closeQuitModal();
      await fetchItems();
      await fetchPatternsSummary();
    } catch (err) {
      console.error('Failed to submit quit event:', err);
      alert('Could not record quit. Please check your connection.');
    }
  };

  // ─── Submit AI Summary Feedback (Thumbs Up / Down) ───────────────
  const submitSummaryFeedback = async (rating, feedbackText = '') => {
    try {
      const res = await fetch(`${API_BASE}/patterns/feedback`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          summary_id: patternStats.id || null,
          rating,
          feedback_text: feedbackText
        })
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return { success: true, message: data.message };
    } catch (err) {
      console.error('Failed to submit AI feedback:', err);
      return { success: false, error: err.message };
    }
  };

  // ─── Recommit (Easier Version) ───────────────────────────────────
  const recommitItem = async (itemId) => {
    const sourceItem = items.find(i => i.id === itemId);
    if (!sourceItem) return false;
    
    const newTitle = `${sourceItem.title} (Modular 15-min Version)`;
    
    // Check for duplicates
    const alreadyExists = items.some(i => i.title === newTitle && i.status === 'active');
    if (alreadyExists) {
      alert("You have already recommitted this item.");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newTitle,
          category: sourceItem.category,
          note: `Re-committed as an easier version of '${sourceItem.title}'.`
        }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      
      // Delete the old item to remove it from past observations
      await deleteItem(itemId);
      
      await fetchItems();
      return true;
    } catch (err) {
      console.error('Failed to recommit item:', err);
      return false;
    }
  };

  // ─── Settings and Account Management ─────────────────────────────
  const updateSettings = async (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    try {
      await fetch(`${API_BASE}/auth/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email_opt_in: newSettings.weeklyDigest,
          reminder_opt_in: newSettings.reminderNudges
        })
      });
    } catch (e) {
      console.error("Error updating settings:", e);
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to delete account");
      logout();
      alert('Account and all observation data removed permanently.');
      return true;
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('Could not delete account. Please try again.');
      return false;
    }
  };

  return (
    <GravequitContext.Provider value={{
      token,
      user,
      isAuthenticated: !!token,
      login,
      signup,
      sendVerificationCode,
      loginWithGoogle,
      logout,
      items,
      isLoading,
      apiError,
      patternStats,
      settings,
      setSettings: updateSettings,
      isAddItemModalOpen,
      setIsAddItemModalOpen,
      isQuitModalOpen,
      activeQuitItem,
      openQuitModal,
      closeQuitModal,
      addItem,
      deleteItem,
      submitQuitEvent,
      submitSummaryFeedback,
      recommitItem,
      deleteAccount,
      refreshItems: fetchItems,
      refreshPatterns: fetchPatternsSummary,
      apiBase: API_BASE,
      getAuthHeaders
    }}>
      {children}
    </GravequitContext.Provider>
  );
};

export const useGravequit = () => {
  const ctx = useContext(GravequitContext);
  if (!ctx) throw new Error('useGravequit must be used within a GravequitProvider');
  return ctx;
};
