// frontend/src/hooks/useQuestionnaire.js
import { useState, useCallback, useEffect } from 'react';
import apiService from '../utils/apiService'; 
import { HEBREW_TEXT } from '../utils/constants';

// Helper to format date to YYYY-MM-DD
const getFormattedDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const useQuestionnaire = (setGlobalLoadingMessage = () => {}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateForQuestionnaire, setSelectedDateForQuestionnaire] = useState(getFormattedDate(new Date()));
  const [questionnaireData, setQuestionnaireData] = useState(null); // { fixedQuestions: [], aiQuestions: [], submitted_data: {} }
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState(null);
  const [isSubmittedForSelectedDate, setIsSubmittedForSelectedDate] = useState(false);

  const [weeklySummary, setWeeklySummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [detailedWeeklyAnswers, setDetailedWeeklyAnswers] = useState([]);
  const [isLoadingWeeklyAnswers, setIsLoadingWeeklyAnswers] = useState(false);
  const [weeklyAnswersError, setWeeklyAnswersError] = useState(null);
  const [currentWeeklyAnswersRange, setCurrentWeeklyAnswersRange] = useState({ startDate: null, endDate: null });


  const [notificationSettings, setNotificationSettings] = useState({
    enable_daily_questionnaire_reminder: true,
    reminder_time: "22:00"
  });
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [shouldShowReminderIcon, setShouldShowReminderIcon] = useState(false); // For the button icon


  const fetchQuestionnaireForDate = useCallback(async (dateString) => {
    setIsLoadingQuestionnaire(true);
    setQuestionnaireError(null);
    setQuestionnaireData(null);
    setIsSubmittedForSelectedDate(false);
    try {
      const result = await apiService.getQuestionnaireForDate(dateString);
      if (result.submitted_today) { // 'submitted_today' here means submitted for the 'dateString'
        setIsSubmittedForSelectedDate(true);
        setQuestionnaireData(result.data); // Show submitted data and structure
      } else {
        setIsSubmittedForSelectedDate(false);
        setQuestionnaireData(result.data); // data: { fixedQuestions, aiQuestions }
      }
      setSelectedDateForQuestionnaire(dateString); // Ensure selectedDate state is updated
    } catch (err) {
      console.error(`Failed to fetch questionnaire for ${dateString}:`, err);
      setQuestionnaireError(err.message || HEBREW_TEXT.questionnaire.errorLoadingQuestions);
    } finally {
      setIsLoadingQuestionnaire(false);
    }
  }, []);

  const openQuestionnaireModal = useCallback((date = new Date()) => {
    const dateString = getFormattedDate(date);
    setSelectedDateForQuestionnaire(dateString);
    fetchQuestionnaireForDate(dateString);
    setIsModalOpen(true);
  }, [fetchQuestionnaireForDate]);

  const closeQuestionnaireModal = useCallback(() => {
    setIsModalOpen(false);
    setQuestionnaireData(null);
    setQuestionnaireError(null);
    setSelectedDateForQuestionnaire(getFormattedDate(new Date())); // Reset to today on close
  }, []);

  const submitQuestionnaire = useCallback(async (answersFromModal) => {
    setIsLoadingQuestionnaire(true);
    setQuestionnaireError(null);
    try {
      const finalPayload = {
        rating_today: answersFromModal.rating_today || null, // Allow null rating
        details_today: answersFromModal.details_today,
      };

      if (questionnaireData && questionnaireData.aiQuestions) {
        questionnaireData.aiQuestions.forEach(q => {
          if (answersFromModal[q.id] !== undefined) {
            finalPayload[`${q.id}_answer`] = answersFromModal[q.id];
            finalPayload[`${q.id}_text`] = q.text; // Ensure AI question text is included
          }
        });
      }
      
      await apiService.submitQuestionnaire({ answers: finalPayload, date: selectedDateForQuestionnaire });
      setIsSubmittedForSelectedDate(true); 
      // Re-fetch to show submitted data or if we want to clear form
      // For now, just clear form and close after a delay
      setQuestionnaireData(null); 
      
      // Check if this submission affects the reminder icon
      if (selectedDateForQuestionnaire === getFormattedDate(new Date())) {
        setShouldShowReminderIcon(false);
      }

      setTimeout(() => {
        closeQuestionnaireModal();
      }, 1500);
    } catch (err) {
      console.error("Failed to submit questionnaire:", err);
      setQuestionnaireError(err.message || HEBREW_TEXT.questionnaire.submitting);
      // Error 409 might not be relevant with INSERT OR REPLACE, but good to keep for other potential conflicts
      if (err.status === 409) { 
        setIsSubmittedForSelectedDate(true); 
        setQuestionnaireError(HEBREW_TEXT.questionnaire.alreadySubmittedToday); // Text might need adjustment for "selected date"
      }
    } finally {
      setIsLoadingQuestionnaire(false);
    }
  }, [closeQuestionnaireModal, questionnaireData, selectedDateForQuestionnaire]);

  const fetchLatestWeeklySummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const result = await apiService.getLatestWeeklySummary();
      setWeeklySummary(result.data); 
    } catch (err) {
      console.error("Failed to fetch weekly summary:", err);
      setSummaryError(err.message || HEBREW_TEXT.questionnaire.errorLoadingSummary);
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const fetchWeeklyAnswers = useCallback(async (weekStartDate, weekEndDate) => { 
    setIsLoadingWeeklyAnswers(true);
    setWeeklyAnswersError(null);
    try {
      const result = await apiService.getWeeklyAnswers(weekStartDate, weekEndDate);
      setDetailedWeeklyAnswers(result.data); // API response is { data: [], weekStartDate, weekEndDate }
      setCurrentWeeklyAnswersRange({ startDate: result.weekStartDate, endDate: result.weekEndDate });
    } catch (err) {
      console.error("Failed to fetch weekly answers:", err);
      setWeeklyAnswersError(err.message || HEBREW_TEXT.questionnaire.errorLoadingDailyAnswers);
    } finally {
      setIsLoadingWeeklyAnswers(false);
    }
  }, []);
  
  const triggerWeeklySummaryGeneration = useCallback(async (dateForWeek) => { // dateForWeek (optional, YYYY-MM-DD string)
    setGlobalLoadingMessage(HEBREW_TEXT.questionnaire.loadingSummary || "מעבד סיכום שבועי...");
    try {
        const result = await apiService.triggerWeeklySummaryGeneration(dateForWeek);
        alert(result.message || "Summary generation process started.");
        if (result.summaryData) { // If summary was generated for a specific week that might be the "latest"
            setWeeklySummary(result.summaryData);
        } else {
            fetchLatestWeeklySummary(); 
        }
    } catch (err) {
        console.error("Failed to trigger summary generation:", err);
        alert(`${HEBREW_TEXT.error}: ${err.message}`);
    } finally {
        setGlobalLoadingMessage("");
    }
  }, [fetchLatestWeeklySummary, setGlobalLoadingMessage]);

  const fetchNotificationSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
        const result = await apiService.getUserNotificationSettings();
        if (result.data) {
            setNotificationSettings(result.data);
        }
    } catch (err) {
        console.warn("Failed to fetch notification settings:", err.message);
    } finally {
        setIsLoadingSettings(false);
    }
  }, []);

  const updateNotificationSettings = useCallback(async (newSettings) => {
    setIsLoadingSettings(true);
    try {
        const result = await apiService.updateUserNotificationSettings(newSettings);
        if (result.success && result.data) {
            setNotificationSettings(result.data);
            alert(HEBREW_TEXT.questionnaire.notificationSettingsUpdated);
            setShowNotificationSettings(false);
        } else {
            throw new Error(result.message || "Failed to update settings via API");
        }
    } catch (err) {
        console.error("Failed to update notification settings:", err);
        alert(`${HEBREW_TEXT.questionnaire.errorUpdatingSettings} ${err.message}`);
    } finally {
        setIsLoadingSettings(false);
    }
  }, []);

  // Effect for initial check of today's submission status (for reminder icon)
  useEffect(() => {
    fetchNotificationSettings();
    
    const checkTodaysSubmissionStatus = async () => {
      const todayString = getFormattedDate(new Date());
      try {
        const result = await apiService.getQuestionnaireForDate(todayString);
        if (result.submitted_today) {
          setIsSubmittedForSelectedDate(true); // This also sets for "today" if selectedDate is today
          setShouldShowReminderIcon(false);
        } else {
          setIsSubmittedForSelectedDate(false);
          // Check if reminder time has passed
          if (notificationSettings.enable_daily_questionnaire_reminder) {
            const now = new Date();
            const [reminderHour, reminderMinute] = (notificationSettings.reminder_time || "22:00").split(':').map(Number);
            if (now.getHours() > reminderHour || (now.getHours() === reminderHour && now.getMinutes() >= reminderMinute)) {
                setShouldShowReminderIcon(true);
            } else {
                setShouldShowReminderIcon(false);
            }
          }
        }
      } catch (err) {
        console.warn("Silent check for today's submission status failed:", err.message);
      }
    };
    checkTodaysSubmissionStatus();
  }, [fetchNotificationSettings]); // Rerun if notification settings change (e.g. reminder_time, though fixed now)

  // Effect for periodic reminder check
  useEffect(() => {
    const checkReminder = () => {
      // Only update if today's questionnaire is NOT submitted AND reminders are enabled
      if (isSubmittedForSelectedDate && selectedDateForQuestionnaire === getFormattedDate(new Date())) {
        setShouldShowReminderIcon(false);
        return;
      }
      if (!notificationSettings.enable_daily_questionnaire_reminder) {
        setShouldShowReminderIcon(false);
        return;
      }

      const now = new Date();
      const [reminderHour, reminderMinute] = (notificationSettings.reminder_time || "22:00").split(':').map(Number);
      
      if (now.getHours() > reminderHour || (now.getHours() === reminderHour && now.getMinutes() >= reminderMinute)) {
        // Check if already submitted today before showing icon
        apiService.getQuestionnaireForDate(getFormattedDate(new Date())).then(result => {
            if (!result.submitted_today) {
                setShouldShowReminderIcon(true);
            } else {
                setShouldShowReminderIcon(false);
            }
        }).catch(() => setShouldShowReminderIcon(true)); // Show on error, better safe than sorry
      } else {
        setShouldShowReminderIcon(false);
      }
    };

    checkReminder(); // Initial check
    const intervalId = setInterval(checkReminder, 60 * 1000 * 5); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [isSubmittedForSelectedDate, selectedDateForQuestionnaire, notificationSettings.enable_daily_questionnaire_reminder, notificationSettings.reminder_time]);


  return {
    isModalOpen,
    openQuestionnaireModal,
    closeQuestionnaireModal,
    selectedDateForQuestionnaire,
    setSelectedDateForQuestionnaire: (date) => { // Allow parent to set date and trigger fetch
        const dateString = getFormattedDate(date);
        setSelectedDateForQuestionnaire(dateString);
        fetchQuestionnaireForDate(dateString);
    },
    questionnaireData,
    isLoadingQuestionnaire,
    questionnaireError,
    submitQuestionnaire,
    isSubmittedForSelectedDate,

    weeklySummary,
    isLoadingSummary,
    summaryError,
    fetchLatestWeeklySummary,
    triggerWeeklySummaryGeneration,

    detailedWeeklyAnswers,
    isLoadingWeeklyAnswers,
    weeklyAnswersError,
    fetchWeeklyAnswers,
    currentWeeklyAnswersRange,

    notificationSettings,
    updateNotificationSettings,
    showNotificationSettings,
    setShowNotificationSettings,
    isLoadingSettings,
    shouldShowReminderIcon,
    getFormattedDate, // Expose helper
  };
};

export default useQuestionnaire;