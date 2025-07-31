// frontend/src/components/SettingsModal.jsx
import React, { useState } from 'react';
import './SettingsModal.css';
import { HEBREW_TEXT } from '../utils/constants';
import NotificationSettings from './NotificationSettings';
import DesignSettings from './DesignSettings';
import TextOrganizationSettings from './TextOrganizationSettings';

const SettingsModal = ({ 
  isOpen, 
  onClose,
  // Notification settings props
  notificationSettings,
  onUpdateNotificationSettings,
  isNotificationLoading,
  // Design settings props
  currentTheme,
  onUpdateTheme,
  onOpenFileConversion
}) => {
  const [activeTab, setActiveTab] = useState('notifications');

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs = [
    { id: 'notifications', label: 'הגדרות התראות', icon: '🔔' },
    { id: 'design', label: 'הגדרות עיצוב', icon: '🎨' },
    { id: 'textOrganization', label: 'ארגון טקסט', icon: '📝' },
    { id: 'about', label: 'אודות', icon: 'ℹ️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <NotificationSettings
            currentSettings={notificationSettings}
            onUpdateSettings={onUpdateNotificationSettings}
            onClose={() => {}} // Don't close the main modal
            isLoading={isNotificationLoading}
            isInModal={true} // Indicate it's inside another modal
          />
        );
      case 'design':
        return (
          <DesignSettings
            currentTheme={currentTheme}
            onUpdateTheme={onUpdateTheme}
          />
        );
      case 'textOrganization':
        return (
          <TextOrganizationSettings
            isInModal={true}
          />
        );
      case 'about':
        return (
          <div className="about-section">
            <h3>אודות התוכנה</h3>
            <div className="about-info">
              <p>סביבת לימוד תורה - תוכנה לעריכת טקסט וניתוח מקורות יהודיים</p>
              <p>גרסה: 1.0.0</p>
              <div className="about-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={onOpenFileConversion}
                  title="המרת קבצים לפורמט Markdown"
                >
                  המרת קבצים
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-backdrop settings-modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header settings-modal-header">
          <h2>הגדרות</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="settings-modal-body">
          <div className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="settings-content">
            {renderTabContent()}
          </div>
        </div>
        
        <div className="modal-footer settings-modal-footer">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
