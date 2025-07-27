// frontend/src/components/MarkdownToolbar.jsx
import React, { useState } from 'react';
import './MarkdownToolbar.css';
import { HEBREW_TEXT } from '../utils/constants';

const MarkdownToolbar = ({ editorRef, isDisabled = false, onPreviewToggle, onOrganizeTextToggle, isOrganizing = false }) => {
  const [showPreview, setShowPreview] = useState(false);

  const insertMarkdown = (before, after = '', placeholder = '') => {
    if (!editorRef?.current || isDisabled) return;
    
    try {
      // Get the CodeMirror view from the Editor component
      const view = editorRef.current.getEditorView?.();
      if (!view || !view.state) return;
      
      const selection = view.state.selection.main;
      const selectedText = view.state.doc.sliceString(selection.from, selection.to);
      const textToInsert = selectedText || placeholder;
      const newText = `${before}${textToInsert}${after}`;
      
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: newText
        },
        selection: {
          anchor: selection.from + before.length,
          head: selection.from + before.length + textToInsert.length
        }
      });
      
      view.focus();
    } catch (error) {
      console.error('שגיאה בהוספת Markdown:', error);
    }
  };

  const markdownButtons = [
    {
      label: 'הדגשה',
      title: 'הופך טקסט למודגש - הטקסט יופיע בכתב עבה',
      onClick: () => insertMarkdown('**', '**', 'טקסט מודגש'),
      className: 'bold'
    },
    {
      label: 'נטייה',
      title: 'הופך טקסט לנטוי - הטקסט יופיע בכתב רגיל נטוי',
      onClick: () => insertMarkdown('*', '*', 'טקסט נטוי'),
      className: 'italic'
    },
    {
      label: 'כותרת גדולה',
      title: 'יוצר כותרת ראשית גדולה - השורה תופיע ככותרת מרכזית',
      onClick: () => insertMarkdown('# ', '', 'כותרת ראשית'),
      className: 'heading'
    },
    {
      label: 'כותרת בינונית',
      title: 'יוצר כותרת משנה בינונית - השורה תופיע ככותרת משנה',
      onClick: () => insertMarkdown('## ', '', 'כותרת משנית'),
      className: 'heading'
    },
    {
      label: 'כותרת קטנה',
      title: 'יוצר כותרת קטנה - השורה תופיע ככותרת משנה קטנה',
      onClick: () => insertMarkdown('### ', '', 'כותרת שלישית'),
      className: 'heading'
    },
    {
      label: 'רשימת נקודות',
      title: 'יוצר רשימה עם נקודות - כל שורה תתחיל בנקודה',
      onClick: () => insertMarkdown('- ', '', 'פריט ברשימה'),
      className: 'list'
    },
    {
      label: 'רשימה ממוספרת',
      title: 'יוצר רשימה ממוספרת - כל שורה תתחיל במספר',
      onClick: () => insertMarkdown('1. ', '', 'פריט ברשימה'),
      className: 'list'
    },
    {
      label: 'קישור',
      title: 'הוספת קישור לאתר אינטרנט - הטקסט יהפוך לקישור לחיצה',
      onClick: () => insertMarkdown('[', '](http://example.com)', 'טקסט הקישור'),
      className: 'link'
    },
    {
      label: 'ציטוט',
      title: 'יוצר ציטוט - השורה תופיע כציטוט עם קו בצד',
      onClick: () => insertMarkdown('> ', '', 'טקסט ציטוט'),
      className: 'quote'
    }
  ];

  const togglePreview = () => {
    const newShowPreview = !showPreview;
    setShowPreview(newShowPreview);
    if (onPreviewToggle) {
      onPreviewToggle(newShowPreview);
    }
  };

  const handleOrganizeText = async () => {
    if (isDisabled || isOrganizing) return;
    
    try {
      if (onOrganizeTextToggle) {
        await onOrganizeTextToggle();
      }
    } catch (error) {
      console.error('שגיאה בארגון הטקסט:', error);
    }
  };

  return (
    <div className="markdown-toolbar">
      <span className="markdown-toolbar-label">
        כלי עיצוב טקסט:
      </span>
      
      {markdownButtons.map((button, index) => (
        <button
          key={index}
          title={button.title}
          onClick={button.onClick}
          disabled={isDisabled}
          className={`markdown-toolbar-button ${button.className || ''}`}
        >
          {button.label}
        </button>
      ))}
      
      <div className="toolbar-separator"></div>
      
      <button
        title="מעבר בין מצב עריכה למצב תצוגה - בתצוגה תראה איך הטקסט ייראה בסוף"
        onClick={togglePreview}
        disabled={isDisabled}
        className={`markdown-toolbar-button preview-button ${showPreview ? 'active' : ''}`}
      >
        {showPreview ? 'חזור לעריכה' : 'תצוגה'}
      </button>
      
      <button
        title="בינה מלאכותית תסדר ותארגן את הטקסט שלך באופן אוטומטי"
        onClick={handleOrganizeText}
        disabled={isDisabled || isOrganizing}
        className={`markdown-toolbar-button organize-text-button ${isOrganizing ? 'processing' : ''}`}
      >
        {isOrganizing ? 'מארגן את הטקסט...' : 'ארגן טקסט עם AI'}
      </button>
    </div>
  );
};

export default MarkdownToolbar;
