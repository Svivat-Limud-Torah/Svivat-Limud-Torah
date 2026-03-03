// frontend/src/components/QuestionnaireModal.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './QuestionnaireModal.css';

const TABS = [
  { id: 'daily',    label: 'יומן',            icon: '◉' },
  { id: 'summary',  label: 'סיכום שבועי',     icon: '◈' },
  { id: 'insights', label: 'תובנות',           icon: '◆' },
  { id: 'chat',     label: 'שיחה אישית',       icon: '◎' },
];

// ── Helpers ────────────────────────────────────────────────────────────
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (d) => d.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ── Sub-panels ──────────────────────────────────────────────────────────

function DailyTab({ questionnaireData, isLoading, error, isSubmitted, selectedDate, onDateChange, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const init = {};
    questionnaireData?.fixedQuestions?.forEach(q => { init[q.id] = q.answer != null ? String(q.answer) : ''; });
    questionnaireData?.aiQuestions?.forEach(q => { init[q.id] = q.answer ?? ''; });
    setAnswers(init);
    setIsEditing(!isSubmitted);
  }, [questionnaireData, isSubmitted, selectedDate]);

  const todayObj = today();
  const selObj = parseDate(selectedDate);
  const sevenAgo = new Date(todayObj); sevenAgo.setDate(todayObj.getDate() - 6);
  const canPrev = selObj > sevenAgo;
  const canNext = selObj < todayObj;

  const handleSubmit = (e) => {
    e.preventDefault();
    const rating = answers['rating_today'];
    if (rating && (parseInt(rating, 10) < 1 || parseInt(rating, 10) > 10)) {
      alert('הדירוג חייב להיות בין 1 ל-10.');
      return;
    }
    const payload = { ...answers };
    questionnaireData?.aiQuestions?.forEach(q => { payload[`${q.id}_text`] = q.text; });
    onSubmit(payload);
    setIsEditing(false);
  };

  const renderInput = (q) => {
    const disabled = isSubmitted && !isEditing;
    if (q.type === 'rating') {
      return (
        <div className="qm-rating-bar">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              type="button"
              className={`qm-rating-btn ${parseInt(answers[q.id]) === n ? 'qm-rating-btn--active' : ''}`}
              onClick={() => !disabled && setAnswers(p => ({ ...p, [q.id]: String(n) }))}
              disabled={disabled}
            >{n}</button>
          ))}
        </div>
      );
    }
    return (
      <textarea
        className="qm-textarea"
        value={answers[q.id] || ''}
        onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
        rows={3}
        disabled={disabled}
        placeholder="כתוב כאן..."
      />
    );
  };

  return (
    <div className="qm-daily">
      {/* Date nav */}
      <div className="qm-date-nav">
        <button className="qm-date-btn" onClick={() => { const p = new Date(selObj); p.setDate(selObj.getDate() - 1); onDateChange(p); }} disabled={!canPrev || isLoading}>
          &#8592; יום קודם
        </button>
        <span className="qm-date-label">{fmtDate(selObj)}</span>
        <button className="qm-date-btn" onClick={() => { const n = new Date(selObj); n.setDate(selObj.getDate() + 1); onDateChange(n); }} disabled={!canNext || isLoading}>
          יום הבא &#8594;
        </button>
      </div>

      {isLoading && <div className="qm-spinner-wrap"><div className="qm-spinner" /></div>}
      {error && <div className="qm-error">{error}</div>}

      {!isLoading && !error && questionnaireData && (
        <>
          {isSubmitted && !isEditing && (
            <div className="qm-submitted-badge">
              <span className="qm-check">&#10003;</span> הוגש ביום זה
              <button className="qm-link-btn" onClick={() => setIsEditing(true)}>עריכה</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {[...(questionnaireData.fixedQuestions || []), ...(questionnaireData.aiQuestions || [])].map(q => (
              <div key={q.id} className="qm-question">
                <label className="qm-question-label">{q.text}</label>
                {renderInput(q)}
              </div>
            ))}

            {(!isSubmitted || isEditing) && (
              <div className="qm-form-actions">
                {isSubmitted && isEditing && (
                  <button type="button" className="qm-btn qm-btn-ghost" onClick={() => setIsEditing(false)}>ביטול</button>
                )}
                <button type="submit" className="qm-btn qm-btn-primary" disabled={isLoading}>
                  {isLoading ? 'שולח...' : isEditing && isSubmitted ? 'עדכן תשובות' : 'שלח תשובות'}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function WeeklySummaryTab({ weeklySummary, isLoading, error, onGenerate, onLoad }) {
  useEffect(() => { onLoad(); }, []);

  return (
    <div className="qm-summary-tab">
      <div className="qm-tab-header">
        <p className="qm-tab-desc">סיכום AI של שבוע הלימודים — נקודות חוזק ותחומי שיפור.</p>
        <button className="qm-btn qm-btn-primary" onClick={onGenerate} disabled={isLoading}>
          {isLoading ? 'מייצר...' : 'צור סיכום שבועי'}
        </button>
      </div>

      {isLoading && <div className="qm-spinner-wrap"><div className="qm-spinner" /></div>}
      {error && <div className="qm-error">{error}</div>}

      {!isLoading && !error && !weeklySummary && (
        <div className="qm-empty">
          <div className="qm-empty-icon">—</div>
          <p>אין סיכום שבועי עדיין.</p>
          <p className="qm-empty-sub">מלא שאלונים יומיים ולחץ "צור סיכום שבועי".</p>
        </div>
      )}

      {!isLoading && weeklySummary && (
        <div className="qm-summary-card">
          <div className="qm-summary-week-label">
            שבוע -{new Date(weeklySummary.week_start_date + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="qm-summary-section">
            <h4 className="qm-summary-section-title">סיכום</h4>
            <p>{weeklySummary.summary_content}</p>
          </div>
          <div className="qm-summary-row">
            <div className="qm-summary-section qm-summary-good">
              <h4 className="qm-summary-section-title">חוזקות</h4>
              <p>{weeklySummary.strengths}</p>
            </div>
            <div className="qm-summary-section qm-summary-improve">
              <h4 className="qm-summary-section-title">שיפור</h4>
              <p>{weeklySummary.areas_for_improvement}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsTab({ insights, isLoading, error, onGenerate }) {
  return (
    <div className="qm-insights-tab">
      <div className="qm-tab-header">
        <p className="qm-tab-desc">ניתוח AI מעמיק של ההיסטוריה הלמודית שלך — מבוסס אך ורק על הנתונים שלך.</p>
        <button className="qm-btn qm-btn-primary" onClick={onGenerate} disabled={isLoading}>
          {isLoading ? 'מנתח...' : insights ? 'יצר מחדש' : 'צור תובנות אישיות'}
        </button>
      </div>

      {isLoading && (
        <div className="qm-spinner-wrap">
          <div className="qm-spinner" />
          <p className="qm-spinner-text">מנתח את ההיסטוריה שלך...</p>
        </div>
      )}
      {error && <div className="qm-error">{error}</div>}

      {!isLoading && !error && !insights && (
        <div className="qm-empty">
          <div className="qm-empty-icon">—</div>
          <p>לחץ "צור תובנות אישיות" לניתוח מעמיק של הפרופיל הלימודי שלך.</p>
          <p className="qm-empty-sub">ה-AI ישתמש אך ורק בנתוני השאלונים שלך.</p>
        </div>
      )}

      {!isLoading && insights && (
        <div className="qm-insights-grid">
          {insights.overall_assessment && (
            <div className="qm-insight-card qm-insight-card--full qm-insight-card--highlight">
              <h4>הערכה כוללת</h4>
              <p>{insights.overall_assessment}</p>
            </div>
          )}
          <div className="qm-insight-card qm-insight-card--green">
            <h4>חוזקות</h4>
            <ul>{(insights.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="qm-insight-card qm-insight-card--orange">
            <h4>תחומי צמיחה</h4>
            <ul>{(insights.areas_for_growth || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          {insights.learning_patterns && (
            <div className="qm-insight-card qm-insight-card--full">
              <h4>הפוסי לימוד</h4>
              <p>{insights.learning_patterns}</p>
            </div>
          )}
          {insights.tips?.length > 0 && (
            <div className="qm-insight-card qm-insight-card--full qm-insight-card--blue">
              <h4>טיפים מעשיים</h4>
              <ul>{insights.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {insights.recommendations?.length > 0 && (
            <div className="qm-insight-card">
              <h4>המלצות</h4>
              <ul>{insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {insights.motivation_message && (
            <div className="qm-insight-card qm-insight-card--motivation">
              <h4>מסר אישי</h4>
              <p className="qm-motivation-text">"{insights.motivation_message}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatTab({ messages, isLoading, error, onSend, onClear }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="qm-chat-tab">
      <div className="qm-chat-header">
        <p className="qm-tab-desc">שוחח עם AI שמכיר אך ורק את הנתונים שלך — לא משתמש במקורות חיצוניים.</p>
        {messages.length > 0 && (
          <button className="qm-link-btn qm-link-btn--danger" onClick={onClear}>נקה שיחה</button>
        )}
      </div>

      <div className="qm-chat-messages">
        {messages.length === 0 && (
          <div className="qm-chat-welcome">
            <div className="qm-empty-icon">◎</div>
            <p>שאל שאלות על הפרופיל הלימודי שלך</p>
            <div className="qm-chat-suggestions">
              {['מה החוזקות שלי בלימוד?', 'באילו ימים אני לומד הכי טוב?', 'איך השתפרתי בחודש האחרון?', 'מה הדירוג הממוצע שלי?'].map(s => (
                <button key={s} className="qm-suggestion-chip" onClick={() => { onSend(s); }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`qm-message qm-message--${m.role === 'user' ? 'user' : 'ai'}`}>
            <div className="qm-message-bubble">{m.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="qm-message qm-message--ai">
            <div className="qm-message-bubble qm-message-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && <div className="qm-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div className="qm-chat-input-row">
        <textarea
          className="qm-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="שאל שאלה..."
          rows={2}
          disabled={isLoading}
        />
        <button className="qm-btn qm-btn-primary qm-chat-send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
          שלח
        </button>
      </div>
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────────────────
const QuestionnaireModal = ({
  isOpen, onClose,
  onSubmit,
  questionnaireData, isLoading, error,
  isSubmittedForSelectedDate, selectedDate, onDateChange,
  onResetAllDataSuccess,
  // hook extras
  activeTab, setActiveTab,
  weeklySummary, isLoadingSummary, summaryError,
  fetchLatestWeeklySummary, triggerWeeklySummaryGeneration,
  personalInsights, isInsightsLoading, insightsError, generateInsights,
  chatMessages, isChatLoading, chatError, sendChatMessage, clearChat,
  notificationSettings, setShowNotificationSettings,
}) => {
  if (!isOpen) return null;

  const currentTab = activeTab || 'daily';

  return (
    <div className="qm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qm-modal">

        {/* Header */}
        <div className="qm-header">
          <h2 className="qm-title">שאלון התקדמות</h2>
          <div className="qm-header-actions">
            <button className="qm-icon-btn qm-close-btn" onClick={onClose}>&#10005;</button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="qm-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`qm-tab ${currentTab === t.id ? 'qm-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="qm-tab-icon">{t.icon}</span>
              <span className="qm-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="qm-body">
          {currentTab === 'daily' && (
            <DailyTab
              questionnaireData={questionnaireData}
              isLoading={isLoading}
              error={error}
              isSubmitted={isSubmittedForSelectedDate}
              selectedDate={selectedDate}
              onDateChange={(d) => onDateChange(toDateStr(d))}
              onSubmit={onSubmit}
            />
          )}
          {currentTab === 'summary' && (
            <WeeklySummaryTab
              weeklySummary={weeklySummary}
              isLoading={isLoadingSummary}
              error={summaryError}
              onGenerate={triggerWeeklySummaryGeneration}
              onLoad={fetchLatestWeeklySummary}
            />
          )}
          {currentTab === 'insights' && (
            <InsightsTab
              insights={personalInsights}
              isLoading={isInsightsLoading}
              error={insightsError}
              onGenerate={generateInsights}
            />
          )}
          {currentTab === 'chat' && (
            <ChatTab
              messages={chatMessages || []}
              isLoading={isChatLoading}
              error={chatError}
              onSend={sendChatMessage}
              onClear={clearChat}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireModal;
