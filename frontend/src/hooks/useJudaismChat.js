import { useState, useCallback, useRef, useEffect } from 'react'; // Added useEffect
import { HEBREW_TEXT } from '../utils/constants';
import { getApiKeyDetails } from '../components/ApiKeyModal';

export default function useJudaismChat({ setGlobalLoadingMessage, selectedAiModel }) { // Added selectedAiModel
  const [chatHistory, setChatHistory] = useState([]);
  const [isJudaismChatLoading, setIsJudaismChatLoading] = useState(false);
  const [judaismChatError, setJudaismChatError] = useState(null);
  const [rememberHistory, setRememberHistory] = useState(false); // State for remembering history
  const chatInputRef = useRef(null);
  const chatBodyRef = useRef(null); // Ref for scrolling chat body

  // Function to toggle history remembering
  const toggleRememberHistory = useCallback(() => {
    setRememberHistory(prev => !prev);
  }, []);

  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatHistory]);


  const sendMessageToJudaismChat = useCallback(async (userMessage) => {
    if (!userMessage.trim()) return;

    // Add user message to local history immediately
    const currentLocalHistory = [...chatHistory, { sender: 'user', text: userMessage }];
    setChatHistory(currentLocalHistory);
    setIsJudaismChatLoading(true);
    setJudaismChatError(null);
    if (setGlobalLoadingMessage) setGlobalLoadingMessage(HEBREW_TEXT.judaismChat.thinking);

    // --- Construct API Payload ---
    let apiContents = [];
    const systemPrompt = `אתה עוזר AI המתמחה בנושאי יהדות. עליך לענות על שאלות הקשורות ליהדות, טקסטים יהודיים (כגון תנ"ך, תלמוד, מדרש, ספרי הלכה), הגות יהודית, רבנים, היסטוריה יהודית, ארמית בהקשר יהודי, וכדומה. אתה יכול גם לענות על ברכות נימוס בסיסיות כמו "שלום", "תודה", "כיף להכיר" וכדומה בצורה קצרה ונעימה. אם תישלח אליך שאלה או בקשה שאינה קשורה לנושאי יהדות או לנימוסים בסיסיים, עליך להשיב אך ורק: '${HEBREW_TEXT.judaismChat.cannotAnswer}'. אל תיכנס לדיבורי סרק או נושאים כלליים.`;

    // History logic
    if (rememberHistory && chatHistory.length > 0) {
      // Include history, mapping sender to API roles
      apiContents.push({ role: 'user', parts: [{ text: systemPrompt }] }); // System prompt as first user message
      apiContents.push({ role: 'model', parts: [{ text: "בסדר, הבנתי. אני מוכן לענות על שאלות בנושאי יהדות." }] }); // Initial model response acknowledging the prompt

      chatHistory.forEach(msg => {
        // Map sender ('user'/'ai') to API role ('user'/'model')
        const role = msg.sender === 'ai' ? 'model' : 'user';
        // Skip error messages from history
        if (!msg.isError) {
          apiContents.push({ role: role, parts: [{ text: msg.text }] });
        }
      });
      // Add the latest user message
      apiContents.push({ role: 'user', parts: [{ text: userMessage }] });

    } else {
      // No history or history not remembered: Send only system prompt + user message
      const combinedPrompt = `${systemPrompt}\n\nהשאלה של המשתמש היא:\n---\n${userMessage}\n---`;
      apiContents = [{ role: 'user', parts: [{ text: combinedPrompt }] }];
    }

    const requestBody = {
      contents: apiContents,
      // Safety settings can be added here if needed
      // generationConfig: { ... }
    };


    try {
      const { key: apiKey } = getApiKeyDetails(); // Use the new helper and destructure the key
      if (!apiKey) {
        alert("מפתח Gemini API אינו מוגדר. אנא הגדר אותו באמצעות כפתור 'מפתח API'.");
        throw new Error("מפתח Gemini API אינו מוגדר. אנא הגדר אותו.");
      }

      // Use the selected AI model directly (no special model for Google search)
      const modelToUse = selectedAiModel;
      console.log(`Using model: ${modelToUse} for this request.`); // Log the model being used

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody) // Use the constructed request body
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
        } catch (e) {
          errorDetails = errorText;
        }
        throw new Error(HEBREW_TEXT.apiError(response.status, response.statusText, errorDetails));
      }

      const data = await response.json();
      const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponseText) {
        throw new Error(HEBREW_TEXT.invalidApiResponse("צ'אט הלכה ויהדות"));
      }

      // Update local history with AI response
      setChatHistory(prevHistory => [...prevHistory, { sender: 'ai', text: aiResponseText.trim() }]);

    } catch (error) {
      console.error(HEBREW_TEXT.judaismChat.errorSendingMessage, error);
      const errorMessage = error.message || HEBREW_TEXT.judaismChat.errorMessageFallback;
      setJudaismChatError(errorMessage);
      // Add error message to local history
      setChatHistory(prevHistory => [...prevHistory, { sender: 'ai', text: errorMessage, isError: true }]);
    } finally {
       setIsJudaismChatLoading(false);
      if (setGlobalLoadingMessage) setGlobalLoadingMessage("");
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  }, [chatHistory, selectedAiModel, setGlobalLoadingMessage]); // Added selectedAiModel to dependencies

  const clearJudaismChat = useCallback(() => {
    setChatHistory([]);
    setJudaismChatError(null);
  }, []);

  return {
    chatHistory,
    isJudaismChatLoading,
    judaismChatError,
    sendMessageToJudaismChat,
    clearJudaismChat,
    chatInputRef,
    chatBodyRef, // Return chat body ref
    rememberHistory, // Return state
    toggleRememberHistory, // Return toggle function
  };
}
