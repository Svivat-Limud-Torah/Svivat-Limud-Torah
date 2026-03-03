// functions/aiFeatures.js
// AI Features using Google Gemini API

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Perform smart search using AI
 */
async function performSmartSearch(query, searchType, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    let prompt = '';
    
    switch (searchType) {
      case 'concept':
        prompt = `הסבר את המושג "${query}" ביהדות. כלול הגדרה, מקורות, ודוגמאות.`;
        break;
      case 'source':
        prompt = `מצא וצטט מקורות רלוונטיים לנושא "${query}" ביהדות. כלול את המקור, הציטוט, והקשר.`;
        break;
      case 'question':
        prompt = `ענה על השאלה הבאה ביהדות: "${query}". תן תשובה מפורטת עם מקורות.`;
        break;
      default:
        prompt = `חפש מידע על "${query}" ביהדות וספק תשובה מקיפה.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      result: text,
      query,
      searchType
    };
  } catch (error) {
    console.error('Smart search error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate flashcards from text
 */
async function generateFlashcards(text, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
צור כרטיסיות לימוד (flashcards) מהטקסט הבא. 
כל כרטיסייה צריכה להיות בפורמט JSON עם "question" ו-"answer".
החזר מערך של 5-10 כרטיסיות.

טקסט:
${text}

פורמט התשובה:
[
  {"question": "שאלה 1", "answer": "תשובה 1"},
  {"question": "שאלה 2", "answer": "תשובה 2"}
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const flashcards = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        flashcards
      };
    } else {
      throw new Error('Failed to parse flashcards from response');
    }
  } catch (error) {
    console.error('Generate flashcards error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Chat with Judaism knowledge base
 */
async function judaismChat(message, conversationHistory = [], apiKey) {
  try {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build conversation context
    let context = 'אתה עוזר AI מומחה ביהדות. ענה על שאלות בצורה ידידותית ומדויקת עם מקורות כשאפשר.\n\n';
    
    if (conversationHistory.length > 0) {
      context += 'היסטוריית השיחה:\n';
      conversationHistory.forEach(msg => {
        context += `${msg.role === 'user' ? 'משתמש' : 'עוזר'}: ${msg.content}\n`;
      });
      context += '\n';
    }

    const prompt = context + `משתמש: ${message}\nעוזר:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      response: text
    };
  } catch (error) {
    console.error('Judaism chat error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Pilpulta - AI debate on Torah topics
 */
async function pilpulta(topic, userArgument, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
אתה חבר לימוד (חברותא) בישיבה. המשתמש מציג טיעון בנושא: "${topic}"

טיעון המשתמש:
${userArgument}

תפקידך:
1. נתח את הטיעון
2. הצג קושיות (שאלות קשות) על הטיעון
3. הצע פירוק (הסבר אלטרנטיבי)
4. הצע חילוק (הבחנה דקה)
5. סכם עם מסקנה

השב בסגנון של לימוד תורה מעמיק, עם התייחסות למקורות אם אפשר.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      response: text,
      topic,
      userArgument
    };
  } catch (error) {
    console.error('Pilpulta error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  performSmartSearch,
  generateFlashcards,
  judaismChat,
  pilpulta
};
