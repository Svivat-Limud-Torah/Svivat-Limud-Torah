// frontend/src/components/RepetitionModal.jsx
import React, { useState, useEffect } from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './RepetitionModal.css'; // We will create this file next

const RepetitionModal = ({ isOpen, onClose, onSave, existingRepetition, isLoading }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [interval1, setInterval1] = useState('');
  const [interval2, setInterval2] = useState('');
  const [interval3, setInterval3] = useState('');
  const [interval4, setInterval4] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingRepetition) {
      setName(existingRepetition.name || '');
      setContent(existingRepetition.content || '');
      setInterval1(existingRepetition.reminder_interval_1 || '');
      setInterval2(existingRepetition.reminder_interval_2 || '');
      setInterval3(existingRepetition.reminder_interval_3 || '');
      setInterval4(existingRepetition.reminder_interval_4 || '');
    } else {
      // Reset form for new repetition
      setName('');
      setContent('');
      setInterval1('7'); // Default values
      setInterval2('14');
      setInterval3('30');
      setInterval4('60');
    }
    setError(''); // Clear error when modal opens or existingRepetition changes
  }, [isOpen, existingRepetition]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(HEBREW_TEXT.repetitions.nameRequired);
      return;
    }

    const intervals = [interval1, interval2, interval3, interval4].map(val => val ? parseInt(val, 10) : null);
    
    if (intervals.some(val => val !== null && (isNaN(val) || val < 0))) {
      setError(HEBREW_TEXT.repetitions.intervalsMustBeNumbers);
      return;
    }
    if (intervals.every(val => val === null || val <= 0)) {
        setError(HEBREW_TEXT.repetitions.atLeastOnePositiveInterval);
        return;
    }


    const repetitionData = {
      name: name.trim(),
      content: content.trim() || null,
      reminder_interval_1: intervals[0],
      reminder_interval_2: intervals[1],
      reminder_interval_3: intervals[2],
      reminder_interval_4: intervals[3],
    };

    try {
      await onSave(repetitionData, existingRepetition ? existingRepetition.id : null);
      onClose(); // Close modal on successful save
    } catch (saveError) {
      console.error("Save error in modal:", saveError);
      setError(saveError.message || HEBREW_TEXT.repetitions.errorSavingDefault);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="repetition-modal-backdrop">
      <div className="repetition-modal-content">
        <h2>{existingRepetition ? HEBREW_TEXT.repetitions.editRepetition : HEBREW_TEXT.repetitions.addRepetition}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="rep-name">{HEBREW_TEXT.repetitions.nameLabel}:</label>
            <input
              type="text"
              id="rep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="rep-content">{HEBREW_TEXT.repetitions.contentLabel} ({HEBREW_TEXT.optional}):</label>
            <textarea
              id="rep-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="3"
              disabled={isLoading}
            />
          </div>
          <p className="intervals-label">{HEBREW_TEXT.repetitions.reminderIntervalsLabel}:</p>
          <div className="intervals-group">
            {[
              { value: interval1, setter: setInterval1, label: HEBREW_TEXT.repetitions.interval1 },
              { value: interval2, setter: setInterval2, label: HEBREW_TEXT.repetitions.interval2 },
              { value: interval3, setter: setInterval3, label: HEBREW_TEXT.repetitions.interval3 },
              { value: interval4, setter: setInterval4, label: HEBREW_TEXT.repetitions.interval4 },
            ].map((interval, index) => (
              <div key={index} className="form-group interval-item">
                <label htmlFor={`rep-interval-${index + 1}`}>{interval.label}:</label>
                <input
                  type="number"
                  id={`rep-interval-${index + 1}`}
                  value={interval.value}
                  onChange={(e) => interval.setter(e.target.value)}
                  min="0"
                  placeholder={HEBREW_TEXT.days}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? HEBREW_TEXT.saving : (existingRepetition ? HEBREW_TEXT.saveChanges : HEBREW_TEXT.add)}
            </button>
            <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
              {HEBREW_TEXT.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RepetitionModal;