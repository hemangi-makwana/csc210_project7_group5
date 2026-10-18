-- ============================================================================
-- LOCAL SKILL EXCHANGE & COMMUNITY LEARNING PLATFORM
-- POSTGRESQL DATABASE SCHEMA
-- ============================================================================
-- Designed for local development with standard PostgreSQL.
-- Safe to execute repeatedly: uses "CREATE TABLE IF NOT EXISTS".
-- ============================================================================

-- 1. USERS & PROFILES
-- Stores user accounts, roles, bios, and reputation scores.
CREATE TABLE IF NOT EXISTS users (
  id               VARCHAR(64) PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) UNIQUE,
  password_hash    VARCHAR(255),
  role             VARCHAR(50) NOT NULL DEFAULT 'student'
                   CHECK (role IN ('student', 'professional', 'volunteer')),
  bio              TEXT,
  avatar_url       VARCHAR(500),
  username         VARCHAR(100) UNIQUE,
  profile_summary  TEXT,
  specialization_domain VARCHAR(255),
  work_experience  JSONB DEFAULT '[]'::jsonb,
  social_profiles  JSONB DEFAULT '{}'::jsonb,
  active_mode      VARCHAR(20) DEFAULT 'learner'
                   CHECK (active_mode IN ('learner', 'teacher')),
  can_teach        BOOLEAN DEFAULT TRUE,
  can_learn        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Additive column migrations for existing deployments (idempotent, non-destructive)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_summary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialization_domain VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_mode VARCHAR(20) DEFAULT 'learner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_teach BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_learn BOOLEAN DEFAULT TRUE;

-- 2. TEACHING & LEARNING SKILLS
-- Stores each skill associated with a user, categorized by proficiency
-- and classification ('teach' vs 'learn').
CREATE TABLE IF NOT EXISTS skills (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name  VARCHAR(100) NOT NULL,
  level       VARCHAR(50) NOT NULL DEFAULT 'beginner'
              CHECK (level IN ('beginner', 'intermediate', 'expert')),
  type        VARCHAR(20) NOT NULL DEFAULT 'teach'
              CHECK (type IN ('teach', 'learn')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT uq_user_skill_type UNIQUE (user_id, skill_name, type)
);

ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- 3. MENTOR LISTINGS
-- Dedicated directory entries for mentors with availability and rates.
CREATE TABLE IF NOT EXISTS mentor_listings (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline     VARCHAR(255),
  hourly_rate  NUMERIC(10, 2) DEFAULT 0.00,
  availability VARCHAR(255) DEFAULT 'Flexible / Weekends & Evenings',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SESSION BOOKING REQUESTS
-- Tracks mentorship booking requests through their lifecycle.
-- Handled chronologically by the backend FIFO Queue and persisted here.
CREATE TABLE IF NOT EXISTS session_bookings (
  id           VARCHAR(64) PRIMARY KEY,
  mentor_id    VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id   VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status       VARCHAR(50) NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued', 'pending', 'confirmed', 'completed', 'cancelled')),
  topic        VARCHAR(255),
  notes        TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. COURSE & WORKSHOP REQUESTS
-- Community requests for courses or skills that learners wish someone would teach.
CREATE TABLE IF NOT EXISTS course_requests (
  id           SERIAL PRIMARY KEY,
  requester_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  category     VARCHAR(100) NOT NULL,
  status       VARCHAR(50) NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'fulfilled', 'closed')),
  votes_count  INT DEFAULT 1,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. NOTIFICATIONS
-- In-app notifications for bookings, confirmations, reviews, and reminders.
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL DEFAULT 'general',
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  link       VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. REVIEWS & RATINGS
-- Post-session peer reviews and star ratings (1 to 5).
CREATE TABLE IF NOT EXISTS reviews (
  id          VARCHAR(64) PRIMARY KEY,
  session_id  VARCHAR(64) REFERENCES session_bookings(id) ON DELETE SET NULL,
  reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id   VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TEACHER VERIFICATION QUIZ ATTEMPTS
-- Tracks skill verification quiz sessions, scores, and outcomes.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           SERIAL PRIMARY KEY,
  user_id      VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name   VARCHAR(100) NOT NULL,
  score        INT NOT NULL,
  total        INT NOT NULL DEFAULT 10,
  percentage   NUMERIC(5, 2) NOT NULL,
  passed       BOOLEAN NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_skills_lookup ON skills (LOWER(skill_name), type);
CREATE INDEX IF NOT EXISTS idx_skills_user ON skills (user_id);
CREATE INDEX IF NOT EXISTS idx_skills_verified ON skills (user_id, is_verified);
CREATE INDEX IF NOT EXISTS idx_mentor_listings_active ON mentor_listings (is_active);
CREATE INDEX IF NOT EXISTS idx_session_bookings_mentor ON session_bookings (mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_bookings_learner ON session_bookings (learner_id);
CREATE INDEX IF NOT EXISTS idx_session_bookings_status ON session_bookings (status);
CREATE INDEX IF NOT EXISTS idx_reviews_mentor ON reviews (mentor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests (status);
CREATE INDEX IF NOT EXISTS idx_course_requests_title ON course_requests (LOWER(title), status);
CREATE INDEX IF NOT EXISTS idx_course_requests_requester ON course_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_skill ON quiz_attempts (user_id, LOWER(skill_name));
