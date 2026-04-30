export const DB_SCHEMA = {
  // Users table
  createUsersTable: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      age INTEGER,
      gender TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Test results table for disease detection
  createTestResultsTable: `
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      test_type TEXT NOT NULL,
      image_path TEXT,
      prediction TEXT NOT NULL,
      confidence REAL NOT NULL,
      all_predictions TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `,

  // Color vision test results
  createColorVisionTestsTable: `
    CREATE TABLE IF NOT EXISTS color_vision_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      score REAL NOT NULL,
      result TEXT NOT NULL,
      test_duration INTEGER,
      answers TEXT,
      protan_score REAL DEFAULT 0,
      deutan_score REAL DEFAULT 0,
      tritan_score REAL DEFAULT 0,
      deficiency_type TEXT,
      severity TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `,

  // Images metadata table
  createImagesTable: `
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_result_id) REFERENCES test_results (id)
    );
  `,

  // Reports metadata table
  createReportsTable: `
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_result_id INTEGER,
      file_path TEXT NOT NULL,
      format TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_result_id) REFERENCES test_results (id)
    );
  `,
};

// Initial data
export const INITIAL_DATA = {
  insertDefaultUser: `
    INSERT OR IGNORE INTO users (id, name, age, gender)
    VALUES (1, 'Default User', 0, 'Not specified');
  `,
};
