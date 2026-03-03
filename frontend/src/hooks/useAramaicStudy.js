// frontend/src/hooks/useAramaicStudy.js
import { useState, useCallback } from 'react';
import { callAiGenerate } from '../utils/aiProxy';
import { getApiKeyDetails } from '../components/ApiKeyModal';
import { HEBREW_TEXT } from '../utils/constants';

const DIFFICULTY_LABELS = {
  beginner: 'מתחיל - מילים בסיסיות ונפוצות בארמית תלמודית',
  intermediate: 'בינוני - מילים שכיחות עם משמעויות מרובות',
  advanced: 'מתקדם - מילים נדירות וביטויים מורכבים בארמית',
};

function cleanAIResponseForJSON(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('תגובה לא תקינה מה-AI');
  }
  let cleaned = responseText.trim();
  cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
  cleaned = cleaned.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned;
}

export default function useAramaicStudy({ selectedAiModel, showQuotaLimitModal, showModelOverloadedModal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [difficulty, setDifficulty] = useState(null); // null | 'beginner' | 'intermediate' | 'advanced'
  const [words, setWords] = useState([]); // Array of { aramaic, translation, explanation }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setDifficulty(null);
    setWords([]);
    setError(null);
    setViewMode('cards');
  }, []);

  const generateWords = useCallback(async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setIsLoading(true);
    setError(null);

    const { hasKey } = getApiKeyDetails();
    if (!hasKey) {
      alert(HEBREW_TEXT.apiKeyNotSetAlert);
      setIsLoading(false);
      return;
    }

    const difficultyLabel = DIFFICULTY_LABELS[selectedDifficulty];
    const existingWords = words.map(w => w.aramaic).join(', ');
    const excludeClause = existingWords
      ? `\nאל תכלול את המילים הבאות שכבר נלמדו: ${existingWords}`
      : '';

    const prompt = `אתה מומחה בארמית תלמודית ובבלית. צור בדיוק 10 מילים בארמית לרמה: ${difficultyLabel}.${excludeClause}

לכל מילה ספק:
- aramaic: המילה בארמית (באותיות עבריות)
- translation: התרגום לעברית
- explanation: הסבר קצר על השימוש במילה בתלמוד או במקורות

עצב את התשובה כמערך JSON בלבד:
[{"aramaic":"מילה","translation":"תרגום","explanation":"הסבר קצר"}]

אל תכלול שום טקסט מחוץ למערך ה-JSON.`;

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

      const cleaned = cleanAIResponseForJSON(textResponse);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || !parsed.every(w => w.aramaic && w.translation)) {
        throw new Error('מבנה תגובה לא תקין');
      }

      setWords(prev => [...prev, ...parsed]);
    } catch (err) {
      if (HEBREW_TEXT.isModelOverloadedError?.(err)) {
        showModelOverloadedModal?.();
      } else if (HEBREW_TEXT.isQuotaLimitError?.(err)) {
        showQuotaLimitModal?.();
      } else {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('try again later') || msg.includes('overload')) {
          setError('השרתים עמוסים כרגע. נסה שוב מאוחר יותר.');
        } else {
          setError(err.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedAiModel, words, showQuotaLimitModal, showModelOverloadedModal]);

  const generateMore = useCallback(() => {
    if (difficulty) {
      generateWords(difficulty);
    }
  }, [difficulty, generateWords]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    difficulty,
    words,
    isLoading,
    error,
    viewMode,
    setViewMode,
    generateWords,
    generateMore,
  };
}
