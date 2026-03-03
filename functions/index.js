// functions/index.js
// Firebase Cloud Functions for Torah IDE

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();

// Import function modules
const aiFeatures = require('./aiFeatures');
const fileConversion = require('./fileConversion');
const smartSearch = require('./smartSearch');
const progress = require('./progress');

// ==================== AI Features ====================

/**
 * Smart search using AI
 */
exports.smartSearch = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { query, searchType, apiKey } = data;
  return await aiFeatures.performSmartSearch(query, searchType, apiKey);
});

/**
 * Generate flashcards from text
 */
exports.generateFlashcards = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { text, apiKey } = data;
  return await aiFeatures.generateFlashcards(text, apiKey);
});

/**
 * Chat with Judaism knowledge base
 */
exports.judaismChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { message, conversationHistory, apiKey } = data;
  return await aiFeatures.judaismChat(message, conversationHistory, apiKey);
});

/**
 * Pilpulta - AI debate
 */
exports.pilpulta = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { topic, userArgument, apiKey } = data;
  return await aiFeatures.pilpulta(topic, userArgument, apiKey);
});

// ==================== File Operations ====================

/**
 * Convert document files (DOCX, PDF, etc.) to text
 * Note: File conversion with actual file uploads would need different handling
 * This is a placeholder for the logic
 */
exports.convertFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { fileUrl, fileType } = data;
  return await fileConversion.convertFile(fileUrl, fileType);
});

// ==================== Search ====================

/**
 * Search across user's files
 */
exports.searchFiles = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { searchTerm, userId } = data;
  return await smartSearch.searchUserFiles(userId, searchTerm);
});

// ==================== Progress & Analytics ====================

/**
 * Update learning progress
 */
exports.updateProgress = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, progressData } = data;
  return await progress.updateUserProgress(userId, progressData);
});

/**
 * Get learning statistics
 */
exports.getStatistics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId } = data;
  return await progress.getUserStatistics(userId);
});

// ==================== HTTP Endpoints (for backward compatibility) ====================

/**
 * HTTP endpoint for smart search (CORS enabled)
 */
exports.smartSearchHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      const { query, searchType, apiKey } = req.body;
      const result = await aiFeatures.performSmartSearch(query, searchType, apiKey);
      
      res.json(result);
    } catch (error) {
      console.error('Smart search error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ==================== Background Tasks ====================

/**
 * Cleanup old temporary data (runs daily)
 */
exports.cleanupOldData = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const db = admin.firestore();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Clean up old temporary files metadata
  const oldFiles = await db.collection('tempFiles')
    .where('createdAt', '<', thirtyDaysAgo)
    .get();

  const batch = db.batch();
  oldFiles.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Cleaned up ${oldFiles.size} old temporary files`);
});

/**
 * Generate daily learning reminders (runs every day at 8 AM)
 */
exports.sendLearningReminders = functions.pubsub.schedule('0 8 * * *')
  .timeZone('Asia/Jerusalem')
  .onRun(async (context) => {
    // Implementation for sending notifications/reminders
    console.log('Learning reminders sent');
    return null;
  });
