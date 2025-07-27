// frontend/src/components/FlashcardView.jsx
import React, { useState } from 'react';
import './FlashcardView.css';

const Flashcard = ({ question, answer }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <p>{question}</p>
        </div>
        <div className="flashcard-back">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
};

const FlashcardView = ({ cards, onClose, onRetry, error, isLoading }) => {
  if (isLoading) { // This specific loading state is for initial view loading, not API call for cards
    return <div className="flashcard-view-loading">טוען כרטיסיות...</div>;
  }

  if (error) {
    return (
      <div className="flashcard-view-error">
        <p>שגיאה ביצירת כרטיסיות: {error}</p>
        {onRetry && <button onClick={onRetry} className="flashcard-button">נסה שוב</button>}
        <button onClick={onClose} className="flashcard-button flashcard-close-button">חזור לעורך</button>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="flashcard-view-no-cards">
        <p>לא נוצרו כרטיסיות מהטקסט, או שהטקסט לא התאים ליצירת שאלות ותשובות.</p>
        <button onClick={onClose} className="flashcard-button flashcard-close-button">חזור לעורך</button>
      </div>
    );
  }

  return (
    <div className="flashcard-view-container">
      <div className="flashcard-view-header">
        <h2>כרטיסיות שאלות ותשובות</h2>
        <button onClick={onClose} className="flashcard-button flashcard-close-button">חזור לעורך</button>
      </div>
      <div className="flashcards-grid">
        {cards.map((card, index) => (
          <Flashcard key={index} question={card.question} answer={card.answer} />
        ))}
      </div>
    </div>
  );
};

export default FlashcardView;