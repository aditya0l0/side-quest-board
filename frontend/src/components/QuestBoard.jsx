import React, { useState, useEffect, useCallback } from 'react';
import XPCounter from './XPCounter';
import NewQuestForm from './NewQuestForm';
import QuestList from './QuestList';
import { ToastContainer } from './Toast';
import {
  getQuests,
  getXpTotal,
  createQuest,
  updateQuest,
  completeQuest,
  abandonQuest,
} from '../api/questApi';

/**
 * Main Quest Board — fetches today's quests + XP total,
 * orchestrates all CRUD operations, and manages toasts.
 */
export default function QuestBoard() {
  const [quests, setQuests] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── Toasts ──────────────────────────────────────────

  const addToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Data Fetching ───────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [questsData, xpData] = await Promise.all([
        getQuests(),
        getXpTotal(),
      ]);
      setQuests(questsData);
      setTotalXp(xpData.totalXp);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load quest board. Is the backend running on port 8080?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handlers ────────────────────────────────────────

  const handleCreate = async (data) => {
    try {
      setError(null);
      const newQuest = await createQuest(data);
      setQuests((prev) => [newQuest, ...prev]);
      addToast(`📜 New quest posted: "${newQuest.title}"`);
    } catch (err) {
      console.error('Failed to create quest:', err);
      setError(err.response?.data?.message || 'Failed to create quest.');
    }
  };

  const handleComplete = async (id, xpValue) => {
    try {
      setError(null);
      const updated = await completeQuest(id);

      // Update quest in list
      setQuests((prev) =>
        prev.map((q) => (q.id === id ? updated : q))
      );

      // Refresh XP total from server (source of truth)
      const xpData = await getXpTotal();
      setTotalXp(xpData.totalXp);

      addToast(`+${updated.xpValue} XP! Quest complete! 🎉`);
    } catch (err) {
      console.error('Failed to complete quest:', err);
      setError(err.response?.data?.message || 'Failed to complete quest.');
    }
  };

  const handleAbandon = async (id) => {
    try {
      setError(null);
      await abandonQuest(id);

      // Remove from list (abandoned quests hidden from board)
      setQuests((prev) => prev.filter((q) => q.id !== id));
      addToast('💀 Quest abandoned. It fades into the mist...');
    } catch (err) {
      console.error('Failed to abandon quest:', err);
      setError(err.response?.data?.message || 'Failed to abandon quest.');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      setError(null);
      const updated = await updateQuest(id, data);

      setQuests((prev) =>
        prev.map((q) => (q.id === id ? updated : q))
      );

      addToast('✏️ Quest updated successfully!');
    } catch (err) {
      console.error('Failed to update quest:', err);
      setError(err.response?.data?.message || 'Failed to update quest.');
    }
  };

  // ── Today's date formatted ──────────────────────────

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Render ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading__spinner"></div>
          <div className="loading__text">Loading Quest Board...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <XPCounter totalXp={totalXp} />

      <div className="date-display">
        Today's Quests — <span className="date-display__date">{today}</span>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-banner__icon">⚠️</span>
          {error}
        </div>
      )}

      <NewQuestForm onSubmit={handleCreate} />

      <QuestList
        quests={quests}
        onComplete={handleComplete}
        onAbandon={handleAbandon}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
