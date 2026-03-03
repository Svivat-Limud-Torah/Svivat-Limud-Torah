// frontend/src/hooks/useFocusMode.js
import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'torah-ide-focus-stats';
const FOCUS_UI_PREFS_KEY = 'torah-ide-focus-ui-prefs';
const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

const DEFAULT_FOCUS_UI_PREFS = {
  hideTopbar: true,
  hideEditorToolbar: true,
  hideSidebar: true,
};

// ── Timer phases ──
const PHASE_WORK = 'work';
const PHASE_BREAK = 'break';
const PHASE_IDLE = 'idle';
const PHASE_PAUSED = 'paused';

function loadTodayStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: 0, totalMinutes: 0, date: new Date().toDateString() };
    const parsed = JSON.parse(raw);
    if (parsed.date !== new Date().toDateString()) {
      return { sessions: 0, totalMinutes: 0, date: new Date().toDateString() };
    }
    return parsed;
  } catch { return { sessions: 0, totalMinutes: 0, date: new Date().toDateString() }; }
}

function saveTodayStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stats, date: new Date().toDateString() }));
}

export default function useFocusMode() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [phase, setPhase] = useState(PHASE_IDLE);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WORK_MINUTES * 60);
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);
  const [todayStats, setTodayStats] = useState(loadTodayStats);
  const intervalRef = useRef(null);
  const sessionStartRef = useRef(null);

  const [focusUiPrefs, setFocusUiPrefsState] = useState(() => {
    try {
      const saved = localStorage.getItem(FOCUS_UI_PREFS_KEY);
      return saved ? { ...DEFAULT_FOCUS_UI_PREFS, ...JSON.parse(saved) } : DEFAULT_FOCUS_UI_PREFS;
    } catch { return DEFAULT_FOCUS_UI_PREFS; }
  });

  const setFocusUiPrefs = useCallback((updater) => {
    setFocusUiPrefsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      localStorage.setItem(FOCUS_UI_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Tick
  useEffect(() => {
    if (phase === PHASE_IDLE || phase === PHASE_PAUSED) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (phase === PHASE_WORK) {
            // Work session finished — record stats, switch to break
            const elapsed = workMinutes;
            setTodayStats(prev => {
              const updated = {
                ...prev,
                sessions: prev.sessions + 1,
                totalMinutes: prev.totalMinutes + elapsed,
              };
              saveTodayStats(updated);
              return updated;
            });
            setPhase(PHASE_BREAK);
            return breakMinutes * 60;
          } else {
            // Break finished — back to idle
            setPhase(PHASE_IDLE);
            return workMinutes * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [phase, workMinutes, breakMinutes]);

  const startWork = useCallback(() => {
    if (phase !== PHASE_PAUSED) {
      setSecondsLeft(workMinutes * 60);
    }
    setPhase(PHASE_WORK);
    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }
  }, [workMinutes, phase]);

  const startBreak = useCallback(() => {
    if (phase !== PHASE_PAUSED) {
      setSecondsLeft(breakMinutes * 60);
    }
    setPhase(PHASE_BREAK);
  }, [breakMinutes, phase]);

  const pauseTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    setPhase(PHASE_PAUSED);
  }, []);

  const resetTimer = useCallback(() => {
    // If mid-work session, record partial minutes
    if ((phase === PHASE_WORK || phase === PHASE_PAUSED) && sessionStartRef.current) {
      const elapsedMin = Math.round((Date.now() - sessionStartRef.current) / 60000);
      if (elapsedMin > 0) {
        setTodayStats(prev => {
          const updated = { ...prev, totalMinutes: prev.totalMinutes + elapsedMin };
          saveTodayStats(updated);
          return updated;
        });
      }
    }
    clearInterval(intervalRef.current);
    setPhase(PHASE_IDLE);
    setSecondsLeft(workMinutes * 60);
    sessionStartRef.current = null;
  }, [phase, workMinutes]);

  const enterFocusMode = useCallback(() => {
    setIsFocusMode(true);
    startWork();
  }, [startWork]);

  const exitFocusMode = useCallback(() => {
    resetTimer();
    setIsFocusMode(false);
  }, [resetTimer]);

  return {
    isFocusMode,
    enterFocusMode,
    exitFocusMode,
    phase,
    secondsLeft,
    workMinutes,
    breakMinutes,
    setWorkMinutes,
    setBreakMinutes,
    startWork,
    startBreak,
    pauseTimer,
    resetTimer,
    todayStats,
    focusUiPrefs,
    setFocusUiPrefs,
    PHASE_WORK,
    PHASE_BREAK,
    PHASE_IDLE,
    PHASE_PAUSED,
  };
}
