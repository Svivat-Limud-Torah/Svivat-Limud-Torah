// frontend/src/utils/apiService.js
import { HEBREW_TEXT } from './constants'; // Import HEBREW_TEXT

const API_BASE_URL = 'http://localhost:3001/api'; // Ensure this is correct

const apiService = {
  // --- File System Operations ---
  openFolder: async (folderPath) => {
    const response = await fetch(`${API_BASE_URL}/open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to open folder');
    return response.json();
  },

  getFileContent: async (baseFolderPath, relativeFilePath, fileName) => {
    const response = await fetch(`${API_BASE_URL}/file-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, relativeFilePath, fileName }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to get file content');
    return response.json(); // { content, type, styles }
  },

  getImageContentUrl: (baseFolderPath, relativeFilePath) => {
    // Returns a URL directly, as image is served by GET request
    return `${API_BASE_URL}/image-content?baseFolderPath=${encodeURIComponent(baseFolderPath)}&relativeFilePath=${encodeURIComponent(relativeFilePath)}`;
  },

  saveFile: async (baseFolderPath, relativeFilePath, content, fileName, styles) => {
    const response = await fetch(`${API_BASE_URL}/save-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, relativeFilePath, content, fileName, styles }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to save file');
    return response.json();
  },

  createFile: async (baseFolderPath, newFilePath, content = '') => {
    const response = await fetch(`${API_BASE_URL}/create-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, newFilePath, content }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to create file');
    return response.json();
  },

  createFolder: async (baseFolderPath, newFolderRelativePath) => {
    const response = await fetch(`${API_BASE_URL}/create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, newFolderRelativePath }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to create folder');
    return response.json();
  },

  deleteItem: async (baseFolderPath, relativePathToDelete) => {
    const response = await fetch(`${API_BASE_URL}/delete-item`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, relativePathToDelete }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete item');
    return response.json();
  },

  renameItem: async (baseFolderPath, oldRelativePath, newName) => {
    const response = await fetch(`${API_BASE_URL}/rename-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, oldRelativePath, newName }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to rename item');
    return response.json();
  },

  moveItem: async (sourceBaseFolderPath, sourceRelativePath, targetBaseFolderPath, targetParentRelativePath) => {
    const response = await fetch(`${API_BASE_URL}/move-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceBaseFolderPath, sourceRelativePath, targetBaseFolderPath, targetParentRelativePath }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move item');
    }
    return response.json();
  },

  // --- Search Operations ---
  searchV1: async (baseFolderPath, searchTerm, scopePath = null) => {
    const response = await fetch(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseFolderPath, searchTerm, scopePath }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Search failed');
    return response.json();
  },

  searchV2: async (searchParameters) => { // searchParameters is an object
    const response = await fetch(`${API_BASE_URL}/v2/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParameters),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search v2 failed');
    }
    return response.json();
  },

  // --- Usage Statistics ---
  getRecentFiles: async (baseFolderPath, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/files/recent?baseFolderPath=${encodeURIComponent(baseFolderPath)}&limit=${limit}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to get recent files');
    return response.json();
  },

  getFrequentFiles: async (baseFolderPath, limit = 10) => {
    const response = await fetch(`${API_BASE_URL}/files/frequent?baseFolderPath=${encodeURIComponent(baseFolderPath)}&limit=${limit}`);
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to get frequent files');
    return response.json();
  },

  // --- Settings ---
  getLastOpenedFolders: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/last-opened-folders`);
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to get last opened folders');
    return response.json();
  },

  saveLastOpenedFolders: async (folderPaths) => {
    const response = await fetch(`${API_BASE_URL}/settings/last-opened-folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPaths }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to save last opened folders');
    return response.json();
  },

  // --- Repetitions API ---
  addRepetition: async (repetitionData) => {
    const response = await fetch(`${API_BASE_URL}/repetitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repetitionData),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to add repetition');
    return response.json();
  },

  getAllRepetitions: async () => {
    const response = await fetch(`${API_BASE_URL}/repetitions`);
    if (!response.ok) throw new Error((await response.json()).error || 'Failed to get repetitions');
    return response.json();
  },

  getRepetitionById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/repetitions/${id}`);
    if (!response.ok) throw new Error((await response.json()).error || `Failed to get repetition ${id}`);
    return response.json();
  },

  updateRepetition: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/repetitions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to update repetition ${id}`);
    return response.json();
  },

  deleteRepetition: async (id) => {
    const response = await fetch(`${API_BASE_URL}/repetitions/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to delete repetition ${id}`);
    return response.json();
  },

  updateRepetitionMuteStatus: async (id, is_muted) => {
    const response = await fetch(`${API_BASE_URL}/repetitions/${id}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_muted }),
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to update mute status for repetition ${id}`);
    return response.json();
  },

  markRepetitionAsCompleted: async (id) => {
    const response = await fetch(`${API_BASE_URL}/repetitions/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }, // Body might not be needed by backend, but header is good practice
        body: JSON.stringify({})
    });
    if (!response.ok) throw new Error((await response.json()).error || `Failed to mark repetition ${id} as completed`);
    return response.json();
  },

  // --- Questionnaire API ---
  getQuestionnaireForDate: async (dateString) => { // YYYY-MM-DD
    const response = await fetch(`${API_BASE_URL}/questionnaires/date/${dateString}`);
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || `Failed to fetch questionnaire for date ${dateString}`);
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { submitted_today: bool, data: {fixedQuestions, aiQuestions, submitted_data?}}
  },

  submitQuestionnaire: async ({ answers, date }) => { // answers is the payload, date is YYYY-MM-DD
    const response = await fetch(`${API_BASE_URL}/questionnaires`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, date }), // Backend expects {answers: {}, date: "YYYY-MM-DD"}
    });
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to submit questionnaire');
        err.status = response.status;
        throw err;
    }
    return response.json();
  },

  getWeeklyAnswers: async (startDate, endDate) => { // YYYY-MM-DD
    const response = await fetch(`${API_BASE_URL}/questionnaires/week?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to fetch weekly answers');
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { data: [], weekStartDate, weekEndDate }
  },

  triggerWeeklySummaryGeneration: async (dateForWeek) => { // dateForWeek (optional, YYYY-MM-DD string)
    const body = dateForWeek ? JSON.stringify({ dateForWeek }) : JSON.stringify({});
    const response = await fetch(`${API_BASE_URL}/questionnaires/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to trigger summary generation');
        err.status = response.status;
        throw err;
    }
    return response.json();
  },

  getLatestWeeklySummary: async () => {
    const response = await fetch(`${API_BASE_URL}/questionnaires/summary/latest`);
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to fetch latest weekly summary');
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { data: summaryObject | null }
  },

  // --- User Notification Settings API ---
  getUserNotificationSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/users/me/settings/notifications`);
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to fetch notification settings');
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { data: { enable_daily_questionnaire_reminder, reminder_time } }
  },

  updateUserNotificationSettings: async (settings) => { // { enable_daily_questionnaire_reminder }
    const response = await fetch(`${API_BASE_URL}/users/me/settings/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || 'Failed to update notification settings');
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { success: true, data: updatedSettings }
  },

  // --- Learning Graph API ---
  getLearningGraphRatings: async (range) => { // range: 'week', 'month', 'all'
    const response = await fetch(`${API_BASE_URL}/learning-graph/ratings?range=${range}`);
    if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.error || `Failed to fetch learning graph data for range ${range}`);
        err.status = response.status;
        throw err;
    }
    return response.json(); // Expected: { data: [{date, rating}, ...] }
  },

  // --- Pilpulta API ---
  // Added apiKey parameter
  generatePilpultaQuestions: async (text, useWebSearch, model, apiKey) => {
    // Corrected endpoint to include /generate
    const response = await fetch(`${API_BASE_URL}/pilpulta/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Include apiKey in the request body
      body: JSON.stringify({ text, useWebSearch, model, apiKey }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate Pilpulta questions');
    }
    return response.json(); // Expecting an array: [{ question: "...", source: "..." }, ...]
  },

  // --- Smart Search API ---
  executeSmartSearch: async (query, model, apiKey, workspacePath, numFilesToScan, onProgressUpdate) => {
    // onProgressUpdate is a callback to update loading messages, e.g., onProgressUpdate(HEBREW_TEXT.smartSearchLoadingAnalyzingNames)
    // This is a frontend-driven progress update for now. Backend might support streaming later.
    
    // Simulate progress updates based on the plan's stages for now
    if (onProgressUpdate) onProgressUpdate(HEBREW_TEXT.smartSearchLoadingFileList); // Initial stage

    const response = await fetch(`${API_BASE_URL}/smart-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, model, apiKey, workspacePath, numFilesToScan }),
    });

    if (onProgressUpdate) onProgressUpdate(HEBREW_TEXT.smartSearchLoadingProcessingResults); // Final stage before getting response

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Smart search failed');
    }
    return response.json(); // Expecting { quote, explanation, sourceFile, lineNumber, isApproximate, found, filesSearched }
  },

  // --- User Data Operations ---
  exportUserData: async () => {
    const response = await fetch(`${API_BASE_URL}/user/export-data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json(); // Try to parse as JSON first
      } catch (e) {
        // If JSON parsing fails, it might be an HTML error page
        const errorText = await response.text();
        const err = new Error(
          `Failed to export user data. Server responded with ${response.status}. Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`
        );
        err.status = response.status;
        throw err;
      }
      const err = new Error(errorPayload.error || `Failed to export user data. Status: ${response.status}`);
      err.status = response.status;
      throw err;
    }
    // For successful response, still ensure it's JSON, otherwise provide context
    try {
      return await response.json(); // Expects the backend to return the user data as JSON
    } catch (e) {
      const responseText = await response.text();
      throw new Error(
        `Failed to parse successful export response as JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`
      );
    }
  },

  importUserData: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/user/import-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      let errorPayload;
      try {
        errorPayload = await response.json();
      } catch (e) {
        const errorText = await response.text();
        const err = new Error(
          `Failed to import user data. Server responded with ${response.status}. Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`
        );
        err.status = response.status;
        throw err;
      }
      const err = new Error(errorPayload.error || `Failed to import user data. Status: ${response.status}`);
      err.status = response.status;
      throw err;
    }
    // For successful response
    try {
      return await response.json(); // Expects a success message or status
    } catch (e) {
      const responseText = await response.text();
      throw new Error(
        `Failed to parse successful import response as JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`
      );
    }
  },

  resetAllUserData: async () => {
    const response = await fetch(`${API_BASE_URL}/user/reset-all-data`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If parsing JSON fails, construct a generic error
        errorData = { error: `Request failed with status ${response.status}` };
      }
      const err = new Error(errorData.error || 'Failed to reset all user data');
      err.status = response.status;
      throw err;
    }
    // Handle 204 No Content specifically, as .json() would fail
    if (response.status === 204) {
      return { success: true, message: 'All user data reset successfully.' };
    }
    return response.json(); // Assuming other success statuses might return a body
  },
};

export default apiService;
