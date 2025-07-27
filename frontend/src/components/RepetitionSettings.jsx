// frontend/src/components/RepetitionSettings.jsx
import React from 'react';
// import { HEBREW_TEXT } from '../utils/constants';
// import './RepetitionSettings.css'; // CSS for this component

const RepetitionSettings = () => {
  // This component is a placeholder for future global repetition settings.
  // For example, default reminder intervals, notification preferences, etc.
  // Currently, all settings are per-repetition item.

  return (
    <div className="repetition-settings-view" style={{ padding: '20px', textAlign: 'center', color: '#a0aec0' }}>
      {/* <h2 style={{color: '#cbd5e0'}}>{HEBREW_TEXT.repetitions.settingsTitle || 'הגדרות חזרות'}</h2> */}
      <p>
        {/* {HEBREW_TEXT.repetitions.settingsPlaceholder || 'כאן יופיעו הגדרות גלובליות עבור מערכת החזרות בעתיד.'} */}
        (מקום שמור להגדרות גלובליות עבור מערכת החזרות)
      </p>
      {/* 
        Example future settings:
        <div>
          <label>Default Interval 1 (days):</label>
          <input type="number" />
        </div>
        // ... more default intervals
        <div>
          <label>Enable Desktop Notifications:</label>
          <input type="checkbox" />
        </div>
      */}
    </div>
  );
};

export default RepetitionSettings;