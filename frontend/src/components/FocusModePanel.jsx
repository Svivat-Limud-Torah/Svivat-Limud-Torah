// frontend/src/components/FocusModePanel.jsx
import React, { useState } from 'react';
import './FocusModePanel.css';

const pad = (n) => String(n).padStart(2, '0');

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad(m)}:${pad(s)}`;
};

const FocusModePanel = ({
  phase,
  secondsLeft,
  workMinutes,
  breakMinutes,
  setWorkMinutes,
  setBreakMinutes,
  startWork,
  pauseTimer,
  resetTimer,
  exitFocusMode,
  todayStats,
  PHASE_WORK,
  PHASE_BREAK,
  PHASE_IDLE,
  PHASE_PAUSED,
  focusUiPrefs = {},
  setFocusUiPrefs = () => { },
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isWork = phase === PHASE_WORK;
  const isBreak = phase === PHASE_BREAK;
  const isIdle = phase === PHASE_IDLE;
  const isPaused = phase === PHASE_PAUSED;

  // Progress ring
  const totalSeconds = isWork ? workMinutes * 60 : isBreak ? breakMinutes * 60 : workMinutes * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) : 0;
  const circumference = 2 * Math.PI * 54; // r=54
  const dashOffset = circumference * (1 - progress);

  // Collapsed view — show only a compact pill with the timer and a toggle
  if (isCollapsed) {
    return (
      <div className="focus-panel focus-panel--collapsed" onClick={() => setIsCollapsed(false)} title="לחץ לפתוח פאנל מיקוד">
        <span className="focus-panel__collapsed-time">
          {formatTime(secondsLeft)}
        </span>
        <span className="focus-panel__collapsed-arrow">▲</span>
      </div>
    );
  }

  return (
    <div className="focus-panel">
      {/* Collapse button */}
      <button
        className="focus-btn focus-btn--collapse"
        onClick={() => setIsCollapsed(true)}
        title="כווץ פאנל"
      >
        ▼ כווץ
      </button>

      {/* Timer ring */}
      <div className="focus-panel__timer">
        <svg className="focus-panel__ring" viewBox="0 0 120 120">
          <circle className="focus-panel__ring-bg" cx="60" cy="60" r="54" />
          <circle
            className={`focus-panel__ring-progress ${isBreak ? 'focus-panel__ring-progress--break' : ''}`}
            cx="60" cy="60" r="54"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="focus-panel__time">
          <span className="focus-panel__digits">{formatTime(secondsLeft)}</span>
          <span className="focus-panel__phase-label">
            {isPaused ? 'מושהה' : isWork ? 'לימוד' : isBreak ? 'הפסקה' : 'מוכן'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="focus-panel__controls">
        {isIdle && (
          <button className="focus-btn focus-btn--start" onClick={startWork}>▶ התחל</button>
        )}
        {(isWork || isBreak) && (
          <button className="focus-btn focus-btn--stop" onClick={pauseTimer} title="השהה טיימר">השהה</button>
        )}
        {isPaused && (
          <button className="focus-btn focus-btn--start" onClick={startWork} title="המשך טיימר">▶ המשך</button>
        )}
        {!isIdle && (
          <button className="focus-btn focus-btn--reset" onClick={resetTimer} title="אפס טיימר" style={{ padding: '8px 12px', background: 'transparent', color: 'var(--theme-text-secondary)', border: '1px solid var(--theme-border-color)' }}>↺ אפס</button>
        )}
      </div>

      {/* Today's stats */}
      <div className="focus-panel__stats">
        <div className="focus-panel__stat">
          <span className="focus-panel__stat-value">{todayStats.sessions}</span>
          <span className="focus-panel__stat-label">סבבים</span>
        </div>
        <div className="focus-panel__stat-divider" />
        <div className="focus-panel__stat">
          <span className="focus-panel__stat-value">{todayStats.totalMinutes}</span>
          <span className="focus-panel__stat-label">דקות למידה</span>
        </div>
      </div>

      {/* Settings toggle */}
      <button className="focus-btn focus-btn--settings" onClick={() => setShowSettings(s => !s)}>
        {showSettings ? 'סגור הגדרות' : 'הגדרות'}
      </button>

      {showSettings && (
        <div className="focus-panel__settings">
          <div className="focus-panel__settings-section-title">הגדרות טיימר</div>
          <label className="focus-panel__setting">
            <span>לימוד (דקות)</span>
            <input
              type="number" min="1" max="120"
              value={workMinutes}
              onChange={e => setWorkMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
              disabled={!isIdle}
            />
          </label>
          <label className="focus-panel__setting">
            <span>הפסקה (דקות)</span>
            <input
              type="number" min="1" max="30"
              value={breakMinutes}
              onChange={e => setBreakMinutes(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              disabled={!isIdle}
            />
          </label>

          <div className="focus-panel__settings-section-title" style={{ marginTop: '8px' }}>הגדרות תצוגה</div>
          <label className="focus-panel__setting">
            <span>הסתר סרגל כלים עליון</span>
            <input
              type="checkbox"
              checked={!!focusUiPrefs.hideTopbar}
              onChange={e => setFocusUiPrefs({ hideTopbar: e.target.checked })}
            />
          </label>
          <label className="focus-panel__setting">
            <span>הסתר סרגל עריכה</span>
            <input
              type="checkbox"
              checked={!!focusUiPrefs.hideEditorToolbar}
              onChange={e => setFocusUiPrefs({ hideEditorToolbar: e.target.checked })}
            />
          </label>
          <label className="focus-panel__setting">
            <span>הסתר סרגל קבצים</span>
            <input
              type="checkbox"
              checked={!!focusUiPrefs.hideSidebar}
              onChange={e => setFocusUiPrefs({ hideSidebar: e.target.checked })}
            />
          </label>
        </div>
      )}

      {/* Exit button */}
      <button className="focus-btn focus-btn--exit" onClick={exitFocusMode}>
        ✕ צא ממצב מיקוד
      </button>
    </div>
  );
};

export default FocusModePanel;
