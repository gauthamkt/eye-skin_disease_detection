import SQLite from 'react-native-sqlite-storage';
import { DB_CONFIG } from '../../utils/constants';
import { DB_SCHEMA, INITIAL_DATA } from './schema';

// Enable promise-based API
SQLite.enablePromise(true);

class DatabaseService {
    constructor() {
        this.db = null;
    }

    // Initialize database
    async init() {
        try {
            this.db = await SQLite.openDatabase({
                name: DB_CONFIG.name,
                location: DB_CONFIG.location,
            });

            console.log('Database opened successfully');
            await this.createTables();
            await this.insertInitialData();
            return true;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    // Create all tables
    async createTables() {
        try {
            await this.db.executeSql(DB_SCHEMA.createUsersTable);
            await this.db.executeSql(DB_SCHEMA.createTestResultsTable);
            await this.db.executeSql(DB_SCHEMA.createColorVisionTestsTable);
            await this.db.executeSql(DB_SCHEMA.createImagesTable);
            await this.db.executeSql(DB_SCHEMA.createReportsTable);

            // Migration: Attempt to add new columns if they don't exist
            // This is a simple migration strategy for dev environment
            const migrationQueries = [
                'ALTER TABLE color_vision_tests ADD COLUMN protan_score REAL DEFAULT 0',
                'ALTER TABLE color_vision_tests ADD COLUMN deutan_score REAL DEFAULT 0',
                'ALTER TABLE color_vision_tests ADD COLUMN tritan_score REAL DEFAULT 0',
                'ALTER TABLE color_vision_tests ADD COLUMN deficiency_type TEXT',
                'ALTER TABLE color_vision_tests ADD COLUMN severity TEXT'
            ];

            for (const query of migrationQueries) {
                try {
                    await this.db.executeSql(query);
                } catch (e) {
                    // Ignore error if column already exists
                    // console.log('Column likely exists or migration failed:', e.message);
                }
            }

            console.log('All tables created and migrated successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    // Insert initial data
    async insertInitialData() {
        try {
            await this.db.executeSql(INITIAL_DATA.insertDefaultUser);
        } catch (error) {
            console.error('Error inserting initial data:', error);
        }
    }

    // Save test result
    async saveTestResult(testData) {
        try {
            const { userId = 1, testType, imagePath, prediction, confidence, allPredictions, notes } = testData;

            const query = `
        INSERT INTO test_results (user_id, test_type, image_path, prediction, confidence, all_predictions, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

            const result = await this.db.executeSql(query, [
                userId,
                testType,
                imagePath,
                prediction,
                confidence,
                JSON.stringify(allPredictions),
                notes || '',
            ]);

            return result[0].insertId;
        } catch (error) {
            console.error('Error saving test result:', error);
            throw error;
        }
    }

    // Save color vision test result
    async saveColorVisionTest(testData) {
        try {
            const {
                userId = 1,
                totalQuestions,
                correctAnswers,
                score,
                result,
                testDuration,
                answers,
                protanScore = 0,
                deutanScore = 0,
                tritanScore = 0,
                deficiencyType = null,
                severity = null
            } = testData;

            const query = `
        INSERT INTO color_vision_tests (
            user_id, total_questions, correct_answers, score, result, test_duration, answers,
            protan_score, deutan_score, tritan_score, deficiency_type, severity
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

            const dbResult = await this.db.executeSql(query, [
                userId,
                totalQuestions,
                correctAnswers,
                score,
                result,
                testDuration,
                JSON.stringify(answers),
                protanScore,
                deutanScore,
                tritanScore,
                deficiencyType,
                severity
            ]);

            return dbResult[0].insertId;
        } catch (error) {
            console.error('Error saving color vision test:', error);
            throw error;
        }
    }

    // Get all test results
    async getAllTestResults(testType = null) {
        try {
            let query = 'SELECT * FROM test_results';
            const params = [];

            if (testType) {
                query += ' WHERE test_type = ?';
                params.push(testType);
            }

            query += ' ORDER BY created_at DESC';

            const results = await this.db.executeSql(query, params);
            const items = [];

            for (let i = 0; i < results[0].rows.length; i++) {
                const row = results[0].rows.item(i);
                items.push({
                    ...row,
                    all_predictions: JSON.parse(row.all_predictions),
                });
            }

            return items;
        } catch (error) {
            console.error('Error getting test results:', error);
            throw error;
        }
    }

    // Get all color vision tests
    async getAllColorVisionTests() {
        try {
            const query = 'SELECT * FROM color_vision_tests ORDER BY created_at DESC';
            const results = await this.db.executeSql(query);
            const items = [];

            for (let i = 0; i < results[0].rows.length; i++) {
                const row = results[0].rows.item(i);
                items.push({
                    ...row,
                    answers: JSON.parse(row.answers),
                });
            }

            return items;
        } catch (error) {
            console.error('Error getting color vision tests:', error);
            throw error;
        }
    }

    // Get test result by ID
    async getTestResultById(id) {
        try {
            const query = 'SELECT * FROM test_results WHERE id = ?';
            const results = await this.db.executeSql(query, [id]);

            if (results[0].rows.length > 0) {
                const row = results[0].rows.item(0);
                return {
                    ...row,
                    all_predictions: JSON.parse(row.all_predictions),
                };
            }

            return null;
        } catch (error) {
            console.error('Error getting test result by ID:', error);
            throw error;
        }
    }

    // Delete test result
    async deleteTestResult(id) {
        try {
            const query = 'DELETE FROM test_results WHERE id = ?';
            await this.db.executeSql(query, [id]);
            return true;
        } catch (error) {
            console.error('Error deleting test result:', error);
            throw error;
        }
    }

    // Delete color vision test
    async deleteColorVisionTest(id) {
        try {
            const query = 'DELETE FROM color_vision_tests WHERE id = ?';
            await this.db.executeSql(query, [id]);
            return true;
        } catch (error) {
            console.error('Error deleting color vision test:', error);
            throw error;
        }
    }

    // Clear all test history
    async clearAllHistory() {
        try {
            await this.db.executeSql('DELETE FROM test_results');
            await this.db.executeSql('DELETE FROM color_vision_tests');
            return true;
        } catch (error) {
            console.error('Error clearing all history:', error);
            throw error;
        }
    }

    // Close database
    async close() {
        if (this.db) {
            await this.db.close();
            console.log('Database closed');
        }
    }
}

// Export singleton instance
export default new DatabaseService();
