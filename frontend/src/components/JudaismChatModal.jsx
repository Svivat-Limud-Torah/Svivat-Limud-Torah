import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { HEBREW_TEXT } from '../utils/constants';
import './JudaismChatModal.css';

const SUGGESTED_QUESTIONS = [
  'מה ההבדל בין שבת לחג?',
  'מה הם שלוש עשרה עיקרי האמונה?',
  'מה פירוש "קדיש"?',
  'מה הם ארבעת המינים?',
  'מה ההלכה לגבי כשרות?',
  'תסביר מה זה ספר התורה',
];

// Render AI message text — handles **bold**, newlines, and bullet lists
function ChatText({ text }) {
  const lines = text.split('\n');
  return (
    <div className="jc-message-text">
      {lines.map((line, i) => {
        const isBullet = /^[\-•*]\s/.test(line.trim());
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        );
        return (
          <React.Fragment key={i}>
            {i > 0 && !isBullet && <br />}
            {isBullet
              ? <div className="jc-bullet">{rendered}</div>
              : rendered}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const JudaismChatModal = ({ isOpen, onClose, useJudaismChatHook }) => {
  const {
    chatHistory,
    isJudaismChatLoading,
    sendMessageToJudaismChat,
    clearJudaismChat,
    chatInputRef,
    chatBodyRef,
  } = useJudaismChatHook;

  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      clearJudaismChat(); // Always start fresh each time the modal opens
      setTimeout(() => chatInputRef.current?.focus(), 120);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(() => {
    const trimmed = userInput.trim();
    if (trimmed && !isJudaismChatLoading) {
      sendMessageToJudaismChat(trimmed, false);
      setUserInput('');
    }
  }, [userInput, isJudaismChatLoading, sendMessageToJudaismChat]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (q) => {
    if (!isJudaismChatLoading) {
      sendMessageToJudaismChat(q, false);
    }
  };

  if (!isOpen) return null;

  const isEmpty = chatHistory.length === 0 && !isJudaismChatLoading;

  return (
    <div className="jc-overlay" onClick={onClose}>
      <div className="jc-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="jc-header">
          <div className="jc-header-title">
            <span className="jc-header-icon"></span>
            <span>{HEBREW_TEXT.judaismChat.modalTitle}</span>
          </div>
          <div className="jc-header-actions">
            {chatHistory.length > 0 && (
              <button className="jc-icon-btn" onClick={clearJudaismChat} title="נקה שיחה">
                🗑
              </button>
            )}
            <button className="jc-close-btn" onClick={onClose} title="סגור">✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="jc-body" ref={chatBodyRef}>

          {isEmpty && (
            <div className="jc-welcome">
              <div className="jc-welcome-icon"></div>
              <h3>שלום! אני כאן לענות על שאלות בנושאי יהדות</h3>
              <p>תורה, תלמוד, הלכה, מנהגים, היסטוריה יהודית ועוד.</p>
              <div className="jc-suggestions">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} className="jc-suggestion-chip" onClick={() => handleSuggestion(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`jc-message jc-message--${msg.sender}${msg.isError ? ' jc-message--error' : ''}`}
            >
              {msg.sender === 'ai' && <div className="jc-message-avatar"></div>}
              <div className="jc-message-bubble">
                {msg.sender === 'ai' && !msg.isError
                  ? <ChatText text={msg.text} />
                  : <div className="jc-message-text">{msg.text}</div>
                }
              </div>
            </div>
          ))}

          {isJudaismChatLoading && (
            <div className="jc-message jc-message--ai">
              <div className="jc-message-avatar"></div>
              <div className="jc-message-bubble">
                <div className="jc-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="jc-footer">
          <textarea
            ref={chatInputRef}
            className="jc-input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={HEBREW_TEXT.judaismChat.inputPlaceholder}
            disabled={isJudaismChatLoading}
            rows={1}
          />
          <button
            className={`jc-send-btn${isJudaismChatLoading ? ' jc-send-btn--loading' : ''}`}
            onClick={handleSend}
            disabled={isJudaismChatLoading || !userInput.trim()}
            title="שלח (Enter)"
          >
            {isJudaismChatLoading ? '⏳' : '➤'}
          </button>
        </div>
        <div className="jc-footer-hint">Enter לשליחה &nbsp;·&nbsp; Shift+Enter לשורה חדשה</div>

      </div>
    </div>
  );
};

JudaismChatModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  useJudaismChatHook: PropTypes.object.isRequired,
};

export default JudaismChatModal;
