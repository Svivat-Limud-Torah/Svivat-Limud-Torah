// functions/progress.js
// Learning progress and analytics for Firebase Functions

const admin = require('firebase-admin');

/**
 * Update user's learning progress
 */
async function updateUserProgress(userId, progressData) {
  try {
    const db = admin.firestore();
    const progressRef = db.collection('learningProgress').doc(userId);
    
    await progressRef.set({
      ...progressData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Update progress error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user's learning statistics
 */
async function getUserStatistics(userId) {
  try {
    const db = admin.firestore();
    
    // Get progress data
    const progressDoc = await db.collection('learningProgress').doc(userId).get();
    const progressData = progressDoc.exists ? progressDoc.data() : {};
    
    // Get files count
    const filesSnapshot = await db.collection('users').doc(userId).collection('files').get();
    const filesCount = filesSnapshot.size;
    
    // Calculate statistics
    const statistics = {
      totalFiles: filesCount,
      learningTime: progressData.totalTime || 0,
      lastActivity: progressData.lastUpdated || null,
      questionnairesCompleted: progressData.questionnairesCompleted || 0,
      flashcardsCreated: progressData.flashcardsCreated || 0,
      searchesPerformed: progressData.searchesPerformed || 0
    };
    
    return {
      success: true,
      statistics
    };
  } catch (error) {
    console.error('Get statistics error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  updateUserProgress,
  getUserStatistics
};
