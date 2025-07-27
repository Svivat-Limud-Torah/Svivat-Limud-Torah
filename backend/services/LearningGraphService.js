// backend/services/LearningGraphService.js
const dbOperations = require('../database');
const { getFormattedDateString } = require('./QuestionnaireService'); // For date formatting consistency

const getRatingsForGraph = async (range) => {
    return new Promise((resolve, reject) => {
        let startDate, endDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent calculations

        switch (range) {
            case 'week': // Last 7 days
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6); // today included, so 6 days back + today = 7 days
                break;
            case 'month': // Last 30 days
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 29); // today included
                break;
            case 'all':
                // No date range, fetch all available data
                startDate = null;
                endDate = null;
                break;
            default: // Default to 'week' if range is invalid
                endDate = new Date(today);
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                break;
        }

        const timeRangeParams = {
            startDate: startDate ? getFormattedDateString(startDate) : null,
            endDate: endDate ? getFormattedDateString(endDate) : null,
        };

        dbOperations.getDailyRatingsForGraph(timeRangeParams, (err, rows) => {
            if (err) {
                return reject(err);
            }

            // If a specific range is requested (not 'all'), ensure all dates in the range are present.
            // For 'all', we just return what's in the DB.
            if (range === 'week' || range === 'month') {
                const allDatesInRange = [];
                let currentDateIterator = new Date(startDate); // startDate is defined for 'week' and 'month'
                
                while(currentDateIterator <= endDate) {
                    allDatesInRange.push(getFormattedDateString(currentDateIterator));
                    currentDateIterator.setDate(currentDateIterator.getDate() + 1);
                }

                const processedRows = allDatesInRange.map(dateStr => {
                    const dbRow = rows.find(r => r.date === dateStr);
                    return {
                        date: dateStr,
                        rating: dbRow ? dbRow.rating_today : null // null indicates missing rating
                    };
                });
                resolve(processedRows);

            } else { // 'all' range
                 const processedRows = rows.map(row => ({
                    date: row.date,
                    rating: row.rating_today // rating_today can be null if questionnaire was submitted without it
                }));
                resolve(processedRows);
            }
        });
    });
};

module.exports = {
    getRatingsForGraph,
};