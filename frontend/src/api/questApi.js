import axios from 'axios';

const api = axios.create({
  // Relative URL — works in both dev (Vite dev server) and production (Nginx proxy).
  // DO NOT use 'http://localhost:8080/api' — in production, the browser resolves
  // localhost to the visitor's own machine, not the EC2 server.
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch quests for a given date (defaults to today on the server).
 * @param {string|null} date — ISO date string YYYY-MM-DD, or null for today
 */
export const getQuests = async (date = null) => {
  const params = date ? { date } : {};
  const response = await api.get('/quests', { params });
  return response.data;
};

/**
 * Fetch lifetime total XP across all completed quests.
 */
export const getXpTotal = async () => {
  const response = await api.get('/quests/xp-total');
  return response.data;
};

/**
 * Create a new quest.
 * @param {{ title: string, description?: string, difficulty: string }} data
 */
export const createQuest = async (data) => {
  const response = await api.post('/quests', data);
  return response.data;
};

/**
 * Update an existing active quest.
 * @param {number} id
 * @param {{ title: string, description?: string, difficulty: string }} data
 */
export const updateQuest = async (id, data) => {
  const response = await api.put(`/quests/${id}`, data);
  return response.data;
};

/**
 * Mark a quest as completed and claim XP.
 * @param {number} id
 */
export const completeQuest = async (id) => {
  const response = await api.patch(`/quests/${id}/complete`);
  return response.data;
};

/**
 * Abandon a quest (soft delete).
 * @param {number} id
 */
export const abandonQuest = async (id) => {
  const response = await api.patch(`/quests/${id}/abandon`);
  return response.data;
};
