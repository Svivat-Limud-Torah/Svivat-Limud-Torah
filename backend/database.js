// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine the correct path for the database
let DB_PATH;
if (process.versions && process.versions.electron) {
    // Running inside Electron
    const { app } = require('electron');
    if (app.isPackaged) {
        // In packaged app, use the user data directory (writable location)
        const userDataPath = app.getPath('userData');
        DB_PATH = path.join(userDataPath, 'torah_ide_stats.sqlite');
        // Migration: If database exists in old location (resources) and not in new location, copy it
        const oldPath = path.join(process.resourcesPath, 'torah_ide_stats.sqlite');
        const fs = require('fs');
        try {
            // Check if old database exists and new one doesn't
            if (fs.existsSync(oldPath) && !fs.existsSync(DB_PATH)) {
                console.log('Migrating database from resources to user data directory...');
                // Ensure user data directory exists
                if (!fs.existsSync(userDataPath)) {
                    fs.mkdirSync(userDataPath, { recursive: true });
                }
                // Copy database file
                fs.copyFileSync(oldPath, DB_PATH);
                console.log('Database migration completed successfully.');
            }
        } catch (migrationError) {
            console.warn('Warning: Database migration failed:', migrationError.message);
            console.log('Will proceed with new database in user data directory.');
        }
    } else {
        // In Electron dev mode, use the relative path
        DB_PATH = path.resolve(__dirname, '../torah_ide_stats.sqlite');
    }
} else {
    // Not running in Electron (plain Node.js, backend dev)
    DB_PATH = path.resolve(__dirname, '../torah_ide_stats.sqlite');
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("שגיאה בפתיחת מסד הנתונים SQLite:", err.message);
        console.error("Database path:", DB_PATH);
    } else {
        console.log("מחובר בהצלחה למסד הנתונים SQLite.");
        console.log("Database path:", DB_PATH);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // --- Files Usage Table ---
        // DON'T drop the table - we want to preserve data between app sessions!
        db.run(`
            CREATE TABLE IF NOT EXISTS files_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                absolute_file_path TEXT UNIQUE NOT NULL, 
                base_folder_path TEXT NOT NULL,
                relative_file_path TEXT NOT NULL, 
                file_name TEXT NOT NULL,
                last_opened_or_edited INTEGER, 
                access_count INTEGER DEFAULT 0,
                last_accessed_timestamp INTEGER 
            )
        `, (creationErr) => {
            if (creationErr) {
                console.error("שגיאה ביצירת טבלת files_usage:", creationErr.message);
                return; 
            }
            console.log("טבלת files_usage נוצרה או כבר קיימת.");

            // Log the actual schema of files_usage after creation
            db.all("PRAGMA table_info(files_usage);", (pragmaErr, columns) => {
                if (pragmaErr) {
                    console.error("שגיאה בקריאת PRAGMA table_info(files_usage):", pragmaErr.message);
                } else {
                    console.log("Schema of files_usage after CREATE TABLE:");
                    columns.forEach(col => {
                        console.log(`  Column: ${col.name}, Type: ${col.type}, NotNull: ${col.notnull}, PK: ${col.pk}`);
                    });
                }

                // Original logic for absolute_file_path (should not be needed if table is fresh)
                // and then call createAllFilesUsageIndexes
                const hasAbsolutePathColumn = columns ? columns.some(col => col.name === 'absolute_file_path') : false;
                let columnWasAdded = false; // For the createAllFilesUsageIndexes message

                if (columns && !hasAbsolutePathColumn) {
                    console.log("עמודת 'absolute_file_path' חסרה בטבלת files_usage. מוסיף אותה...");
                    db.run("ALTER TABLE files_usage ADD COLUMN absolute_file_path TEXT;", (alterErr) => {
                        if (alterErr) {
                            console.error("שגיאה בהוספת עמודת 'absolute_file_path':", alterErr.message);
                        } else {
                            console.log("עמודת 'absolute_file_path' נוספה בהצלחה.");
                            columnWasAdded = true;
                        }
                        createAllFilesUsageIndexes(db, handleError, columnWasAdded);
                    });
                } else if (columns) {
                    console.log("עמודת 'absolute_file_path' קיימת בטבלת files_usage.");
                    createAllFilesUsageIndexes(db, handleError, false);
                } else {
                    // columns is null/undefined due to pragmaErr, already logged.
                    // Still attempt to create indexes, might fail but better than stopping.
                    console.error("לא ניתן היה לוודא את מבנה הטבלה files_usage, מנסה ליצור אינדקסים בכל זאת.");
                    createAllFilesUsageIndexes(db, handleError, false);
                }
            }); // Closes PRAGMA db.all callback
        }); // Closes CREATE files_usage db.run callback

        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `, (err) => {
            if (err) console.error("שגיאה ביצירת טבלת settings:", err.message);
            else console.log("טבלת settings נוצרה או כבר קיימת.");
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS repetitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reminder_interval_1 INTEGER,
                reminder_interval_2 INTEGER,
                reminder_interval_3 INTEGER,
                reminder_interval_4 INTEGER,
                current_interval_index INTEGER DEFAULT 0,
                is_muted BOOLEAN DEFAULT 0,
                last_completed_at DATETIME,
                next_reminder_date DATETIME 
            )
        `, (err) => {
            if (err) console.error("שגיאה ביצירת טבלת repetitions:", err.message);
            else {
                console.log("טבלת repetitions נוצרה או כבר קיימת.");
                db.run("CREATE INDEX IF NOT EXISTS idx_next_reminder_date_repetitions ON repetitions (next_reminder_date);", (idxErr) => {
                    if (idxErr) handleError(idxErr, 'idx_next_reminder_date_repetitions');
                    else console.log("אינדקס idx_next_reminder_date_repetitions נוצר/קיים.");
                });
                db.run("CREATE INDEX IF NOT EXISTS idx_is_muted_repetitions ON repetitions (is_muted);", (idxErr) => {
                    if (idxErr) handleError(idxErr, 'idx_is_muted_repetitions');
                    else console.log("אינדקס idx_is_muted_repetitions נוצר/קיים.");
                });
            }
        });

        // --- Updated/New Tables for Questionnaire & Learning Graph Feature ---

        db.run(`
            CREATE TABLE IF NOT EXISTS UserSettings (
                user_id INTEGER PRIMARY KEY DEFAULT 1, 
                enable_daily_questionnaire_reminder BOOLEAN DEFAULT 1,
                reminder_time TEXT DEFAULT "22:00" 
            )
        `, (err) => {
            if (err) console.error("שגיאה ביצירת טבלת UserSettings:", err.message);
            else {
                console.log("טבלת UserSettings נוצרה או כבר קיימת.");
                db.run("INSERT OR IGNORE INTO UserSettings (user_id) VALUES (1);", (insertErr) => {
                    if (insertErr) console.error("שגיאה בהוספת רשומת ברירת מחדל ל-UserSettings:", insertErr.message);
                });
            }
        });

        // Modified Questionnaires Table
        db.run(`
            CREATE TABLE IF NOT EXISTS Questionnaires (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                date DATE NOT NULL, -- YYYY-MM-DD, critical for retroactive entries and graph
                rating_today INTEGER, -- 1-10, can be NULL if missed
                details_today TEXT,   -- can be NULL
                ai_q1_text TEXT,      -- can be NULL
                ai_q1_answer TEXT,    -- can be NULL
                ai_q2_text TEXT,      -- can be NULL
                ai_q2_answer TEXT,    -- can be NULL
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES UserSettings(user_id),
                UNIQUE (user_id, date) -- Ensure one questionnaire per user per day
            )
        `, (err) => {
            if (err) console.error("שגיאה ביצירת/עדכון טבלת Questionnaires:", err.message);
            else {
                console.log("טבלת Questionnaires נוצרה או כבר קיימת (ועודכנה במידת הצורך).");
                db.run("CREATE INDEX IF NOT EXISTS idx_questionnaires_user_date ON Questionnaires (user_id, date);", (idxErr) => {
                    if (idxErr) handleError(idxErr, 'idx_questionnaires_user_date');
                    else console.log("אינדקס idx_questionnaires_user_date נוצר/קיים.");
                });
                 db.run("CREATE INDEX IF NOT EXISTS idx_questionnaires_rating_date ON Questionnaires (user_id, date, rating_today);", (idxErr) => {
                    if (idxErr) handleError(idxErr, 'idx_questionnaires_rating_date');
                    else console.log("אינדקס idx_questionnaires_rating_date (לגרף) נוצר/קיים.");
                });
            }
        });
        
        // Add new columns to Questionnaires if they don't exist (migration for older schemas)
        db.all("PRAGMA table_info(Questionnaires);", (pragmaErr, columns) => {
            if (pragmaErr) {
                console.error("שגיאה בבדיקת מבנה טבלת Questionnaires:", pragmaErr.message);
                return;
            }
            const columnNames = columns.map(col => col.name);
            const columnsToAdd = [
                { name: 'rating_today', type: 'INTEGER' },
                { name: 'details_today', type: 'TEXT' },
                { name: 'ai_q1_text', type: 'TEXT' },
                { name: 'ai_q1_answer', type: 'TEXT' },
                { name: 'ai_q2_text', type: 'TEXT' },
                { name: 'ai_q2_answer', type: 'TEXT' }
            ];

            columnsToAdd.forEach(col => {
                if (!columnNames.includes(col.name)) {
                    db.run(`ALTER TABLE Questionnaires ADD COLUMN ${col.name} ${col.type};`, (alterErr) => {
                        if (alterErr) {
                            console.error(`שגיאה בהוספת עמודה ${col.name} לטבלת Questionnaires:`, alterErr.message);
                        } else {
                            console.log(`עמודה ${col.name} נוספה לטבלת Questionnaires.`);
                        }
                    });
                }
            });
        });


        // New WeeklySummaries Table
        db.run(`
            CREATE TABLE IF NOT EXISTS WeeklySummaries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                week_start_date DATE NOT NULL, -- YYYY-MM-DD (e.g., Sunday)
                summary_content TEXT,
                strengths TEXT,
                areas_for_improvement TEXT,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES UserSettings(user_id),
                UNIQUE (user_id, week_start_date) -- Ensure one summary per user per week
            )
        `, (err) => {
            if (err) console.error("שגיאה ביצירת טבלת WeeklySummaries:", err.message);
            else {
                console.log("טבלת WeeklySummaries נוצרה או כבר קיימת.");
                db.run("CREATE INDEX IF NOT EXISTS idx_weeklysummaries_user_week ON WeeklySummaries (user_id, week_start_date);", (idxErr) => {
                    if (idxErr) handleError(idxErr, 'idx_weeklysummaries_user_week');
                    else console.log("אינדקס idx_weeklysummaries_user_week נוצר/קיים.");
                });
            }
        });
    });
}

function createAllFilesUsageIndexes(dbInstance, errorHandler, columnWasJustAdded = false) {
    if (columnWasJustAdded) {
        console.log("יוצר אינדקסים עבור files_usage לאחר הוספת עמודת absolute_file_path...");
    } else {
        console.log("מוודא קיום אינדקסים עבור files_usage...");
    }
    dbInstance.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_abs_file_path ON files_usage (absolute_file_path);", (err) => {
        if (err) {
            errorHandler(err, 'idx_abs_file_path (UNIQUE)');
            if (err.message.includes("UNIQUE constraint failed")) {
                console.warn("אזהרה: יצירת אינדקס UNIQUE על absolute_file_path נכשלה. ייתכן שיש רשומות קיימות עם ערכי NULL או כפולים.");
            }
        } else console.log("אינדקס idx_abs_file_path (UNIQUE) נוצר/קיים.");
    });
    dbInstance.run("CREATE INDEX IF NOT EXISTS idx_base_folder_path_files_usage ON files_usage (base_folder_path);", (err) => {
        if (err) errorHandler(err, 'idx_base_folder_path_files_usage');
        else console.log("אינדקס idx_base_folder_path_files_usage נוצר/קיים.");
    });
    dbInstance.run("CREATE INDEX IF NOT EXISTS idx_rel_file_path_base ON files_usage (base_folder_path, relative_file_path);", (err) => {
        if (err) errorHandler(err, 'idx_rel_file_path_base');
        else console.log("אינדקס idx_rel_file_path_base נוצר/קיים.");
    });
    dbInstance.run("CREATE INDEX IF NOT EXISTS idx_last_opened_files_usage ON files_usage (last_opened_or_edited);", (err) => {
        if (err) errorHandler(err, 'idx_last_opened_files_usage');
        else console.log("אינדקס idx_last_opened_files_usage נוצר/קיים.");
    });
    dbInstance.run("CREATE INDEX IF NOT EXISTS idx_access_count_files_usage ON files_usage (access_count);", (err) => {
        if (err) errorHandler(err, 'idx_access_count_files_usage');
        else console.log("אינדקס idx_access_count_files_usage נוצר/קיים.");
    });
}

function handleError(err, context = '') {
    if (err) console.error(`שגיאת SQL ${context}:`, err.message);
}

// --- Existing Functions (recordFileUsage, getRecentFiles, etc.) ---
// These remain unchanged for now.

function recordFileUsage(baseFolderPath, relativeFilePath, fileName) {
    const absoluteFilePath = path.resolve(baseFolderPath, relativeFilePath); 
    const currentTime = Math.floor(Date.now() / 1000); 

    db.get("SELECT access_count, last_accessed_timestamp FROM files_usage WHERE absolute_file_path = ?", [absoluteFilePath], (err, row) => {
        if (err) return handleError(err, `בשליפת נתונים עבור ${absoluteFilePath}`);
        
        let currentAccessCount = row ? (row.access_count || 0) : 0;
        let newAccessCount = currentAccessCount;
        const thirtyMinutesInSeconds = 30 * 60;

        if (row) {
            const lastAccess = row.last_accessed_timestamp || 0;
            if ((currentTime - lastAccess) > thirtyMinutesInSeconds) {
                newAccessCount = currentAccessCount + 1;
            }
            db.run(`UPDATE files_usage SET last_opened_or_edited = ?, access_count = ?, last_accessed_timestamp = ? WHERE absolute_file_path = ?`, 
                   [currentTime, newAccessCount, currentTime, absoluteFilePath], 
                   (updateErr) => handleError(updateErr, `בעדכון רשומה עבור ${absoluteFilePath}`));
        } else {
            newAccessCount = 1; 
            db.run(`INSERT INTO files_usage (absolute_file_path, base_folder_path, relative_file_path, file_name, last_opened_or_edited, access_count, last_accessed_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                   [absoluteFilePath, path.resolve(baseFolderPath), relativeFilePath, fileName, currentTime, newAccessCount, currentTime], 
                   (insertErr) => handleError(insertErr, `בהוספת רשומה עבור ${absoluteFilePath}`));
        }
    });
}

function getRecentFiles(baseFolderPath, limit, callback) {
    const resolvedBaseFolderPath = path.resolve(baseFolderPath);
    const sql = `
        SELECT DISTINCT file_name, relative_file_path AS path, base_folder_path, last_opened_or_edited, access_count,
               absolute_file_path
        FROM files_usage
        WHERE base_folder_path = ?
        ORDER BY last_opened_or_edited DESC
        LIMIT ?`;
    db.all(sql, [resolvedBaseFolderPath, limit], callback);
}

function getFrequentFiles(baseFolderPath, limit, callback) {
    const resolvedBaseFolderPath = path.resolve(baseFolderPath);
    const sql = `
        SELECT DISTINCT file_name, relative_file_path AS path, base_folder_path, last_opened_or_edited, access_count,
               absolute_file_path
        FROM files_usage
        WHERE base_folder_path = ?
        ORDER BY access_count DESC, last_opened_or_edited DESC
        LIMIT ?`;
    db.all(sql, [resolvedBaseFolderPath, limit], callback);
}

function saveSetting(key, value, callback) {
    const sql = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;
    db.run(sql, [key, value], function(err) { 
        handleError(err, `בשמירת הגדרה ${key}`);
        if (callback) callback(err); 
    });
}

function getSetting(key, callback) {
    const sql = `SELECT value FROM settings WHERE key = ?`;
    db.get(sql, [key], (err, row) => {
        if (err) {
            handleError(err, `בשליפת הגדרה ${key}`);
            return callback(err, null);
        }
        callback(null, row ? row.value : null);
    });
}

function updateFileUsagePath(oldAbsoluteFilePath, newAbsoluteFilePath, newBaseFolderPath, newRelativeFilePath, newFileName, callback) {
    const resolvedOldAbsoluteFilePath = path.resolve(oldAbsoluteFilePath);
    const resolvedNewAbsoluteFilePath = path.resolve(newAbsoluteFilePath);
    const resolvedNewBaseFolderPath = path.resolve(newBaseFolderPath);
    const currentTime = Math.floor(Date.now() / 1000);

    const sql = `
        UPDATE files_usage 
        SET absolute_file_path = ?, base_folder_path = ?, relative_file_path = ?, file_name = ?, last_accessed_timestamp = ?
        WHERE absolute_file_path = ?`;
    
    db.run(sql, [resolvedNewAbsoluteFilePath, resolvedNewBaseFolderPath, newRelativeFilePath, newFileName, currentTime, resolvedOldAbsoluteFilePath], function(err) {
        if (err) handleError(err, `בעדכון נתיב מ-${resolvedOldAbsoluteFilePath} ל-${resolvedNewAbsoluteFilePath}`);
        if (callback) callback(err, this.changes);
    });
}

function updateDescendantPaths(oldBaseFolderPath, oldFolderRelativePath, newBaseFolderPath, newFolderRelativePath, callback) {
    const resolvedOldBase = path.resolve(oldBaseFolderPath);
    const resolvedNewBase = path.resolve(newBaseFolderPath);
    const oldFolderAbsolutePrefix = path.resolve(resolvedOldBase, oldFolderRelativePath);
    const newFolderAbsolutePrefix = path.resolve(resolvedNewBase, newFolderRelativePath);
    const sqlSelect = `
        SELECT id, absolute_file_path, relative_file_path, file_name 
        FROM files_usage 
        WHERE base_folder_path = ? AND (absolute_file_path = ? OR absolute_file_path LIKE ?)`;
    const oldFolderAbsolutePrefixForLike = oldFolderAbsolutePrefix.endsWith(path.sep) ? oldFolderAbsolutePrefix : oldFolderAbsolutePrefix + path.sep;

    db.all(sqlSelect, [resolvedOldBase, oldFolderAbsolutePrefix, oldFolderAbsolutePrefixForLike + '%'], (err, rows) => {
        if (err) {
            handleError(err, `בשליפת צאצאים של ${oldFolderAbsolutePrefix}`);
            return callback(err);
        }
        if (rows.length === 0) return callback(null, 0);
        let completed = 0;
        let totalChanges = 0;
        const currentTime = Math.floor(Date.now() / 1000);
        db.parallelize(() => {
            rows.forEach(row => {
                const pathSuffix = row.absolute_file_path.substring(oldFolderAbsolutePrefix.length);
                const updatedAbsoluteFilePath = path.join(newFolderAbsolutePrefix, pathSuffix);
                const updatedRelativeFilePath = path.relative(resolvedNewBase, updatedAbsoluteFilePath).replace(/\\/g, '/');
                const updatedFileName = path.basename(updatedAbsoluteFilePath); 
                const sqlUpdate = `
                    UPDATE files_usage 
                    SET absolute_file_path = ?, base_folder_path = ?, relative_file_path = ?, file_name = ?, last_accessed_timestamp = ?
                    WHERE id = ?`;
                db.run(sqlUpdate, [updatedAbsoluteFilePath, resolvedNewBase, updatedRelativeFilePath, updatedFileName, currentTime, row.id], function(updateErr) {
                    if (updateErr) handleError(updateErr, `בעדכון צאצא ${row.absolute_file_path} ל ${updatedAbsoluteFilePath}`);
                    else totalChanges += this.changes;
                    completed++;
                    if (completed === rows.length) {
                        callback(null, totalChanges);
                    }
                });
            });
        });
    });
}

function deleteFileUsage(baseFolderPath, relativePathToDelete, isFolder, callback) {
    const resolvedBaseFolderPath = path.resolve(baseFolderPath);
    const absolutePathToDelete = path.resolve(resolvedBaseFolderPath, relativePathToDelete);
    let sql;
    let params;

    if (isFolder) {
        const pathPrefixForLike = absolutePathToDelete.endsWith(path.sep) ? absolutePathToDelete : absolutePathToDelete + path.sep;
        sql = `DELETE FROM files_usage WHERE base_folder_path = ? AND (absolute_file_path = ? OR absolute_file_path LIKE ?)`;
        params = [resolvedBaseFolderPath, absolutePathToDelete, pathPrefixForLike + '%'];
    } else {
        sql = `DELETE FROM files_usage WHERE absolute_file_path = ?`;
        params = [absolutePathToDelete];
    }
    db.run(sql, params, function(err) {
        if (err) handleError(err, `במחיקת רשומות שימוש עבור ${absolutePathToDelete} (isFolder: ${isFolder})`);
        if (callback) callback(err, this.changes);
    });
}

// --- Repetition Functions ---

function calculateNextReminderDate(baseDate, intervalDays) {
    if (!intervalDays || intervalDays <= 0) return null;
    const date = new Date(baseDate);
    date.setDate(date.getDate() + intervalDays);
    return date.toISOString(); 
}

function addRepetition(repetitionData, callback) {
    const { name, content, reminder_interval_1, reminder_interval_2, reminder_interval_3, reminder_interval_4 } = repetitionData;
    const createdAt = new Date().toISOString();
    const nextReminderDate = calculateNextReminderDate(createdAt, reminder_interval_1);
    
    const sql = `INSERT INTO repetitions 
                 (name, content, created_at, reminder_interval_1, reminder_interval_2, reminder_interval_3, reminder_interval_4, next_reminder_date, current_interval_index) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`; 
    db.run(sql, [name, content, createdAt, reminder_interval_1, reminder_interval_2, reminder_interval_3, reminder_interval_4, nextReminderDate], function(err) {
        if (err) {
            handleError(err, 'בהוספת חזרה חדשה');
            return callback(err);
        }
        getRepetitionById(this.lastID, callback);
    });
}

function getAllRepetitions(callback) {
    const sql = `SELECT * FROM repetitions ORDER BY next_reminder_date ASC, created_at DESC`;
    db.all(sql, [], callback);
}

function getRepetitionById(id, callback) {
    const sql = `SELECT * FROM repetitions WHERE id = ?`;
    db.get(sql, [id], callback);
}

function deleteRepetition(id, callback) {
    const sql = `DELETE FROM repetitions WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) handleError(err, `במחיקת חזרה עם ID ${id}`);
        callback(err, this.changes);
    });
}

function updateRepetitionMuteStatus(id, is_muted, callback) {
    const sql = `UPDATE repetitions SET is_muted = ? WHERE id = ?`;
    db.run(sql, [is_muted ? 1 : 0, id], function(err) {
        if (err) handleError(err, `בעדכון סטטוס השתקה עבור חזרה ID ${id}`);
        if (err) return callback(err);
        getRepetitionById(id, callback); 
    });
}

function markRepetitionAsCompleted(id, callback) {
    getRepetitionById(id, (err, repetition) => {
        if (err) return callback(err);
        if (!repetition) return callback(new Error(`חזרה עם ID ${id} לא נמצאה`));

        const lastCompletedAt = new Date().toISOString();
        let nextIntervalIndex = repetition.current_interval_index + 1;
        let nextReminderDate = null;
        const intervals = [repetition.reminder_interval_1, repetition.reminder_interval_2, repetition.reminder_interval_3, repetition.reminder_interval_4];

        if (nextIntervalIndex < intervals.length && intervals[nextIntervalIndex] > 0) {
            nextReminderDate = calculateNextReminderDate(lastCompletedAt, intervals[nextIntervalIndex]);
        } else {
            nextIntervalIndex = -1; 
        }
        
        const sql = `UPDATE repetitions SET last_completed_at = ?, next_reminder_date = ?, current_interval_index = ? WHERE id = ?`;
        db.run(sql, [lastCompletedAt, nextReminderDate, nextIntervalIndex, id], function(updateErr) {
            if (updateErr) {
                handleError(updateErr, `בעדכון חזרה ID ${id} כהושלמה`);
                return callback(updateErr);
            }
            getRepetitionById(id, callback); 
        });
    });
}

function updateRepetition(id, data, callback) {
    const fields = [];
    const values = [];
    Object.entries(data).forEach(([key, value]) => {
        if (['name', 'content', 'reminder_interval_1', 'reminder_interval_2', 'reminder_interval_3', 'reminder_interval_4', 'is_muted'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(key === 'is_muted' ? (value ? 1 : 0) : value);
        }
    });

    if (fields.length === 0) {
        return getRepetitionById(id, callback); 
    }
    const sql = `UPDATE repetitions SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    db.run(sql, values, function(err) {
        if (err) {
            handleError(err, `בעדכון חזרה ID ${id}`);
            return callback(err);
        }
        getRepetitionById(id, callback);
    });
}


// --- Questionnaire & Learning Graph Feature Database Functions ---

const DEFAULT_USER_ID = 1;

function getUserNotificationSettings(callback) {
    const sql = `SELECT enable_daily_questionnaire_reminder, reminder_time FROM UserSettings WHERE user_id = ?`;
    db.get(sql, [DEFAULT_USER_ID], (err, row) => {
        if (err) {
            handleError(err, `בשליפת הגדרות התראה למשתמש ${DEFAULT_USER_ID}`);
            return callback(err);
        }
        callback(null, row || { enable_daily_questionnaire_reminder: 1, reminder_time: "22:00" });
    });
}

function updateUserNotificationSettings(settings, callback) {
    const { enable_daily_questionnaire_reminder } = settings; // reminder_time is fixed
    const sql = `UPDATE UserSettings SET enable_daily_questionnaire_reminder = ? WHERE user_id = ?`;
    db.run(sql, [enable_daily_questionnaire_reminder ? 1 : 0, DEFAULT_USER_ID], function(err) {
        if (err) {
            handleError(err, `בעדכון הגדרות התראה למשתמש ${DEFAULT_USER_ID}`);
            return callback(err);
        }
        getUserNotificationSettings(callback);
    });
}

// Renamed from getTodaysQuestionnaireStatus for clarity
function getQuestionnaireByDate(dateString, callback) { // dateString in 'YYYY-MM-DD'
    const sql = `SELECT * FROM Questionnaires WHERE user_id = ? AND date = ?`;
    db.get(sql, [DEFAULT_USER_ID, dateString], (err, row) => {
        if (err) {
            handleError(err, `בבדיקת סטטוס שאלון לתאריך ${dateString}`);
            return callback(err);
        }
        callback(null, row); // Returns the questionnaire if submitted, or null
    });
}

function submitQuestionnaire(questionnaireData, callback) {
    const { date, rating_today, details_today, ai_q1_text, ai_q1_answer, ai_q2_text, ai_q2_answer } = questionnaireData;
    // Use INSERT OR REPLACE to handle submissions for a date that might already exist (e.g., user corrects a retroactive entry)
    // or use INSERT ... ON CONFLICT (user_id, date) DO UPDATE SET ... for SQLite versions >= 3.24.0
    // For simplicity and broader compatibility, INSERT OR REPLACE is used here.
    // Note: This will update submitted_at timestamp on replace.
    const sql = `INSERT OR REPLACE INTO Questionnaires 
                 (user_id, date, rating_today, details_today, ai_q1_text, ai_q1_answer, ai_q2_text, ai_q2_answer, submitted_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    db.run(sql, [DEFAULT_USER_ID, date, rating_today, details_today, ai_q1_text, ai_q1_answer, ai_q2_text, ai_q2_answer], function(err) {
        if (err) {
            handleError(err, `בשמירת/עדכון שאלון לתאריך ${date}`);
            return callback(err);
        }
        callback(null, { id: this.lastID, changes: this.changes });
    });
}

function getWeeklyQuestionnaireAnswers(weekStartDate, weekEndDate, callback) { // dates in 'YYYY-MM-DD'
    const sql = `SELECT * FROM Questionnaires 
                 WHERE user_id = ? AND date >= ? AND date <= ? 
                 ORDER BY date ASC`;
    db.all(sql, [DEFAULT_USER_ID, weekStartDate, weekEndDate], (err, rows) => {
        if (err) {
            handleError(err, `בשליפת תשובות שבועיות מ-${weekStartDate} עד ${weekEndDate}`);
            return callback(err);
        }
        callback(null, rows);
    });
}

function saveWeeklySummary(summaryData, callback) {
    const { week_start_date, summary_content, strengths, areas_for_improvement } = summaryData;
    const sql = `INSERT OR REPLACE INTO WeeklySummaries (user_id, week_start_date, summary_content, strengths, areas_for_improvement, generated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    db.run(sql, [DEFAULT_USER_ID, week_start_date, summary_content, strengths, areas_for_improvement], function(err) {
        if (err) {
            handleError(err, `בשמירת סיכום שבועי ל-${week_start_date}`);
            return callback(err);
        }
        callback(null, { id: this.lastID });
    });
}

function getLatestWeeklySummary(callback) {
    const sql = `SELECT * FROM WeeklySummaries 
                 WHERE user_id = ? 
                 ORDER BY week_start_date DESC 
                 LIMIT 1`;
    db.get(sql, [DEFAULT_USER_ID], (err, row) => {
        if (err) {
            handleError(err, `בשליפת הסיכום השבועי האחרון`);
            return callback(err);
        }
        callback(null, row); 
    });
}

// --- Learning Graph Database Functions ---
function getDailyRatingsForGraph(timeRangeParams, callback) {
    const { startDate, endDate } = timeRangeParams; // Expect YYYY-MM-DD
    // Fetches date and rating_today. If rating_today is NULL, it will be represented in the results.
    let sql = `SELECT date, rating_today FROM Questionnaires 
               WHERE user_id = ?`;
    const params = [DEFAULT_USER_ID];

    if (startDate && endDate) {
        sql += ` AND date >= ? AND date <= ?`;
        params.push(startDate, endDate);
    }
    sql += ` ORDER BY date ASC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            handleError(err, `בשליפת דירוגים יומיים לגרף`);
            return callback(err);
        }
        callback(null, rows);
    });
}


module.exports = { 
    db, 
    recordFileUsage, 
    getRecentFiles, 
    getFrequentFiles, 
    saveSetting, 
    getSetting,
    updateFileUsagePath, 
    updateDescendantPaths, 
    deleteFileUsage,
    // Repetition exports
    addRepetition,
    getAllRepetitions,
    getRepetitionById,
    deleteRepetition,
    updateRepetitionMuteStatus,
    markRepetitionAsCompleted,
    updateRepetition,
    // Questionnaire exports
    getUserNotificationSettings,
    updateUserNotificationSettings,
    getQuestionnaireByDate, // Updated name
    submitQuestionnaire,
    getWeeklyQuestionnaireAnswers,
    saveWeeklySummary,
    getLatestWeeklySummary,
    // Learning Graph exports
    getDailyRatingsForGraph,
    resetAllUserData, // Added for the new functionality
};

// --- Function to Reset All User Data ---
function resetAllUserData(callback) {
    const tablesToClear = [
        'files_usage',
        'settings', // This will clear lastOpenedFolderPaths and any other general settings
        'repetitions',
        'UserSettings', // This will be cleared and then default re-inserted
        'Questionnaires',
        'WeeklySummaries'
        // Add any other user-specific tables here
    ];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION;", handleError);

        tablesToClear.forEach(table => {
            db.run(`DELETE FROM ${table};`, (err) => {
                if (err) {
                    handleError(err, `במחיקת נתונים מטבלת ${table}`);
                    // If any delete fails, rollback and callback with error
                    db.run("ROLLBACK;", (rollbackErr) => {
                        if (rollbackErr) console.error("שגיאה ב-ROLLBACK לאחר כשל במחיקה:", rollbackErr.message);
                        return callback(err);
                    });
                } else {
                    console.log(`נתונים נמחקו בהצלחה מטבלת ${table}.`);
                }
            });
        });

        // Re-insert default UserSettings after clearing
        // The initializeDatabase function already handles creating a default UserSettings row if it doesn't exist.
        // However, since we are explicitly deleting, we should re-insert.
        db.run("INSERT OR IGNORE INTO UserSettings (user_id, enable_daily_questionnaire_reminder, reminder_time) VALUES (1, 1, '22:00');", (insertErr) => {
            if (insertErr) {
                handleError(insertErr, "בהוספת רשומת ברירת מחדל ל-UserSettings לאחר איפוס");
                db.run("ROLLBACK;", (rollbackErr) => {
                    if (rollbackErr) console.error("שגיאה ב-ROLLBACK לאחר כשל בהוספת UserSettings:", rollbackErr.message);
                    return callback(insertErr);
                });
            } else {
                console.log("רשומת ברירת מחדל הוספה מחדש ל-UserSettings.");
            }
        });
        
        // Vacuum the database to reclaim space after deletions
        db.run("VACUUM;", (vacuumErr) => {
            if (vacuumErr) {
                // This is not critical enough to rollback, but good to log
                console.warn("אזהרה: שגיאה בביצוע VACUUM לאחר מחיקת נתונים:", vacuumErr.message);
            } else {
                console.log("מסד הנתונים עבר VACUUM בהצלחה.");
            }
        });

        db.run("COMMIT;", (commitErr) => {
            if (commitErr) {
                handleError(commitErr, "בביצוע COMMIT לאחר איפוס נתונים");
                // Attempt rollback if commit fails, though it might also fail
                db.run("ROLLBACK;", (rollbackErr) => {
                    if (rollbackErr) console.error("שגיאה ב-ROLLBACK לאחר כשל ב-COMMIT:", rollbackErr.message);
                });
                return callback(commitErr);
            }
            console.log("איפוס כל נתוני המשתמש הושלם בהצלחה והשינויים נשמרו (COMMIT).");
            if (callback) callback(null);
        });
    });
}
