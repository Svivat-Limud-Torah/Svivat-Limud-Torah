import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiKeyDetails } from '../components/ApiKeyModal';
import { DISABLE_ITALIC_FORMATTING_KEY, API_BASE_URL, IS_WEB_MODE, HEBREW_TEXT } from '../utils/constants';
import { callAiGenerate } from '../utils/aiProxy';

/**
 * Custom hook for text organization with real-time progress tracking
 */
export const useTextOrganizationWithProgress = ({ showModelOverloadedModal, showQuotaLimitModal } = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processId, setProcessId] = useState(null);
  const [progress, setProgress] = useState({
    currentStep: 0,
    totalSteps: 0,
    completedSteps: 0,
    status: 'idle',
    steps: [],
    textLength: 0,
    model: '',
    elapsedTime: 0,
    estimatedTimeRemaining: null,
    processingSpeed: null
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const calculateProcessingSpeed = useCallback((textLength, elapsedTime) => {
    if (elapsedTime > 0) {
      const seconds = elapsedTime / 1000;
      return Math.round(textLength / seconds);
    }
    return null;
  }, []);

  const organizeText = useCallback(async (text, selectedAiModel, customPrompt = null) => {
    try {
      // Reset state
      setIsProcessing(true);
      setError(null);
      setResult(null);
      setProgress({
        currentStep: 0,
        totalSteps: 0,
        completedSteps: 0,
        status: 'initializing',
        steps: [],
        textLength: text.split('\n').length,
        model: selectedAiModel,
        elapsedTime: 0,
        estimatedTimeRemaining: null,
        processingSpeed: null
      });

      // Get API key status (key itself is stored server-side)
      const { hasKey } = getApiKeyDetails();
      if (!hasKey) {
        throw new Error('מפתח API לא מוגדר. אנא הגדר מפתח API תחילה.');
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Get user settings
      const disableItalicFormatting = localStorage.getItem(DISABLE_ITALIC_FORMATTING_KEY) === 'true';

      if (IS_WEB_MODE) {
        // Direct Gemini call in web mode (no backend SSE)
        const lines = text.split('\n');
        const totalChunks = Math.ceil(lines.length / 80) || 1;
        setProgress(prev => ({ ...prev, status: 'processing', totalSteps: totalChunks, currentStep: 1 }));

        let organizedParts = [];
        for (let i = 0; i < totalChunks; i++) {
          if (abortControllerRef.current.signal.aborted) throw new Error('בוטל.');
          const chunk = lines.slice(i * 80, (i + 1) * 80).join('\n');
          const italicNote = disableItalicFormatting ? '\nחשוב: אל תשתמש בעיצוב italic (*כזה*) בשום מקום.' : '';
          const prompt = customPrompt || `ארגן את הטקסט הבא בצורה נקייה ומסודרת ב-Markdown. שמור על כל התוכן המקורי ללא שינוי. הוסף כותרות, רשימות ועיצוב מתאים.${italicNote}\n\nטקסט:\n${chunk}`;
          const requestBody = { contents: [{ parts: [{ text: prompt }] }] };
          const response = await callAiGenerate(selectedAiModel, requestBody, 120000);
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || 'שגיאה בארגון הטקסט');
          }
          const data = await response.json();
          const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          organizedParts.push(aiText);
          setProgress(prev => ({ ...prev, completedSteps: i + 1, currentStep: Math.min(i + 2, totalChunks) }));
        }

        const organizedText = organizedParts.join('\n\n');
        setProgress(prev => ({ ...prev, status: 'completed', completedSteps: totalChunks }));
        setResult({ organizedText, processInfo: { model: selectedAiModel, chunks: totalChunks } });
        setIsProcessing(false);
        cleanup();
        return;
      }

      // Start the organization process (apiKey is in server session)
      const response = await fetch(`${API_BASE_URL}/text-organization/organize-with-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text,
          prompt: customPrompt,
          model: selectedAiModel,
          disableItalicFormatting
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'שגיאה בהתחלת תהליך הארגון');
      }

      const { processId: newProcessId } = await response.json();
      setProcessId(newProcessId);

      // Start listening to progress updates via Server-Sent Events
      const eventSource = new EventSource(`${API_BASE_URL}/text-organization/progress/${newProcessId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('Connected to progress stream');
              break;
              
            case 'progress':
              const processingSpeed = calculateProcessingSpeed(
                data.textLength, 
                data.elapsedTime
              );
              
              setProgress({
                currentStep: data.currentStep,
                totalSteps: data.totalSteps,
                completedSteps: data.completedSteps,
                status: data.status,
                steps: data.steps,
                textLength: data.textLength,
                model: data.model,
                elapsedTime: data.elapsedTime,
                estimatedTimeRemaining: data.estimatedTimeRemaining,
                processingSpeed
              });
              break;
              
            case 'completed':
              setProgress(prev => ({
                ...prev,
                status: 'completed',
                completedSteps: prev.totalSteps
              }));
              setResult({
                organizedText: data.organizedText,
                processInfo: data.processInfo
              });
              setIsProcessing(false);
              cleanup();
              break;
              
            case 'error':
              setError(data.error);
              setIsProcessing(false);
              cleanup();
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setError('שגיאה בחיבור לשרת התקדמות');
        setIsProcessing(false);
        cleanup();
      };

    } catch (error) {
      console.error('Error starting text organization:', error);
      // Check for model overloaded / quota errors first — show modal instead of inline error
      if (HEBREW_TEXT.isModelOverloadedError(error) && showModelOverloadedModal) {
        showModelOverloadedModal();
      } else if (HEBREW_TEXT.isQuotaLimitError(error) && showQuotaLimitModal) {
        showQuotaLimitModal();
      } else {
        setError(error.message);
      }
      setIsProcessing(false);
      cleanup();
    }
  }, [calculateProcessingSpeed, cleanup]);

  const cancelProcess = useCallback(async () => {
    if (!processId && !IS_WEB_MODE) return;

    try {
      if (IS_WEB_MODE) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } else {
        await fetch(`${API_BASE_URL}/text-organization/cancel/${processId}`, {
          method: 'POST'
        });
      }
      
      setIsProcessing(false);
      setProgress(prev => ({ ...prev, status: 'cancelled' }));
      cleanup();
    } catch (error) {
      console.error('Error cancelling process:', error);
    }
  }, [processId, cleanup]);

  const resetState = useCallback(() => {
    cleanup();
    setIsProcessing(false);
    setProcessId(null);
    setProgress({
      currentStep: 0,
      totalSteps: 0,
      completedSteps: 0,
      status: 'idle',
      steps: [],
      textLength: 0,
      model: '',
      elapsedTime: 0,
      estimatedTimeRemaining: null,
      processingSpeed: null
    });
    setResult(null);
    setError(null);
  }, [cleanup]);

  return {
    isProcessing,
    progress,
    result,
    error,
    organizeText,
    cancelProcess,
    resetState
  };
};
