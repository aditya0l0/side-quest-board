import React, { useState, useEffect } from 'react';

/**
 * Floating toast notification for XP earned on quest completion.
 * Auto-dismisses after 2.5s.
 */
export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast">
      ⚡ {message}
    </div>
  );
}

/**
 * Container that manages a stack of toast notifications.
 */
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
