// frontend/src/utils/aiProxy.js
// AI API calls go through the backend proxy in local mode,
// or directly to Gemini API in web mode.

import { API_BASE_URL, IS_WEB_MODE } from './constants';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

/**
 * Call Google Generative AI.
 * Web mode: calls Gemini API directly using key from localStorage.
 * Local mode: proxies through the Express backend.
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
    if (IS_WEB_MODE) {
      // Direct Gemini API call
      const apiKey = localStorage.getItem('gemini_api_key_val');
      if (!apiKey) throw new Error('מפתח API נדרש לשימוש ב-AI. הגדר מפתח בהגדרות.');
      const url = `${GEMINI_API_BASE}${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithDefaults),
        signal: controller.signal,
      });
      return response;
    }

    // Backend proxy
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
 * Store API key in server-side session (local mode) or no-op (web mode — already in localStorage).
 */
export async function setApiKey(apiKey, isPaid = false) {
  if (IS_WEB_MODE) {
    // In web mode, key is already stored in localStorage by ApiKeyModal
    return { success: true };
  }
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
 * Check if an API key is available.
 */
export async function getApiKeyStatus() {
  if (IS_WEB_MODE) {
    const hasKey = !!localStorage.getItem('gemini_api_key_val');
    const isPaid = localStorage.getItem('gemini_api_key_is_paid') === 'true';
    return { hasKey, isPaid };
  }
  const response = await fetch(`${API_BASE_URL}/auth/api-key/status`, {
    credentials: 'include',
  });
  if (!response.ok) {
    return { hasKey: false, isPaid: false };
  }
  return response.json();
}

/**
 * Clear the API key.
 */
export async function clearApiKey() {
  if (IS_WEB_MODE) {
    localStorage.removeItem('gemini_api_key_val');
    localStorage.removeItem('gemini_has_key');
    localStorage.removeItem('gemini_api_key_is_paid');
    return { success: true };
  }
  const response = await fetch(`${API_BASE_URL}/auth/api-key`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}
