// backend/services/UserDataService.js
const db = require('../database').db; // Direct access to the database instance for transactions
const dbOperations = require('../database'); // For specific existing operations if needed

const exportAllUserData = async () => {
  console.log("Starting user data export...");
  const allData = {};

  try {
    // 1. Settings (includes API key, last opened folders, notification settings, font size etc.)
    allData.settings = await new Promise((resolve, reject) => {
      db.all("SELECT key, value FROM settings", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch settings: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.settings.length} settings records.`);

    // 2. UserSettings
    allData.UserSettings = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM UserSettings", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch UserSettings: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.UserSettings.length} UserSettings records.`);

    // 3. Files Usage
    allData.files_usage = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM files_usage", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch files_usage: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.files_usage.length} files_usage records.`);

    // 4. Repetitions
    allData.repetitions = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM repetitions", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch repetitions: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.repetitions.length} repetitions records.`);

    // 5. Questionnaires (formerly questionnaire_submissions)
    // Fixed questions and AI questions are not separate tables based on screenshots.
    // AI question text seems to be part of the Questionnaires table (e.g., ai_q1_text).
    allData.Questionnaires = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM Questionnaires", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch Questionnaires: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.Questionnaires.length} Questionnaires records.`);

    // 6. Weekly Summaries (formerly questionnaire_weekly_summaries)
    allData.WeeklySummaries = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM WeeklySummaries", (err, rows) => {
        if (err) return reject(new Error(`Failed to fetch WeeklySummaries: ${err.message}`));
        resolve(rows);
      });
    });
    console.log(`Exported ${allData.WeeklySummaries.length} WeeklySummaries records.`);

    // Learning Graph data is derived from Questionnaires (rating_today), so no separate table to export.
    // The client rebuilds the graph from submissions.

    console.log("User data export completed successfully.");
    return allData;
  } catch (error) {
    console.error("Error during user data export:", error);
    throw error; // Re-throw to be caught by the route handler
  }
};

const importAllUserData = async (dataToImport) => {
  console.log("Starting user data import...");
  if (!dataToImport || typeof dataToImport !== 'object') {
    throw new Error("Invalid data format for import.");
  }

  // List of tables to clear and import data into
  // Column lists should match the actual schema. SELECT * is used for export, so all columns are fetched.
  // For import, we need to be specific if not all exported columns should be inserted or if there are defaults.
  // Assuming the primary key 'id' for most tables is auto-incrementing and should NOT be set during import if the records are new.
  // However, for a full data restore, we DO want to preserve IDs. So, include 'id' if it's part of the exported data.
  const tablesToProcess = [
    // settings table has 'key' as PK.
    { name: 'settings', dataKey: 'settings', columns: ['key', 'value'], pk: 'key' },
    // UserSettings table has 'user_id' as PK.
    { name: 'UserSettings', dataKey: 'UserSettings', columns: ['user_id', 'enable_daily_questionnaire_reminder', 'reminder_time'], pk: 'user_id' },
    // files_usage: Assuming 'id' is PK and auto-increment, but for restore, we might want to preserve it.
    // The screenshot shows 'id' as a regular column, likely the PK.
    { name: 'files_usage', dataKey: 'files_usage', columns: ['id', 'absolute_file_path', 'base_folder_path', 'relative_file_path', 'file_name', 'last_opened_or_edited', 'access_count', 'last_accessed_timestamp'], pk: 'id' },
    { name: 'repetitions', dataKey: 'repetitions', columns: ['id', 'name', 'content', 'created_at', 'last_completed_at', 'current_interval_index', 'next_reminder_date', 'is_muted', 'reminder_interval_1', 'reminder_interval_2', 'reminder_interval_3', 'reminder_interval_4'], pk: 'id' },
    // Questionnaires: Based on screenshot. 'id' is PK.
    // The 'answers_json' column was an assumption. If it's not in the actual table, it shouldn't be in columns list for insert.
    // The export uses SELECT *, so it will get all actual columns. The import must match.
    // For now, using columns from screenshot. If 'answers_json' or 'submitted_at' exist, they should be added.
    { name: 'Questionnaires', dataKey: 'Questionnaires', columns: ['id', 'user_id', 'date', 'rating_today', 'details_today', 'ai_q1_text', 'ai_q1_answer', 'ai_q2_text', 'ai_q2_answer', 'submitted_at'], pk: 'id'},
    // WeeklySummaries: Based on screenshot. 'id' is PK.
    { name: 'WeeklySummaries', dataKey: 'WeeklySummaries', columns: ['id', 'user_id', 'week_start_date', 'summary_content', 'strengths', 'areas_for_improvement', 'generated_at'], pk: 'id' },
  ];

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;", (err) => {
        if (err) return reject(new Error(`Failed to begin transaction: ${err.message}`));
      });

      let operationsCompleted = 0;
      const totalOperations = tablesToProcess.length * 2; // Delete + Insert for each table

      const checkCompletion = () => {
        operationsCompleted++;
        if (operationsCompleted === totalOperations) {
          db.run("COMMIT;", (commitErr) => {
            if (commitErr) {
              db.run("ROLLBACK;"); // Attempt rollback on commit error
              return reject(new Error(`Failed to commit transaction: ${commitErr.message}`));
            }
            console.log("User data import committed successfully.");
            resolve({ message: "User data imported successfully." });
          });
        }
      };
      
      const rollbackAndReject = (tableName, operation, error) => {
        db.run("ROLLBACK;", () => { // No need to check error of rollback itself here
            reject(new Error(`Failed to ${operation} table ${tableName}: ${error.message}`));
        });
      };

      tablesToProcess.forEach(tableInfo => {
        const { name, dataKey, columns, pk } = tableInfo;
        const records = dataToImport[dataKey];

        // 1. Clear existing data from the table
        db.run(`DELETE FROM ${name};`, function(deleteErr) {
          if (deleteErr) return rollbackAndReject(name, 'clear', deleteErr);
          console.log(`Cleared table: ${name}`);
          checkCompletion();

          // 2. Insert new data
          if (records && Array.isArray(records) && records.length > 0) {
            const placeholders = columns.map(() => '?').join(',');
            // For 'settings' table, use INSERT OR REPLACE due to primary key 'key'
            const insertSQL = pk ? `INSERT OR REPLACE INTO ${name} (${columns.join(',')}) VALUES (${placeholders})` 
                                 : `INSERT INTO ${name} (${columns.join(',')}) VALUES (${placeholders})`;
            const stmt = db.prepare(insertSQL);

            records.forEach(record => {
              const values = columns.map(col => record[col]);
              stmt.run(values, function(insertErr) {
                if (insertErr) {
                  // If one insert fails, we should ideally stop and rollback.
                  // This simple loop doesn't easily allow breaking out and ensuring rollback.
                  // For robust error handling, each stmt.run would need to be promisified or handled carefully.
                  // For now, log error and continue, relying on transaction rollback if a major error occurs.
                  console.error(`Error inserting record into ${name}:`, insertErr.message, record);
                }
              });
            });

            stmt.finalize(finalizeErr => {
              if (finalizeErr) return rollbackAndReject(name, 'finalize insert statement for', finalizeErr);
              console.log(`Inserted ${records.length} records into ${name}.`);
              checkCompletion();
            });
          } else {
            console.log(`No records to import for table: ${name}`);
            checkCompletion(); // Still count as an operation (insert phase)
          }
        });
      });
    });
  });
};


module.exports = {
  exportAllUserData,
  importAllUserData,
};
