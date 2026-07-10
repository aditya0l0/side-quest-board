import React from 'react';
import QuestCard from './QuestCard';

/**
 * Renders quests separated into Active and Completed sections.
 */
export default function QuestList({ quests, onComplete, onAbandon, onUpdate }) {
  const activeQuests = quests.filter(q => q.status === 'ACTIVE');
  const completedQuests = quests.filter(q => q.status === 'COMPLETED');

  return (
    <div className="quest-list">
      {/* ── Active Quests ────────────────────────────── */}
      <div className="section-header">
        <span className="section-header__icon">⚔️</span>
        <h2 className="section-header__title">Active Quests</h2>
        <span className="section-header__count">{activeQuests.length}</span>
      </div>

      {activeQuests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🏰</div>
          <p className="empty-state__text">
            No active quests. Post a new quest above to begin your adventure!
          </p>
        </div>
      ) : (
        activeQuests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            onComplete={onComplete}
            onAbandon={onAbandon}
            onUpdate={onUpdate}
          />
        ))
      )}

      {/* ── Divider ──────────────────────────────────── */}
      {completedQuests.length > 0 && <hr className="quest-list__divider" />}

      {/* ── Completed Quests ─────────────────────────── */}
      {completedQuests.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-header__icon">🏆</span>
            <h2 className="section-header__title">Completed Quests</h2>
            <span className="section-header__count">{completedQuests.length}</span>
          </div>

          {completedQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onComplete={onComplete}
              onAbandon={onAbandon}
              onUpdate={onUpdate}
            />
          ))}
        </>
      )}
    </div>
  );
}
