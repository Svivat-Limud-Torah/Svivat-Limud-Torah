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

    // Convert raw stats into the shape UserSnapshotView expects
    const fileEntries = Object.values(fileStats).map(f => {
        const openCount = f.openCount || 0;
        const totalSec = f.totalSeconds || 0;
        // Extract fileName from stored data or from the key path
        const fName = f.fileName || (f.relativePath ? f.relativePath.split('/').pop() : (f.path ? f.path.split('/').pop() : ''));
        return {
            file_name: fName,
            path: f.relativePath || f.path || '',
            base_folder_path: f.basePath || '',
            rootName: f.basePath || '',
            access_count: openCount,
            time_spent_seconds: totalSec,
            avg_seconds_per_session: openCount > 0 ? Math.round(totalSec / openCount) : 0,
            last_opened_or_edited: f.lastOpened ? Math.round(f.lastOpened / 1000) : null,
            // keep raw for aggregation
            _openCount: openCount,
            _totalSeconds: totalSec,
        };
    });

    const totalOpens = fileEntries.reduce((s, f) => s + f._openCount, 0);
    const totalTime = fileEntries.reduce((s, f) => s + f._totalSeconds, 0);
    const lastTs = fileEntries.reduce((m, f) => Math.max(m, f.last_opened_or_edited || 0), 0);

    // Questionnaire average rating
    const ratings = questionnaires.map(q => q.overallRating).filter(r => typeof r === 'number');
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    // Build activityByHour and dailyActivity from the activity log
    const activityLog = JSON.parse(localStorage.getItem('web_activity_log') || '[]');
    const hourCounts = {};
    const dayCounts = {};
    for (const ts of activityLog) {
        const d = new Date(ts);
        const hour = d.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        const dayStr = d.toISOString().substring(0, 10); // YYYY-MM-DD
        dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
    }
    const activityByHour = Object.entries(hourCounts).map(([h, c]) => ({ hour: Number(h), count: c }));
    // Last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const dailyActivity = Object.entries(dayCounts)
        .filter(([day]) => day >= thirtyDaysAgo)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, count }));

    return {
        totalStats: { unique_files: fileEntries.length, total_opens: totalOpens, total_time_seconds: totalTime, last_activity_timestamp: lastTs || null },
        fileTypeDistribution: [],
        activityByHour,
        dailyActivity,
        questionnaireInsights: { averageRating: avgRating, totalEntries: questionnaires.length, firstEntryDate: questionnaires[0]?.date || null, lastEntryDate: questionnaires[questionnaires.length - 1]?.date || null },
        topFiles: fileEntries.sort((a, b) => (b.time_spent_seconds || 0) - (a.time_spent_seconds || 0)).slice(0, 20),
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
