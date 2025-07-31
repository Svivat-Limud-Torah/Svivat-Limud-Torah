import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiKeyDetails } from '../components/ApiKeyModal';
import { DISABLE_ITALIC_FORMATTING_KEY } from '../utils/constants';

/**
 * Custom hook for text organization with real-time progress tracking
 */
export const useTextOrganizationWithProgress = () => {
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

      // Get API key
      const { key: apiKey } = getApiKeyDetails();
      if (!apiKey) {
        throw new Error('מפתח API לא מוגדר. אנא הגדר מפתח API תחילה.');
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Get user settings
      const disableItalicFormatting = localStorage.getItem(DISABLE_ITALIC_FORMATTING_KEY) === 'true';

      // Start the organization process
      const response = await fetch('http://localhost:3001/api/text-organization/organize-with-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          prompt: customPrompt,
          model: selectedAiModel,
          apiKey,
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
      const eventSource = new EventSource(`http://localhost:3001/api/text-organization/progress/${newProcessId}`);
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
      setError(error.message);
      setIsProcessing(false);
      cleanup();
    }
  }, [calculateProcessingSpeed, cleanup]);

  const cancelProcess = useCallback(async () => {
    if (!processId) return;

    try {
      await fetch(`http://localhost:3001/api/text-organization/cancel/${processId}`, {
        method: 'POST'
      });
      
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
