// frontend/src/hooks/useRepetitions.js
import { useState, useCallback } from 'react';
import { API_BASE_URL, HEBREW_TEXT } from '../utils/constants';

const useRepetitions = (globalSetLoadingMessage = () => {}) => {
  const [repetitions, setRepetitions] = useState([]);
  const [isLoadingRepetitions, setIsLoadingRepetitions] = useState(false);
  const [repetitionError, setRepetitionError] = useState(null);

  const fetchRepetitions = useCallback(async () => {
    setIsLoadingRepetitions(true);
    setRepetitionError(null);
    globalSetLoadingMessage(HEBREW_TEXT.repetitions.loadingRepetitions);
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorFetchingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorFetchingDefault);
      }
      const data = await response.json();
      setRepetitions(data);
    } catch (err) {
      console.error("Failed to fetch repetitions:", err);
      setRepetitionError(err.message);
    } finally {
      setIsLoadingRepetitions(false);
      globalSetLoadingMessage('');
    }
  }, [globalSetLoadingMessage]);

  const addRepetition = useCallback(async (repetitionData) => {
    setIsLoadingRepetitions(true);
    setRepetitionError(null);
    globalSetLoadingMessage(HEBREW_TEXT.repetitions.addingRepetition);
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repetitionData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorAddingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorAddingDefault);
      }
      const newRepetition = await response.json();
      setRepetitions(prev => [...prev, newRepetition].sort((a,b) => new Date(a.next_reminder_date || 0) - new Date(b.next_reminder_date || 0) || new Date(a.created_at) - new Date(b.created_at)));
      return newRepetition; // Return the newly added repetition
    } catch (err) {
      console.error("Failed to add repetition:", err);
      setRepetitionError(err.message);
      throw err; // Re-throw to be caught by modal
    } finally {
      setIsLoadingRepetitions(false);
      globalSetLoadingMessage('');
    }
  }, [globalSetLoadingMessage]);

  const deleteRepetition = useCallback(async (id) => {
    setIsLoadingRepetitions(true);
    setRepetitionError(null);
    globalSetLoadingMessage(HEBREW_TEXT.repetitions.deletingRepetition);
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorDeletingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorDeletingDefault);
      }
      setRepetitions(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Failed to delete repetition:", err);
      setRepetitionError(err.message);
      throw err; // Re-throw
    } finally {
      setIsLoadingRepetitions(false);
      globalSetLoadingMessage('');
    }
  }, [globalSetLoadingMessage]);

  const toggleRepetitionMute = useCallback(async (id, is_muted) => {
    // Optimistic update example
    const originalRepetitions = [...repetitions];
    setRepetitions(prev => prev.map(r => r.id === id ? { ...r, is_muted } : r));
    setRepetitionError(null);
    // No global loading message for quick toggle
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions/${id}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_muted }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorMutingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorMutingDefault);
      }
      const updatedRepetition = await response.json();
      setRepetitions(prev => prev.map(r => r.id === id ? updatedRepetition : r)
        .sort((a,b) => new Date(a.next_reminder_date || 0) - new Date(b.next_reminder_date || 0) || new Date(a.created_at) - new Date(b.created_at)));
    } catch (err) {
      console.error("Failed to toggle mute for repetition:", err);
      setRepetitionError(err.message);
      setRepetitions(originalRepetitions); // Rollback optimistic update
      throw err; // Re-throw
    }
  }, [repetitions]);

  const markRepetitionAsCompleted = useCallback(async (id) => {
    setIsLoadingRepetitions(true);
    setRepetitionError(null);
    globalSetLoadingMessage(HEBREW_TEXT.repetitions.completingRepetition);
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions/${id}/complete`, {
        method: 'PUT',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorCompletingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorCompletingDefault);
      }
      const updatedRepetition = await response.json();
      setRepetitions(prev => prev.map(r => r.id === id ? updatedRepetition : r)
        .sort((a,b) => new Date(a.next_reminder_date || 0) - new Date(b.next_reminder_date || 0) || new Date(a.created_at) - new Date(b.created_at)));
    } catch (err) {
      console.error("Failed to mark repetition as completed:", err);
      setRepetitionError(err.message);
      throw err; // Re-throw
    } finally {
      setIsLoadingRepetitions(false);
      globalSetLoadingMessage('');
    }
  }, [globalSetLoadingMessage]);
  
  const updateRepetition = useCallback(async (id, repetitionData) => {
    setIsLoadingRepetitions(true);
    setRepetitionError(null);
    globalSetLoadingMessage(HEBREW_TEXT.repetitions.updatingRepetition);
    try {
      const response = await fetch(`${API_BASE_URL}/repetitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repetitionData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: HEBREW_TEXT.repetitions.errorUpdatingDefault }));
        throw new Error(errorData.error || errorData.message || HEBREW_TEXT.repetitions.errorUpdatingDefault);
      }
      const updatedRepetition = await response.json();
      setRepetitions(prev => prev.map(r => r.id === id ? updatedRepetition : r)
        .sort((a,b) => new Date(a.next_reminder_date || 0) - new Date(b.next_reminder_date || 0) || new Date(a.created_at) - new Date(b.created_at)));
      return updatedRepetition;
    } catch (err) {
      console.error("Failed to update repetition:", err);
      setRepetitionError(err.message);
      throw err; // Re-throw
    } finally {
      setIsLoadingRepetitions(false);
      globalSetLoadingMessage('');
    }
  }, [globalSetLoadingMessage]);


  // Function to check if there are repetitions due today
  const getRepetitionsDueToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    return repetitions.filter(rep => {
      // Only check non-completed, non-muted repetitions
      if (rep.current_interval_index === -1 || rep.is_muted) {
        return false;
      }
      
      if (!rep.next_reminder_date) {
        return false;
      }

      const reminderDate = new Date(rep.next_reminder_date);
      // Check if reminder date is today or overdue
      return reminderDate <= tomorrow;
    });
  }, [repetitions]);

  const hasRepetitionsDueToday = useCallback(() => {
    return getRepetitionsDueToday().length > 0;
  }, [getRepetitionsDueToday]);

  return {
    repetitions,
    isLoadingRepetitions,
    repetitionError,
    setRepetitionError, // Allow manual clearing of error
    fetchRepetitions,
    addRepetition,
    deleteRepetition,
    toggleRepetitionMute,
    markRepetitionAsCompleted,
    updateRepetition,
    getRepetitionsDueToday,
    hasRepetitionsDueToday,
  };
};

export default useRepetitions;