// frontend/src/hooks/useTextAnalysis.js
import { useState, useCallback } from 'react';
import { callAiGenerate } from '../utils/aiProxy';
import { getApiKeyDetails } from '../components/ApiKeyModal';
import { HEBREW_TEXT } from '../utils/constants';

function cleanAIResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('תגובה לא תקינה מה-AI');
  }
  return responseText.trim();
}

function extractMermaidCode(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('תגובה לא תקינה מה-AI');
  }
  let cleaned = responseText.trim();
  // Extract mermaid code block
  const mermaidMatch = cleaned.match(/```mermaid\s*([\s\S]*?)```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }
  // Try without fences - if it starts with graph/flowchart
  if (/^(graph|flowchart)\s/i.test(cleaned)) {
    return cleaned;
  }
  // Strip any code fences
  cleaned = cleaned.replace(/^```\w*\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

export default function useTextAnalysis({ selectedAiModel, showQuotaLimitModal, showModelOverloadedModal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [flowchartCode, setFlowchartCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFlowchart, setIsLoadingFlowchart] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('input'); // 'input' | 'analysis' | 'flowchart'

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setInputText('');
    setAnalysisResult('');
    setFlowchartCode('');
    setError(null);
    setMode('input');
  }, []);

  const handleApiError = useCallback((err) => {
    if (HEBREW_TEXT.isModelOverloadedError?.(err)) {
      showModelOverloadedModal?.();
      return true;
    }
    if (HEBREW_TEXT.isQuotaLimitError?.(err)) {
      showQuotaLimitModal?.();
      return true;
    }
    // Friendly message for server errors
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('503') || msg.includes('high demand') || msg.includes('try again later') || msg.includes('overload')) {
      setError('השרתים עמוסים כרגע. נסה שוב מאוחר יותר.');
      return true;
    }
    return false;
  }, [showQuotaLimitModal, showModelOverloadedModal]);

  const analyzeText = useCallback(async (text) => {
    if (!text.trim()) return;

    const { hasKey } = getApiKeyDetails();
    if (!hasKey) {
      alert(HEBREW_TEXT.apiKeyNotSetAlert);
      return;
    }

    setIsLoading(true);
    setError(null);

    const prompt = `אתה מומחה בלימוד תורה, תלמוד בבלי וירושלמי, ראשונים ואחרונים.

נא לנתח ולהסביר את הטקסט הבא בצורה מפורטת וברורה:

1. **סיכום כללי**: הסבר קצר על מה הטקסט עוסק
2. **ניתוח מפורט**: פירוט הסוגיה, השלבים והמושגים המרכזיים
3. **מושגים מרכזיים**: הסבר מילים ומושגים חשובים
4. **מבנה הטקסט**: הצגת מבנה לוגי — שאלה, תשובה, קושיה, תירוץ וכדומה
5. **הקשר רחב**: קישור למקורות נוספים אם רלוונטי

הטקסט לניתוח:
---
${text}
---

כתוב את התשובה בעברית בצורה מסודרת וקריאה.`;

    try {
      const response = await callAiGenerate(selectedAiModel, {
        contents: [{ parts: [{ text: prompt }] }],
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
        } catch {
          errorDetails = errorText;
        }
        throw new Error(`שגיאת API: ${response.status} - ${errorDetails}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('תגובה לא תקינה מה-AI');

      setAnalysisResult(cleanAIResponse(textResponse));
      setMode('analysis');
    } catch (err) {
      if (!handleApiError(err)) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedAiModel, handleApiError]);

  const generateFlowchart = useCallback(async () => {
    if (!inputText.trim()) return;

    const { hasKey } = getApiKeyDetails();
    if (!hasKey) {
      alert(HEBREW_TEXT.apiKeyNotSetAlert);
      return;
    }

    setIsLoadingFlowchart(true);
    setError(null);

    const prompt = `אתה מומחה בלימוד תורה ותלמוד ובתרשימי זרימה.
צור תרשים זרימה פשוט וקצר בפורמט Mermaid עבור הטקסט הבא.

כללים חובה:
- התחל בשורה אחת עם: flowchart TD
- מקסימום 10-15 צמתים
- IDs לצמתים: אותיות אנגלית בלבד (A, B, C... או n1, n2...)
- אורך מקסימלי לתווית כל צמת: 40 תווים
- עטוף טקסט בסוגריים מרובעים כך: A[טקסט]
- אסור לחלוטין מיוחדים (לא גרשיים, לא מרכאות, לא גרש, לא נֹקדות) בתוך תוויות הצמת
- אסור להשתמש במרכאות כפולות (" ") בתוך תוויות הצמת
- וודא שכל צמת יש לו לפחות קשת אחת יוצאת או נכנסת
- החזר רק את קוד Mermaid בלבד, ללא הסברות

הטקסט:
---
${inputText}
---`;

    try {
      const response = await callAiGenerate(selectedAiModel, {
        contents: [{ parts: [{ text: prompt }] }],
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
        } catch {
          errorDetails = errorText;
        }
        throw new Error(`שגיאת API: ${response.status} - ${errorDetails}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('תגובה לא תקינה מה-AI');

      const mermaidCode = extractMermaidCode(textResponse);
      setFlowchartCode(mermaidCode);
      setMode('flowchart');
    } catch (err) {
      if (!handleApiError(err)) {
        setError(err.message);
      }
    } finally {
      setIsLoadingFlowchart(false);
    }
  }, [selectedAiModel, inputText, handleApiError]);

  const backToInput = useCallback(() => {
    setMode('input');
    setError(null);
  }, []);

  const backToAnalysis = useCallback(() => {
    setMode('analysis');
    setError(null);
  }, []);

  return {
    isModalOpen,
    openModal,
    closeModal,
    inputText,
    setInputText,
    analysisResult,
    flowchartCode,
    isLoading,
    isLoadingFlowchart,
    error,
    mode,
    setMode,
    analyzeText,
    generateFlowchart,
    backToInput,
    backToAnalysis,
  };
}
