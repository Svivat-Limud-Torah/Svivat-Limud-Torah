// frontend/src/components/GuidedTour.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './GuidedTour.css';

const TOUR_STEPS = [
  {
    target: null, // center-screen welcome
    title: 'ברוכים הבאים לסביבת לימוד תורה!',
    content: 'מדריך קצר שיעזור לך להכיר את הכלים העיקריים שעומדים לרשותך. בוא נתחיל!',
    placement: 'center',
  },
  {
    target: '.sidebar',
    title: 'סייר קבצים',
    content: 'כאן תנהל את כל הקבצים והתיקיות שלך. לחץ על "בחר תיקייה מהמחשב" כדי להתחיל לעבוד עם הקבצים שלך.',
    placement: 'left',
  },
  {
    target: '[data-tutorial="add-folder-button"]',
    title: 'הוספת תיקייה',
    content: 'לחץ כאן כדי לבחור תיקייה מהמחשב. הקבצים יופיעו בסייר ותוכל ללחוץ עליהם כדי לפתוח אותם בעורך.',
    placement: 'left',
  },
  {
    target: '[data-tutorial="app-topbar"]',
    title: 'סרגל כלים ראשי',
    content: 'הסרגל העליון מכיל את הפעולות המרכזיות: יצירת קובץ חדש, שמירה, מחיקה, הגדרות ועוד.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="editor-toolbar"]',
    title: 'כלי עריכה ו-AI',
    content: 'כאן תמצא את כל כלי הבינה המלאכותית: כרטיסיות שו"ת, מציאת מקורות, פלפולתא, חיפוש חכם ועוד. הכלים פועלים על הטקסט שנמצא בעורך.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="ai-model-button"]',
    title: 'בחירת מודל AI',
    content: 'כאן תוכל לבחור איזה מודל בינה מלאכותית ישמש עבור כל הכלים. יש מודלים חינמיים ומשולמים.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="api-key-button"]',
    title: 'מפתח API',
    content: 'כדי להשתמש בכלי ה-AI, הכנס מפתח API מ-Google AI Studio. ללא מפתח, תכונות ה-AI לא יעבדו.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="settings-button"]',
    title: 'הגדרות ⚙️',
    content: 'כאן תוכל להתאים את העיצוב, הצבעים, ההתראות ועוד הגדרות לפי הטעם שלך.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="annotations-button"]',
    title: 'הערות שוליים',
    content: 'לחץ על "הערות" כדי להפעיל מצב הערות שוליים. לאחר מכן סמן כל קטע טקסט במסמך — לדוגמה: "ואהבת לרעך כמוך" — ויופיע חלון להוספת הערה אישית לאותו קטע. ההערות נשמרות לכל קובץ בנפרד ומוצגות בצבע כשמרחפים מעל הטקסט.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="split-button"]',
    title: 'תצוגה מפוצלת',
    content: 'לחץ על "פצל" כדי לפתוח שני קבצים זה לצד זה. שימושי במיוחד ללימוד שני ספרים במקביל — למשל גמרא ומשנה ברורה, או שאלה ותשובה — בלי לעמוד ולחזור בין טאבים.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="bookmarks-button"]',
    title: 'סימניות',
    content: 'לחץ על "סימניות" כדי לפתוח את לוח הסימניות. סמן קטע טקסט בכל קובץ ולחץ "הוסף סימנייה" — הקטע ייאסף כאן. נוח לאיסוף ציטוטים ממקורות שונים ולחזרה מהירה אליהם.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="focus-button"]',
    title: 'מצב מיקוד',
    content: 'לחץ על "מיקוד" כדי להיכנס למצב לימוד ממוקד עם טיימר פומודורו. הסרגלים מתמעטים, הטיימר מונה את זמן הלימוד, ובסיום הפגישה תקבל סיכום. מיועד לסדר לימוד עם יעד זמן ברור.',
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="help-button"]',
    title: 'עזרה וסיום',
    content: 'תמיד אפשר ללחוץ כאן לקבלת עזרה או להפעלת המדריך מחדש. בהצלחה בלימוד!',
    placement: 'bottom',
  },
];

const GuidedTour = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const tooltipRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const updateHighlight = useCallback(() => {
    if (!step || step.placement === 'center' || !step.target) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setHighlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlightRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    // Scroll into view if needed
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [isOpen, currentStep, updateHighlight]);

  // Observe DOM changes that might move the target
  useEffect(() => {
    if (!isOpen) return;
    resizeObserverRef.current = new ResizeObserver(updateHighlight);
    resizeObserverRef.current.observe(document.body);
    return () => resizeObserverRef.current?.disconnect();
  }, [isOpen, updateHighlight]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && !isLast) setCurrentStep((s) => s + 1); // RTL: left = next
      if (e.key === 'ArrowRight' && !isFirst) setCurrentStep((s) => s - 1); // RTL: right = prev
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isFirst, isLast, onClose]);

  // Position the tooltip relative to the highlighted element
  const getTooltipStyle = useCallback(() => {
    if (!highlightRect || step.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const pad = 16;
    const tooltipWidth = 360;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top, left;

    switch (step.placement) {
      case 'bottom':
        top = highlightRect.top + highlightRect.height + pad;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        // If it goes below viewport, show above
        if (top + tooltipHeight > vh) {
          top = highlightRect.top - tooltipHeight - pad;
        }
        break;
      case 'left':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.left - tooltipWidth - pad;
        // If goes off-screen left, show right
        if (left < 0) {
          left = highlightRect.left + highlightRect.width + pad;
        }
        break;
      case 'right':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.left + highlightRect.width + pad;
        if (left + tooltipWidth > vw) {
          left = highlightRect.left - tooltipWidth - pad;
        }
        break;
      default: // top
        top = highlightRect.top - tooltipHeight - pad;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        if (top < 0) {
          top = highlightRect.top + highlightRect.height + pad;
        }
        break;
    }

    // Clamp to viewport
    left = Math.max(pad, Math.min(left, vw - tooltipWidth - pad));
    top = Math.max(pad, Math.min(top, vh - tooltipHeight - pad));

    return { position: 'fixed', top, left, width: tooltipWidth };
  }, [highlightRect, step]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  return (
    <div className="guided-tour-overlay">
      {/* Dark overlay with cutout for highlighted element */}
      <svg className="guided-tour-mask" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="guided-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 6}
                y={highlightRect.top - 6}
                width={highlightRect.width + 12}
                height={highlightRect.height + 12}
                rx="6"
                ry="6"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#guided-tour-mask)"
        />
      </svg>

      {/* Highlight ring around target element */}
      {highlightRect && (
        <div
          className="guided-tour-highlight-ring"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
          }}
        />
      )}

      {/* Tooltip */}
      <div className="guided-tour-tooltip" ref={tooltipRef} style={getTooltipStyle()}>
        <div className="guided-tour-tooltip-header">
          <span className="guided-tour-step-badge">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <button className="guided-tour-close" onClick={onClose} title="סגור מדריך">
            ×
          </button>
        </div>
        <h3 className="guided-tour-title">{step.title}</h3>
        <p className="guided-tour-content">{step.content}</p>
        <div className="guided-tour-footer">
          <button
            className="guided-tour-btn guided-tour-btn-skip"
            onClick={onClose}
          >
            דלג על המדריך
          </button>
          <div className="guided-tour-nav">
            {!isFirst && (
              <button className="guided-tour-btn guided-tour-btn-prev" onClick={handlePrev}>
                → הקודם
              </button>
            )}
            <button className="guided-tour-btn guided-tour-btn-next" onClick={handleNext}>
              {isLast ? 'סיום ✓' : 'הבא ←'}
            </button>
          </div>
        </div>
        {/* Progress dots */}
        <div className="guided-tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`guided-tour-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
