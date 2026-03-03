// frontend/src/services/FirebaseStorageService.js
// Firebase Storage Service for Torah IDE - handles file storage

import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

class FirebaseStorageService {
  /**
   * Upload a text file to Firebase Storage
   * @param {string} userId - User ID
   * @param {string} path - File path (folder structure)
   * @param {string} content - File content
   * @param {string} contentType - MIME type (default: text/plain)
   * @returns {Promise<Object>} Upload result with URL
   */
  async uploadTextFile(userId, path, content, contentType = 'text/plain') {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      
      await uploadString(storageRef, content, 'raw', {
        contentType,
        customMetadata: {
          uploadedAt: new Date().toISOString()
        }
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      return {
        success: true,
        path: fullPath,
        url: downloadURL
      };
    } catch (error) {
      console.error('Upload text file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload a binary file (images, PDFs, etc.)
   * @param {string} userId - User ID
   * @param {string} path - File path
   * @param {File} file - File object
   * @returns {Promise<Object>} Upload result with URL
   */
  async uploadFile(userId, path, file) {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      return {
        success: true,
        path: fullPath,
        url: downloadURL,
        size: file.size
      };
    } catch (error) {
      console.error('Upload file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download a file's content as text
   * @param {string} userId - User ID
   * @param {string} path - File path
   * @returns {Promise<Object>} Download result with content
   */
  async downloadTextFile(userId, path) {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      
      const url = await getDownloadURL(storageRef);
      const response = await fetch(url);
      const content = await response.text();
      
      return {
        success: true,
        content
      };
    } catch (error) {
      console.error('Download text file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get download URL for a file
   * @param {string} userId - User ID
   * @param {string} path - File path
   * @returns {Promise<Object>} Result with URL
   */
  async getFileURL(userId, path) {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      const url = await getDownloadURL(storageRef);
      
      return {
        success: true,
        url
      };
    } catch (error) {
      console.error('Get file URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a file
   * @param {string} userId - User ID
   * @param {string} path - File path
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(userId, path) {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      await deleteObject(storageRef);
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Delete file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all files in a directory
   * @param {string} userId - User ID
   * @param {string} folderPath - Folder path
   * @returns {Promise<Object>} List result with files
   */
  async listFiles(userId, folderPath = '') {
    try {
      const fullPath = `users/${userId}/files/${folderPath}`;
      const storageRef = ref(storage, fullPath);
      const result = await listAll(storageRef);
      
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const metadata = await getMetadata(itemRef);
          const url = await getDownloadURL(itemRef);
          
          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url,
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            updated: metadata.updated
          };
        })
      );
      
      const folders = result.prefixes.map(folderRef => ({
        name: folderRef.name,
        path: folderRef.fullPath
      }));
      
      return {
        success: true,
        files,
        folders
      };
    } catch (error) {
      console.error('List files error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file metadata
   * @param {string} userId - User ID
   * @param {string} path - File path
   * @returns {Promise<Object>} Metadata result
   */
  async getFileMetadata(userId, path) {
    try {
      const fullPath = `users/${userId}/files/${path}`;
      const storageRef = ref(storage, fullPath);
      const metadata = await getMetadata(storageRef);
      
      return {
        success: true,
        metadata: {
          name: metadata.name,
          size: metadata.size,
          contentType: metadata.contentType,
          created: metadata.timeCreated,
          updated: metadata.updated,
          customMetadata: metadata.customMetadata
        }
      };
    } catch (error) {
      console.error('Get file metadata error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new FirebaseStorageService();
