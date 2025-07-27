// frontend/src/components/EditableMarkdownPreview.jsx
import React, { useState, useRef, useEffect } from 'react';
import './EditableMarkdownPreview.css';

const EditableMarkdownPreview = ({ content, onContentChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [editingPosition, setEditingPosition] = useState({ start: 0, end: 0 });
  const [selectedText, setSelectedText] = useState('');
  const previewRef = useRef(null);
  const textareaRef = useRef(null);

  // פונקציה להמרת Markdown לHTML עם מיפוי מיקומים - משופרת
  const convertMarkdownToHtmlWithMapping = (text) => {
    if (!text) return { html: '', mapping: [] };

    let html = text;
    const mapping = [];
    let processedIndices = new Set(); // למעקב אחר המיקומים שכבר עובדו

    // פונקציה לחישוב offset נכון בטקסט המקורי
    const getActualOffset = (match, index, string) => {
      const beforeMatch = string.substring(0, index);
      return text.indexOf(match, beforeMatch.length - match.length + 1);
    };

    // Headers - עם מיפוי מדויק
    html = html.replace(/^(#{1,6})\s(.+)$/gim, (match, hashes, title, offset) => {
      const actualOffset = text.indexOf(match);
      if (!processedIndices.has(actualOffset)) {
        const level = hashes.length;
        processedIndices.add(actualOffset);
        return `<h${level} data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${title}</h${level}>`;
      }
      return match;
    });

    // Bold - עם מיפוי מדויק
    html = html.replace(/\*\*([^*]+)\*\*/g, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match, processedIndices.size > 0 ? Math.max(...processedIndices) + 1 : 0);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<strong data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</strong>`;
      }
      return match;
    });

    // Italic - עם מיפוי מדויק
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<em data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</em>`;
      }
      return match;
    });

    // Code inline - עם מיפוי מדויק
    html = html.replace(/`([^`]+)`/g, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<code data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</code>`;
      }
      return match;
    });

    // Links - עם מיפוי מדויק
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${linkText}</a>`;
      }
      return match;
    });

    // Lists - עם מיפוי מדויק לכל פריט
    html = html.replace(/^[\s]*[-*+]\s(.+)$/gm, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<li data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</li>`;
      }
      return match;
    });
    
    // Wrap lists
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gs, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^[\s]*\d+\.\s(.+)$/gm, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<li data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</li>`;
      }
      return match;
    });

    // Blockquotes - עם מיפוי מדויק
    html = html.replace(/^>\s(.+)$/gm, (match, innerText, offset, string) => {
      const actualOffset = text.indexOf(match);
      if (actualOffset !== -1 && !processedIndices.has(actualOffset)) {
        processedIndices.add(actualOffset);
        return `<blockquote data-original-start="${actualOffset}" data-original-end="${actualOffset + match.length}">${innerText}</blockquote>`;
      }
      return match;
    });

    // Paragraphs - חלוקה למתחמי פסקאות
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map((paragraph, index) => {
      if (paragraph.trim() === '') return '';
      if (paragraph.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|hr)/)) {
        return paragraph;
      }
      
      const actualOffset = text.indexOf(paragraph.trim());
      if (actualOffset !== -1 && !paragraph.includes('data-original-start')) {
        return `<p data-original-start="${actualOffset}" data-original-end="${actualOffset + paragraph.trim().length}">${paragraph.replace(/\n/g, '<br>')}</p>`;
      }
      return paragraph;
    }).join('\n');

    return { html, mapping };
  };

  // פונקציה למציאת המיקום המקורי מתוך אלמנט HTML
  const getOriginalPosition = (element) => {
    const start = element.getAttribute('data-original-start');
    const end = element.getAttribute('data-original-end');
    
    if (start !== null && end !== null) {
      return {
        start: parseInt(start),
        end: parseInt(end)
      };
    }

    // אם לא נמצא data attributes, נחפש באלמנט הורה
    let parent = element.parentElement;
    while (parent && parent !== previewRef.current) {
      const parentStart = parent.getAttribute('data-original-start');
      const parentEnd = parent.getAttribute('data-original-end');
      if (parentStart !== null && parentEnd !== null) {
        return {
          start: parseInt(parentStart),
          end: parseInt(parentEnd)
        };
      }
      parent = parent.parentElement;
    }

    return null;
  };

  // פונקציה לטיפול בלחיצה על אלמנט לעריכה
  const handleElementClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target.closest('[data-original-start]');
    
    if (element) {
      const position = getOriginalPosition(element);
      if (position) {
        const textToEdit = content.substring(position.start, position.end);
        setEditingContent(textToEdit);
        setEditingPosition(position);
        setSelectedText(textToEdit);
        setIsEditing(true);
      }
    }
  };

  // פונקציה לעריכה מהירה - הוספת סגנונות
  const applyQuickStyle = (styleType) => {
    if (!editingContent) return;

    let newContent = editingContent;
    
    switch (styleType) {
      case 'bold':
        if (newContent.startsWith('**') && newContent.endsWith('**')) {
          newContent = newContent.slice(2, -2); // הסר bold
        } else {
          newContent = `**${newContent}**`; // הוסף bold
        }
        break;
      case 'italic':
        if (newContent.startsWith('*') && newContent.endsWith('*') && !newContent.startsWith('**')) {
          newContent = newContent.slice(1, -1); // הסר italic
        } else {
          newContent = `*${newContent}*`; // הוסף italic
        }
        break;
      case 'code':
        if (newContent.startsWith('`') && newContent.endsWith('`')) {
          newContent = newContent.slice(1, -1); // הסר code
        } else {
          newContent = `\`${newContent}\``; // הוסף code
        }
        break;
      case 'heading1':
        newContent = newContent.replace(/^#+\s*/, ''); // הסר כותרות קיימות
        newContent = `# ${newContent}`;
        break;
      case 'heading2':
        newContent = newContent.replace(/^#+\s*/, '');
        newContent = `## ${newContent}`;
        break;
      case 'heading3':
        newContent = newContent.replace(/^#+\s*/, '');
        newContent = `### ${newContent}`;
        break;
      case 'quote':
        if (newContent.startsWith('> ')) {
          newContent = newContent.replace(/^>\s*/, ''); // הסר ציטוט
        } else {
          newContent = `> ${newContent}`; // הוסף ציטוט
        }
        break;
      case 'link':
        if (!newContent.match(/\[.*\]\(.*\)/)) {
          newContent = `[${newContent}](https://example.com)`; // הוסף קישור
        }
        break;
    }
    
    setEditingContent(newContent);
  };

  // פונקציה לשמירת השינויים
  const handleSaveEdit = () => {
    if (!onContentChange) return;

    const newContent = 
      content.substring(0, editingPosition.start) + 
      editingContent + 
      content.substring(editingPosition.end);
    
    onContentChange(newContent);
    setIsEditing(false);
    setEditingContent('');
    setSelectedText('');
  };

  // פונקציה לביטול העריכה
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingContent('');
    setSelectedText('');
  };

  // פוקוס על textarea כשמתחילים לערוך
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // טיפול בקיצורי מקלדת
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const { html } = convertMarkdownToHtmlWithMapping(content || '');

  return (
    <div className="editable-markdown-preview">
      {!isEditing ? (
        <div className="preview-content">
          <div className="edit-instructions">
            <span className="edit-icon">עריכה</span>
            לחץ על כל אלמנט כדי לערוך אותו ישירות
          </div>
          <div 
            ref={previewRef}
            className="markdown-content clickable-content"
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={handleElementClick}
          />
        </div>
      ) : (
        <div className="editing-mode">
          <div className="editing-header">
            <span className="editing-title">עורך: {selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}</span>
            <div className="editing-controls">
              <button 
                className="save-btn"
                onClick={handleSaveEdit}
                title="שמור (Ctrl+Enter)"
              >
                💾 שמור
              </button>
              <button 
                className="cancel-btn"
                onClick={handleCancelEdit}
                title="בטל (Escape)"
              >
                ❌ בטל
              </button>
            </div>
          </div>
          
          {/* כפתורי עריכה מהירה */}
          <div className="quick-style-toolbar">
            <span className="toolbar-label">כלי עיצוב מהיר:</span>
            <button 
              className="quick-style-btn bold-btn" 
              onClick={() => applyQuickStyle('bold')}
              title="הופך טקסט למודגש - הטקסט יופיע בכתב עבה"
            >
              הדגשה
            </button>
            <button 
              className="quick-style-btn italic-btn" 
              onClick={() => applyQuickStyle('italic')}
              title="הופך טקסט לנטוי - הטקסט יופיע בכתב רגיל נטוי"
            >
              נטייה
            </button>
            <button 
              className="quick-style-btn code-btn" 
              onClick={() => applyQuickStyle('code')}
              title="מסמן טקסט כקוד מחשב - הטקסט יופיע בגופן מיוחד"
            >
              קוד
            </button>
            <button 
              className="quick-style-btn heading-btn" 
              onClick={() => applyQuickStyle('heading1')}
              title="יוצר כותרת ראשית גדולה - השורה תופיע ככותרת מרכזית"
            >
              כותרת גדולה
            </button>
            <button 
              className="quick-style-btn heading-btn" 
              onClick={() => applyQuickStyle('heading2')}
              title="יוצר כותרת משנה בינונית - השורה תופיע ככותרת משנה"
            >
              כותרת בינונית
            </button>
            <button 
              className="quick-style-btn heading-btn" 
              onClick={() => applyQuickStyle('heading3')}
              title="יוצר כותרת קטנה - השורה תופיע ככותרת משנה קטנה"
            >
              כותרת קטנה
            </button>
            <button 
              className="quick-style-btn quote-btn" 
              onClick={() => applyQuickStyle('quote')}
              title="יוצר ציטוט - השורה תופיע כציטוט עם קו בצד"
            >
              ציטוט
            </button>
            <button 
              className="quick-style-btn link-btn" 
              onClick={() => applyQuickStyle('link')}
              title="הוספת קישור לאתר אינטרנט - הטקסט יהפוך לקישור לחיצה"
            >
              קישור
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-textarea"
            placeholder="ערוך את התוכן כאן..."
            rows={Math.max(3, editingContent.split('\n').length)}
          />
          <div className="editing-tips">
            <small>
              טיפים: Ctrl+Enter לשמירה | Escape לביטול | השתמש בכפתורי העיצוב המהיר למעלה
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableMarkdownPreview;
