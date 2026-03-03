// frontend/src/utils/aiProxy.js
// All AI API calls go through the backend proxy.
// The API key is stored server-side in an HTTP-only session cookie.

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Call Google Generative AI through the backend proxy.
 * The backend reads the API key from the server-side session.
 * @param {string} model - AI model name (e.g. 'gemini-2.5-flash')
 * @param {object} requestBody - The request body for generateContent API
 * @returns {Promise<Response>} - The fetch Response object
 */
export async function callAiGenerate(model, requestBody, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Apply default maxOutputTokens for free-tier models if not already set
  const bodyWithDefaults = {
    ...requestBody,
    generationConfig: {
      maxOutputTokens: 8192,
      ...requestBody.generationConfig,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ model, body: bodyWithDefaults }),
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('הבקשה ל-AI לא הושלמה בזמן. ייתכן שהשרתים עמוסים — נסה שוב מאוחר יותר.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Store API key in server-side session (not in localStorage).
 */
export async function setApiKey(apiKey, isPaid = false) {
  const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ apiKey, isPaid }),
  });
  if (!response.ok) {
    throw new Error('Failed to save API key');
  }
  return response.json();
}

/**
 * Check if an API key is stored in the server session.
 * Returns { hasKey: boolean, isPaid: boolean } — never the key itself.
 */
export async function getApiKeyStatus() {
  const response = await fetch(`${API_BASE_URL}/auth/api-key/status`, {
    credentials: 'include',
  });
  if (!response.ok) {
    return { hasKey: false, isPaid: false };
  }
  return response.json();
}

/**
 * Clear the API key from the server session.
 */
export async function clearApiKey() {
  const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}
