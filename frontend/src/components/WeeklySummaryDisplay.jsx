// frontend/src/components/WeeklySummaryDisplay.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants'; 

const WeeklySummaryDisplay = ({ summary, isLoading, error, onFetchPreviousAnswers, currentWeekDateRange }) => {
  const containerStyle = {
    padding: '20px',
    backgroundColor: 'var(--theme-bg-secondary)',
    borderRadius: '8px',
    color: 'var(--theme-text-primary)',
    maxWidth: '800px',
    margin: '20px auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '1px solid var(--theme-border-color)',
    direction: 'rtl',
  };

  const titleStyle = {
    // fontSize removed - using h2 global style
    color: 'var(--theme-success-color)',
    marginBottom: '15px',
    textAlign: 'center',
    borderBottom: '1px solid var(--theme-border-color)',
    paddingBottom: '10px',
  };

  const sectionTitleStyle = {
    // fontSize removed - using h3 global style
    color: 'var(--theme-text-secondary)',
    marginTop: '20px',
    marginBottom: '8px',
  };

  const contentStyle = {
    // fontSize removed - using p global style
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    backgroundColor: 'var(--theme-bg-tertiary)',
    padding: '10px',
    borderRadius: '4px',
  };

  const buttonStyle = {
    padding: '10px 15px',
    backgroundColor: 'var(--theme-accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9em',
    marginTop: '20px',
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  const noSummaryStyle = {
    textAlign: 'center',
    padding: '30px',
    // fontSize removed - relying on inner p tags
  };

  if (isLoading) {
    return <div style={containerStyle}>{HEBREW_TEXT.questionnaire?.loadingSummary || "טוען סיכום שבועי..."}</div>;
  }

  if (error) {
    return <div style={{...containerStyle, color: 'var(--theme-error-color)'}}>{HEBREW_TEXT.questionnaire?.errorLoadingSummary || "שגיאה בטעינת הסיכום:"} {error}</div>;
  }

  // Use currentWeekDateRange if summary itself doesn't have week_start_date (e.g. during generation)
  const displayWeekStartDate = summary?.week_start_date || currentWeekDateRange?.startDate;


  if (!summary || !summary.summary_content) {
    return (
      <div style={containerStyle}>
        <div style={noSummaryStyle}>
            <p>{HEBREW_TEXT.questionnaire?.noSummaryAvailable || "אין סיכום שבועי זמין עדיין."}</p>
            {displayWeekStartDate && (
                 <p style={{/* fontSize removed */ color: 'var(--theme-text-secondary)'}}>
                    ({HEBREW_TEXT.questionnaire?.weekOf || "שבוע של"} {new Date(displayWeekStartDate + "T00:00:00").toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })})
                </p>
            )}
            <p>{HEBREW_TEXT.questionnaire?.completeDailyQuestionnaires || "אנא המשך למלא את השאלונים היומיים."}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>
        {HEBREW_TEXT.questionnaire?.weeklySummaryTitle || "סיכום התקדמות שבועי"}
        {displayWeekStartDate && (
            <span style={{/* fontSize removed */ display: 'block', color: 'var(--theme-text-secondary)', marginTop: '5px'}}>
                ({HEBREW_TEXT.questionnaire?.weekOf || "שבוע של"} {new Date(displayWeekStartDate + "T00:00:00").toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })})
            </span>
        )}
        </h2>

      <div>
        <h3 style={sectionTitleStyle}>{HEBREW_TEXT.questionnaire?.overallStatus || "סטטוס כללי והתקדמות:"}</h3>
        <p style={contentStyle}>{summary.summary_content}</p>
      </div>

      {summary.strengths && (
        <div>
          <h3 style={sectionTitleStyle}>{HEBREW_TEXT.questionnaire?.strengths || "נקודות חוזק:"}</h3>
          <p style={contentStyle}>{summary.strengths}</p>
        </div>
      )}

      {summary.areas_for_improvement && (
        <div>
          <h3 style={sectionTitleStyle}>{HEBREW_TEXT.questionnaire?.areasForImprovement || "נקודות לשיפור:"}</h3>
          <p style={contentStyle}>{summary.areas_for_improvement}</p>
        </div>
      )}

      {onFetchPreviousAnswers && typeof onFetchPreviousAnswers === 'function' && displayWeekStartDate && (
        <button
            className="btn btn-primary" // Added btn classes
            onClick={() => onFetchPreviousAnswers(displayWeekStartDate, summary.week_end_date || currentWeekDateRange?.endDate)}
            // style={buttonStyle} removed - using btn classes
            disabled={isLoading}
        >
          {HEBREW_TEXT.questionnaire?.viewWeeklyAnswers || "הצג תשובות יומיות משבוע זה"}
        </button>
      )}
    </div>
  );
};

export default WeeklySummaryDisplay;
