// frontend/src/components/HelpModal.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose, onStartTour }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const openYouTubeChannel = () => {
    // כאן נוסיף את הקישור לערוץ יוטיוב בפועל
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal('https://www.youtube.com/@Svivat-Limud-Torah');
    } else {
      window.open('https://www.youtube.com/@Svivat-Limud-Torah', '_blank');
    }
  };

  return (
    <div className="help-modal-overlay" onClick={handleOverlayClick}>
      <div className="help-modal-content">
        <div className="help-modal-header">
          <h2>{HEBREW_TEXT.helpModalTitle}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="help-modal-body">
          {/* מדריך אינטראקטיבי */}
          <div className="help-section">
            <h3>מדריך אינטראקטיבי</h3>
            <p>הפעל את המדריך כדי להכיר את התכונות העיקריות של התוכנה צעד אחר צעד.</p>
            <button
              className="help-link-button tour-button"
              onClick={onStartTour}
            >
              הפעל מדריך
            </button>
          </div>

          {/* ערוץ יוטיוב */}
          <div className="help-section">
            <h3>{HEBREW_TEXT.helpModalYoutubeTitle}</h3>
            <p>{HEBREW_TEXT.helpModalYoutubeDescription}</p>
            <button 
              className="help-link-button youtube-button"
              onClick={openYouTubeChannel}
            >
              {HEBREW_TEXT.helpModalYoutubeLink}
            </button>
          </div>

          {/* תכונות התוכנה */}
          <div className="help-section features-section">
            <h3>{HEBREW_TEXT.helpModalFeaturesTitle}</h3>
            <p>{HEBREW_TEXT.helpModalFeaturesDescription}</p>
            <ul className="features-list">
              {HEBREW_TEXT.helpModalFeatures.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="help-modal-footer">
          <button className="close-footer-button" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
