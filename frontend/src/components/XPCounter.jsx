import React, { useEffect, useRef } from 'react';

/**
 * RPG HUD-style sticky header showing lifetime XP and level.
 * The XP counter pulses on value changes.
 */
export default function XPCounter({ totalXp }) {
  const xpRef = useRef(null);
  const prevXpRef = useRef(totalXp);

  // Pulse animation when XP changes
  useEffect(() => {
    if (totalXp !== prevXpRef.current && xpRef.current) {
      xpRef.current.classList.add('pulse');
      const timer = setTimeout(() => {
        xpRef.current?.classList.remove('pulse');
      }, 600);
      prevXpRef.current = totalXp;
      return () => clearTimeout(timer);
    }
  }, [totalXp]);

  const level = Math.floor(totalXp / 100);

  return (
    <header className="xp-hud">
      <div>
        <div className="xp-hud__app-title">⚔️ The Side-Quest Board</div>
      </div>

      <div className="xp-hud__counter-section">
        {level > 0 && (
          <div className="xp-hud__level">
            LVL {level}
          </div>
        )}
        <div>
          <div className="xp-hud__xp-value" ref={xpRef}>
            {totalXp.toLocaleString()} XP
          </div>
          <div className="xp-hud__xp-label">Lifetime Experience</div>
        </div>
      </div>
    </header>
  );
}
