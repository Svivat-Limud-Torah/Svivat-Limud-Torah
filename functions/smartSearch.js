// functions/smartSearch.js
// Smart search functionality for Firebase Functions

const admin = require('firebase-admin');

/**
 * Search across user's files in Firestore
 */
async function searchUserFiles(userId, searchTerm) {
  try {
    const db = admin.firestore();
    const filesRef = db.collection('users').doc(userId).collection('files');
    
    // Get all user files
    const snapshot = await filesRef.get();
    
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const content = data.content || '';
      const name = data.name || '';
      
      // Simple text search
      if (content.toLowerCase().includes(searchLower) || 
          name.toLowerCase().includes(searchLower)) {
        
        // Find context around the match
        const contentLower = content.toLowerCase();
        const index = contentLower.indexOf(searchLower);
        
        let context = '';
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(content.length, index + searchTerm.length + 50);
          context = content.substring(start, end);
        }
        
        results.push({
          id: doc.id,
          name: data.name,
          path: data.path,
          context,
          matchType: contentLower.includes(searchLower) ? 'content' : 'name'
        });
      }
    });
    
    return {
      success: true,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search files error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  searchUserFiles
};
