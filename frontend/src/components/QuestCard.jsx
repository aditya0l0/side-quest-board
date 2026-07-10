import React, { useState } from 'react';
import DifficultyBadge from './DifficultyBadge';

const TIERS = [
  { value: 'BRONZE', label: 'Bronze', xp: 10 },
  { value: 'SILVER', label: 'Silver', xp: 25 },
  { value: 'GOLD',   label: 'Gold',   xp: 50 },
];

/**
 * A single quest card with action buttons and inline edit support.
 */
export default function QuestCard({ quest, onComplete, onAbandon, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(quest.title);
  const [editDescription, setEditDescription] = useState(quest.description || '');
  const [editDifficulty, setEditDifficulty] = useState(quest.difficulty);
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCompleted = quest.status === 'COMPLETED';
  const isActive = quest.status === 'ACTIVE';

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(quest.id, quest.xpValue);
    } finally {
      // Keep completing true for animation duration
      setTimeout(() => setCompleting(false), 600);
    }
  };

  const handleAbandon = () => {
    if (window.confirm(`⚠️ Abandon quest "${quest.title}"?\n\nThis quest will be removed from your board and won't count toward XP.`)) {
      onAbandon(quest.id);
    }
  };

  const handleStartEdit = () => {
    setEditTitle(quest.title);
    setEditDescription(quest.description || '');
    setEditDifficulty(quest.difficulty);
    setEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || saving) return;
    setSaving(true);
    try {
      await onUpdate(quest.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        difficulty: editDifficulty,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditTitle(quest.title);
    setEditDescription(quest.description || '');
    setEditDifficulty(quest.difficulty);
  };

  const tierClass = quest.difficulty?.toLowerCase() || 'bronze';

  return (
    <div
      className={`quest-card quest-card--${tierClass} ${isCompleted ? 'quest-card--completed' : ''} ${completing ? 'quest-card--completing' : ''}`}
      style={{ animationDelay: `${Math.random() * 0.15}s` }}
    >
      {editing ? (
        /* ── Inline Edit Form ────────────────────────── */
        <form className="edit-form" onSubmit={handleSaveEdit}>
          <div className="quest-form__row">
            <label className="quest-form__label" htmlFor={`edit-title-${quest.id}`}>Title</label>
            <input
              id={`edit-title-${quest.id}`}
              className="quest-form__input"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="quest-form__row">
            <label className="quest-form__label" htmlFor={`edit-desc-${quest.id}`}>Description</label>
            <textarea
              id={`edit-desc-${quest.id}`}
              className="quest-form__textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          <div className="quest-form__row">
            <label className="quest-form__label">Difficulty</label>
            <div className="difficulty-selector">
              {TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  className={`difficulty-selector__btn difficulty-selector__btn--${tier.value.toLowerCase()} ${editDifficulty === tier.value ? 'active' : ''}`}
                  onClick={() => setEditDifficulty(tier.value)}
                >
                  {tier.label}
                  <span className="difficulty-selector__xp">+{tier.xp} XP</span>
                </button>
              ))}
            </div>
          </div>

          <div className="edit-form__actions">
            <button type="submit" className="btn btn--save" disabled={!editTitle.trim() || saving}>
              {saving ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
            <button type="button" className="btn btn--cancel" onClick={handleCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* ── Display Mode ────────────────────────────── */
        <>
          <div className="quest-card__header">
            <h3 className="quest-card__title">
              {isCompleted && '✅ '}
              {quest.title}
            </h3>
            <DifficultyBadge difficulty={quest.difficulty} />
          </div>

          {quest.description && (
            <p className="quest-card__description">{quest.description}</p>
          )}

          <div className="quest-card__footer">
            {isCompleted ? (
              <span className="completed-stamp">
                ✨ Quest Complete — {quest.xpValue} XP Claimed
              </span>
            ) : (
              <div className="quest-card__actions">
                {isActive && (
                  <>
                    <button
                      className="btn btn--complete"
                      onClick={handleComplete}
                      disabled={completing}
                    >
                      {completing ? '⚡ Claiming...' : `⚡ Claim ${quest.xpValue} XP`}
                    </button>
                    <button className="btn btn--edit" onClick={handleStartEdit}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn--abandon" onClick={handleAbandon}>
                      💀 Abandon
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
