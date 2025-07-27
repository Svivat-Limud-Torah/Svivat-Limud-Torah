// frontend/src/components/SummaryView.jsx
import React, { useState, useEffect } from 'react';
import './SummaryView.css';

const SummaryView = ({ 
    initialSummary, 
    isLoading, 
    error, 
    onSave, 
    onDiscard, 
    onRedo,
    onCloseEditor // To switch back to editor view
}) => {
  const [editedSummary, setEditedSummary] = useState(initialSummary || '');

  useEffect(() => {
    setEditedSummary(initialSummary || '');
  }, [initialSummary]);

  const handleSave = () => {
    if (editedSummary.trim() !== "") {
      onSave(editedSummary); // Pass only the edited summary content
    } else {
      alert("הסיכום ריק. אנא כתוב משהו או בטל.");
    }
  };

  if (isLoading && !initialSummary && !error) { // Show main loading if no summary yet and no error
    return <div className="summary-view-status">יוצר סיכום, אנא המתן...</div>;
  }
  
  if (error && !isLoading) { // Show error only if not actively loading (e.g. retry failed)
    return (
      <div className="summary-view-container summary-view-status">
        <p className="summary-error-text">שגיאה ביצירת הסיכום: {error}</p>
        <div className="summary-actions">
          {onRedo && <button onClick={onRedo} className="summary-button retry-button">נסה שוב</button>}
          <button onClick={onCloseEditor} className="summary-button discard-button">חזור לעורך</button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-view-container">
      <div className="summary-header">
        <h2>סיכום הטקסט</h2>
        {isLoading && <span className="summary-loading-indicator">מעדכן...</span>}
      </div>
      <textarea
        className="summary-textarea"
        value={editedSummary}
        onChange={(e) => setEditedSummary(e.target.value)}
        placeholder="כאן יוצג הסיכום שנוצר..."
        dir="rtl"
        disabled={isLoading}
      />
      <div className="summary-actions">
        <button onClick={handleSave} className="summary-button save-button" disabled={isLoading || !editedSummary.trim()}>שמור סיכום</button>
        {onRedo && <button onClick={onRedo} className="summary-button retry-button" disabled={isLoading}>צור מחדש</button>}
        <button onClick={onDiscard} className="summary-button discard-button" disabled={isLoading}>בטל וחזור לעורך</button>
      </div>
    </div>
  );
};

export default SummaryView;