import React, { useState } from 'react';

const TIERS = [
  { value: 'BRONZE', label: 'Bronze', xp: 10 },
  { value: 'SILVER', label: 'Silver', xp: 25 },
  { value: 'GOLD',   label: 'Gold',   xp: 50 },
];

/**
 * Form for creating a new quest with title, description, and difficulty selector.
 */
export default function NewQuestForm({ onSubmit, disabled }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('BRONZE');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || null, difficulty });
      setTitle('');
      setDescription('');
      setDifficulty('BRONZE');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTier = TIERS.find(t => t.value === difficulty);

  return (
    <form className="quest-form" onSubmit={handleSubmit}>
      <div className="quest-form__header">
        📜 Accept New Quest
      </div>

      <div className="quest-form__row">
        <label className="quest-form__label" htmlFor="quest-title">Quest Title</label>
        <input
          id="quest-title"
          className="quest-form__input"
          type="text"
          placeholder="e.g. Read 5 pages of a system design book"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          disabled={disabled}
        />
      </div>

      <div className="quest-form__row">
        <label className="quest-form__label" htmlFor="quest-description">Description (optional)</label>
        <textarea
          id="quest-description"
          className="quest-form__textarea"
          placeholder="Add extra details or scope notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="quest-form__row">
        <label className="quest-form__label">Difficulty Tier</label>
        <div className="difficulty-selector">
          {TIERS.map((tier) => (
            <button
              key={tier.value}
              type="button"
              className={`difficulty-selector__btn difficulty-selector__btn--${tier.value.toLowerCase()} ${difficulty === tier.value ? 'active' : ''}`}
              onClick={() => setDifficulty(tier.value)}
              disabled={disabled}
            >
              {tier.value === 'BRONZE' && '🥉 '}
              {tier.value === 'SILVER' && '🥈 '}
              {tier.value === 'GOLD'   && '🥇 '}
              {tier.label}
              <span className="difficulty-selector__xp">+{tier.xp} XP</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="quest-form__submit"
        disabled={!title.trim() || submitting || disabled}
      >
        {submitting ? '⏳ Posting Quest...' : `⚔️ Post Quest (+${selectedTier?.xp} XP)`}
      </button>
    </form>
  );
}
