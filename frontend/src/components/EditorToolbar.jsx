// frontend/src/components/EditorToolbar.jsx
import React, { useState } from 'react';
import { HEBREW_TEXT, DEFAULT_FONT_SIZE_PX } from '../utils/constants'; // Ensure HEBREW_TEXT is imported
import FontSizeModal from './FontSizeModal';
import FontSelectionModal from './FontSelectionModal';
import { undo, redo } from '@codemirror/commands'; // Import undo and redo commands

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
  presentationFontSize, // Prop from App.jsx for presentation font size
  onPresentationFontSizeChange, // Prop from App.jsx for presentation font size change
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

  const handleSaveFontSize = (newSize, fontType) => {
    if (fontType === 'editor') {
      if (onEditorFontSizeChange) {
        onEditorFontSizeChange(newSize);
      }
    } else if (fontType === 'presentation') {
      if (onPresentationFontSizeChange) {
        onPresentationFontSizeChange(newSize);
      }
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

  // Redo function using CodeMirror's history
  const handleRedo = () => {
    if (!editorRef?.current) return;
    
    try {
      // Get the CodeMirror view from the Editor component
      const view = editorRef.current.getEditorView?.();
      if (!view || !view.state) return;
      
      // Use CodeMirror's redo command
      redo(view);
      view.focus();
    } catch (error) {
      console.error('שגיאה בביצוע redo:', error);
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
        borderBottom: '1px solid var(--theme-border-color)',
        backgroundColor: 'var(--theme-toolbar-bg)',
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
        className="btn btn-sm" // Changed from btn-secondary to default btn for non-gray style
        style={{
          marginRight: '8px', // Space before the next button
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
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        ↶ חזור
      </button>

      {/* Redo Button */}
      <button
        title="חזור לשינוי הבא (Ctrl+Y)"
        onClick={handleRedo}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={{
          marginRight: '8px',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
      >
        ↷ קדימה
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
        className="btn btn-sm" // Use default button styling for consistency
        style={{ // Consistent styling
          marginLeft: '15px',
          ...( (isFindingSources || isAiFeaturesActive) ? disabledStyle : {}),
        }}
      >
        {isFindingSources ? HEBREW_TEXT.findingSources : HEBREW_TEXT.findSources}
      </button>

      {/* New Transcription Feature Button */}
      <button
        title={HEBREW_TEXT.transcriptionFeatureButton}
        onClick={onOpenTranscriptionModal}
        disabled={isAiFeaturesActive} // Disable if other AI features are active or during general loading
        className="btn btn-sm" // Use default button styling for consistency
        style={{ // Kept specific styles
          marginLeft: '15px',
          ...(isAiFeaturesActive ? disabledStyle : {}),
        }}
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
        className="btn btn-sm" // Use default button styling for consistency
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
        }}
      >
        {HEBREW_TEXT.aramaicStudyButton}
      </button>

      <FontSizeModal
        isOpen={isFontSizeModalOpen}
        onClose={closeFontSizeModal}
        currentEditorSize={editorFontSize} // Use prop from App.jsx
        currentPresentationSize={presentationFontSize} // Use prop from App.jsx
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
