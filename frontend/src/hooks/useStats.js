// frontend/src/hooks/useStats.js
import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

export default function useStats({ workspaceFolders }) {
  const [recentFiles, setRecentFiles] = useState([]);
  const [frequentFiles, setFrequentFiles] = useState([]);
  const [statsError, setStatsError] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchStatsFiles = useCallback(async () => {
    if (workspaceFolders.length === 0) {
      setRecentFiles([]); setFrequentFiles([]); return;
    }
    setIsLoadingStats(true); setStatsError(null);
    let combinedRecent = []; let combinedFrequent = [];
    try {
      for (const folder of workspaceFolders) {
        if (folder.path && !folder.isLoading && !folder.error) {
          const results = await Promise.allSettled([
            fetch(`${API_BASE_URL}/files/recent?baseFolderPath=${encodeURIComponent(folder.path)}&limit=10`),
            fetch(`${API_BASE_URL}/files/frequent?baseFolderPath=${encodeURIComponent(folder.path)}&limit=10`)
          ]);
          const [recentResult, frequentResult] = results;
          if (recentResult.status === 'fulfilled' && recentResult.value.ok) {
            const recentData = await recentResult.value.json();
            combinedRecent.push(...recentData.map(f => ({ ...f, basePath: folder.path, rootName: folder.name })));
          }
          if (frequentResult.status === 'fulfilled' && frequentResult.value.ok) {
            const frequentData = await frequentResult.value.json();
            combinedFrequent.push(...frequentData.map(f => ({ ...f, basePath: folder.path, rootName: folder.name })));
          }
        }
      }
      
      // Remove duplicates based on absolute_file_path
      const uniqueRecent = combinedRecent.filter((file, index, self) => 
        index === self.findIndex(f => 
          (f.absolute_file_path && file.absolute_file_path && f.absolute_file_path === file.absolute_file_path) ||
          (f.base_folder_path === file.base_folder_path && f.path === file.path)
        )
      );
      
      const uniqueFrequent = combinedFrequent.filter((file, index, self) => 
        index === self.findIndex(f => 
          (f.absolute_file_path && file.absolute_file_path && f.absolute_file_path === file.absolute_file_path) ||
          (f.base_folder_path === file.base_folder_path && f.path === file.path)
        )
      );
      
      uniqueRecent.sort((a, b) => b.last_opened_or_edited - a.last_opened_or_edited);
      uniqueFrequent.sort((a, b) => b.access_count - a.access_count || b.last_opened_or_edited - a.last_opened_or_edited);
      setRecentFiles(uniqueRecent.slice(0, 15));
      setFrequentFiles(uniqueFrequent.slice(0, 15));
    } catch (error) {
      console.error("שגיאה בטעינת סטטיסטיקות קבצים:", error); setStatsError(error.message);
    } finally { setIsLoadingStats(false); }
  }, [workspaceFolders]);

  useEffect(() => {
    if (workspaceFolders.length > 0 && workspaceFolders.some(wf => !wf.isLoading && !wf.error)) {
      fetchStatsFiles();
    } else { setRecentFiles([]); setFrequentFiles([]); setStatsError(null); }
  }, [workspaceFolders, fetchStatsFiles]);

  return {
    recentFiles,
    frequentFiles,
    statsError,
    isLoadingStats,
    fetchStatsFiles,
  };
}