// frontend/src/services/FirebaseDBService.js
// Firestore Database Service for Torah IDE - handles all database operations

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

class FirebaseDBService {
  /**
   * Create or update a document
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Result
   */
  async setDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      return {
        success: true,
        id: docId
      };
    } catch (error) {
      console.error('Set document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a document by ID
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @returns {Promise<Object>} Result with data
   */
  async getDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...docSnap.data()
          }
        };
      } else {
        return {
          success: false,
          error: 'Document not found'
        };
      }
    } catch (error) {
      console.error('Get document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Add a new document with auto-generated ID
   * @param {string} collectionName - Collection name
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Result with new ID
   */
  async addDocument(collectionName, data) {
    try {
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        id: docRef.id
      };
    } catch (error) {
      console.error('Add document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a document
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Result
   */
  async updateDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      return {
        success: true,
        id: docId
      };
    } catch (error) {
      console.error('Update document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a document
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @returns {Promise<Object>} Result
   */
  async deleteDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Delete document error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query documents with filters
   * @param {string} collectionName - Collection name
   * @param {Array} filters - Array of filter objects [{field, operator, value}]
   * @param {string} orderByField - Field to order by
   * @param {number} limitCount - Limit results
   * @returns {Promise<Object>} Result with documents
   */
  async queryDocuments(collectionName, filters = [], orderByField = null, limitCount = null) {
    try {
      const colRef = collection(db, collectionName);
      let q = query(colRef);
      
      // Add filters
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
      
      // Add ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField));
      }
      
      // Add limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        documents
      };
    } catch (error) {
      console.error('Query documents error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all documents in a collection
   * @param {string} collectionName - Collection name
   * @returns {Promise<Object>} Result with all documents
   */
  async getAllDocuments(collectionName) {
    try {
      const colRef = collection(db, collectionName);
      const querySnapshot = await getDocs(colRef);
      const documents = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        documents
      };
    } catch (error) {
      console.error('Get all documents error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Listen to real-time updates for a document
   * @param {string} collectionName - Collection name
   * @param {string} docId - Document ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToDocument(collectionName, docId, callback) {
    const docRef = doc(db, collectionName, docId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          success: true,
          data: {
            id: docSnap.id,
            ...docSnap.data()
          }
        });
      } else {
        callback({
          success: false,
          error: 'Document not found'
        });
      }
    }, (error) => {
      callback({
        success: false,
        error: error.message
      });
    });
  }

  /**
   * Listen to real-time updates for a collection
   * @param {string} collectionName - Collection name
   * @param {Array} filters - Array of filter objects
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToCollection(collectionName, filters = [], callback) {
    const colRef = collection(db, collectionName);
    let q = query(colRef);
    
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
    
    return onSnapshot(q, (querySnapshot) => {
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      callback({
        success: true,
        documents
      });
    }, (error) => {
      callback({
        success: false,
        error: error.message
      });
    });
  }

  /**
   * Batch write operations
   * @param {Array} operations - Array of operations [{type, collection, id, data}]
   * @returns {Promise<Object>} Result
   */
  async batchWrite(operations) {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(op => {
        const docRef = doc(db, op.collection, op.id);
        
        switch (op.type) {
          case 'set':
            batch.set(docRef, {
              ...op.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...op.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            console.warn('Unknown operation type:', op.type);
        }
      });
      
      await batch.commit();
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Batch write error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ====================
  // Torah IDE Specific Methods
  // ====================

  /**
   * Save user workspace structure
   * @param {string} userId - User ID
   * @param {Object} workspaceData - Workspace structure
   */
  async saveWorkspace(userId, workspaceData) {
    return await this.setDocument('workspaces', userId, workspaceData);
  }

  /**
   * Get user workspace
   * @param {string} userId - User ID
   */
  async getWorkspace(userId) {
    return await this.getDocument('workspaces', userId);
  }

  /**
   * Save user settings
   * @param {string} userId - User ID
   * @param {Object} settings - User settings
   */
  async saveSettings(userId, settings) {
    return await this.setDocument('userSettings', userId, settings);
  }

  /**
   * Get user settings
   * @param {string} userId - User ID
   */
  async getSettings(userId) {
    return await this.getDocument('userSettings', userId);
  }

  /**
   * Save learning progress
   * @param {string} userId - User ID
   * @param {Object} progressData - Progress data
   */
  async saveLearningProgress(userId, progressData) {
    return await this.setDocument('learningProgress', userId, progressData);
  }

  /**
   * Get learning progress
   * @param {string} userId - User ID
   */
  async getLearningProgress(userId) {
    return await this.getDocument('learningProgress', userId);
  }

  /**
   * Save a note/file content
   * @param {string} userId - User ID
   * @param {string} fileId - File ID (path-based)
   * @param {Object} fileData - File content and metadata
   */
  async saveFile(userId, fileId, fileData) {
    const collectionPath = `users/${userId}/files`;
    return await this.setDocument(collectionPath, fileId, fileData);
  }

  /**
   * Get a file
   * @param {string} userId - User ID
   * @param {string} fileId - File ID
   */
  async getFile(userId, fileId) {
    const collectionPath = `users/${userId}/files`;
    return await this.getDocument(collectionPath, fileId);
  }

  /**
   * Get all user files
   * @param {string} userId - User ID
   */
  async getAllUserFiles(userId) {
    const collectionPath = `users/${userId}/files`;
    return await this.getAllDocuments(collectionPath);
  }

  /**
   * Delete a file
   * @param {string} userId - User ID
   * @param {string} fileId - File ID
   */
  async deleteFile(userId, fileId) {
    const collectionPath = `users/${userId}/files`;
    return await this.deleteDocument(collectionPath, fileId);
  }
}

export default new FirebaseDBService();
