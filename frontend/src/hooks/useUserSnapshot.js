// frontend/src/hooks/useUserSnapshot.js
import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL, IS_WEB_MODE } from '../utils/constants';

function buildLocalSnapshot() {
    // Build snapshot from localStorage data
    // web_questionnaires is stored as an object keyed by date (by WebApiService), convert to array
    const questionnairesRaw = localStorage.getItem('web_questionnaires');
    let questionnairesObj = {};
    try { questionnairesObj = JSON.parse(questionnairesRaw || '{}'); } catch (e) {}
    const questionnaires = Array.isArray(questionnairesObj)
        ? questionnairesObj
        : Object.values(questionnairesObj);
    const summaries = JSON.parse(localStorage.getItem('web_weekly_summaries') || '[]');
    const fileStats = JSON.parse(localStorage.getItem('web_file_usage_stats') || '{}');

    const fileEntries = Object.values(fileStats);
    const totalOpens = fileEntries.reduce((s, f) => s + (f.openCount || 0), 0);
    const totalTime = fileEntries.reduce((s, f) => s + (f.totalSeconds || 0), 0);
    const lastTs = fileEntries.reduce((m, f) => Math.max(m, f.lastOpened || 0), 0);

    // Questionnaire average rating
    const ratings = questionnaires.map(q => q.overallRating).filter(r => typeof r === 'number');
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    return {
        totalStats: { unique_files: fileEntries.length, total_opens: totalOpens, total_time_seconds: totalTime, last_activity_timestamp: lastTs || null },
        fileTypeDistribution: [],
        activityByHour: [],
        dailyActivity: [],
        questionnaireInsights: { averageRating: avgRating, totalEntries: questionnaires.length, firstEntryDate: questionnaires[0]?.date || null, lastEntryDate: questionnaires[questionnaires.length - 1]?.date || null },
        topFiles: fileEntries.sort((a, b) => (b.totalSeconds || 0) - (a.totalSeconds || 0)).slice(0, 20),
        weeklySummary: summaries[summaries.length - 1] || null,
    };
}

export default function useUserSnapshot({ workspaceFolders }) {
    const [snapshotData, setSnapshotData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSnapshot = useCallback(async () => {
        if (!workspaceFolders || workspaceFolders.length === 0) {
            setSnapshotData(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            if (IS_WEB_MODE) {
                setSnapshotData(buildLocalSnapshot());
                return;
            }
            const response = await fetch(`${API_BASE_URL}/user-snapshot`);
            if (!response.ok) {
                throw new Error(`שגיאה בשליפת תמונת מצב: ${response.status}`);
            }
            const data = await response.json();
            setSnapshotData(data);
        } catch (err) {
            console.error('Error fetching user snapshot:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceFolders]);

    useEffect(() => {
        if (workspaceFolders && workspaceFolders.length > 0 && workspaceFolders.some(wf => !wf.isLoading && !wf.error)) {
            fetchSnapshot();
            const interval = setInterval(fetchSnapshot, 30000);
            return () => clearInterval(interval);
        } else {
            setSnapshotData(null);
            setError(null);
        }
    }, [workspaceFolders, fetchSnapshot]);

    return {
        snapshotData,
        isLoading,
        error,
        fetchSnapshot,
    };
}
