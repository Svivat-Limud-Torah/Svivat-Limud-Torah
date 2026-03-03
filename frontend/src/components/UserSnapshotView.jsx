// frontend/src/components/UserSnapshotView.jsx
import React from 'react';
import { HEBREW_TEXT } from '../utils/constants';
import './UserSnapshotView.css';

// Format seconds to human-readable string
function formatTime(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return '—';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}ש' ${m}ד'`;
    if (m > 0) return `${m}ד' ${s}ש"`.trim();
    return `${s}ש"`;
}

// SVG Bar Chart Component
const BarChart = ({ data, width = 500, height = 180, barColor = '#64748b', labelKey = 'label', valueKey = 'value' }) => {
    if (!data || data.length === 0) return <p className="snapshot-empty">אין נתונים</p>;

    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    const barWidth = Math.max(4, Math.min(20, (width - 60) / data.length - 2));
    const chartLeft = 40;
    const chartBottom = height - 25;
    const chartTop = 10;
    const chartHeight = chartBottom - chartTop;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            {/* Y axis line */}
            <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom}
                stroke="var(--theme-border-color)" strokeWidth="1" />
            {/* X axis line */}
            <line x1={chartLeft} y1={chartBottom} x2={width - 10} y2={chartBottom}
                stroke="var(--theme-border-color)" strokeWidth="1" />

            {/* Y axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                const y = chartBottom - frac * chartHeight;
                const val = Math.round(frac * maxVal);
                return (
                    <g key={i}>
                        <line x1={chartLeft - 4} y1={y} x2={chartLeft} y2={y}
                            stroke="var(--theme-text-tertiary)" strokeWidth="1" />
                        <text x={chartLeft - 6} y={y + 3} textAnchor="end"
                            fill="var(--theme-text-tertiary)" fontSize="9">{val}</text>
                    </g>
                );
            })}

            {/* Bars */}
            {data.map((d, i) => {
                const barH = (d[valueKey] / maxVal) * chartHeight;
                const x = chartLeft + 10 + i * ((width - chartLeft - 20) / data.length);
                const y = chartBottom - barH;
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            rx={2}
                            fill={barColor}
                            opacity="0.8"
                        >
                            <title>{d[labelKey]}: {d[valueKey]}</title>
                        </rect>
                        {data.length <= 15 && (
                            <text
                                x={x + barWidth / 2}
                                y={chartBottom + 12}
                                textAnchor="middle"
                                fill="var(--theme-text-tertiary)"
                                fontSize="7"
                                transform={`rotate(-45, ${x + barWidth / 2}, ${chartBottom + 12})`}
                            >
                                {d[labelKey]}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

// Hours chart — shows a horizontal bar for each hour
const HoursChart = ({ data, width = 500, height = 200 }) => {
    if (!data || data.length === 0) return <p className="snapshot-empty">אין נתונים</p>;

    // Fill in missing hours
    const hourMap = {};
    data.forEach(d => { hourMap[d.hour] = d.count; });
    const hours = [];
    for (let h = 0; h < 24; h++) {
        hours.push({ hour: h, count: hourMap[h] || 0 });
    }
    const maxCount = Math.max(...hours.map(h => h.count), 1);

    const barW = (width - 40) / 24 - 1;
    const chartBottom = height - 30;
    const chartTop = 10;
    const chartHeight = chartBottom - chartTop;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            {hours.map((h, i) => {
                const barH = (h.count / maxCount) * chartHeight;
                const x = 30 + i * ((width - 40) / 24);
                const y = chartBottom - barH;
                const intensity = h.count / maxCount;
                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={Math.max(barH, h.count > 0 ? 2 : 0)}
                            rx={2}
                            fill="#64748b"
                            opacity={0.25 + intensity * 0.75}
                        >
                            <title>{`${String(h.hour).padStart(2, '0')}:00 — ${h.count} פתיחות`}</title>
                        </rect>
                        {i % 3 === 0 && (
                            <text
                                x={x + barW / 2}
                                y={chartBottom + 14}
                                textAnchor="middle"
                                fill="var(--theme-text-tertiary)"
                                fontSize="8"
                            >
                                {String(h.hour).padStart(2, '0')}
                            </text>
                        )}
                    </g>
                );
            })}
            {/* X axis */}
            <line x1={30} y1={chartBottom} x2={width - 10} y2={chartBottom}
                stroke="var(--theme-border-color)" strokeWidth="1" />
        </svg>
    );
};


const UserSnapshotView = ({
    snapshotData,
    isLoading,
    error,
    onRefresh,
    onFileSelect,
    workspaceFolders,
}) => {

    const dailyBarData = snapshotData?.dailyActivity
        ? snapshotData.dailyActivity.map(d => ({ label: d.day ? d.day.substring(5) : '', value: d.count }))
        : [];

    const topFiles = snapshotData?.topFiles || [];
    const totalStats = snapshotData?.totalStats || {};
    const qInsights = snapshotData?.questionnaireInsights || {};
    const weeklySummary = snapshotData?.weeklySummary || null;

    if (isLoading) {
        return (
            <div className="snapshot-dashboard">
                <div className="snapshot-loading">{HEBREW_TEXT.loading}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="snapshot-dashboard">
                <div className="snapshot-header">
                    <h2>{HEBREW_TEXT.userSnapshot || 'תמונת מצב'}</h2>
                    <button onClick={onRefresh} className="btn btn-secondary btn-sm">נסה שוב</button>
                </div>
                <div className="snapshot-empty" style={{ color: 'var(--theme-error-color)' }}>
                    {HEBREW_TEXT.error}: {error}
                </div>
            </div>
        );
    }

    if (!snapshotData || (!workspaceFolders || workspaceFolders.length === 0)) {
        return (
            <div className="snapshot-dashboard">
                <div className="snapshot-header">
                    <h2>{HEBREW_TEXT.userSnapshot || 'תמונת מצב'}</h2>
                </div>
                <div className="snapshot-empty">
                    {HEBREW_TEXT.addFolderFirst || 'הוסף תיקייה כדי לראות את תמונת המצב.'}
                </div>
            </div>
        );
    }

    // Find the most used file (by time spent)
    const mostUsedFile = topFiles.length > 0 ? topFiles[0] : null;
    const totalTimeSeconds = totalStats.total_time_seconds || 0;

    return (
        <div className="snapshot-dashboard">
            {/* Header */}
            <div className="snapshot-header">
                <h2>{HEBREW_TEXT.userSnapshot || 'תמונת מצב'}</h2>
                <button onClick={onRefresh} className="btn btn-secondary btn-sm" title="רענן נתונים">רענן</button>
            </div>

            {/* Stats Cards */}
            <div className="snapshot-stats-grid">
                <div className="snapshot-stat-card">
                    <span className="stat-label">קבצים ייחודיים</span>
                    <span className="stat-value">{totalStats.unique_files || 0}</span>
                </div>
                <div className="snapshot-stat-card">
                    <span className="stat-label">סה"כ פתיחות</span>
                    <span className="stat-value">{totalStats.total_opens || 0}</span>
                </div>
                <div className="snapshot-stat-card">
                    <span className="stat-label">סה"כ זמן לימוד</span>
                    <span className="stat-value">{formatTime(totalTimeSeconds)}</span>
                </div>
                <div className="snapshot-stat-card">
                    <span className="stat-label">קובץ מוביל</span>
                    <span className="stat-value stat-value--filename">{mostUsedFile ? mostUsedFile.file_name : '—'}</span>
                </div>
            </div>

            {/* Charts Row */}
            <div className="snapshot-charts-row">
                {/* Hour Activity */}
                <div className="snapshot-chart-card" style={{ flex: 1 }}>
                    <h3>שעות פעילות</h3>
                    <HoursChart data={snapshotData?.activityByHour || []} />
                </div>
            </div>

            {/* Daily Activity Bar Chart */}
            <div className="snapshot-chart-card">
                <h3>פעילות ב-30 ימים אחרונים</h3>
                <BarChart data={dailyBarData} barColor="#60a5fa" />
            </div>

            {/* Top Files Table */}
            {topFiles.length > 0 && (
                <div className="snapshot-top-files">
                    <h3>קבצים מובילים</h3>
                    <table className="snapshot-files-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>שם קובץ</th>
                                <th>תיקייה</th>
                                <th>פתיחות</th>
                                <th>זמן כולל</th>
                                <th>ממוצע לביקור</th>
                                <th>פתיחה אחרונה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topFiles.slice(0, 20).map((file, i) => (
                                <tr
                                    key={file.absolute_file_path || i}
                                    style={{ cursor: onFileSelect ? 'pointer' : 'default' }}
                                    onClick={() => {
                                        if (onFileSelect && file.base_folder_path) {
                                            const targetFolder = { path: file.base_folder_path, name: file.rootName };
                                            onFileSelect(targetFolder, { name: file.file_name, path: file.path, type: 'file' });
                                        }
                                    }}
                                >
                                    <td style={{ color: 'var(--theme-text-tertiary)', width: '30px' }}>{i + 1}</td>
                                    <td className="file-name-cell">{file.file_name}</td>
                                    <td style={{ color: 'var(--theme-text-tertiary)', fontSize: '0.82rem' }}>{file.rootName}</td>
                                    <td className="access-count-cell">{file.access_count}</td>
                                    <td style={{ color: 'var(--theme-text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>{formatTime(file.time_spent_seconds)}</td>
                                    <td style={{ color: 'var(--theme-text-secondary)', fontSize: '0.82rem' }}>{formatTime(file.avg_seconds_per_session)}</td>
                                    <td style={{ color: 'var(--theme-text-tertiary)', fontSize: '0.82rem' }}>
                                        {file.last_opened_or_edited
                                            ? new Date(file.last_opened_or_edited * 1000).toLocaleDateString('he-IL')
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Questionnaire Insights */}
            <div className="snapshot-insights">
                <h3>תובנות מהשאלון</h3>
                <div className="snapshot-insights-content">
                    {qInsights.totalEntries > 0 ? (
                        <>
                            <div className="snapshot-insight-row">
                                <span className="snapshot-insight-label">דירוג ממוצע:</span>
                                <span className="snapshot-insight-value">
                                    {qInsights.averageRating}/10 (על סמך {qInsights.totalEntries} ימים)
                                </span>
                            </div>
                            {qInsights.firstEntryDate && (
                                <div className="snapshot-insight-row">
                                    <span className="snapshot-insight-label">תקופת מעקב:</span>
                                    <span className="snapshot-insight-value">
                                        {new Date(qInsights.firstEntryDate + 'T00:00:00').toLocaleDateString('he-IL')}
                                        {' — '}
                                        {new Date(qInsights.lastEntryDate + 'T00:00:00').toLocaleDateString('he-IL')}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p style={{ color: 'var(--theme-text-secondary)' }}>
                            אין עדיין נתוני שאלון. מלא את השאלון היומי כדי לראות תובנות כאן.
                        </p>
                    )}

                    {/* Weekly Summary */}
                    {weeklySummary && (
                        <>
                            {weeklySummary.summary_content && (
                                <div className="snapshot-insight-row" style={{ flexDirection: 'column' }}>
                                    <span className="snapshot-insight-label">סיכום שבועי אחרון:</span>
                                    <div className="snapshot-summary-text">{weeklySummary.summary_content}</div>
                                </div>
                            )}
                            {weeklySummary.strengths && (
                                <div className="snapshot-insight-row">
                                    <span className="snapshot-insight-label">נקודות חוזק:</span>
                                    <span className="snapshot-insight-value">{weeklySummary.strengths}</span>
                                </div>
                            )}
                            {weeklySummary.areas_for_improvement && (
                                <div className="snapshot-insight-row">
                                    <span className="snapshot-insight-label">נקודות לשיפור:</span>
                                    <span className="snapshot-insight-value">{weeklySummary.areas_for_improvement}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserSnapshotView;
