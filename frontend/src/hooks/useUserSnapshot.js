// frontend/src/hooks/useUserSnapshot.js
import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

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
