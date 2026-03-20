export const APP_DB_NAME = 'lexicon.db';
export const APP_DB_VERSION = 3;
export const WORDS_SEED_VERSION = 1;

const schemaV1Sql = `
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY,
  english TEXT NOT NULL,
  turkish TEXT NOT NULL,
  sentence1 TEXT,
  sentence2 TEXT,
  sentence3 TEXT,
  sentence4 TEXT,
  sentence5 TEXT,
  normalized_english TEXT NOT NULL,
  normalized_turkish TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_progress (
  word_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new',
  mastery_level INTEGER NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  seen_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  last_reviewed_at TEXT,
  next_due_at TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_suspended INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  new_items INTEGER NOT NULL DEFAULT 0,
  review_items INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS session_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  prompt_type TEXT NOT NULL,
  selected_sentence_index INTEGER,
  result_rating TEXT,
  answered_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  reviewed_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  studied_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_words_english ON words(normalized_english);
CREATE INDEX IF NOT EXISTS idx_words_turkish ON words(normalized_turkish);
CREATE INDEX IF NOT EXISTS idx_progress_next_due_at ON word_progress(next_due_at);
CREATE INDEX IF NOT EXISTS idx_progress_status ON word_progress(status);
CREATE INDEX IF NOT EXISTS idx_session_items_session_id ON session_items(session_id);
`;

const schemaV2Sql = `
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_session_items_session_order ON session_items(session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_progress_favorite ON word_progress(is_favorite);
CREATE INDEX IF NOT EXISTS idx_progress_suspended ON word_progress(is_suspended);
`;

const schemaV3Sql = `
CREATE TABLE IF NOT EXISTS session_quiz_items (
  session_id TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  user_answer TEXT,
  normalized_answer TEXT,
  is_correct INTEGER,
  duration_ms INTEGER,
  answered_at TEXT,
  PRIMARY KEY (session_id, word_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_quiz_items_session_order
  ON session_quiz_items(session_id, order_index);
`;

export const migrationDefinitions = [
  {
    version: 1,
    statements: [schemaV1Sql],
  },
  {
    version: 2,
    statements: [schemaV2Sql],
  },
  {
    version: 3,
    statements: [schemaV3Sql],
  },
] as const;
