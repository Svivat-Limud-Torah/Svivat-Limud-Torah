// frontend/src/hooks/useAiFeatures.js
import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL, HEBREW_TEXT } from '../utils/constants'; // Removed GEMINI_MODEL_NAME, GEMINI_API_KEY
import path from '../utils/pathUtils'; // For path.basename, path.dirname, path.join for saving summary
import { getApiKeyDetails } from '../components/ApiKeyModal'; // Import the updated helper
import apiService from '../utils/apiService'; // Import apiService

export default function useAiFeatures({
  activeTabObject, // From App
  setMainViewMode,   // From App
  handleCreateNewFileOrSummary, // From useFileOperations, passed through App
  setGlobalLoadingMessage, // From App
  workspaceFolders, // From App (via useWorkspace), used for default save path
  selectedAiModel, // From App
  showPilpulta, // From App - function to show the Pilpulta window with data
  // hidePilpulta is implicitly handled by closing the window via its own button triggering state change in App
}) {
  const [flashcardData, setFlashcardData] = useState([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState(null);
  const lastContentForFlashcardsRef = useRef('');

  const [summaryText, setSummaryText] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [originalFileForSummary, setOriginalFileForSummary] = useState(null);
  const lastContentForSummaryRef = useRef('');

  const [sourceFindingResults, setSourceFindingResults] = useState('');
  const [isLoadingSourceFinding, setIsLoadingSourceFinding] = useState(false);
  const [sourceFindingError, setSourceFindingError] = useState(null);
  const [originalFileForSourceFinding, setOriginalFileForSourceFinding] = useState(null);
  const lastContentForSourceFindingRef = useRef('');

  // --- Transcription Processing Feature State ---
  const [processedText, setProcessedText] = useState('');
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [processingMode, setProcessingMode] = useState(''); // 'organize' or 'summarize'

  // --- Pilpulta Feature State ---
  const [pilpultaData, setPilpultaData] = useState([]); // Array of { question, source }
  const [isLoadingPilpulta, setIsLoadingPilpulta] = useState(false);
  const [pilpultaError, setPilpultaError] = useState(null);
  const lastContentForPilpultaRef = useRef('');

  // --- Smart Search State ---
  const [isSmartSearchModalOpen, setIsSmartSearchModalOpen] = useState(false);
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [smartSearchResults, setSmartSearchResults] = useState(null);
  const [isLoadingSmartSearch, setIsLoadingSmartSearch] = useState(false);
  const [smartSearchError, setSmartSearchError] = useState(null);


  const generateFlashcards = useCallback(async () => {
    if (!activeTabObject || activeTabObject.type !== 'file' || activeTabObject.content === undefined) {
      alert(HEBREW_TEXT.openFileForFlashcards);
      return;
    }
    setIsLoadingFlashcards(true);
    setFlashcardError(null);
    setFlashcardData([]);
    lastContentForFlashcardsRef.current = activeTabObject.content;
    setGlobalLoadingMessage(HEBREW_TEXT.generatingFlashcards);

    const prompt = `אתה מומחה ביצירת תוכן לימודי.
הפוך את הטקסט הבא לסדרה של זוגות שאלה ותשובה, המתאימים לכרטיסיות לימוד.
כל זוג צריך להיות מובחן ולהתמקד במושגי מפתח או במידע מהטקסט.
עצב את הפלט כמערך JSON של אובייקטים, כאשר לכל אובייקט יש מפתח 'question' ומפתח 'answer'.
לדוגמה: [{ "question": "מהו הנושא המרכזי?", "answer": "הנושא המרכזי הוא..." }, { "question": "...", "answer": "..." }]
ודא שהשאלות ברורות ותמציתיות, והתשובות אינפורמטיביות.
אל תכלול טקסט כלשהו מחוץ למערך ה-JSON.

הנה הטקסט לעיבוד:
---
${activeTabObject.content}
---
`;
    try {
      const { key: apiKey } = getApiKeyDetails(); // Only need the key here
      if (!apiKey) {
        // Use alert for immediate user feedback, but keep the error for console/state
        alert(HEBREW_TEXT.apiKeyNotSetAlert); // Use constant
        throw new Error(HEBREW_TEXT.apiKeyNotSetError); // Use constant
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedAiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
          console.error("Gemini API Error Response (Flashcards - JSON):", errorData);
        } catch (e) {
          errorDetails = errorText;
          console.error("Gemini API Error Response (Flashcards - Non-JSON):", errorText);
        }
        throw new Error(HEBREW_TEXT.apiError(response.status, response.statusText, errorDetails));
      }
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error(HEBREW_TEXT.invalidApiResponse("כרטיסיות"));
      const cleanedResponse = textResponse.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      let parsedCards = JSON.parse(cleanedResponse);
      if (!Array.isArray(parsedCards) || !parsedCards.every(c => c.question && c.answer)) {
        throw new Error(HEBREW_TEXT.invalidFlashcardResponse);
      }
      setFlashcardData(parsedCards);
      setMainViewMode('flashcards');
    } catch (error) {
      console.error("שגיאה ביצירת כרטיסיות:", error);
      setFlashcardError(error.message);
      alert(`${HEBREW_TEXT.flashcardsError}: ${error.message}`); // Show error to user
    } finally {
      setIsLoadingFlashcards(false);
      setGlobalLoadingMessage("");
    }
  }, [activeTabObject, setMainViewMode, setGlobalLoadingMessage, selectedAiModel]);

  const generateSummary = useCallback(async () => {
    if (!activeTabObject || activeTabObject.type !== 'file' || activeTabObject.content === undefined) {
      alert(HEBREW_TEXT.openFileForSummary);
      return;
    }
    setIsLoadingSummary(true);
    setSummaryError(null);
    setSummaryText('');
    setOriginalFileForSummary({
      basePath: activeTabObject.basePath,
      relativePath: activeTabObject.relativePath,
      name: activeTabObject.name
    });
    lastContentForSummaryRef.current = activeTabObject.content;
    setGlobalLoadingMessage(HEBREW_TEXT.generatingSummary);

    const prompt = `אתה מומחה בכתיבת סיכומים תמציתיים ואינפורמטיביים.
סכם את הטקסט הבא. התמקד בנקודות המרכזיות ובמידע החשוב ביותר.
הפלט צריך להיות הסיכום בלבד, ללא כותרות או משפטי פתיחה כמו "להלן סיכום הטקסט:".

הטקסט לסיכום:
---
${activeTabObject.content}
---
`;
    try {
      const { key: apiKey } = getApiKeyDetails(); // Only need the key here
      if (!apiKey) {
        alert(HEBREW_TEXT.apiKeyNotSetAlert);
        throw new Error(HEBREW_TEXT.apiKeyNotSetError);
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedAiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
          console.error("Gemini API Error Response (Summary - JSON):", errorData);
        } catch (e) {
          errorDetails = errorText;
          console.error("Gemini API Error Response (Summary - Non-JSON):", errorText);
        }
        throw new Error(HEBREW_TEXT.apiError(response.status, response.statusText, errorDetails));
      }
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error(HEBREW_TEXT.invalidApiResponse("סיכום"));
      setSummaryText(textResponse.trim());
      setMainViewMode('summary');
    } catch (error) {
      console.error("שגיאה ביצירת סיכום:", error);
      setSummaryError(error.message);
       alert(`${HEBREW_TEXT.summaryError}: ${error.message}`); // Show error to user
    } finally {
      setIsLoadingSummary(false);
      setGlobalLoadingMessage("");
    }
  }, [activeTabObject, setMainViewMode, setGlobalLoadingMessage, selectedAiModel]);

  const saveSummary = useCallback(async (summaryContentToSave) => {
    if (!originalFileForSummary) {
      alert(HEBREW_TEXT.error + ": המקור של הסיכום אינו ידוע. לא ניתן לשמור.");
      return;
    }
    const { basePath, relativePath: origRelPath, name: originalName } = originalFileForSummary;
    const originalFileNameWithoutExt = path.basename(originalName, path.extname(originalName));
    const suggestedSummaryFileName = `${originalFileNameWithoutExt}_summary.txt`;
    const dirnameOfOriginal = path.dirname(origRelPath) === '.' ? '' : path.dirname(origRelPath);


    const finalSummaryFileName = prompt(HEBREW_TEXT.saveSummaryPrompt(path.join(dirnameOfOriginal, originalName), suggestedSummaryFileName), suggestedSummaryFileName);

    if (!finalSummaryFileName || !finalSummaryFileName.trim()) {
      alert(HEBREW_TEXT.invalidName + " " + HEBREW_TEXT.cancel); return;
    }
    if (finalSummaryFileName.includes('/') || finalSummaryFileName.includes('\\')) {
      alert(HEBREW_TEXT.itemCannotContainSlash("קובץ סיכום")); return;
    }
    const relativePathForSummary = path.join(dirnameOfOriginal, finalSummaryFileName.trim());

    const success = await handleCreateNewFileOrSummary(basePath, relativePathForSummary, summaryContentToSave, true);
    if (success) {
      setMainViewMode('editor');
      setSummaryText('');
      setSummaryError(null);
      setOriginalFileForSummary(null);
    }
  }, [originalFileForSummary, handleCreateNewFileOrSummary, setMainViewMode]);

  const discardSummary = useCallback(() => {
    setMainViewMode('editor');
    setSummaryText('');
    setSummaryError(null);
    setOriginalFileForSummary(null);
  }, [setMainViewMode]);

  // --- Find Jewish Sources Feature ---
  const findJewishSources = useCallback(async () => {
    if (!activeTabObject || activeTabObject.type !== 'file' || activeTabObject.content === undefined) {
      alert(HEBREW_TEXT.openFileForSourceFinding);
      return;
    }
    setIsLoadingSourceFinding(true);
    setSourceFindingError(null);
    setSourceFindingResults('');
    setOriginalFileForSourceFinding({
      basePath: activeTabObject.basePath,
      relativePath: activeTabObject.relativePath,
      name: activeTabObject.name
    });
    lastContentForSourceFindingRef.current = activeTabObject.content;
    setGlobalLoadingMessage(HEBREW_TEXT.findingSources);

    const prompt = `אתה עוזר מומחה באיתור מקורות יהודיים רלוונטיים לטקסט נתון.
השתמש ביכולות החיפוש שלך (Grounding with Google Search) כדי למצוא מקורות אך ורק מטקסטים יהודיים קנוניים (תנ"ך, משנה, תלמוד, מדרשים, ספרי הלכה מרכזיים כמו רמב"ם ושולחן ערוך, ספרי הגות יהודית קלאסיים) ומאתרי אינטרנט יהודיים מכובדים ומהימנים (כגון ספריא, דעת, אתרי ישיבות מוכרות ואפילו האתר של הרב אורי שרקי).

עבור כל משפט או קטע רלוונטי בטקסט המקורי של המשתמש, נתח אותו ובדוק אם הוא מתאים לאחד משני התרחישים הבאים:

תרחיש א': התאמה טקסטואלית מדויקת או קרובה מאוד
- אם הטקסט של המשתמש (או קטע ממנו) הוא ציטוט מדויק או כמעט מדויק ממקור יהודי, הוסף מיד לאחר הקטע הרלוונטי את המקור בלבד, בפורמט: (מקור: <ציטוט_מקור_בלבד>).
- לדוגמה, אם המשתמש כתב: "...שמע ישראל ה' אלקינו ה' אחד..."
- הפלט שלך צריך להיות: "...שמע ישראל ה' אלקינו ה' אחד... (מקור: דברים ו, ד)"
- במקרה זה, *אל* תכלול ציטוט חוזר מהמקור.

תרחיש ב': התאמה רעיונית או קונספטואלית
- אם הטקסט של המשתמש מבטא רעיון או קונספט שנמצא במקורות יהודיים, אך אינו ציטוט ישיר, הוסף מיד לאחר הקטע הרלוונטי את המקור והסבר קצר, בפורמט: (מקור: <ציטוט_מקור>, "<ציטוט_קצר_מהמקור_המדגים_את_הרעיון (משפט אחד או שניים)>").
- לדוגמה, אם המשתמש כתב: "...חשוב להתפלל בכוונה..."
- הפלט שלך צריך להיות: "...חשוב להתפלל בכוונה... (מקור: רמב"ם, הלכות תפילה וברכת כהנים ד, טו, "כוונה כיצד? שיפנה את לבו מכל המחשבות ויראה עצמו כאילו הוא עומד לפני השכינה.")"

כללים נוספים:
- אם לא נמצא מקור למשפט או קטע מסוים, השאר את הטקסט המקורי כפי שהוא ללא תוספות.
- הפלט הסופי שלך צריך להיות הטקסט המקורי של המשתמש, כאשר המקורות משולבים בו על פי התרחישים והפורמטים שתוארו לעיל.
- אל תוסיף שום טקסט הסבר נוסף מחוץ לטקסט המעובד.
- הקפד על דיוק במראי מקומות. ודא שכתובות URL, אם הן כלולות, הן מלאות ותקינות.

הנה הטקסט לעיבוד:
---
${activeTabObject.content}
---
`;
    try {
      const { key: apiKey, isPaid: isPaidKey } = getApiKeyDetails(); // Get key and paid status

      if (!apiKey) {
        alert(HEBREW_TEXT.apiKeyNotSetAlert);
        throw new Error(HEBREW_TEXT.apiKeyNotSetError);
      }

      // Conditionally add grounding tool based on paid status
      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        ...(isPaidKey && { // Only add 'tools' if isPaidKey is true
          tools: [{
            "googleSearchRetrieval": {}
          }]
        })
      };

      // Note: Ensure the selectedAiModel supports grounding if this feature is critical.
      // The prompt requests grounding, so the model needs to support it.
      // We now only enable grounding if the key is marked as paid.
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedAiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }); // Correctly placed closing parenthesis for fetch

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails = '';
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.error?.message || errorText;
          console.error("Gemini API Error Response (Source Finding - JSON):", errorData);
        } catch (e) {
          errorDetails = errorText;
          console.error("Gemini API Error Response (Source Finding - Non-JSON):", errorText);
        }
        throw new Error(HEBREW_TEXT.apiError(response.status, response.statusText, errorDetails));
      }
      const data = await response.json();

      let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse && data.candidates?.[0]?.content?.parts?.length > 1) {
        const groundedPart = data.candidates[0].content.parts.find(part => part.text && part.text.length > 0);
        if (groundedPart) {
            textResponse = groundedPart.text;
        }
      }

      if (!textResponse) {
        console.warn("Gemini API response for source finding did not contain a usable text part. Full response:", data);
        throw new Error(HEBREW_TEXT.noSourceFoundError);
      }
      setSourceFindingResults(textResponse.trim());
      setMainViewMode('sourceResults'); // New view mode
    } catch (error) {
      console.error("שגיאה במציאת מקורות:", error);
      setSourceFindingError(error.message);
      alert(`${HEBREW_TEXT.sourceResultsError}: ${error.message}`); // Show error to user
    } finally {
      setIsLoadingSourceFinding(false);
      setGlobalLoadingMessage("");
    }
  }, [activeTabObject, setMainViewMode, setGlobalLoadingMessage, selectedAiModel]);

  const saveSourceFindingResults = useCallback(async (contentToSave) => {
    if (!originalFileForSourceFinding) {
      alert(HEBREW_TEXT.error + ": המקור של הטקסט עם המקורות אינו ידוע. לא ניתן לשמור.");
      return;
    }
    const { basePath, relativePath: origRelPath, name: originalName } = originalFileForSourceFinding;
    const originalFileNameWithoutExt = path.basename(originalName, path.extname(originalName));
    const suggestedFileName = `${originalFileNameWithoutExt}_with_sources.txt`;
    const dirnameOfOriginal = path.dirname(origRelPath) === '.' ? '' : path.dirname(origRelPath);

    const finalFileName = prompt(HEBREW_TEXT.saveSourceResultsPrompt(path.join(dirnameOfOriginal, originalName), suggestedFileName), suggestedFileName);

    if (!finalFileName || !finalFileName.trim()) {
      alert(HEBREW_TEXT.invalidName + " " + HEBREW_TEXT.cancel); return;
    }
    if (finalFileName.includes('/') || finalFileName.includes('\\')) {
      alert(HEBREW_TEXT.itemCannotContainSlash("קובץ מקורות")); return;
    }
    const relativePathForNewFile = path.join(dirnameOfOriginal, finalFileName.trim());

    const success = await handleCreateNewFileOrSummary(basePath, relativePathForNewFile, contentToSave, true); // true to open it
    if (success) {
      setMainViewMode('editor');
      setSourceFindingResults('');
      setSourceFindingError(null);
      setOriginalFileForSourceFinding(null);
    }
  }, [originalFileForSourceFinding, handleCreateNewFileOrSummary, setMainViewMode]);

  const discardSourceFindingResults = useCallback(() => {
    setMainViewMode('editor');
    setSourceFindingResults('');
    setSourceFindingError(null);
    setOriginalFileForSourceFinding(null);
  }, [setMainViewMode]);

  // Expose setters for these new states for useTabs cleanup
  const setSourceFindingResultsState = useCallback((text) => setSourceFindingResults(text), []);
  const setSourceFindingErrorState = useCallback((error) => setSourceFindingError(error), []);
  const setOriginalFileForSourceFindingState = useCallback((file) => setOriginalFileForSourceFinding(file), []);

  // --- Transcription Processing Functions ---
  const processTranscription = useCallback(async (inputText, operation) => {
    if (!inputText.trim()) {
      alert(HEBREW_TEXT.pleaseEnterText);
      return;
    }
    setIsProcessingText(true);
    setProcessingError(null);
    setProcessedText('');
    setProcessingMode(operation);
    setGlobalLoadingMessage(HEBREW_TEXT.processingTranscription);

    let promptText = '';
    if (operation === 'organize') {
      promptText = `אתה מומחה בארגון ועריכת טקסטים.
הטקסט הבא הוא תמלול של שיעור או חברותא. אנא סדר וארגן אותו בצורה ברורה וקריאה. זה יכול לכלול:
- חלוקה לפסקאות הגיוניות.
- הוספת כותרות משנה במידת הצורך (ללא עיצוב מיוחד, רק טקסט).
- תיקוני פיסוק ובמידת האפשר גם שגיאות כתיב קלות.
- הדגשת נקודות מרכזיות או שאלות שעולות מהטקסט.
- שמירה על שפת המקור וסגנון הדיבור ככל הניתן, תוך הפיכת הטקסט למסודר יותר. הפלט צריך להיות הטקסט המאורגן בלבד.

הטקסט לעיבוד:
---
${inputText}
---
`;
    } else if (operation === 'summarize') {
      promptText = `אתה מומחה בכתיבת סיכומים תמציתיים ואינפורמטיביים.
סכם את הטקסט הבא, שהוא תמלול של שיעור או חברותא. התמקד בנקודות המרכזיות, ברעיונות העיקריים ובמסקנות החשובות.
הפלט צריך להיות הסיכום בלבד, ללא כותרות או משפטי פתיחה כמו "להלן סיכום הטקסט:".

הטקסט לסיכום:
---
${inputText}
---
`;
    } else {
      setProcessingError("Invalid operation type.");
      setIsProcessingText(false);
      setGlobalLoadingMessage("");
      return;
    }

    try {
      const { key: apiKey } = getApiKeyDetails(); // Only need the key here
      if (!apiKey) {
        alert(HEBREW_TEXT.apiKeyNotSetAlert);
        throw new Error(HEBREW_TEXT.apiKeyNotSetError);
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedAiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
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
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error(HEBREW_TEXT.invalidApiResponse(operation === 'organize' ? "ארגון טקסט" : "סיכום תמלול"));

      setProcessedText(textResponse.trim());
      // setMainViewMode('transcriptionResult'); // Handled by modal flow
    } catch (error) {
      console.error(`שגיאה ב${operation === 'organize' ? 'ארגון' : 'סיכום'} טקסט:`, error);
      setProcessingError(error.message);
      // No alert here, error is displayed within the modal
    } finally {
      setIsProcessingText(false);
      setGlobalLoadingMessage("");
    }
  }, [setGlobalLoadingMessage, selectedAiModel]);

  const saveProcessedText = useCallback(async (textToSave, mode) => {
      const defaultFileNameSuffix = mode === 'organize' ? HEBREW_TEXT.organizedTextDefaultFileName : HEBREW_TEXT.summarizedTranscriptionDefaultFileName;

      let basePathToUse = '';
      if (activeTabObject?.basePath) {
          basePathToUse = activeTabObject.basePath;
      } else if (workspaceFolders && workspaceFolders.length > 0) {
          basePathToUse = workspaceFolders[0].path; // Default to the first workspace folder
      }

      if (!basePathToUse) {
          alert(HEBREW_TEXT.error + ": " + HEBREW_TEXT.noWorkspaceSelectedToSave);
          return false; // Indicate failure
      }

      // Use a generic prefix as original file name isn't known here
      const suggestedFileName = `processed_transcription${defaultFileNameSuffix}`;

      const finalFileName = prompt(HEBREW_TEXT.saveFilePrompt(suggestedFileName), suggestedFileName);

      if (!finalFileName || !finalFileName.trim()) {
        // alert(HEBREW_TEXT.invalidName + " " + HEBREW_TEXT.cancel); // User might cancel, not necessarily an error
        return false; // Indicate failure or cancellation
      }
      if (finalFileName.includes('/') || finalFileName.includes('\\')) {
        alert(HEBREW_TEXT.itemCannotContainSlash("שם קובץ"));
        return false; // Indicate failure
      }

      const success = await handleCreateNewFileOrSummary(basePathToUse, finalFileName.trim(), textToSave, true); // true to open it
      if (success) {
        setProcessedText('');
        setProcessingError(null);
        // setProcessingMode(''); // Reset mode
        // The modal should close or reset itself upon successful save
        return true; // Indicate success
      }
      return false; // Indicate failure
    }, [handleCreateNewFileOrSummary, activeTabObject?.basePath, workspaceFolders]);


  // --- Pilpulta Feature ---
  const generatePilpulta = useCallback(async () => {
    if (!activeTabObject || activeTabObject.type !== 'file' || activeTabObject.content === undefined) {
        alert(HEBREW_TEXT.openFileForPilpulta); // Add this constant
        return;
    }
    setIsLoadingPilpulta(true);
    setPilpultaError(null);
    setPilpultaData([]); // Clear previous results
    lastContentForPilpultaRef.current = activeTabObject.content;
    setGlobalLoadingMessage(HEBREW_TEXT.generatingPilpulta); // Add this constant

    try {
        // Retrieve the full API key details from the UI configuration
        const { key: apiKey, isPaid: isPaidKey } = getApiKeyDetails();
        if (!apiKey) {
            alert(HEBREW_TEXT.apiKeyNotSetAlert);
            throw new Error(HEBREW_TEXT.apiKeyNotSetError);
        }

        // Pass the actual API key along with other parameters to the backend service
        const results = await apiService.generatePilpultaQuestions(
            activeTabObject.content,
            isPaidKey, // Tell backend whether to use web search
            selectedAiModel, // Pass selected model to backend
            apiKey // Pass the API key configured in the UI
        );

        if (!results || !Array.isArray(results)) {
            console.warn("Invalid response format from backend for Pilpulta:", results);
            throw new Error(HEBREW_TEXT.invalidPilpultaResponse); // Add this constant
        }

        setPilpultaData(results);
        showPilpulta(results); // Call the function passed from App to show the window

    } catch (error) {
        console.error("שגיאה ביצירת פלפולתא:", error);
        setPilpultaError(error.message);
        alert(`${HEBREW_TEXT.pilpultaError}: ${error.message}`); // Add this constant
    } finally {
        setIsLoadingPilpulta(false);
        setGlobalLoadingMessage("");
    }
  }, [activeTabObject, setGlobalLoadingMessage, selectedAiModel, apiService, showPilpulta]); // Added dependencies


  return {
    flashcardData,
    setFlashcardData,
    isLoadingFlashcards,
    flashcardError,
    setFlashcardError,
    summaryText,
    setSummaryText,
    isLoadingSummary,
    summaryError,
    setSummaryError,
    originalFileForSummary,
    setOriginalFileForSummary,
    generateFlashcards,
    generateSummary,
    saveSummary,
    discardSummary,

    // Source Finding
    sourceFindingResults,
    setSourceFindingResults: setSourceFindingResultsState,
    isLoadingSourceFinding,
    sourceFindingError,
    setSourceFindingError: setSourceFindingErrorState,
    originalFileForSourceFinding,
    setOriginalFileForSourceFinding: setOriginalFileForSourceFindingState,
    findJewishSources,
    saveSourceFindingResults,
    discardSourceFindingResults,

    // Transcription Processing
    processTranscription,
    processedText,
    setProcessedText, // Expose setter for clearing
    isProcessingText,
    processingError,
    setProcessingError, // Expose setter for clearing
    saveProcessedText,
    processingMode, // Expose for result view title

    // Pilpulta
    pilpultaData,
    isLoadingPilpulta,
    pilpultaError,
    generatePilpulta, // Expose the function
    setPilpultaData, // Expose setter if needed for clearing
    setPilpultaError, // Expose setter if needed for clearing

    // Smart Search
    isSmartSearchModalOpen,
    smartSearchQuery, // Though primarily managed in modal, might be useful here
    smartSearchResults,
    isLoadingSmartSearch,
    smartSearchError,
    openSmartSearchModal: useCallback(() => setIsSmartSearchModalOpen(true), []),
    closeSmartSearchModal: useCallback(() => {
      setIsSmartSearchModalOpen(false);
      setSmartSearchQuery('');
      setSmartSearchResults(null);
      setSmartSearchError(null);
    }, []),
    performSmartSearch: useCallback(async (query, numFilesToScan) => { // Added numFilesToScan
      setIsLoadingSmartSearch(true);
      setSmartSearchQuery(query); // Query is already set by modal, this is more for internal state if needed
      setSmartSearchResults(null);
      setSmartSearchError(null);
      // Initial loading message, can be updated by backend through progress updates if implemented
      // For now, using a sequence of messages based on the plan.
      setGlobalLoadingMessage(HEBREW_TEXT.smartSearchLoadingFileList);

      try {
        const { key: apiKey } = getApiKeyDetails();
        if (!apiKey) {
          alert(HEBREW_TEXT.apiKeyNotSetAlert);
          throw new Error(HEBREW_TEXT.apiKeyNotSetError);
        }

        const currentWorkspacePath = workspaceFolders[0]?.path;
        if (!currentWorkspacePath) {
          throw new Error("לא נבחרה תיקיית עבודה. אנא פתח תיקייה כדי להשתמש בחיפוש חכם.");
        }
        
        // The plan mentions updating loading messages. This is a simplified approach.
        // A more robust solution might involve progress updates from the backend.
        // For now, we'll rely on the backend to take some time and the spinner in the modal.
        // We can update the global message at key stages if desired, but the modal itself
        // will show a spinner. The backend will do multiple steps.

        const results = await apiService.executeSmartSearch(
          query,
          selectedAiModel,
          apiKey,
          currentWorkspacePath,
          numFilesToScan, // Pass numFilesToScan
          (stageMessage) => setGlobalLoadingMessage(stageMessage) // Pass callback for progress
        );
        setSmartSearchResults(results);
      } catch (error) {
        console.error("שגיאה בחיפוש חכם:", error);
        const errorMessage = error.response?.data?.error || error.message || HEBREW_TEXT.smartSearchErrorPrefix + " " + HEBREW_TEXT.error;
        setSmartSearchError(errorMessage);
        // Alerting here might be redundant if the modal displays the error,
        // but good for ensuring user sees it if modal somehow fails to render error.
        // alert(errorMessage); 
      } finally {
        setIsLoadingSmartSearch(false);
        setGlobalLoadingMessage(""); // Clear global loading message
      }
    }, [selectedAiModel, workspaceFolders, setGlobalLoadingMessage, apiService]),
  };
}
