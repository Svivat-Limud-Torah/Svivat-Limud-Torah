import React, { useState, useEffect } from 'react';
import './TextOrganizationProgressModal.css';
import { HEBREW_TEXT } from '../utils/constants';

const TextOrganizationProgressModal = ({ 
  isOpen, 
  onClose, 
  onCancel,
  textLength,
  selectedAiModel,
  isProcessing,
  currentStep,
  totalSteps,
  stepDetails,
  estimatedTimeRemaining,
  processingSpeed,
  completedSteps
}) => {
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen || !isProcessing) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isProcessing, startTime]);

  if (!isOpen) return null;

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const calculateProgress = () => {
    if (!totalSteps || totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getStepStatus = (stepIndex) => {
    if (stepIndex < completedSteps) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'pending';
  };

  const renderStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <span className="step-icon completed">✓</span>;
      case 'active':
        return <span className="step-icon active">⟳</span>;
      case 'pending':
        return <span className="step-icon pending">○</span>;
      default:
        return <span className="step-icon">○</span>;
    }
  };

  const progressPercentage = calculateProgress();

  return (
    <div className="text-organization-progress-overlay" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={`text-organization-progress-modal ${isMinimized ? 'minimized' : ''}`}>
        <div className="progress-header">
          <h2>{HEBREW_TEXT.textOrganizationProgress || 'התקדמות ארגון טקסט'}</h2>
          <div className="header-controls">
            <button 
              className="minimize-btn" 
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "הרחב" : "מזער"}
            >
              {isMinimized ? '□' : '−'}
            </button>
            {onClose && (
              <button className="close-btn" onClick={onClose}>✕</button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <div className="progress-content">
            {/* Overall Progress */}
            <div className="overall-progress">
              <div className="progress-info">
                <span className="progress-text">
                  {isProcessing ? 'מעבד...' : 'הושלם'} ({completedSteps}/{totalSteps})
                </span>
                <span className="progress-percentage">{progressPercentage}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Text Statistics - Simplified */}
            <div className="text-stats">
              <div className="stat-item">
                <span className="stat-label">שורות טקסט:</span>
                <span className="stat-value">{textLength?.toLocaleString() || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">מודל AI:</span>
                <span className="stat-value">{selectedAiModel || 'gemini-2.5-flash'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">שלב נוכחי:</span>
                <span className="stat-value">{currentStep + 1} מתוך {totalSteps}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">סטטוס:</span>
                <span className="stat-value">{isProcessing ? 'פעיל' : 'הושלם'}</span>
              </div>
            </div>

            {/* Detailed Steps */}
            <div className="steps-container">
              <h3>שלבי העיבוד:</h3>
              <div className="steps-list">
                {stepDetails && stepDetails.map((step, index) => {
                  const status = getStepStatus(index);
                  return (
                    <div key={index} className={`step-item ${status}`}>
                      {renderStepIcon(status)}
                      <div className="step-content">
                        <span className="step-title">{step.title}</span>
                        <span className="step-description">{step.description}</span>
                        {step.subSteps && step.subSteps.length > 0 && (
                          <div className="sub-steps">
                            {step.subSteps.map((subStep, subIndex) => (
                              <div key={subIndex} className="sub-step">
                                <span className="sub-step-bullet">•</span>
                                <span>{subStep}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {status === 'active' && step.currentOperation && (
                          <div className="current-operation">
                            <span className="operation-text">{step.currentOperation}</span>
                            <div className="loading-dots">
                              <span>.</span><span>.</span><span>.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Insights */}
            {isProcessing && (
              <div className="performance-insights">
                <h4>תובנות ביצועים:</h4>
                <div className="insights-grid">
                  <div className="insight-item">
                    <span className="insight-icon">🧠</span>
                    <span>המודל מנתח את מבנה הטקסט</span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">📝</span>
                    <span>יוצר היררכיה של כותרות</span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">🎯</span>
                    <span>משפר את הזרימה והקריאות</span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">✨</span>
                    <span>מיטב פורמט Markdown</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="progress-footer">
          {isProcessing ? (
            <>
              {onCancel && (
                <button className="btn btn-secondary" onClick={onCancel}>
                  בטל עיבוד
                </button>
              )}
              <div className="processing-status">
                <span className="processing-icon">⏳</span>
                <span>מעבד...</span>
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              סגור
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextOrganizationProgressModal;
