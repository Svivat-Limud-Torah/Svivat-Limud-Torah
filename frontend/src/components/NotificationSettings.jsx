// frontend/src/components/NotificationSettings.jsx
import React, { useState, useEffect } from 'react';
import { HEBREW_TEXT } from '../utils/constants';
// import './NotificationSettings.css'; // Optional: if more specific styles are needed

const NotificationSettings = ({
  currentSettings, // { enable_daily_questionnaire_reminder: bool, reminder_time: "HH:MM" }
  onUpdateSettings,
  onClose,
  isLoading,
  isInModal = false, // New prop to indicate if it's inside another modal
}) => {
  const [enableReminder, setEnableReminder] = useState(
    currentSettings.enable_daily_questionnaire_reminder
  );
  // Reminder time is fixed at "22:00" for now, so no UI to change it.
  // const [reminderTime, setReminderTime] = useState(currentSettings.reminder_time);

  useEffect(() => {
    setEnableReminder(currentSettings.enable_daily_questionnaire_reminder);
    // setReminderTime(currentSettings.reminder_time);
  }, [currentSettings]);

  const handleSave = () => {
    onUpdateSettings({
      enable_daily_questionnaire_reminder: enableReminder,
      // reminder_time: reminderTime, // If it becomes configurable
    });
  };

  const fixedReminderTime = "22:00"; // As per requirements

  // Basic styling, can be moved to a CSS file if it grows
  const modalStyle = isInModal ? {
    // When inside another modal, don't use fixed positioning
    backgroundColor: 'transparent',
    padding: '0',
    borderRadius: '0',
    zIndex: 'auto',
    color: 'var(--theme-text-primary, #E4E4E7)',
    width: '100%',
    maxWidth: 'none',
    boxShadow: 'none',
    direction: 'rtl',
    position: 'static',
    transform: 'none',
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#2d3748', // Tailwind gray-800
    padding: '25px 30px',
    borderRadius: '8px',
    zIndex: 1010, // Above questionnaire modal if both could appear
    color: '#e0e0e0', // Lighter text for dark background
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    direction: 'rtl',
  };

  const headerStyle = {
    textAlign: 'center',
    fontSize: '1.4em',
    marginBottom: '20px',
    color: '#81e6d9', // Tailwind teal-300
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    fontSize: '1.1em',
    justifyContent: 'space-between', // Pushes checkbox to the end
  };

  const checkboxStyle = {
    // marginLeft: '10px', // RTL: checkbox after text (not needed with justify-content)
    width: '20px',
    height: '20px',
    accentColor: '#81e6d9', // Teal accent for checkbox
    cursor: 'pointer',
  };

  const infoTextStyle = {
    fontSize: '0.9em',
    color: '#a0aec0', // Tailwind gray-400
    marginBottom: '20px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '25px',
  };

  const buttonStyle = (isPrimary) => ({
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    backgroundColor: isPrimary ? '#38a169' : '#718096', // Green for primary, gray for secondary
    color: 'white',
    opacity: isLoading ? 0.7 : 1,
    minWidth: '100px',
    textAlign: 'center',
  });


  return (
    <div style={modalStyle} className={isInModal ? 'notification-settings-content' : ''}>
      <h3 style={headerStyle}>{HEBREW_TEXT.questionnaire?.notificationSettingsTitle || "הגדרות תזכורת"}</h3>
      
      <label style={labelStyle}>
        <span>{HEBREW_TEXT.questionnaire?.enableDailyReminder || "אפשר תזכורת יומית לשאלון"}</span>
        <input
          type="checkbox"
          checked={enableReminder}
          onChange={(e) => setEnableReminder(e.target.checked)}
          style={checkboxStyle}
          disabled={isLoading}
        />
      </label>

      <p style={infoTextStyle}>
        {HEBREW_TEXT.questionnaire?.reminderInfo(fixedReminderTime) || `התזכורת תישלח כל יום בשעה ${fixedReminderTime} אם השאלון לא הושלם.`}
      </p>
      
      {/* Placeholder for time selection if it becomes dynamic in the future
      {enableReminder && (
        <div>
          <label>
            {HEBREW_TEXT.questionnaire?.reminderTime || "שעת תזכורת:"}
            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isLoading} />
          </label>
        </div>
      )}
      */}

      {!isInModal && (
        <div style={buttonContainerStyle}>
          <button onClick={onClose} style={buttonStyle(false)} disabled={isLoading}>
            {HEBREW_TEXT.close || "סגור"}
          </button>
          <button onClick={handleSave} style={buttonStyle(true)} disabled={isLoading}>
            {isLoading ? (HEBREW_TEXT.saving || "שומר...") : (HEBREW_TEXT.saveChanges || "שמור שינויים")}
          </button>
        </div>
      )}
      
      {isInModal && (
        <div style={{...buttonContainerStyle, justifyContent: 'center', marginTop: '20px'}}>
          <button onClick={handleSave} style={buttonStyle(true)} disabled={isLoading}>
            {isLoading ? (HEBREW_TEXT.saving || "שומר...") : (HEBREW_TEXT.saveChanges || "שמור שינויים")}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;