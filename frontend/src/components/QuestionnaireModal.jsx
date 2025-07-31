// frontend/src/components/QuestionnaireModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './QuestionnaireModal.css';
import apiService from '../utils/apiService';

const QuestionnaireModal = ({
  isOpen,
  onClose,
  onSubmit,
  questionnaireData, // { fixedQuestions: [], aiQuestions: [], submitted_data: {} (if submitted) }
  isLoading,
  error,
  isSubmittedForSelectedDate, // Boolean: true if the questionnaire for `selectedDate` is submitted
  selectedDate, // YYYY-MM-DD string
  onDateChange, // Function to call when user wants to change date (receives new Date object)
  getFormattedDate, // Helper function (date) => "YYYY-MM-DD"
  onResetAllDataSuccess, // New prop to handle successful data deletion and frontend reset
}) => {
  const [answers, setAnswers] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);
  const [weeklySummaryError, setWeeklySummaryError] = useState('');

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const fileInputRef = React.useRef(null);

  // Populate answers from questionnaireData (either blank for new, or from submitted_data)
  useEffect(() => {
    if (questionnaireData) {
      const initialAnswers = {};
      // Determine the source of truth for answers:
      // - If submitted and `submitted_data` exists, use that.
      // - Otherwise, it's a new/unsubmitted questionnaire, initialize empty.
      const sourceData = isSubmittedForSelectedDate && questionnaireData.submitted_data 
                         ? questionnaireData.submitted_data
                         : {};
      
      questionnaireData.fixedQuestions?.forEach(q => {
        initialAnswers[q.id] = sourceData[q.id] || (q.type === 'rating' ? '' : '');
      });

      questionnaireData.aiQuestions?.forEach(q => {
        // For AI questions, the ID is like 'ai_q1'. The answer in submitted_data might be 'ai_q1_answer'.
        // The text is stored as 'ai_q1_text'.
        // When initializing, we just care about the answer for the input field.
        initialAnswers[q.id] = sourceData[`${q.id}_answer`] || sourceData[q.id] || '';
      });
      setAnswers(initialAnswers);
      // Enter edit mode if:
      // 1. It's not submitted for the selected date OR
      // 2. It is submitted, but the user explicitly clicked "edit" (which is handled by handleEdit)
      // This effect primarily sets initial edit state for new questionnaires.
      setIsEditing(!isSubmittedForSelectedDate); 
    } else {
      setAnswers({}); // Clear answers if no data (e.g., error or loading)
      setIsEditing(true); // Default to edit mode if no data
    }
  }, [questionnaireData, isSubmittedForSelectedDate, selectedDate]); // Rerun when data, submission status, or date changes


  const handleExportUserData = useCallback(async () => {
    setExportError('');
    setExportLoading(true);
    try {
      const response = await apiService.exportUserData(); // apiService.exportUserData returns the data directly
      if (response) { // Check if response (the data itself) is truthy
        const jsonData = JSON.stringify(response, null, 2); // Use response directly
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `torah_ide_user_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setExportError(HEBREW_TEXT.questionnaire?.exportErrorGeneral || "שגיאה ביצוא הנתונים.");
      }
    } catch (err) {
      console.error("Error exporting user data:", err);
      setExportError(err.response?.data?.error || HEBREW_TEXT.questionnaire?.exportErrorApi || "שגיאה בשרת בעת יצוא הנתונים.");
    } finally {
      setExportLoading(false);
    }
  }, []);

  const handleImportFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setImportError('');
    setImportSuccess('');
    setImportLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        await apiService.importUserData(jsonData); // This function needs to be created in apiService
        setImportSuccess(HEBREW_TEXT.questionnaire?.importSuccess || "הנתונים יובאו בהצלחה. ייתכן שיידרש רענון ליישום מלא.");
        // Optionally, trigger a refresh or state update if needed
        if (onResetAllDataSuccess) { // Reuse this prop to signal a major data change
            setTimeout(() => {
                onResetAllDataSuccess(); // This should ideally reload/reset relevant app state
            }, 2000);
        } else {
            window.location.reload(); // Fallback
        }
      } catch (err) {
        console.error("Error importing user data:", err);
        setImportError(err.response?.data?.error || HEBREW_TEXT.questionnaire?.importErrorFile || "שגיאה בעיבוד קובץ הנתונים או בייבוא לשרת.");
      } finally {
        setImportLoading(false);
      }
    };
    reader.onerror = () => {
      setImportError(HEBREW_TEXT.questionnaire?.importErrorReadingFile || "שגיאה בקריאת הקובץ.");
      setImportLoading(false);
    };
    reader.readAsText(file);

    // Reset file input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onResetAllDataSuccess]);

  const triggerImportFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const ratingAnswer = answers['rating_today'];
    if (ratingAnswer && (parseInt(ratingAnswer, 10) < 1 || parseInt(ratingAnswer, 10) > 10)) {
        alert(HEBREW_TEXT.questionnaire?.ratingValidationError || "הדירוג חייב להיות בין 1 ל-10.");
        return;
    }
    
    // Prepare payload, ensuring AI question texts are included for storage
    const answersWithAiText = { ...answers };
    if (questionnaireData && questionnaireData.aiQuestions) {
        questionnaireData.aiQuestions.forEach(q => {
            // The actual AI question text is part of questionnaireData.aiQuestions[i].text
            // This needs to be passed to the backend during submission.
            answersWithAiText[`${q.id}_text`] = q.text; 
        });
    }
    onSubmit(answersWithAiText); // The hook's submitQuestionnaire will use `selectedDate`
    setIsEditing(false); // Exit edit mode after successful submission
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (!isOpen) {
    return null;
  }

  const renderQuestion = (question) => {
    const isDisabled = !isEditing && isSubmittedForSelectedDate; // Disable if submitted and not in edit mode
    switch (question.type) {
      case 'rating':
        return (
          <input
            type="number"
            id={question.id}
            min="1"
            max="10"
            value={answers[question.id] || ''}
            onChange={(e) => handleChange(question.id, e.target.value)}
            className="questionnaire-input"
            disabled={isDisabled}
            // 'required' attribute might be better handled by form validation logic if needed
            // For a rating, an empty value can mean "not rated" if rating is optional.
            // If rating is mandatory, this should be handled in handleSubmit or form validation.
          />
        );
      case 'text':
        return (
          <textarea
            id={question.id}
            value={answers[question.id] || ''}
            onChange={(e) => handleChange(question.id, e.target.value)}
            className="questionnaire-textarea"
            rows="3"
            disabled={isDisabled}
            // required={isEditing && question.id === 'details_today'} // Example if details are mandatory when editing/submitting
          />
        );
      default:
        return null;
    }
  };

  // Date navigation logic
  const today = new Date();
  const todayStr = getFormattedDate(today);
  // Parse selectedDate carefully to avoid timezone issues with just date strings
  const [year, month, day] = selectedDate.split('-').map(Number);
  const selectedDateObj = new Date(year, month - 1, day); // month is 0-indexed

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);


  const canGoToPreviousDay = selectedDateObj > sevenDaysAgo;
  // Allow navigating to "today" if not already on "today"
  const canGoToNextDay = selectedDateObj < today && getFormattedDate(selectedDateObj) !== todayStr;

  const handleShowWeeklySummary = useCallback(async () => {
    if (showWeeklySummary && weeklySummary) { 
        // If already shown and data exists, just toggle
        setShowWeeklySummary(false);
        return;
    }
    
    // Clear any previous errors when starting fresh
    setWeeklySummaryError('');
    
    // Show the section immediately for better UX
    setShowWeeklySummary(true); 
    setWeeklySummaryLoading(true);
    setWeeklySummary(null);
    
    try {
      const response = await apiService.getLatestWeeklySummary();
      if (response && response.data) {
        setWeeklySummary(response.data);
        console.log("Weekly summary loaded successfully:", response.data);
      } else {
        setWeeklySummary(null);
        console.log("No weekly summary data available");
        // Don't show error for missing data, show informational message instead
        setWeeklySummaryError('');
      }
    } catch (err) {
      console.error("Error fetching weekly summary:", err);
      // Provide more user-friendly error messages
      if (err.message?.includes('Network')) {
        setWeeklySummaryError(HEBREW_TEXT.questionnaire?.networkError || "בעיית רשת. אנא נסה שוב.");
      } else if (err.message?.includes('404')) {
        setWeeklySummaryError('');
        setWeeklySummary(null);
      } else {
        setWeeklySummaryError(HEBREW_TEXT.questionnaire?.errorFetchingWeeklySummary || "שגיאה בטעינת הסיכום השבועי. אנא נסה שוב.");
      }
    } finally {
      setWeeklySummaryLoading(false);
    }
  }, [showWeeklySummary, weeklySummary]); // Dependencies for useCallback


  const goToPreviousDay = () => {
    if (canGoToPreviousDay) {
      const prevDay = new Date(selectedDateObj);
      prevDay.setDate(selectedDateObj.getDate() - 1);
      onDateChange(prevDay); // onDateChange expects a Date object
    }
  };

  const goToNextDay = () => {
    if (canGoToNextDay) {
      const nextDay = new Date(selectedDateObj);
      nextDay.setDate(selectedDateObj.getDate() + 1);
      onDateChange(nextDay); // onDateChange expects a Date object
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleteError('');
      setDeleteSuccess('');
      
      await apiService.resetAllUserData(); 
      
      setDeleteSuccess(HEBREW_TEXT.questionnaire?.deleteAllDataSuccess || "כל נתוני המשתמש נמחקו בהצלחה.");
      // setShowDeleteConfirmation(false); // Keep it open to show success message before triggering full reset

      // Call the callback passed from App.jsx to handle frontend state clearing and reload
      if (onResetAllDataSuccess) {
        // Delay slightly to allow user to see success message before full reload
        setTimeout(() => {
            onResetAllDataSuccess();
            // onClose(); // onClose might not be necessary if the app reloads
            // setDeleteSuccess(''); // State will be lost on reload anyway
        }, 2000); // 2 seconds delay
      } else {
        // Fallback if the prop isn't passed, though it should be
        console.warn("onResetAllDataSuccess prop not provided to QuestionnaireModal. Frontend state might not be fully reset.");
        setTimeout(() => {
            onClose(); 
            setDeleteSuccess('');
            window.location.reload(); // Force reload as a fallback
        }, 3000);
      }

    } catch (err) {
      console.error("Error deleting all data:", err);
      let errorMessage = HEBREW_TEXT.questionnaire?.deleteAllDataError || "שגיאה במחיקת נתונים. נסה שוב מאוחר יותר.";
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
      }
      setDeleteError(errorMessage);
      // setShowDeleteConfirmation(false); // Decide if to close confirmation on error
    }
  };
  
  return (
    <div className="questionnaire-modal-overlay">
      <div className="questionnaire-modal-content">
        <button onClick={onClose} className="questionnaire-modal-close-btn">
          ×
        </button>
        <h2 className="questionnaire-modal-title">
          {HEBREW_TEXT.questionnaire?.modalTitle || "שאלון התקדמות יומי"}
        </h2>

        <div className="date-navigation">
          <button onClick={goToPreviousDay} disabled={!canGoToPreviousDay || isLoading}>{ '<' } {HEBREW_TEXT.previousDay || "יום קודם"}</button>
          <span>{selectedDateObj.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <button onClick={goToNextDay} disabled={!canGoToNextDay || isLoading}>{HEBREW_TEXT.nextDay || "יום הבא"} { '>' }</button>
        </div>

        {isLoading && <div className="questionnaire-loading"><p>{HEBREW_TEXT.questionnaire?.loadingQuestions || "טוען שאלות..."}</p></div>}
        {error && <p className="questionnaire-error-message">{HEBREW_TEXT.questionnaire?.errorLoadingDataForDate(selectedDate) || `שגיאה בטעינת נתונים לתאריך ${selectedDate}`}: {error}</p>}
        
        {!isLoading && !error && isSubmittedForSelectedDate && !isEditing && (
          <div className="questionnaire-submitted-message">
            <p>{HEBREW_TEXT.questionnaire?.alreadySubmittedForDate(selectedDate)}</p>
            {questionnaireData && questionnaireData.fixedQuestions?.map(q => ( // Display submitted answers
              <div key={`${q.id}-submitted`} className="questionnaire-question-block submitted-answer">
                <strong className="questionnaire-label">{q.text}:</strong>
                <p>{answers[q.id] || (<i>{HEBREW_TEXT.na || "לא נרשם"}</i>)}</p>
              </div>
            ))}
            {questionnaireData && questionnaireData.aiQuestions?.map(q => (
              <div key={`${q.id}-submitted`} className="questionnaire-question-block submitted-answer">
                <strong className="questionnaire-label">{q.text}:</strong>
                <p>{answers[q.id] || (<i>{HEBREW_TEXT.na || "לא נרשם"}</i>)}</p>
              </div>
            ))}
            <button onClick={handleEdit} className="questionnaire-edit-btn">
              {HEBREW_TEXT.questionnaire?.editAnswers || "ערוך תשובות"}
            </button>
          </div>
        )}

        {!isLoading && !error && questionnaireData && (isEditing || !isSubmittedForSelectedDate) && (
          <form onSubmit={handleSubmit}>
            {questionnaireData.fixedQuestions?.map(q => (
              <div key={q.id} className="questionnaire-question-block">
                <label htmlFor={q.id} className="questionnaire-label">{q.text}</label>
                {renderQuestion(q)}
              </div>
            ))}
            {questionnaireData.aiQuestions?.map(q => (
              <div key={q.id} className="questionnaire-question-block">
                <label htmlFor={q.id} className="questionnaire-label">{q.text}</label>
                {renderQuestion(q)}
              </div>
            ))}
            <button type="submit" className="questionnaire-submit-btn" disabled={isLoading}>
              {isLoading ? (HEBREW_TEXT.questionnaire?.submitting || "שולח...") : (HEBREW_TEXT.questionnaire?.submitButton || "שלח תשובות")}
            </button>
            {isSubmittedForSelectedDate && isEditing && ( // Show cancel only if editing a previously submitted form
                 <button type="button" onClick={() => { setIsEditing(false); /* Optionally re-fetch or reset answers to original submitted state */ }} className="questionnaire-cancel-edit-btn">
                    {HEBREW_TEXT.cancel || "ביטול עריכה"}
                </button>
            )}
          </form>
        )}
        {!isLoading && !error && !questionnaireData && !isSubmittedForSelectedDate && ( // Message if no questions and not submitted
            <p>{HEBREW_TEXT.questionnaire?.noQuestionsAvailable || "אין שאלות זמינות כרגע עבור תאריך זה. נסה שוב מאוחר יותר."}</p>
        )}

        {/* Weekly Summary Section */}
        <div className="weekly-summary-section">
          <button 
            onClick={handleShowWeeklySummary} 
            className="show-weekly-summary-btn"
            disabled={isLoading || weeklySummaryLoading}
            title={showWeeklySummary && weeklySummary ? 
              (HEBREW_TEXT.questionnaire?.hideWeeklySummaryTooltip || "הסתר את הסיכום השבועי") : 
              (HEBREW_TEXT.questionnaire?.showWeeklySummaryTooltip || "הצג סיכום שבועי של התקדמותך")
            }
          >
            {weeklySummaryLoading ? 
              (HEBREW_TEXT.questionnaire?.loadingWeeklySummary || "טוען...") : 
              (showWeeklySummary && weeklySummary ? 
                (HEBREW_TEXT.questionnaire?.hideWeeklySummary || "הסתר סיכום שבועי") : 
                (HEBREW_TEXT.questionnaire?.showWeeklySummary || "הצג סיכום שבועי")
              )
            }
          </button>
          {showWeeklySummary && (
            <div className="weekly-summary-content">
              {weeklySummaryLoading && (
                <div className="weekly-summary-loading">
                  <p>{HEBREW_TEXT.questionnaire?.loadingWeeklySummary || "טוען סיכום שבועי..."}</p>
                  <div className="loading-spinner"></div>
                </div>
              )}
              {weeklySummaryError && (
                <div className="weekly-summary-error">
                  <p className="error-message">{weeklySummaryError}</p>
                  <button 
                    onClick={handleShowWeeklySummary} 
                    className="retry-btn"
                    disabled={weeklySummaryLoading}
                  >
                    {HEBREW_TEXT.questionnaire?.retryButton || "נסה שוב"}
                  </button>
                </div>
              )}
              {weeklySummary && !weeklySummaryLoading && !weeklySummaryError && (
                <div className="weekly-summary-data">
                  <h4>
                    {HEBREW_TEXT.questionnaire?.weeklySummaryTitle || "סיכום שבועי אחרון"} 
                    <span className="week-date">
                      (שבוע המתחיל ב: {new Date(weeklySummary.week_start_date + "T00:00:00").toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                    </span>
                  </h4>
                  <div className="summary-section">
                    <p><strong>{HEBREW_TEXT.questionnaire?.summaryContentLabel || "תוכן הסיכום:"}</strong></p>
                    <p className="summary-text">{weeklySummary.summary_content || (<i>{HEBREW_TEXT.na || "אין תוכן"}</i>)}</p>
                  </div>
                  <div className="summary-section">
                    <p><strong>{HEBREW_TEXT.questionnaire?.strengthsLabel || "נקודות חוזק:"}</strong></p>
                    <p className="summary-text">{weeklySummary.strengths || (<i>{HEBREW_TEXT.na || "אין נקודות חוזק"}</i>)}</p>
                  </div>
                  <div className="summary-section">
                    <p><strong>{HEBREW_TEXT.questionnaire?.areasForImprovementLabel || "נקודות לשיפור:"}</strong></p>
                    <p className="summary-text">{weeklySummary.areas_for_improvement || (<i>{HEBREW_TEXT.na || "אין נקודות לשיפור"}</i>)}</p>
                  </div>
                </div>
              )}
              {!weeklySummary && !weeklySummaryLoading && !weeklySummaryError && (
                <div className="no-summary-message">
                  <p>{HEBREW_TEXT.questionnaire?.noWeeklySummaryFound || "לא נמצא סיכום שבועי עדיין."}</p>
                  <p className="help-text">{HEBREW_TEXT.questionnaire?.completeDailyQuestionnaires || "המשך למלא שאלונים יומיים כדי ליצור סיכום שבועי."}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Data Export/Import Section */}
        <div className="user-data-management-section">
          <h4>{HEBREW_TEXT.questionnaire?.userDataManagementTitle || "ניהול נתוני משתמש"}</h4>
          <div className="user-data-buttons">
            <button
              onClick={handleExportUserData}
              className="export-data-btn"
              disabled={isLoading || exportLoading || importLoading}
            >
              {exportLoading ? (HEBREW_TEXT.questionnaire?.exportingData || "מייצא נתונים...") : (HEBREW_TEXT.questionnaire?.exportDataButton || "ייצא נתונים לקובץ")}
            </button>
            {exportError && <p className="error-message">{exportError}</p>}
          </div>
          <div className="user-data-buttons">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportFileSelect} 
              style={{ display: 'none' }} 
            />
            <button
              onClick={triggerImportFile}
              className="import-data-btn"
              disabled={isLoading || exportLoading || importLoading}
            >
              {importLoading ? (HEBREW_TEXT.questionnaire?.importingData || "מייבא נתונים...") : (HEBREW_TEXT.questionnaire?.importDataButton || "ייבא נתונים מקובץ")}
            </button>
            {importError && <p className="error-message">{importError}</p>}
            {importSuccess && <p className="success-message">{importSuccess}</p>}
          </div>
        </div>


        {/* Delete All Data Section */}
        {!showDeleteConfirmation && (
          <div className="delete-all-data-section">
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="delete-all-data-btn"
              disabled={isLoading || exportLoading || importLoading} // Disable if questionnaire is loading or other data ops
            >
              {HEBREW_TEXT.questionnaire?.deleteAllDataButton || "מחק את כל הנתונים שלי"}
            </button>
          </div>
        )}

        {showDeleteConfirmation && (
          <div className="confirmation-dialog">
            <h3>{HEBREW_TEXT.questionnaire?.confirmDeleteTitle || "אישור מחיקת נתונים"}</h3>
            <p>{HEBREW_TEXT.questionnaire?.confirmDeleteMessage || "האם אתה בטוח? כל הנתונים יימחקו לצמיתות ואין אפשרות לשחזרם."}</p>
            {deleteError && <p className="error-message">{deleteError}</p>}
            {deleteSuccess && <p className="success-message">{deleteSuccess}</p>}
            <div className="confirmation-buttons">
              <button onClick={handleDeleteAllData} className="confirm-btn" disabled={!!deleteSuccess}>
                {HEBREW_TEXT.confirm || "אישור"}
              </button>
              <button onClick={() => { setShowDeleteConfirmation(false); setDeleteError(''); }} className="cancel-btn" disabled={!!deleteSuccess}>
                {HEBREW_TEXT.cancel || "ביטול"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionnaireModal;
