import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { HEBREW_TEXT } from '../utils/constants';
import './JudaismChatModal.css'; // We'll create this next

const JudaismChatModal = ({ isOpen, onClose, useJudaismChatHook }) => {
  const {
    chatHistory,
    isJudaismChatLoading,
    judaismChatError,
    sendMessageToJudaismChat,
    clearJudaismChat,
    chatInputRef,
    chatBodyRef, // Use ref from hook
    rememberHistory, // Get state from hook
    toggleRememberHistory, // Get function from hook
  } = useJudaismChatHook;

  const [userInput, setUserInput] = useState('');
  // Removed enableGoogleSearch state - no longer needed
  // Removed local chatBodyRef, using the one from the hook

  useEffect(() => {
    if (isOpen) {
      // Only clear history if 'remember history' is OFF
      if (!rememberHistory) {
        clearJudaismChat();
      }
      // Focus input after a short delay
      setTimeout(() => {
        if (chatInputRef.current) {
           chatInputRef.current.focus();
        }
      }, 100); // Delay focus slightly to ensure modal is rendered
    }
    // Dependency array includes rememberHistory now
  }, [isOpen, clearJudaismChat, chatInputRef, rememberHistory]);

  // Removed local useEffect for scrolling, handled in the hook now

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim() && !isJudaismChatLoading) {
      sendMessageToJudaismChat(userInput, false); // Always pass false since we removed Google search
      setUserInput('');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="judaism-chat-modal-overlay" onClick={onClose}>
      <div className="judaism-chat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="judaism-chat-modal-header">
          <h2>{HEBREW_TEXT.judaismChat.modalTitle}</h2>
          <button onClick={onClose} className="judaism-chat-modal-close-btn">
            &times;
          </button>
        </div>
        
        {/* Google AI Studio Recommendation */}
        <div className="judaism-chat-recommendation">
          <p>{HEBREW_TEXT.judaismChat.googleAiStudioRecommendation}</p>
          <a 
            href={HEBREW_TEXT.judaismChat.googleAiStudioLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="google-ai-studio-link"
          >
            {HEBREW_TEXT.judaismChat.openGoogleAiStudio}
          </a>
        </div>
        <div className="judaism-chat-modal-body" ref={chatBodyRef}>
          {chatHistory.map((msg, index) => (
            <div key={index} className={`judaism-chat-message judaism-chat-${msg.sender} ${msg.isError ? 'judaism-chat-error-message' : ''}`}>
              <p>{msg.text}</p>
            </div>
          ))}
          {isJudaismChatLoading && (
            <div className="judaism-chat-message judaism-chat-ai">
              <p>{HEBREW_TEXT.judaismChat.typing || 'חושב...'}</p>
            </div>
          )}
          {judaismChatError && !isJudaismChatLoading && (
             <div className="judaism-chat-message judaism-chat-ai judaism-chat-error-message">
               <p>{HEBREW_TEXT.judaismChat.errorPrefix}: {judaismChatError}</p>
             </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="judaism-chat-modal-footer">
          <div className="judaism-chat-options">
            {/* Add Remember History Checkbox */}
            <label style={{ marginRight: '15px' }}> {/* Add some spacing */}
              <input
                type="checkbox"
                checked={rememberHistory}
                onChange={toggleRememberHistory} // Use the function from the hook
                disabled={isJudaismChatLoading} // Disable while loading like the other controls
              />
              {HEBREW_TEXT.judaismChat.rememberHistory || 'זכור היסטוריה'}
            </label>
          </div>
          <input
             type="text"
            ref={chatInputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={HEBREW_TEXT.judaismChat.inputPlaceholder}
            disabled={isJudaismChatLoading}
          />
          <button type="submit" disabled={isJudaismChatLoading}>
            {isJudaismChatLoading ? HEBREW_TEXT.judaismChat.sending : HEBREW_TEXT.judaismChat.sendButton}
          </button>
        </form>
      </div>
    </div>
  );
};

JudaismChatModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  useJudaismChatHook: PropTypes.shape({
    chatHistory: PropTypes.array.isRequired,
    isJudaismChatLoading: PropTypes.bool.isRequired,
    judaismChatError: PropTypes.string,
    sendMessageToJudaismChat: PropTypes.func.isRequired,
    clearJudaismChat: PropTypes.func.isRequired,
    chatInputRef: PropTypes.object.isRequired,
    chatBodyRef: PropTypes.object.isRequired, // Add chatBodyRef prop type
    rememberHistory: PropTypes.bool.isRequired, // Add rememberHistory prop type
    toggleRememberHistory: PropTypes.func.isRequired, // Add toggleRememberHistory prop type
  }).isRequired,
};

export default JudaismChatModal;
