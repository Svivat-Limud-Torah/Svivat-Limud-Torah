// frontend/src/utils/constants.js
export const APP_DIRECTION = 'rtl';
export const SUPPORTED_IMAGE_EXTENSIONS_CLIENT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
// export const GEMINI_API_KEY = 'YOUR_API_KEY_HERE'; // Key is now managed via ApiKeyModal and localStorage
export const API_KEY_STORAGE_KEY = 'gemini_api_key'; // Added for consistency
export const API_KEY_IS_PAID_STORAGE_KEY = 'gemini_api_key_is_paid'; // Key for paid status
export const GEMINI_MODEL_NAME = 'gemini-1.5-pro-latest'; // Default model if not selected

// Text Organization Settings
export const DISABLE_ITALIC_FORMATTING_KEY = 'disable_italic_formatting'; // Setting to disable italic formatting in AI text organization

// AI Models available for selection
export const AI_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'הגרסה המתקדמת ביותר של Gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'גרסה מהירה של Gemini 2.5' }
];

export const DEFAULT_FONT_SIZE_PX = 16;
// FONT_SIZE_INCREMENT_PX הוסר - לא נדרש יותר

// Updated for V2, assuming API endpoint remains under /api but might be /v2/search
export const API_BASE_URL = 'http://localhost:3001/api';
// The full V2 search URL will be API_BASE_URL + '/v2/search'

// Hebrew UI Text Strings
export const HEBREW_TEXT = {
  // General
  appName: "מערכת",
  error: "שגיאה",
  loading: "טוען...",
  close: "סגור",
  save: "שמור",
  discard: "בטל",
  cancel: "ביטול",
  confirm: "אישור",
  optional: "אופציונלי",
  days: "ימים",
  edit: "ערוך",
  add: "הוסף",
  saveChanges: "שמור שינויים",
  yes: "כן",
  no: "לא",
  na: "לא זמין",
  unknownFolder: "תיקייה לא ידועה",
  tryAgain: "נסה שוב",
  previousDay: "יום קודם", // Added for date navigation
  nextDay: "יום הבא",   // Added for date navigation

  // File Operations
  newFile: "קובץ חדש",
  newFolder: "תיקייה חדשה",
  rename: "שנה שם",
  deleteItem: "מחק פריט",
  deleteConfirmation: (itemName) => `האם אתה בטוח שברצונך למחוק את '${itemName}'? פעולה זו אינה הפיכה.`,
  fileNamePrompt: "הזן שם קובץ:",
  folderNamePrompt: "הזן שם תיקייה:",
  invalidName: "שם לא חוקי.",
  noWorkspaceSelectedToSave: "לא נבחרה תיקיית עבודה לשמירת הקובץ. אנא פתח תיקייה או קובץ.",

  // Editor
  unsavedChanges: "לא שמור",

  // Sidebar & Main View Toggles
  explorer: "סייר קבצים",
  search: "חיפוש",
  searchFiles: "חיפוש קבצים",
  recentFiles: "קבצים אחרונים",
  frequentFiles: "קבצים נפוצים",

  // Search
  searchIn: (scope) => `חפש ב${scope}`,
  searchInThisFolder: "חפש בתיקייה זו...",
  searchGlobal: "חיפוש גלובלי",
  clearSearchScope: "נקה היקף חיפוש",
  searchPlaceholder: "הזן מונח חיפוש...",
  searchQueryTooShort: "מילת החיפוש קצרה מדי.",
  searchScopeUpdatedEnterTerm: "היקף החיפוש עודכן. הזן מונח חיפוש.",
  searchScopeClearedEnterTerm: "היקף החיפוש נוקה. הזן מונח לחיפוש בכל סביבת העבודה.",
  noResultsFound: "לא נמצאו תוצאות.",
  searchResultsCount: (count, filesCount) => `נמצאו ${count} התאמות ב-${filesCount} קבצים:`,
  searching: "מחפש...",

  // Search V2 Options
  regex: "ביטוי רגולרי (RegEx)",
  caseSensitive: "התאם רישיות (Case Sensitive)",
  wholeWord: "מילה שלמה (Whole Word)",
  includeFiles: "כלול קבצים (Glob Patterns)",
  excludeFiles: "אל תכלול קבצים (Glob Patterns)",
  includePlaceholder: "*.js, *.txt",
  excludePlaceholder: "node_modules/**, *.log",

  // AI Features
  generateFlashcards: 'כרטיסיות שו"ת',
  generatingFlashcards: "יוצר כרטיסיות...",
  flashcardsError: "שגיאת כרטיסיות",
  openFileForFlashcards: "פתח קובץ טקסט בעורך כדי ליצור כרטיסיות.",
  invalidFlashcardResponse: "הפלט מ-Gemini אינו במבנה JSON תקין של כרטיסיות.",

  generateSummary: "סכם טקסט",
  generatingSummary: "יוצר סיכום...",
  summaryError: "שגיאת סיכום",
  openFileForSummary: "פתח קובץ טקסט בעורך כדי ליצור סיכום.",
  saveSummaryPrompt: (originalFileName, suggestedName) => `הזן שם לקובץ הסיכום (יישמר בתיקייה של '${originalFileName}'):`,

  findSources: "מצא מקורות",
  findingSources: "מחפש מקורות...",
  sourceResultsError: "שגיאה במציאת מקורות",
  openFileForSourceFinding: "פתח קובץ טקסט בעורך כדי למצוא מקורות.",
  saveSourceResultsPrompt: (originalFileName, suggestedName) => `הזן שם לקובץ המקורות (יישמר בתיקייה של '${originalFileName}'):`,
  redoSearch: "בצע חיפוש מחדש",
  noSourceFoundError: "לא נמצא תוכן מקורות בתגובת ה-API.",
  apiError: (status, statusText, details) => `שגיאת API של Gemini: ${status} ${statusText}. ${details}`,
  invalidApiResponse: (feature) => `תגובה לא חוקית מ-Gemini או שלא נמצא תוכן (${feature}).`,
  apiKeyNotSetAlert: "מפתח Gemini API אינו מוגדר. אנא הגדר אותו באמצעות כפתור 'מפתח API'.",
  apiKeyNotSetError: "מפתח Gemini API אינו מוגדר.",

  // Quota Limit Messages
  quotaLimitReachedTitle: "הגעת למגבלת השימוש ב-Gemini API",
  quotaLimitReachedMessage: "נראה שהגעת למגבלת השימוש היומית או החודשית של Gemini API. אנא נסה שוב מאוחר יותר.",
  quotaLimitReachedAdvice: "טיפים להתמודדות עם מגבלות השימוש:",
  quotaLimitTip1: "• המתן מספר דקות ונסה שוב",
  quotaLimitTip2: "• בדוק את מגבלות ה-API שלך ב-Google AI Studio",
  quotaLimitTip3: "• שקול לשדרג לתוכנית עם מגבלות גבוהות יותר",
  quotaLimitTip4: "• השתמש בטקסטים קצרים יותר כדי לחסוך בשימוש",
  quotaLimitCloseButton: "הבנתי",
  quotaLimitTryLaterButton: "אנסה מאוחר יותר",

  // Model Overloaded Messages
  modelOverloadedTitle: "המודל עמוס כרגע",
  modelOverloadedMessage: "מודל Gemini עמוס כרגע ואינו זמין. אנא המתן מספר דקות ונסה שוב מאוחר יותר.",
  modelOverloadedAdvice: "זהו מצב זמני - המודל יחזור להיות זמין בקרוב:",
  modelOverloadedTip1: "• המתן 2-5 דקות ונסה שוב",
  modelOverloadedTip2: "• נסה להפחית את אורך הטקסט",
  modelOverloadedTip3: "• במקרה של בעיה מתמשכת, נסה מודל אחר",
  modelOverloadedCloseButton: "הבנתי",
  modelOverloadedTryLaterButton: "אנסה מאוחר יותר",

  // Function to check if error is quota related
  isQuotaLimitError: (error) => {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorStatus = error.status || 0;
    
    // Check for HTTP 429 status (Too Many Requests)
    if (errorStatus === 429) return true;
    
    // Check for common quota-related error messages from Gemini API
    const quotaKeywords = [
      'quota exceeded',
      'rate limit',
      'too many requests',
      'resource exhausted',
      'quota',
      'limit exceeded',
      'usage limit',
      'billing quota',
      'requests per',
      'per day',
      'per minute',
      'per hour',
      'RESOURCE_EXHAUSTED',
      'QUOTA_EXCEEDED',
      'overloaded',
      'model overloaded',
      'service overloaded',
      'temporarily overloaded',
      'model is overloaded',
      'service unavailable',
      'temporarily unavailable',
      'server overloaded'
    ];
    
    const lowerMessage = errorMessage.toLowerCase();
    return quotaKeywords.some(keyword => lowerMessage.includes(keyword));
  },

  // Function to check if error is specifically about model being overloaded
  isModelOverloadedError: (error) => {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorStatus = error.status || 0;
    
    // Check for HTTP 503 status (Service Unavailable)
    if (errorStatus === 503) return true;
    
    // Check for model overloaded specific keywords
    const overloadedKeywords = [
      'overloaded',
      'model overloaded',
      'service overloaded',
      'temporarily overloaded',
      'model is overloaded',
      'server overloaded',
      'service unavailable',
      'temporarily unavailable',
      'model unavailable'
    ];
    
    const lowerMessage = errorMessage.toLowerCase();
    return overloadedKeywords.some(keyword => lowerMessage.includes(keyword));
  },

  // Pilpulta Feature
  generatePilpultaTitle: "צור פלפולתא (קושיות מהטקסט)",
  generatePilpultaButton: "פלפולתא",
  openFileForPilpulta: "פתח קובץ טקסט בעורך כדי ליצור פלפולתא.",
  generatingPilpulta: "יוצר פלפולתא...",
  pilpultaError: "שגיאה ביצירת פלפולתא",
  invalidPilpultaResponse: "תגובה לא חוקית מהשרת עבור פלפולתא (לא מערך JSON תקין).",
  pilpultaTitle: "פלפולתא", // Window title
  pilpultaNoResults: "לא נוצרו קושיות עבור טקסט זה.",
  pilpultaMissingQuestion: "שאלה חסרה",
  pilpultaMissingSource: "מקור חסר",

  // Smart Search Feature
  smartSearchButtonText: "חיפוש חכם",
  smartSearchModalTitle: "חיפוש חכם",
  smartSearchInputPlaceholder: "הקלד שאילתה לחיפוש חכם...",
  smartSearchModalSearchButton: "חפש",
  smartSearchLoadingFileList: "מאחזר רשימת קבצים...",
  smartSearchLoadingAnalyzingNames: "מנתח שמות קבצים באמצעות בינה מלאכותית...",
  smartSearchLoadingSearchingFiles: "מחפש בקבצים נבחרים...",
  smartSearchLoadingProcessingResults: "מעבד תוצאות...",
  smartSearchResultQuote: "נמצא ציטוט:",
  smartSearchResultExplanation: "הסבר:",
  smartSearchResultSource: "מקור:",
  smartSearchResultLine: "שורה:",
  smartSearchFilesScanned: "קבצים שנסרקו:",
  smartSearchNotFound: "לא נמצאו תוצאות העונות לשאילתה.",
  smartSearchErrorPrefix: "שגיאה בחיפוש החכם:",
  smartSearchButtonTooltip: "בצע חיפוש חכם בכל קבצי הטקסט שלך",
  smartSearchInitialMessage: "הזן שאילתה ובצע חיפוש",


  // Top Bar & Settings
  createNewFileGlobal: "צור קובץ חדש (בתיקייה הנבחרת)",
  deleteActiveFile: "מחק קובץ פעיל מהעורך",
  noActiveFileToDelete: "אין קובץ פעיל למחיקה בעורך.",
  returnToEditor: "חזור לעורך",
  toggleHighlightLine: (active) => active ? "כבה הדגשת שורה" : "הדלק הדגשת שורה",
  toggleLineNumbers: (active) => active ? "הסתר מספרי שורות" : "הצג מספרי שורות",
  zenMode: (active) => active ? "צא ממצב Zen" : "מצב Zen",
  toggleFormattingToolbar: (active) => active ? "הסתר כלי עיצוב" : "הצג כלי עיצוב",

  // Workspace
  addFolder: "הוסף תיקייה",
  addFolderToStart: "הוסף תיקייה להתחלה.",
  enterFolderPath: "הזן נתיב תיקייה",
  addFolderError: "שגיאת תיקייה",
  loadingFolder: "טוען תיקייה",
  removeFolderFromWorkspace: "הסר תיקייה מסביבת העבודה",
  confirmRemoveFolder: (folderName) => `האם אתה בטוח שברצונך להסיר את התיקייה '${folderName}' מסביבת העבודה? (התיקייה לא תימחק מהמחשב)`,
  folderPathInputPlaceholder: "הזן נתיב לתיקייה...",
  folderRemovedSearchScopeCleared: "היקף החיפוש נוקה מכיוון שהתיקייה הוסרה.",
  addFolderFirst: "אנא הוסף תיקייה לסביבת העבודה תחילה.",
  chooseTargetFolderPrompt: (folderNames) => `באיזו תיקיית שורש ליצור את הפריט?\n${folderNames}\nהזן מספר:`,
  invalidChoice: "בחירה לא חוקית.",
  noTargetFolder: "לא נבחרה תיקיית יעד.",
  itemCannotContainSlash: (itemType) => `שם ${itemType} אינו יכול לכלול '/' או '\\'.`,

  // Editor Toolbar - הוסרו פיצ'רי עיצוב מתקדמים
  // הושארו רק פיצ'רי עריכה בסיסיים של Markdown

  // Source Results Display
  sourceResultsTitle: "תוצאות חיפוש מקורות",
  sourceResultsContentHeader: "טקסט עם מקורות משולבים:",

  // Repetitions Feature
  repetitions: {
    title: "חזרות",
    addRepetition: "הוסף חזרה חדשה",
    addRepetitionShort: "הוסף חזרה",
    editRepetition: "ערוך חזרה",
    nameLabel: "שם החזרה / תיאור קצר",
    contentLabel: "תוכן מלא / הערות",
    reminderIntervalsLabel: "מרווחי תזכורת (בימים מהחזרה הקודמת או מהיצירה)",
    interval1: "מרווח 1",
    interval2: "מרווח 2",
    interval3: "מרווח 3",
    interval4: "מרווח 4",
    nameRequired: "שם החזרה הוא שדה חובה.",
    intervalsMustBeNumbers: "ערכי המרווחים חייבים להיות מספרים חיוביים.",
    atLeastOnePositiveInterval: "יש להזין לפחות מרווח תזכורת אחד חיובי.",
    errorSavingDefault: "שגיאה בשמירת החזרה.",
    errorFetchingDefault: "שגיאה בטעינת החזרות.",
    errorAddingDefault: "שגיאה בהוספת החזרה.",
    errorDeletingDefault: "שגיאה במחיקת החזרה.",
    errorMutingDefault: "שגיאה בעדכון השתקת החזרה.",
    errorCompletingDefault: "שגיאה בסימון החזרה כהושלמה.",
    errorUpdatingDefault: "שגיאה בעדכון החזרה.",
    loadingRepetitions: "טוען חזרות...",
    addingRepetition: "מוסיף חזרה...",
    deletingRepetition: "מוחק חזרה...",
    completingRepetition: "מסמן חזרה כהושלמה...",
    updatingRepetition: "מעדכן חזרה...",
    noRepetitionsFound: "לא נמצאו חזרות. נסה להוסיף אחת!",
    confirmDelete: (name) => `האם אתה בטוח שברצונך למחוק את החזרה "${name}"?`,
    markAsCompleted: "סמן כנלמד (עבור להבא)",
    markAsCompletedShort: "נלמד",
    mute: "השתק תזכורות",
    unmute: "בטל השתקה",
    muteShort: "השתק",
    unmuteShort: "בטל השתקה",
    createdAt: "נוצר בתאריך",
    nextReminderDate: "תזכורת הבאה",
    lastCompletedAt: "נלמד לאחרונה",
    currentInterval: "שלב חזרה נוכחי",
    statusMuted: "מושתק",
    completed: "הושלם!",
    errorState: "מצב שגיאה בנתוני חזרה",
    intervalPrefix: "שלב",
    settingsTitle: "הגדרות חזרות",
    settingsPlaceholder: "כאן יופיעו הגדרות גלובליות עבור מערכת החזרות בעתיד.",
  },
  saving: "שומר...",

  // Transcription Feature
  transcriptionFeatureButton: "עיבוד תמלול",
  transcriptionModalTitle: "הכנס טקסט לעיבוד (שיעור/חברותא)",
  organizeTextButton: "ארגן טקסט",
  summarizeTextButton: "סכם טקסט",
  processingTranscription: "מעבד את הטקסט...",
  pasteTranscriptionPlaceholder: "הדבק כאן את התמלול...",
  pleaseEnterText: "אנא הזן טקסט לעיבוד.",
  transcriptionOrganizedSuccess: "הטקסט אורגן בהצלחה.",
  transcriptionSummarizedSuccess: "הטקסט סוכם בהצלחה.",
  errorProcessingTranscription: "שגיאה בעיבוד הטקסט.",
  saveOrganizedText: "שמור טקסט מאורגן",
  saveSummarizedText: "שמור סיכום",
  organizedTextDefaultFileName: "_organized.txt",
  summarizedTranscriptionDefaultFileName: "_transcription_summary.txt",
  saveFilePrompt: (suggestedName) => `שמור קובץ בשם (בתיקיית העבודה הנוכחית): ${suggestedName}`,
  organizedTextResult: "טקסט מאורגן",
  summarizedTextResult: "סיכום תמלול",

  // Text Organization Large File Warning
  largeFileWarning: (lineCount) => `⚠️ הקובץ מכיל ${lineCount} שורות

הקובץ גדול ולכן התהליך עלול לקחת זמן
  האם להמשיך?`,

  // Text Organization Settings
  textOrganizationSettings: {
    title: "הגדרות ארגון טקסט",
    disableItalicFormatting: "בטל עיצוב נטייה",
    disableItalicFormattingDescription: "מונע מהבינה המלאכותית להוסיף עיצוב נטייה (*טקסט*) בעת ארגון הטקסט"
  },

  // Questionnaire Feature
  questionnaire: {
    buttonText: "שאלון",
    buttonTitle: "פתח שאלון התקדמות יומי",
    notificationDotAlt: "יש למלא שאלון",
    modalTitle: "שאלון התקדמות יומי",
    loadingQuestions: "טוען שאלות...",
    errorLoadingQuestions: "שגיאה בטעינת השאלון:",
    errorLoadingDataForDate: (date) => `שגיאה בטעינת נתונים עבור ${new Date(date + "T00:00:00").toLocaleDateString('he-IL')}`, // Formatted date
    alreadySubmittedToday: "השאלון היומי כבר הושלם היום.", // Kept for specific checks for "today"
    alreadySubmittedForDate: (date) => `השאלון עבור ${new Date(date + "T00:00:00").toLocaleDateString('he-IL')} כבר הושלם.`,
    comeBackTomorrow: "חזור מחר לשאלון חדש!",
    ratingValidationError: "הדירוג חייב להיות בין 1 ל-10.",
    submitButton: "שלח תשובות",
    submitting: "שולח...",
    noQuestionsAvailable: "אין שאלות זמינות כרגע. נסה שוב מאוחר יותר.",
    editAnswers: "ערוך תשובות", // For editing a submitted questionnaire

    // Weekly Summary
    weeklySummaryViewTitle: "סיכום שבועי",
    weeklySummaryTitle: "סיכום התקדמות שבועי",
    loadingSummary: "טוען סיכום שבועי...",
    loadingWeeklySummary: "טוען סיכום שבועי...",
    errorLoadingSummary: "שגיאה בטעינת הסיכום:",
    errorFetchingWeeklySummary: "שגיאה בטעינת הסיכום השבועי. אנא נסה שוב.",
    networkError: "בעיית רשת. אנא בדוק את החיבור ונסה שוב.",
    noSummaryAvailable: "אין סיכום שבועי זמין עדיין.",
    noWeeklySummaryFound: "לא נמצא סיכום שבועי עדיין.",
    completeDailyQuestionnaires: "המשך למלא שאלונים יומיים כדי ליצור סיכום שבועי.",
    showWeeklySummary: "הצג סיכום שבועי",
    hideWeeklySummary: "הסתר סיכום שבועי",
    showWeeklySummaryTooltip: "הצג סיכום שבועי של התקדמותך",
    hideWeeklySummaryTooltip: "הסתר את הסיכום השבועי",
    retryButton: "נסה שוב",
    overallStatus: "סטטוס כללי והתקדמות:",
    strengths: "נקודות חוזק:",
    strengthsLabel: "נקודות חוזק:",
    areasForImprovement: "נקודות לשיפור:",
    areasForImprovementLabel: "נקודות לשיפור:",
    summaryContentLabel: "תוכן הסיכום:",
    viewWeeklyAnswers: "הצג תשובות יומיות משבוע זה",
    weekOf: "שבוע של",
    triggerSummaryGeneration: "צור סיכום שבועי (ידני)",

    // Daily Answers Display (when viewing past week)
    dailyAnswersTitle: (date) => `תשובות יומיות - ${new Date(date + "T00:00:00").toLocaleDateString('he-IL')}`,
    loadingDailyAnswers: "טוען תשובות יומיות...",
    errorLoadingDailyAnswers: "שגיאה בטעינת תשובות יומיות:",
    noAnswersForDay: "לא נמצאו תשובות ליום זה.",
    backToSummary: "חזור לסיכום השבועי",

    // Notification Settings
    notificationSettingsTitle: "הגדרות תזכורת שאלון",
    enableDailyReminder: "אפשר תזכורת יומית לשאלון",
    reminderInfo: (time) => `התזכורת תישלח כל יום בשעה ${time} אם השאלון לא הושלם.`,
    reminderTime: "שעת תזכורת:",
    notificationSettingsUpdated: "הגדרות התראה עודכנו.",
    errorUpdatingSettings: "שגיאה בעדכון הגדרות:",
    manageNotificationsButton: "נהל התראות שאלון",

    // Delete All Data
    deleteAllDataButton: "מחק את כל הנתונים שלי",
    confirmDeleteTitle: "אישור מחיקת נתונים",
    confirmDeleteMessage: "האם אתה בטוח? כל הנתונים יימחקו לצמיתות ואין אפשרות לשחזרם.",
    deleteAllDataSuccess: "כל נתוני המשתמש נמחקו בהצלחה.",
    deleteAllDataError: "שגיאה במחיקת נתונים. נסה שוב מאוחר יותר.",

    // New for weekly summary display in modal
    showWeeklySummary: "הצג סיכום שבועי",
    hideWeeklySummary: "הסתר סיכום שבועי",
    loadingWeeklySummary: "טוען סיכום שבועי...",
    errorFetchingWeeklySummary: "שגיאה בטעינת הסיכום השבועי.",
    weeklySummaryTitle: "סיכום שבועי אחרון", // Different from the view title
    summaryContentLabel: "תוכן הסיכום:",
    strengthsLabel: "נקודות חוזק:",
    areasForImprovementLabel: "נקודות לשיפור:",
    noWeeklySummaryFound: "לא נמצא סיכום שבועי.",

    // User Data Export/Import
    userDataManagementTitle: "ניהול נתוני משתמש",
    exportDataButton: "ייצא נתונים לקובץ",
    exportingData: "מייצא נתונים...",
    exportErrorGeneral: "שגיאה ביצוא הנתונים.",
    exportErrorApi: "שגיאה בשרת בעת יצוא הנתונים.",
    importDataButton: "ייבא נתונים מקובץ",
    importingData: "מייבא נתונים...",
    importSuccess: "הנתונים יובאו בהצלחה. ייתכן שיידרש רענון ליישום מלא.",
    importErrorFile: "שגיאה בעיבוד קובץ הנתונים או בייבוא לשרת.",
    importErrorReadingFile: "שגיאה בקריאת הקובץ.",
  },

  // Learning Graph Feature
  learningGraph: {
    buttonText: "גרף לימוד",
    buttonTitle: "הצג גרף התקדמות בלימוד",
    viewTitle: "גרף התקדמות בלימוד",
    chartTitle: "התקדמות בדירוג הלימוד היומי",
    ratingLabel: "דירוג לימוד יומי",
    noRating: "אין דירוג",
    loading: "טוען נתוני גרף...",
    errorLoadingData: "שגיאה בטעינת נתוני הגרף.",
    noData: "אין נתונים להצגה עבור טווח זה.",
    ranges: {
      week: "שבוע אחרון",
      month: "חודש אחרון",
      all: "כל הזמן",
    },
  },

  // Judaism Chat Feature
  judaismChat: {
    modalTitle: "צ'אט הלכה ויהדות",
    inputPlaceholder: "שאל כל דבר הקשור ליהדות...",
    sendButton: "שלח",
    sending: "שולח...",
    thinking: "חושב...",
    typing: "מקליד...", // Generic, can be same as thinking or more specific
    cannotAnswer: "זה לא קשור ליהדות, שאל שאלה אחרת.",
    errorSendingMessage: "שגיאה בשליחת הודעה לצ'אט הלכה ויהדות:",
    errorMessageFallback: "אירעה שגיאה. אנא נסה שוב מאוחר יותר.",
    errorPrefix: "שגיאה",
    chatButtonText: "צ'אט הלכה ויהדות", // Text for the button to open the chat
    rememberHistory: 'זכור היסטוריה', // Added text for remember history checkbox
    googleAiStudioRecommendation: "💡 במקום הצ'אט הנוכחי - מומלץ להשתמש ב-Google AI Studio לתוצאות הרבה יותר מדויקות! לא לשכוח להפעיל את הכפתור 'Grounding with Google Search' (ללא עלות).",
    googleAiStudioLink: "https://aistudio.google.com/",
    openGoogleAiStudio: "פתח Google AI Studio",
  },

  // Gemini API Key Section (Modal & Button)
  geminiApiKeyButton: "מפתח API", // Button text to open modal
  geminiApiKeyModalTitle: "הגדרת מפתח Gemini API",
  geminiApiKeyInstructions: "הדבק כאן את מפתח ה-API שלך עבור Google Gemini כדי להפעיל תכונות AI. ניתן להשיג מפתח דרך Google AI Studio.",
  enterGeminiApiKey: 'הזן מפתח Gemini API...',
  saveApiKey: 'שמור מפתח',
  geminiApiKeySaved: "מפתח API נשמר בהצלחה!",
  geminiApiKeyIsPaidLabel: "זהו מפתח API בתשלום (מאפשר חיפוש מקורות באינטרנט)", // Added label

  // AI Model Selection
  selectAiModelButton: "בחר מודל AI",
  selectAiModelTitle: "בחר מודל בינה מלאכותית",
  textOrganizationProgress: "התקדמות ארגון טקסט",
  openOrotHatorahLink: "פתח ניתוח טקסט",

  // New Button Texts
  smartDiscussionButton: "דיון חכם",
  smartDiscussionButtonTooltip: "פתח דיון חכם",
  aramaicStudyButton: "לימוד ארמית",
  aramaicStudyButtonTooltip: "פתח לימוד ארמית",

  // Help Modal
  helpButton: "עזרה",
  helpButtonTooltip: "מדריך שימוש ועזרה לתוכנה",
  helpModalTitle: "מדריך למשתמש",
  helpModalYoutubeTitle: "ערוץ יוטיוב הדרכה",
  helpModalYoutubeDescription: "ערוץ יוטיוב מקיף עם סרטוני הדרכה מפורטים על כל הפיצ'רים בתוכנה",
  helpModalYoutubeLink: "צפה בסרטוני ההדרכה",
  helpModalFeaturesTitle: "תכונות עיקריות בתוכנה",
  helpModalFeaturesDescription: "המערכת מספקת סביבת עבודה מתקדמת ללימוד תורה עם כלי בינה מלאכותית:",
  helpModalFeatures: [
    "אין לכם כח לסדר כותרות? בלחיצת כפתור המערכת תארגן לכם את הטקסט",
    "רוצים לראות אם יש מקור לחידוש שלכם? נסו את הפיצר 'מצא מקורות'",
    "כלי פלפולתא - יצירת קושיות וניתוחים מהטקסט בלחיצת כפתור", 
    "עיבוד תמלול - ארגון וסיכום של שיעורים וחברותות על פי תמלול",
    "הפכו את הטקסט שלכם לכרטיסיות חזרה",
    "גרף לימוד אישי למעקב אחר ההתקדמות בזמן",
    "מערכת התראות ותזכורות ללימוד",
    "צ'אט בוט לכל שאלה ביהדות, מילון ארמי חכם",
    "נתח טקסט לימודי והפוך אותו לתרשים זרימה",
    "מערכת ללימוד ארמית עם רמות קל, בינוני וקשה"
  ],

  // Font Size Modal
  fontSizeModal: {
    buttonText: "גודל גופן",
    title: "הגדר גודל גופן",
    label: "גודל גופן (פיקסלים):",
    editorLabel: "גודל גופן עורך (פיקסלים):",
    presentationLabel: "גודל גופן תצוגה (פיקסלים):",
    invalidSizeError: "גודל גופן לא תקין. אנא הזן מספר חיובי."
  },
};
