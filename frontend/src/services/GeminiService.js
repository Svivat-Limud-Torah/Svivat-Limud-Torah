// frontend/src/services/GeminiService.js
// Direct Gemini API calls from the browser — used in web mode (no backend).

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

function getApiKey() {
  return localStorage.getItem('gemini_api_key_val');
}

function getSelectedModel() {
  return localStorage.getItem('selectedAiModel') || 'gemini-2.5-flash';
}

/**
 * Call Gemini API directly from the browser.
 * Mirrors the backend QuestionnaireService.callGemini exactly.
 */
export async function callGemini(contents, systemInstruction, model, config = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('מפתח API נדרש לשימוש ב-AI.');

  const url = `${GEMINI_API_BASE}${model || getSelectedModel()}:generateContent?key=${apiKey}`;
  const body = {
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 4096,
      ...config,
    },
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 90000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `שגיאת Gemini API: ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
 * Clean AI response text to extract valid JSON.
 * Mirrors backend cleanAIResponseForJSON exactly.
 */
export function cleanAIResponseForJSON(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('Invalid response text provided');
  }
  let cleaned = responseText.trim();
  cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, '');
  cleaned = cleaned.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) cleaned = jsonMatch[0];
  return cleaned;
}

export { getApiKey, getSelectedModel };
