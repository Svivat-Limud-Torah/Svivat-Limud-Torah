// frontend/src/components/EditorToolbar.jsx
import React, { useState } from 'react';
import { HEBREW_TEXT } from '../utils/constants';

const AI_TOOLS_INFO = [
  {
    title: 'סיכום שיעורים מיוטיוב / קבצי שמע',
    description: [
      'גמיני של גוגל (מצב Pro) מצוין לסיכום שיעורים מיוטיוב ומקבצי שמע.',
      'מספיק להדביק קישור לסרטון או להעלות קובץ שמע — הוא יסכם ויסביר.',
      'גם לפרשנות טקסט וסיכום מקורות כתובים — גמיני Pro עושה עבודה מצוינת.',
    ],
    links: [{ label: 'פתח את גמיני', url: 'https://gemini.google.com/' }],
  },
  {
    title: 'שינון חומר באמצעות שירים',
    description: [
      'שיטה יצירתית לשינון: בקש מגמיני לכתוב שיר על הסוגיה שאתה לומד, או כתוב בעצמך.',
      'אחר כך העבר את המלל ל-Suno AI — הוא יהפוך אותו לשיר עם מנגינה.',
      'שינון דרך מוזיקה קל הרבה יותר משינון טקסט גולמי.',
    ],
    links: [
      { label: 'פתח את גמיני', url: 'https://gemini.google.com/' },
      { label: 'פתח את Suno AI', url: 'https://suno.com/' },
    ],
  },
  {
    title: 'חיפוש מקורות',
    description: [
      'שתי שיטות מומלצות לחיפוש מקורות תורניים:',
      '1. בקש מגמיני או מגרוק — שניהם מצוינים לאיתור מקורות.',
      '2. אם יש לך זמן — הפעל את מצב "Deep Research" באחד המודלים. המודל יחפש לעומק ויחזיר מקורות מפורטים.',
    ],
    links: [
      { label: 'פתח את גמיני', url: 'https://gemini.google.com/' },
      { label: 'פתח את גרוק', url: 'https://grok.com/' },
    ],
  },
];

const AiToolsModal = ({ onClose }) => (
  <div className="settings-modal-overlay" onClick={onClose}>
    <div
      className="settings-modal"
      style={{ maxWidth: '620px', direction: 'rtl' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="settings-modal-header">
        <h2>כלים מומלצים ללימוד תורה</h2>
        <button className="settings-modal-close" onClick={onClose}>×</button>
      </div>
      <div className="settings-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {AI_TOOLS_INFO.map((section, i) => (
          <div key={i} style={{
            padding: '16px',
            border: '1px solid var(--theme-border-color)',
            borderRadius: '8px',
            background: 'var(--theme-bg-secondary)',
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--theme-text-primary)' }}>
              {section.title}
            </h3>
            <ul style={{ margin: '0 0 12px 0', paddingRight: '18px', color: 'var(--theme-text-secondary)', fontSize: '14px', lineHeight: '1.7' }}>
              {section.description.map((line, j) => (
                <li key={j}>{line}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {section.links.map((link, k) => (
                <a
                  key={k}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EditorToolbar = ({
  onFindSources,
  isFindingSources,
  isAiFeaturesActive,
  onOpenTranscriptionModal,
  onGeneratePilpulta,
  onOpenSmartSearchModal,
  onGenerateFlashcards,
  isGeneratingFlashcards,
  activeTabObject,
  // Summary
  onGenerateSummary,
  isLoadingSummary,
  // Questionnaire
  onOpenQuestionnaire,
  questionnaireNotificationActive,
  isLoadingQuestionnaire,
  // Aramaic Study
  onOpenAramaicStudy,
  // Text Analysis
  onOpenTextAnalysis,
  // View mode buttons (focus, split, annotations, bookmarks)
  viewModeButtons,
}) => {
  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed' };
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);

  return (
    <div className="editor-toolbar" data-tutorial="editor-toolbar">

      {/* Flashcards */}
      <button
        title={isGeneratingFlashcards ? HEBREW_TEXT.generatingFlashcards : HEBREW_TEXT.generateFlashcards}
        onClick={onGenerateFlashcards}
        disabled={isGeneratingFlashcards || isAiFeaturesActive}
        className="btn btn-sm"
        style={(isGeneratingFlashcards || isAiFeaturesActive) ? disabledStyle : {}}
      >
        {isGeneratingFlashcards ? HEBREW_TEXT.generatingFlashcards : HEBREW_TEXT.generateFlashcards}
      </button>

      {/* Find Sources */}
      <button
        title={isFindingSources ? HEBREW_TEXT.findingSources : HEBREW_TEXT.findSources}
        onClick={onFindSources}
        disabled={isFindingSources || isAiFeaturesActive}
        className="btn btn-sm"
        style={(isFindingSources || isAiFeaturesActive) ? disabledStyle : {}}
      >
        {isFindingSources ? HEBREW_TEXT.findingSources : HEBREW_TEXT.findSources}
      </button>

      {/* Transcription */}
      <button
        title={HEBREW_TEXT.transcriptionFeatureButton}
        onClick={onOpenTranscriptionModal}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={isAiFeaturesActive ? disabledStyle : {}}
      >
        {HEBREW_TEXT.transcriptionFeatureButton}
      </button>

      {/* Pilpulta */}
      <button
        title={HEBREW_TEXT.generatePilpultaTitle || "צור פלפולתא"}
        onClick={onGeneratePilpulta}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={isAiFeaturesActive ? disabledStyle : {}}
      >
        {HEBREW_TEXT.generatePilpultaButton || "פלפולתא"}
      </button>

      {/* Smart Search */}
      <button
        title={HEBREW_TEXT.smartSearchButtonTooltip}
        onClick={onOpenSmartSearchModal}
        disabled={isAiFeaturesActive}
        className="btn btn-sm"
        style={isAiFeaturesActive ? disabledStyle : {}}
      >
        {HEBREW_TEXT.smartSearchButtonText}
      </button>

      {/* Text Analysis */}
      <button
        title={HEBREW_TEXT.openOrotHatorahLink}
        onClick={onOpenTextAnalysis}
        className="btn btn-secondary btn-sm"
      >
        {HEBREW_TEXT.openOrotHatorahLink}
      </button>

      {/* Aramaic Study */}
      <button
        title={HEBREW_TEXT.aramaicStudyButtonTooltip}
        onClick={onOpenAramaicStudy}
        className="btn btn-secondary btn-sm"
      >
        {HEBREW_TEXT.aramaicStudyButton}
      </button>

      {/* Summary - only for text files */}
      {activeTabObject?.type === 'file' && (
        <button
          title={HEBREW_TEXT.generateSummary}
          onClick={onGenerateSummary}
          disabled={isAiFeaturesActive || isLoadingSummary}
          className="btn btn-sm"
          style={(isAiFeaturesActive || isLoadingSummary) ? disabledStyle : {}}
        >
          {isLoadingSummary ? HEBREW_TEXT.generatingSummary : HEBREW_TEXT.generateSummary}
        </button>
      )}

      {/* Questionnaire */}
      <button
        onClick={onOpenQuestionnaire}
        disabled={isLoadingQuestionnaire}
        className="btn btn-sm"
        style={{ position: 'relative', ...(isLoadingQuestionnaire ? disabledStyle : {}) }}
        title={HEBREW_TEXT.questionnaire?.buttonTitle || "פתח שאלון יומי"}
      >
        {HEBREW_TEXT.questionnaire?.buttonText || "שאלון"}
        {questionnaireNotificationActive && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '10px', height: '10px',
            backgroundColor: '#ef4444', borderRadius: '50%',
            border: '1px solid white', boxSizing: 'border-box',
          }} />
        )}
      </button>

      {/* AI Tools info */}
      <button
        title="כלים מומלצים ללימוד תורה"
        onClick={() => setIsAiToolsOpen(true)}
        className="btn btn-secondary btn-sm"
      >
        כלים
      </button>

      {viewModeButtons && (
        <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
          {viewModeButtons}
        </div>
      )}

      {isAiToolsOpen && <AiToolsModal onClose={() => setIsAiToolsOpen(false)} />}

    </div>
  );
};

export default EditorToolbar;
