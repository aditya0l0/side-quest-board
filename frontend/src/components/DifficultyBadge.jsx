import React from 'react';

const XP_MAP = { BRONZE: 10, SILVER: 25, GOLD: 50 };

/**
 * Color-coded difficulty badge showing tier name + XP value.
 */
export default function DifficultyBadge({ difficulty }) {
  const tier = difficulty?.toUpperCase() || 'BRONZE';
  const xp = XP_MAP[tier] || 10;

  return (
    <span className={`difficulty-badge difficulty-badge--${tier.toLowerCase()}`}>
      {tier === 'BRONZE' && '🥉'}
      {tier === 'SILVER' && '🥈'}
      {tier === 'GOLD'   && '🥇'}
      {' '}{tier}
      <span className="difficulty-badge__xp">+{xp} XP</span>
    </span>
  );
}
