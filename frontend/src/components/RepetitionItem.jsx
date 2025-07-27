// frontend/src/components/RepetitionItem.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './RepetitionItem.css'; // We will create this file next

const RepetitionItem = ({ repetition, onDelete, onToggleMute, onMarkComplete, onEdit, getIntervalText, isLoading }) => {
  const { id, name, content, next_reminder_date, is_muted, created_at, last_completed_at, current_interval_index } = repetition;

  const formatDate = (dateString) => {
    if (!dateString) return HEBREW_TEXT.na;
    try {
      return new Date(dateString).toLocaleDateString('he-IL', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return HEBREW_TEXT.na;
    }
  };

  const isOverdue = next_reminder_date && new Date(next_reminder_date) < new Date();
  const isCompleted = current_interval_index === -1;

  return (
    <div className={`repetition-item ${isOverdue && !isCompleted ? 'overdue' : ''} ${isCompleted ? 'completed-repetition' : ''}`}>
      <div className="repetition-item-main">
        <h3 className="repetition-name">{name}</h3>
        {content && <p className="repetition-content">{content}</p>}
        
        <div className="repetition-details">
            <p><strong>{HEBREW_TEXT.repetitions.createdAt}:</strong> {formatDate(created_at)}</p>
            {!isCompleted && next_reminder_date && (
                <p className={isOverdue ? 'detail-next-reminder overdue-text' : 'detail-next-reminder'}>
                    <strong>{HEBREW_TEXT.repetitions.nextReminderDate}:</strong> {formatDate(next_reminder_date)}
                </p>
            )}
            {last_completed_at && (
                <p><strong>{HEBREW_TEXT.repetitions.lastCompletedAt}:</strong> {formatDate(last_completed_at)}</p>
            )}
            <p><strong>{HEBREW_TEXT.repetitions.currentInterval}:</strong> {getIntervalText(repetition)}</p>
            <p><strong>{HEBREW_TEXT.repetitions.statusMuted}:</strong> {is_muted ? HEBREW_TEXT.yes : HEBREW_TEXT.no}</p>
        </div>
      </div>

      <div className="repetition-item-actions">
        {!isCompleted && (
            <button 
                onClick={() => onMarkComplete(id)} 
                className="action-button complete-button"
                title={HEBREW_TEXT.repetitions.markAsCompleted}
                disabled={isLoading}
            >
                {HEBREW_TEXT.repetitions.markAsCompletedShort}
            </button>
        )}
        <button 
            onClick={() => onToggleMute(id)} 
            className={`action-button mute-button ${is_muted ? 'unmute' : ''}`}
            title={is_muted ? HEBREW_TEXT.repetitions.unmute : HEBREW_TEXT.repetitions.mute}
            disabled={isLoading}
        >
            {is_muted ? HEBREW_TEXT.repetitions.unmuteShort : HEBREW_TEXT.repetitions.muteShort}
        </button>
        <button 
            onClick={() => onEdit(repetition)} 
            className="action-button edit-button"
            title={HEBREW_TEXT.edit}
            disabled={isLoading}
        >
            {HEBREW_TEXT.edit}
        </button>
        <button 
            onClick={() => onDelete(id)} 
            className="action-button delete-button"
            title={HEBREW_TEXT.deleteItem}
            disabled={isLoading}
        >
            {HEBREW_TEXT.deleteItem}
        </button>
      </div>
    </div>
  );
};

export default RepetitionItem;