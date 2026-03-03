// frontend/src/components/FlashcardView.jsx
import React, { useState, useCallback, useMemo } from 'react';
import './FlashcardView.css';

// ─── Modes ───
const MODE_BROWSE = 'browse';   // Browse all cards, flip one-by-one
const MODE_TEST = 'test';       // Quiz: question → reveal → rate

// ─── Anki-style single-card display (shared between modes) ───
const SingleCard = ({ question, answer, isRevealed, onReveal }) => (
  <div className={`fc-card ${isRevealed ? 'fc-card--revealed' : ''}`} onClick={!isRevealed ? onReveal : undefined}>
    <div className="fc-card__inner">
      <div className="fc-card__face fc-card__front">
        <span className="fc-card__label">שאלה</span>
        <p className="fc-card__text">{question}</p>
        {!isRevealed && <span className="fc-card__hint">לחץ לגלות תשובה</span>}
      </div>
      <div className="fc-card__face fc-card__back">
        <span className="fc-card__label">תשובה</span>
        <p className="fc-card__text">{answer}</p>
      </div>
    </div>
  </div>
);

// ─── Progress bar ───
const ProgressBar = ({ current, total }) => (
  <div className="fc-progress">
    <div className="fc-progress__bar" style={{ width: `${((current + 1) / total) * 100}%` }} />
    <span className="fc-progress__text">{current + 1} / {total}</span>
  </div>
);

// ─── Export helper — generates a plain-text file (tab-separated) Anki can import ───
const exportToAnkiTxt = (cards) => {
  const rows = cards.map(c =>
    `${c.question.replace(/\t/g, ' ').replace(/\n/g, '<br>')}\t${c.answer.replace(/\t/g, ' ').replace(/\n/g, '<br>')}`
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards-anki.txt';
  a.click();
  URL.revokeObjectURL(url);
};

// ═════════════════════════════════════════════════════════════
// FlashcardView — Main component
// ═════════════════════════════════════════════════════════════
const FlashcardView = ({ cards, onClose, onRetry, error, isLoading, addRepetition }) => {
  const [mode, setMode] = useState(MODE_BROWSE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Test-mode tracking
  const [knewCards, setKnewCards] = useState([]);      // indices the user got right
  const [missedCards, setMissedCards] = useState([]);   // indices the user got wrong
  const [testFinished, setTestFinished] = useState(false);

  // Review-missed round
  const [reviewQueue, setReviewQueue] = useState(null); // null = not in review

  // The effective deck: either full cards or review queue
  const deck = useMemo(() => {
    if (reviewQueue) return reviewQueue;
    return cards || [];
  }, [cards, reviewQueue]);

  // ─── Navigation ───
  const goNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsRevealed(false);
    }
  }, [currentIndex, deck.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setIsRevealed(false);
    }
  }, [currentIndex]);

  // ─── Test rating ───
  const rateCard = useCallback((knew) => {
    const cardIdx = reviewQueue ? reviewQueue[currentIndex]._originalIdx : currentIndex;

    if (knew) {
      setKnewCards(prev => [...prev, cardIdx]);
    } else {
      setMissedCards(prev => [...prev, cardIdx]);
    }

    if (currentIndex < deck.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsRevealed(false);
    } else {
      setTestFinished(true);
    }
  }, [currentIndex, deck.length, reviewQueue]);

  // ─── Review missed cards ───
  const startReviewMissed = useCallback(() => {
    const missed = missedCards.map(idx => ({ ...cards[idx], _originalIdx: idx }));
    setReviewQueue(missed);
    setCurrentIndex(0);
    setIsRevealed(false);
    setTestFinished(false);
    setKnewCards([]);
    setMissedCards([]);
  }, [missedCards, cards]);

  // ─── Save missed to repetitions ───
  const saveMissedToRepetitions = useCallback(async () => {
    if (!addRepetition || missedCards.length === 0) return;
    for (const idx of missedCards) {
      const card = cards[idx];
      await addRepetition({
        name: card.question.slice(0, 100),
        content: `שאלה: ${card.question}\n\nתשובה: ${card.answer}`,
      });
    }
  }, [addRepetition, missedCards, cards]);

  // ─── Mode switch ───
  const switchMode = useCallback((newMode) => {
    setMode(newMode);
    setCurrentIndex(0);
    setIsRevealed(false);
    setKnewCards([]);
    setMissedCards([]);
    setTestFinished(false);
    setReviewQueue(null);
  }, []);

  // ─── Loading / Error / Empty states ───
  if (isLoading) return <div className="fc-status">טוען כרטיסיות...</div>;

  if (error) {
    return (
      <div className="fc-status">
        <p>שגיאה ביצירת כרטיסיות: {error}</p>
        <div className="fc-status__actions">
          {onRetry && <button onClick={onRetry} className="fc-btn fc-btn--primary">נסה שוב</button>}
          <button onClick={onClose} className="fc-btn fc-btn--ghost">חזור לעורך</button>
        </div>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="fc-status">
        <p>לא נוצרו כרטיסיות מהטקסט.</p>
        <button onClick={onClose} className="fc-btn fc-btn--ghost">חזור לעורך</button>
      </div>
    );
  }

  const currentCard = deck[currentIndex];

  // ─── Test finished summary ───
  if (mode === MODE_TEST && testFinished) {
    const total = knewCards.length + missedCards.length;
    const pct = total > 0 ? Math.round((knewCards.length / total) * 100) : 0;

    return (
      <div className="fc-container">
        <div className="fc-summary">
          <h2>סיכום מבחן</h2>
          <div className="fc-summary__score">{pct}%</div>
          <div className="fc-summary__details">
            <span className="fc-summary__knew">✓ ידעתי: {knewCards.length}</span>
            <span className="fc-summary__missed">✗ לא ידעתי: {missedCards.length}</span>
          </div>
          <div className="fc-summary__actions">
            {missedCards.length > 0 && (
              <>
                <button onClick={startReviewMissed} className="fc-btn fc-btn--primary">חזור על מה שטעיתי</button>
                {addRepetition && (
                  <button onClick={saveMissedToRepetitions} className="fc-btn fc-btn--accent">שמור לחזרות מרווחות</button>
                )}
              </>
            )}
            <button onClick={() => switchMode(MODE_TEST)} className="fc-btn fc-btn--secondary">התחל מבחן מחדש</button>
            <button onClick={() => switchMode(MODE_BROWSE)} className="fc-btn fc-btn--ghost">חזור לעיון</button>
            <button onClick={onClose} className="fc-btn fc-btn--ghost">חזור לעורך</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ───
  return (
    <div className="fc-container">
      {/* Header */}
      <div className="fc-header">
        <h2>כרטיסיות למידה</h2>
        <div className="fc-header__actions">
          {/* Mode tabs */}
          <button
            className={`fc-btn fc-btn--tab ${mode === MODE_BROWSE ? 'fc-btn--tab-active' : ''}`}
            onClick={() => switchMode(MODE_BROWSE)}
          >עיון</button>
          <button
            className={`fc-btn fc-btn--tab ${mode === MODE_TEST ? 'fc-btn--tab-active' : ''}`}
            onClick={() => switchMode(MODE_TEST)}
          >מבחן</button>

          <span className="fc-header__sep" />
          <button onClick={() => exportToAnkiTxt(cards)} className="fc-btn fc-btn--secondary" title="ייצוא לקובץ שניתן לייבא ב-Anki">ייצוא ל-Anki</button>
          <button onClick={onClose} className="fc-btn fc-btn--ghost">✕</button>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar current={currentIndex} total={deck.length} />

      {/* Card */}
      <div className="fc-stage">
        {currentCard && (
          <SingleCard
            key={`${mode}-${currentIndex}`}
            question={currentCard.question}
            answer={currentCard.answer}
            isRevealed={isRevealed}
            onReveal={() => setIsRevealed(true)}
          />
        )}
      </div>

      {/* Controls */}
      <div className="fc-controls">
        {mode === MODE_BROWSE && (
          <>
            <button className="fc-btn fc-btn--nav" onClick={goPrev} disabled={currentIndex === 0}>→ הקודם</button>
            <button className="fc-btn fc-btn--nav" onClick={() => setIsRevealed(r => !r)}>
              {isRevealed ? 'הסתר' : 'גלה תשובה'}
            </button>
            <button className="fc-btn fc-btn--nav" onClick={goNext} disabled={currentIndex === deck.length - 1}>הבא ←</button>
          </>
        )}

        {mode === MODE_TEST && !isRevealed && (
          <button className="fc-btn fc-btn--primary fc-btn--lg" onClick={() => setIsRevealed(true)}>גלה תשובה</button>
        )}

        {mode === MODE_TEST && isRevealed && (
          <div className="fc-controls__rating">
            <button className="fc-btn fc-btn--knew" onClick={() => rateCard(true)}>✓ ידעתי</button>
            <button className="fc-btn fc-btn--missed" onClick={() => rateCard(false)}>✗ לא ידעתי</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardView;