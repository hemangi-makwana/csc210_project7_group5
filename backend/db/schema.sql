-- ============================================================================
-- SKILL EXCHANGE PLATFORM — DATABASE SCHEMA (PostgreSQL)
-- ============================================================================
-- This file is the blueprint of every table in our database.
-- Run it with:  node db/setup.js   (from the backend folder)
--
-- "IF NOT EXISTS" makes the file safe to run more than once: tables that
-- already exist are left untouched instead of causing an error.
--
-- Tables are created in dependency order: a table can only reference
-- (via a FOREIGN KEY) a table that has already been created above it.
--
-- ON DELETE CASCADE: if the parent row is deleted (e.g. a user deletes their
-- account), the rows that depend on it are deleted automatically, so no
-- "orphan" rows are left pointing at a user who no longer exists.
-- ============================================================================


-- 1. USERS — one row per registered person (profile fields live here too,
--    because each user has exactly one profile).
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,               -- auto-numbered 1, 2, 3...
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,             -- no duplicate accounts
  password_hash TEXT NOT NULL,                    -- bcrypt hash, never the real password
  bio           TEXT,
  avatar_url    TEXT,
  banner_url    TEXT,                             -- profile banner image
  theme         TEXT NOT NULL DEFAULT 'dark'
                CHECK (theme IN ('dark', 'light')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 2. CATEGORIES — groups of skills, e.g. "Programming", "Music".
CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT                                       -- icon name shown in the UI
);


-- 3. SKILLS — one row per skill. Each skill belongs to one category
--    (one category -> many skills: a ONE-TO-MANY relationship).
CREATE TABLE IF NOT EXISTS skills (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE
);


-- 4. USER_SKILLS — junction table for the MANY-TO-MANY link between users
--    and skills. "User X teaches / wants to learn skill Y at level Z."
--    type = 'teach' feeds the Teaching panel, 'learn' feeds the Learning panel.
CREATE TABLE IF NOT EXISTS user_skills (
  user_id     INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  skill_id    INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('teach', 'learn')),
  level       TEXT NOT NULL DEFAULT 'beginner'
              CHECK (level IN ('beginner', 'intermediate', 'expert')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = passed quiz, shows badge
  -- A user can list the same skill once to teach and once to learn, never twice.
  PRIMARY KEY (user_id, skill_id, type)
);


-- 5. QUIZ_ATTEMPTS — each attempt at the teacher-verification quiz.
--    Passing sets user_skills.is_verified = TRUE for that skill.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  skill_id     INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL CHECK (score >= 0),
  passed       BOOLEAN NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 6. CONNECTIONS — "User A connected with User B".
--    Users are the NODES of our Graph; accepted connections are its EDGES.
CREATE TABLE IF NOT EXISTS connections (
  id           SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (requester_id <> receiver_id),            -- cannot connect to yourself
  UNIQUE (requester_id, receiver_id)              -- no duplicate requests
);


-- 7. SESSIONS — one booked learning session between a mentor and a learner.
CREATE TABLE IF NOT EXISTS sessions (
  id           SERIAL PRIMARY KEY,
  mentor_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  learner_id   INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  skill_id     INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  status       TEXT NOT NULL DEFAULT 'requested'
               CHECK (status IN ('requested', 'accepted', 'completed', 'cancelled')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (mentor_id <> learner_id)                 -- cannot book yourself
);


-- 8. REVIEWS — a 1–5 star rating for a session.
--    UNIQUE session_id = only one review per session (no rating spam).
--    A mentor's reputation = AVG(rating) of their reviews (feeds the Heap).
CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 9. COURSE_REQUESTS — a learner asks for a course nobody teaches yet.
CREATE TABLE IF NOT EXISTS course_requests (
  id           SERIAL PRIMARY KEY,
  requested_by INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  skill_id     INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'fulfilled')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);


-- 10. NOTIFICATIONS — one message for one user (feeds the bell icon).
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                       -- e.g. 'connection_request'
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
