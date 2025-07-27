// frontend/src/hooks/useLearningGraph.js
import { useState, useCallback } from 'react';
import apiService from '../utils/apiService';
import { HEBREW_TEXT } from '../utils/constants';

const useLearningGraph = () => {
  const [graphData, setGraphData] = useState([]); // Stores [{date: 'YYYY-MM-DD', rating: X | null}, ...]
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState(null);
  const [currentRange, setCurrentRange] = useState('week'); // 'week', 'month', 'all'

  const fetchLearningGraphData = useCallback(async (range = 'week') => {
    setIsLoadingGraph(true);
    setGraphError(null);
    setCurrentRange(range);
    try {
      const result = await apiService.getLearningGraphRatings(range);
      // The backend should already format data correctly:
      // an array of objects { date: 'YYYY-MM-DD', rating: number | null }
      // and include all dates in the range for 'week' and 'month'
      setGraphData(result.data || []);
    } catch (err) {
      console.error(`Failed to fetch learning graph data for range ${range}:`, err);
      setGraphError(err.message || HEBREW_TEXT.learningGraph?.errorLoadingData || "שגיאה בטעינת נתוני הגרף");
      setGraphData([]); // Clear data on error
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  // Call fetchLearningGraphData with initial range (e.g., 'week') when hook is first used,
  // or let the component call it. For now, component will call.

  return {
    graphData,
    isLoadingGraph,
    graphError,
    currentRange,
    fetchLearningGraphData, // Expose to allow changing range from component
  };
};

export default useLearningGraph;