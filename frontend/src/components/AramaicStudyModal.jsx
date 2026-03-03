// frontend/src/components/AramaicStudyModal.jsx
import React, { useState } from 'react';
import './AramaicStudyModal.css';

const DIFFICULTIES = [
  { key: 'beginner', label: 'מתחיל', icon: '', desc: 'מילים בסיסיות ונפוצות' },
  { key: 'intermediate', label: 'בינוני', icon: '', desc: 'מילים שכיחות עם משמעויות מרובות' },
  { key: 'advanced', label: 'מתקדם', icon: '', desc: 'מילים נדירות וביטויים מורכבים' },
];

const AramaicStudyModal = ({
  isOpen,
  onClose,
  difficulty,
  words,
  isLoading,
  error,
  viewMode,
  setViewMode,
  onSelectDifficulty,
  onGenerateMore,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen) return null;

  const handleSelectDifficulty = (key) => {
    setCurrentIndex(0);
    setIsFlipped(false);
    onSelectDifficulty(key);
  };

  const handlePrev = () => {
    setCurrentIndex(i => Math.max(0, i - 1));
    setIsFlipped(false);
  };

  const handleNext = () => {
    setCurrentIndex(i => Math.min(words.length - 1, i + 1));
    setIsFlipped(false);
  };

  const handleGenerateMore = () => {
    setIsFlipped(false);
    onGenerateMore();
  };

  const handleBackToDifficulty = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    onClose();
  };

  // Phase 1: Difficulty selection
  const showDifficultySelection = !difficulty && !isLoading;
  // Phase 2/3: Words loaded
  const showContent = words.length > 0 && !isLoading;

  const currentWord = words[currentIndex];

  return (
    <div className="aramaic-modal-overlay" onClick={handleBackToDifficulty}>
      <div className="aramaic-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="aramaic-modal__header">
          <h2>לימוד ארמית</h2>
          <button className="aramaic-modal__close" onClick={handleBackToDifficulty}>✕</button>
        </div>

        {/* Body */}
        <div className="aramaic-modal__body">
          {/* Difficulty Selection */}
          {showDifficultySelection && (
            <div className="aramaic-difficulty">
              <p className="aramaic-difficulty__title">בחר רמת קושי:</p>
              <div className="aramaic-difficulty__cards">
                {DIFFICULTIES.map(d => (
                  <div
                    key={d.key}
                    className="aramaic-difficulty__card"
                    onClick={() => handleSelectDifficulty(d.key)}
                  >
                    <div className="aramaic-difficulty__card-icon">{d.icon}</div>
                    <div className="aramaic-difficulty__card-label">{d.label}</div>
                    <div className="aramaic-difficulty__card-desc">{d.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="aramaic-loading">
              <div className="aramaic-loading__spinner" />
              <span>מייצר מילים בארמית...</span>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="aramaic-error">
              <p>שגיאה: {error}</p>
              {difficulty && (
                <button className="aramaic-btn" onClick={() => onSelectDifficulty(difficulty)}>
                  נסה שוב
                </button>
              )}
            </div>
          )}

          {/* Content: cards or list */}
          {showContent && (
            <>
              {/* Controls */}
              <div className="aramaic-controls">
                <div className="aramaic-controls__toggle">
                  <button
                    className={`aramaic-controls__toggle-btn ${viewMode === 'cards' ? 'aramaic-controls__toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('cards')}
                  >
                    כרטיסיות
                  </button>
                  <button
                    className={`aramaic-controls__toggle-btn ${viewMode === 'list' ? 'aramaic-controls__toggle-btn--active' : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    רשימה
                  </button>
                </div>
                <div className="aramaic-controls__actions">
                  <button className="aramaic-btn" onClick={handleGenerateMore} disabled={isLoading}>
                    ייצר עוד 10
                  </button>
                </div>
              </div>

              {/* Cards View */}
              {viewMode === 'cards' && currentWord && (
                <div className="aramaic-flashcard-area">
                  <div
                    className={`aramaic-flashcard ${isFlipped ? 'aramaic-flashcard--flipped' : ''}`}
                    onClick={() => setIsFlipped(f => !f)}
                  >
                    <div className="aramaic-flashcard__inner">
                      <div className="aramaic-flashcard__face">
                        <span className="aramaic-flashcard__label">מילה בארמית</span>
                        <div className="aramaic-flashcard__word">{currentWord.aramaic}</div>
                        <span className="aramaic-flashcard__hint">לחץ לגלות תרגום</span>
                      </div>
                      <div className="aramaic-flashcard__face aramaic-flashcard__back">
                        <span className="aramaic-flashcard__label">תרגום</span>
                        <div className="aramaic-flashcard__translation">{currentWord.translation}</div>
                        <div className="aramaic-flashcard__explanation">{currentWord.explanation}</div>
                      </div>
                    </div>
                  </div>

                  <div className="aramaic-flashcard-nav">
                    <button onClick={handlePrev} disabled={currentIndex === 0}>→ הקודם</button>
                    <span className="aramaic-flashcard-counter">{currentIndex + 1} / {words.length}</span>
                    <button onClick={handleNext} disabled={currentIndex === words.length - 1}>הבא ←</button>
                  </div>
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="aramaic-list">
                  {words.map((w, i) => (
                    <div key={i} className="aramaic-list__item">
                      <span className="aramaic-list__num">{i + 1}</span>
                      <div className="aramaic-list__content">
                        <div className="aramaic-list__word">{w.aramaic}</div>
                        <div className="aramaic-list__translation">{w.translation}</div>
                        <div className="aramaic-list__explanation">{w.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {showContent && (
          <div className="aramaic-modal__footer">
            <span className="aramaic-modal__word-count">
              סה״כ {words.length} מילים
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AramaicStudyModal;
