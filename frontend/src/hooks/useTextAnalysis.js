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
  const [flowchartLoadingStage, setFlowchartLoadingStage] = useState(null); // null | 'structure' | 'mermaid'
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

    try {
      // Step 1: Extract nodes AND their connections as arrow-notation pseudo-chart
      setFlowchartLoadingStage('structure');
      const structurePrompt = `נתח את הטקסט הבא ותאר את מבנה הסוגיה כתרשים זרימה בסימון חצים פשוט.
כתוב שורות בפורמט: מושג/שלב --> מושג/שלב
כאשר יש הסתעפות (כן/לא, מחלוקת, שאלה/תשובה) כתוב:
  מושג --> |כן| מושג אחר
  מושג --> |לא| מושג אחר
כל תווית: עברית פשוטה, עד 25 תווים, ללא מרכאות, ללא גרשיים.
8 עד 15 חצים בסך הכל.
כתוב רק את שורות החצים, ללא הסברים נוספים.

טקסט:
${inputText.substring(0, 1200)}`;

      const r1 = await callAiGenerate(selectedAiModel, {
        contents: [{ parts: [{ text: structurePrompt }] }],
      });
      if (!r1.ok) throw new Error(`שגיאת API שלב 1: ${r1.status}`);
      const d1 = await r1.json();
      const structureList = d1.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!structureList) throw new Error('תגובה לא תקינה בשלב 1');

      // Step 2: Convert the arrow-notation to valid Mermaid syntax
      setFlowchartLoadingStage('mermaid');
      const mermaidPrompt = `המר את תיאור תרשים הזרימה הבא לקוד Mermaid תקני.
החזר קוד Mermaid בלבד, ללא הסברים.

חוקים קריטיים:
- שורה ראשונה בדיוק: flowchart TD
- IDs לצמתים: אותיות לטיניות בלבד A,B,C,D... (לא מספרים, לא עברית)
- תוויות: בסוגריים מרובעים בלבד A[טקסט]
- אסור מרכאות כפולות בתוך תוויות - השתמש בסוגריים מרובעים
- תוויות על חצים מותרות: A -->|תווית| B
- אם אותו צומת מופיע פעמיים תן לו אותו ID

דוגמה:
flowchart TD
  A[שאלת הגמרא] --> B[דעת רש"י]
  A --> C[דעת תוספות]
  B --> D[מסקנה]
  C --> D

תיאור התרשים:
${structureList}`;

      const r2 = await callAiGenerate(selectedAiModel, {
        contents: [{ parts: [{ text: mermaidPrompt }] }],
      });
      if (!r2.ok) throw new Error(`שגיאת API שלב 2: ${r2.status}`);
      const d2 = await r2.json();
      const textResponse = d2.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error('תגובה לא תקינה בשלב 2');

      const mermaidCode = extractMermaidCode(textResponse);
      setFlowchartCode(mermaidCode);
      setMode('flowchart');
    } catch (err) {
      if (!handleApiError(err)) {
        setError(err.message);
      }
    } finally {
      setIsLoadingFlowchart(false);
      setFlowchartLoadingStage(null);
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
    flowchartLoadingStage,
    error,
    mode,
    setMode,
    analyzeText,
    generateFlowchart,
    backToInput,
    backToAnalysis,
  };
}
