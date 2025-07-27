// frontend/src/components/RepetitionListView.jsx
import React, { useEffect, useState } from 'react';
import { HEBREW_TEXT, APP_DIRECTION } from '../utils/constants';
import RepetitionItem from './RepetitionItem'; // We'll create this next
import RepetitionModal from './RepetitionModal';
import './RepetitionListView.css'; // We will create this file next

const RepetitionListView = ({ 
    repetitionsHook, // { repetitions, isLoadingRepetitions, repetitionError, fetchRepetitions, deleteRepetition, toggleRepetitionMute, markRepetitionAsCompleted, updateRepetition, addRepetition, setRepetitionError }
    onCloseView, // Function to close this view and go back to editor for example
    globalLoadingMessage
}) => {
  const { 
    repetitions, isLoadingRepetitions, repetitionError, 
    fetchRepetitions, deleteRepetition, toggleRepetitionMute, 
    markRepetitionAsCompleted, updateRepetition, addRepetition, setRepetitionError
  } = repetitionsHook;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepetition, setEditingRepetition] = useState(null); // null for new, object for edit

  useEffect(() => {
    fetchRepetitions();
  }, [fetchRepetitions]);

  const handleOpenModalForNew = () => {
    setEditingRepetition(null);
    setRepetitionError(null); // Clear previous errors
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (repetition) => {
    setEditingRepetition(repetition);
    setRepetitionError(null); // Clear previous errors
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRepetition(null);
  };

  const handleSaveRepetition = async (repetitionData, idToUpdate) => {
    if (idToUpdate) {
      await updateRepetition(idToUpdate, repetitionData);
    } else {
      await addRepetition(repetitionData);
    }
    // Modal will close itself on success via its own logic calling onClose
  };
  
  const getIntervalText = (repetition) => {
    const intervals = [
        repetition.reminder_interval_1,
        repetition.reminder_interval_2,
        repetition.reminder_interval_3,
        repetition.reminder_interval_4
    ].filter(Boolean); // Remove null/0 values

    if (repetition.current_interval_index === -1 || intervals.length === 0) {
        return HEBREW_TEXT.repetitions.completed;
    }
    if (repetition.current_interval_index >= intervals.length) {
        return HEBREW_TEXT.repetitions.errorState; // Should not happen
    }
    const currentIntervalValue = intervals[repetition.current_interval_index];
    return `${HEBREW_TEXT.repetitions.intervalPrefix} ${repetition.current_interval_index + 1} (${currentIntervalValue} ${HEBREW_TEXT.days})`;
  };


  if (isLoadingRepetitions && repetitions.length === 0 && !repetitionError) {
    return (
      <div className="repetition-list-view">
        <p className="loading-text">{HEBREW_TEXT.repetitions.loadingRepetitions}...</p>
      </div>
    );
  }


  return (
    <div className="repetition-list-view" style={{ direction: APP_DIRECTION }}>
      <div className="repetition-list-header">
        <h1>{HEBREW_TEXT.repetitions.title}</h1>
        <div className="header-actions">
            <button onClick={handleOpenModalForNew} className="add-repetition-button" disabled={!!globalLoadingMessage || isLoadingRepetitions}>
              {HEBREW_TEXT.repetitions.addRepetitionShort}
            </button>
            {onCloseView && (
                 <button onClick={onCloseView} className="close-view-button" title={HEBREW_TEXT.returnToEditor} disabled={!!globalLoadingMessage || isLoadingRepetitions}>
                    {HEBREW_TEXT.close}
                 </button>
            )}
        </div>
      </div>

      {repetitionError && <p className="error-message main-error">{repetitionError}</p>}
      
      {!isLoadingRepetitions && repetitions.length === 0 && !repetitionError && (
        <p className="no-repetitions-message">{HEBREW_TEXT.repetitions.noRepetitionsFound}</p>
      )}

      <div className="repetitions-container">
        {repetitions.map(rep => (
          <RepetitionItem
            key={rep.id}
            repetition={rep}
            onDelete={() => {
                if (window.confirm(HEBREW_TEXT.repetitions.confirmDelete(rep.name))) {
                    deleteRepetition(rep.id).catch(err => console.error("Failed to delete from item:", err));
                }
            }}
            onToggleMute={() => toggleRepetitionMute(rep.id, !rep.is_muted).catch(err => console.error("Failed to mute from item:", err))}
            onMarkComplete={() => markRepetitionAsCompleted(rep.id).catch(err => console.error("Failed to complete from item:", err))}
            onEdit={() => handleOpenModalForEdit(rep)}
            getIntervalText={getIntervalText}
            isLoading={isLoadingRepetitions}
          />
        ))}
      </div>

      <RepetitionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRepetition}
        existingRepetition={editingRepetition}
        isLoading={isLoadingRepetitions} // Pass loading state to modal
      />
    </div>
  );
};

export default RepetitionListView;