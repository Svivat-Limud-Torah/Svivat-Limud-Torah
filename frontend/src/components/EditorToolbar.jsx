// frontend/src/components/EditorToolbar.jsx
import React, { useState } from 'react';
import { HEBREW_TEXT, DEFAULT_FONT_SIZE_PX } from '../utils/constants'; // Ensure HEBREW_TEXT is imported
import FontSizeModal from './FontSizeModal';
import FontSelectionModal from './FontSelectionModal';
import { undo } from '@codemirror/commands'; // Import undo command

const EditorToolbar = ({
  onFindSources,
  isFindingSources,
  isAiFeaturesActive,
  onOpenTranscriptionModal,
  onGeneratePilpulta, // New prop for Pilpulta feature
  onOpenSmartSearchModal, // New prop for Smart Search
  onGenerateFlashcards, // New prop for Flashcards feature
  isGeneratingFlashcards, // New prop for Flashcards loading state
  editorFontSize, // Prop from App.jsx
  onEditorFontSizeChange, // Prop from App.jsx
  handleToggleMainView, // New prop for toggling main view
  mainViewMode, // New prop for current main view mode
  activeTabObject, // New prop to check file type
  appFont, // New prop for app font
  editorFont, // New prop for editor font  
  onAppFontChange, // New prop for app font change
  onEditorFontChange, // New prop for editor font change
  repetitionsHook, // New prop for repetitions notifications
  editorRef, // New prop for editor reference to enable undo
}) => {
  const [isFontSizeModalOpen, setIsFontSizeModalOpen] = useState(false);
  const [isFontSelectionModalOpen, setIsFontSelectionModalOpen] = useState(false);

  const openFontSizeModal = () => setIsFontSizeModalOpen(true);
  const closeFontSizeModal = () => setIsFontSizeModalOpen(false);
  
  const openFontSelectionModal = () => setIsFontSelectionModalOpen(true);
  const closeFontSelectionModal = () => setIsFontSelectionModalOpen(false);

  const handleSaveFontSize = (newSize) => {
    if (onEditorFontSizeChange) {
      onEditorFontSizeChange(newSize);
    }
    // The local currentEditorFontSize state is removed, App.jsx manages the source of truth.
    // The modal will get its currentSize directly from the editorFontSize prop.
  };

  // Undo function using CodeMirror's history
  const handleUndo = () => {
    if (!editorRef?.current) return;
    
    try {
      // Get the CodeMirror view from the Editor component
      const view = editorRef.current.getEditorView?.();
      if (!view || !view.state) return;
      
      // Use CodeMirror's undo command
      undo(view);
      view.focus();
    } catch (error) {
      console.error('שגיאה בביצוע undo:', error);
    }
  };

  // const handleFontSizeIncrease = () => { // Removed as A+ button is removed
  //   onApplyStyle('fontSize', { action: 'increase' });
  // };

  // const handleFontSizeDecrease = () => { // Removed as A- button is removed
  //   onApplyStyle('fontSize', { action: 'decrease' });
  // };

  // const handleBoldClick = () => { // Removed as B button is removed
  //   onApplyStyle('bold', { active: true });
  // };

  const buttonStyle = {
    backgroundColor: '#555e69',
    color: 'white',
    border: '1px solid #4a5568',
    padding: '4px 8px',
    height: '28px',
    cursor: 'pointer',
    /* fontSize removed - using btn-sm */
    borderRadius: '3px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'border-color 0.2s, transform 0.1s, background-color 0.2s',
  };

  const buttonHoverStyle = {
    backgroundColor: '#6b7280',
    borderColor: '#718096',
  };

  const buttonActiveStyle = {
    transform: 'scale(0.95)',
  };

  const disabledStyle = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  // Check if current file is Markdown
  const isMarkdownFile = activeTabObject?.id?.toLowerCase().endsWith('.md') || false;
  // For TXT files or non-MD files, only show basic editing (no advanced features)
  const shouldShowAdvancedFeatures = isMarkdownFile;


  return (
    <div style={{
        padding: '6px 10px',
        borderBottom: '1px solid #2d3748',
        backgroundColor: '#23272c',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: '40px'
    }}>
      
      {/* Font Size Button - Always available */}
      <button
        title={HEBREW_TEXT.fontSizeModal?.buttonText || "Set Font Size"}
        onClick={openFontSizeModal}
        disabled={isAiFeaturesActive} // Consistent with other buttons
        className="btn btn-sm" // Changed from btn-secondary to default btn for non-blue style
        style={{
          marginRight: '8px', // Space before the next button
          outline: 'none', // No blue outline on focus
          boxShadow: 'none', // No box shadow
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        {HEBREW_TEXT.fontSizeModal?.buttonText || "גודל גופן"}
      </button>
      
      {/* Font Selection Button */}
      <button
        title="בחירת פונט לתוכנה ולעורך"
        onClick={openFontSelectionModal}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={{
          marginRight: '8px', // Always space before the next button
          outline: 'none',
          boxShadow: 'none',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        בחירת פונט
      </button>

      {/* Undo Button */}
      <button
        title="חזור לשינוי הקודם (Ctrl+Z)"
        onClick={handleUndo}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={{
          marginRight: '8px',
          outline: 'none',
          boxShadow: 'none',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        חזור
      </button>

      {/* Flashcards Button - moved from App.jsx and placed before Find Sources */}
      <button
        title={isGeneratingFlashcards ? HEBREW_TEXT.generatingFlashcards : HEBREW_TEXT.generateFlashcards}
        onClick={onGenerateFlashcards}
        disabled={isGeneratingFlashcards || isAiFeaturesActive}
        className="btn btn-sm"
        style={{
          marginLeft: '15px',
          ...( (isGeneratingFlashcards || isAiFeaturesActive) ? disabledStyle : {}),
        }}
      >
        {isGeneratingFlashcards ? HEBREW_TEXT.generatingFlashcards : HEBREW_TEXT.generateFlashcards}
      </button>

      <button
        title={isFindingSources ? HEBREW_TEXT.findingSources : HEBREW_TEXT.findSources}
        onClick={onFindSources}
        disabled={isFindingSources || isAiFeaturesActive}
        className="btn btn-info btn-sm" // Added btn classes (info for blue)
        style={{ // Kept specific styles
          backgroundColor: isFindingSources ? '#f59e0b' : undefined, // Keep warning color when finding
          marginLeft: '15px',
          ...( (isFindingSources || isAiFeaturesActive) ? disabledStyle : {}),
        }}
        // Removed hover/active styles handled by btn classes
      >
        {isFindingSources ? HEBREW_TEXT.findingSources : HEBREW_TEXT.findSources}
      </button>

      {/* New Transcription Feature Button */}
      <button
        title={HEBREW_TEXT.transcriptionFeatureButton}
        onClick={onOpenTranscriptionModal}
        disabled={isAiFeaturesActive} // Disable if other AI features are active or during general loading
        className="btn btn-success btn-sm" // Added btn classes (success for green)
        style={{ // Kept specific styles
          marginLeft: '15px',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
        // Removed hover/active styles handled by btn classes
      >
        {HEBREW_TEXT.transcriptionFeatureButton}
      </button>

      {/* Repetitions Button */}
      <button
        title={HEBREW_TEXT.repetitions?.title || "חזרות"}
        onClick={() => handleToggleMainView('repetitions')}
        disabled={isAiFeaturesActive}
        className={`btn btn-sm ${mainViewMode === 'repetitions' ? 'btn-primary' : ''}`}
        style={{
          marginLeft: '8px',
          position: 'relative',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        {HEBREW_TEXT.repetitions?.title || "חזרות"}
        {/* Red notification dot for overdue repetitions */}
        {repetitionsHook && repetitionsHook.hasRepetitionsDueToday && repetitionsHook.hasRepetitionsDueToday() && (
          <span className="repetitions-notification-dot" />
        )}
      </button>

      {/* New Pilpulta Feature Button */}
      <button
        title={HEBREW_TEXT.generatePilpultaTitle || "צור פלפולתא (קושיות מהטקסט)"} // Add text to constants later
        onClick={onGeneratePilpulta}
        disabled={isAiFeaturesActive} // Disable if other AI features are active
        className="btn btn-warning btn-sm" // Use warning (orange) for this new AI feature
        style={{
          marginLeft: '15px', // Add space from previous button
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        {HEBREW_TEXT.generatePilpultaButton || "פלפולתא"} {/* Add text to constants later */}
      </button>

      {/* New Smart Search Button */}
      <button
        title={HEBREW_TEXT.smartSearchButtonTooltip}
        onClick={onOpenSmartSearchModal}
        disabled={isAiFeaturesActive}
        className="btn btn-sm" // Removed btn-secondary to use default .btn styles
        style={{
          marginLeft: '8px',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        {HEBREW_TEXT.smartSearchButtonText}
      </button>

      {/* New Orot HaTorah Link Button */}
      <button
        title={HEBREW_TEXT.openOrotHatorahLink}
        onClick={() => window.open('https://spiffy-bunny-1b6a99.netlify.app', '_blank')}
        className="btn btn-secondary btn-sm" // Changed to secondary for a more standard look
        style={{
          marginLeft: '8px', // Add some space from the previous button
          color: 'white', // Ensure text is white
          border: '1px solid #4a5568', // Explicitly set border to match other non-highlighted button borders
          outline: 'none', // Remove focus outline
          boxShadow: 'none', // Remove any box shadow
        }}
      >
        {HEBREW_TEXT.openOrotHatorahLink}
      </button>

      {/* Smart Discussion Button */}
      <button
        title={HEBREW_TEXT.smartDiscussionButtonTooltip}
        onClick={() => window.open('https://radiant-heliotrope-e42025.netlify.app', '_blank')}
        className="btn btn-secondary btn-sm"
        style={{
          marginLeft: '8px',
          color: 'white',
          border: '1px solid #4a5568',
          outline: 'none',
          boxShadow: 'none',
        }}
      >
        {HEBREW_TEXT.smartDiscussionButton}
      </button>

      {/* Aramaic Study Button */}
      <button
        title={HEBREW_TEXT.aramaicStudyButtonTooltip}
        onClick={() => window.open('https://wondrous-empanada-6aa695.netlify.app', '_blank')}
        className="btn btn-secondary btn-sm"
        style={{
          marginLeft: '8px',
          color: 'white',
          border: '1px solid #4a5568',
          outline: 'none',
          boxShadow: 'none',
        }}
      >
        {HEBREW_TEXT.aramaicStudyButton}
      </button>

      <FontSizeModal
        isOpen={isFontSizeModalOpen}
        onClose={closeFontSizeModal}
        currentSize={editorFontSize} // Use prop from App.jsx
        onSaveFontSize={handleSaveFontSize}
      />
      
      <FontSelectionModal
        isOpen={isFontSelectionModalOpen}
        onClose={closeFontSelectionModal}
        currentAppFont={appFont}
        currentEditorFont={editorFont}
        onSaveAppFont={onAppFontChange}
        onSaveEditorFont={onEditorFontChange}
      />
    </div>
  );
};

export default EditorToolbar;
