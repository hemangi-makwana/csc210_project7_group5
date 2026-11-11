/**
 * ============================================================================
 * Available Courses Page (src/pages/AvailableCourses.jsx)
 * ============================================================================
 * Dedicated full-page catalog of database-backed courses from canonical skill_catalog
 * that have active, approved (verified) teachers in PostgreSQL.
 *
 * Features:
 * - Real-time keyword search across titles and descriptions.
 * - Category filtering across canonical domains.
 * - Approved teacher badges with level and Bayesian reputation scores.
 * - Direct 1-click booking integration with pre-selected mentor and topic.
 * - Clear empty state linking to Course Requests when no teacher currently covers a topic.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getAvailableCourses } from '../api/sessions.js';
import {
  SkillsIcon,
  SearchIcon,
  ChevronRightIcon,
  RequestIcon,
  SparklesIcon,
  CalendarIcon,
  VerifiedBadgeIcon,
  CloseIcon,
} from '../components/Icons.jsx';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'SE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AvailableCourses() {
  const { isTeacher } = useAuth();
  const [courses, setCourses] = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchSuggestion, setSearchSuggestion] = useState(null);
  const [searchMessage, setSearchMessage] = useState(null);
  const [selectedTeacherMap, setSelectedTeacherMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getAvailableCourses(category, search);
        if (isMounted && res) {
          setCourses(Array.isArray(res.courses) ? res.courses : []);
          setSearchSuggestion(res.suggestion || null);
          setSearchMessage(res.message || null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load available courses.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchCourses();
    return () => {
      isMounted = false;
    };
  }, [category, search]);

  const categories = [
    'Programming & Software',
    'Data Science & AI',
    'Cloud & DevOps',
    'UI/UX & Design',
    'Productivity & Analytics',
    'Academics & Mathematics',
    'Languages & Communication',
    'Arts & Creative',
    'Social Sciences & Psychology',
    'Sports & Athletics',
  ];

  return (
    <div className="page">
      {/* Header Banner */}
      <section className="greeting-card">
        <div className="greeting-avatar" style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
          <SkillsIcon size={26} />
        </div>
        <div>
          <h1 className="greeting-title">Available Courses</h1>
          <p className="greeting-subtitle">
            Browse available courses from the canonical catalog led by verified, approved peer mentors.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="courses-search-bar">
          <div className="courses-search-wrapper">
            <span className="courses-search-icon">
              <SearchIcon size={20} />
            </span>
            <input
              type="text"
              className="courses-search-input"
              placeholder="Search course title or topic description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search available courses"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="search-composer-clear"
                title="Clear search input"
                aria-label="Clear search input"
              >
                <CloseIcon size={18} />
              </button>
            )}
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <select
              className="courses-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by course category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {(category || search) && (
            <button
              onClick={() => {
                setCategory('');
                setSearch('');
              }}
              className="btn btn-outline courses-reset-btn"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
          <span>
            Showing <strong>{courses.length}</strong> active course{courses.length === 1 ? '' : 's'} with verified teachers
          </span>
          <Link to="/requests" style={{ color: 'var(--color-primary)', fontWeight: '500', textDecoration: 'none' }}>
            Cannot find a course? Post a request →
          </Link>
        </div>
      </section>

      {/* Courses Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-muted)' }}>
          <p>Loading available courses...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-sm btn-outline">
            Retry
          </button>
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '3rem' }}>
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                    {course.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary-soft)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {course.category}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                  {course.description || 'Comprehensive peer-led course offering verified curriculum and structured 1:1 mentorship.'}
                </p>
              </div>

              <div>
                {/* Approved Teachers List with Selection */}
                {(() => {
                  const teacherList = course.teachers || [];
                  const activeTeacher = selectedTeacherMap[course.id] || teacherList[0] || null;

                  return (
                    <>
                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <VerifiedBadgeIcon size={14} style={{ color: 'var(--color-emerald)' }} />
                            <span>Approved Teachers ({course.teacher_count || teacherList.length || 1})</span>
                          </div>
                          {teacherList.length > 1 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              Click teacher to choose
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {teacherList.map((teacher) => {
                            const isSelected = activeTeacher && activeTeacher.id === teacher.id;
                            return (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => setSelectedTeacherMap((prev) => ({ ...prev, [course.id]: teacher }))}
                                title={teacher.bio ? `${teacher.name}: ${teacher.bio}` : `Select ${teacher.name}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isSelected ? 'var(--color-primary-soft)' : 'var(--color-bg-secondary)',
                                  border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  textAlign: 'left',
                                }}
                              >
                                <div
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-border-strong, #64748b)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: '700',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                  }}
                                >
                                  {teacher.avatar_url ? (
                                    <img
                                      src={teacher.avatar_url}
                                      alt={teacher.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ) : (
                                    getInitials(teacher.name)
                                  )}
                                </div>
                                <span style={{ fontWeight: isSelected ? '700' : '600', color: 'var(--color-text-primary)' }}>
                                  {teacher.name}
                                </span>
                                <span style={{ color: '#eab308', fontSize: '0.82rem', fontWeight: '700' }}>
                                  ★ {Number(teacher.reputation_score || 5.0).toFixed(1)}
                                </span>
                                {isSelected && (
                                  <span style={{ color: 'var(--color-primary)', fontWeight: '800', fontSize: '0.85rem' }}>
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {activeTeacher && activeTeacher.bio && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                            "{activeTeacher.bio.length > 100 ? `${activeTeacher.bio.slice(0, 100)}...` : activeTeacher.bio}"
                          </p>
                        )}
                      </div>

                      {/* Booking Button: Learner mode only (hidden in Teacher mode) */}
                      {!isTeacher && activeTeacher && (
                        <Link
                          to={`/booking?skill=${encodeURIComponent(course.name)}&mentorId=${activeTeacher.id}&mentorName=${encodeURIComponent(activeTeacher.name)}`}
                          className="btn btn-primary"
                          style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <CalendarIcon size={16} />
                          <span>
                            Book 1:1 Session {teacherList.length > 1 ? `with ${activeTeacher.name.split(' ')[0]}` : ''}
                          </span>
                          <ChevronRightIcon size={15} />
                        </Link>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State with Spelling Suggestions & Catalog Diagnostics */
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <RequestIcon size={36} style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            {searchSuggestion ? `Did you mean "${searchSuggestion}"?` : 'No Matching Courses Found'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.55, fontSize: '0.92rem' }}>
            {searchMessage || (search
              ? `No active courses matched "${search}". Misspelled or unlisted course names are not automatically added to the catalog.`
              : 'No verified teachers currently match your selected filter criteria.')}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {searchSuggestion && (
              <button
                type="button"
                onClick={() => setSearch(searchSuggestion)}
                className="btn btn-primary"
                style={{ gap: '0.35rem' }}
              >
                <SearchIcon size={16} />
                <span>Search for "{searchSuggestion}"</span>
              </button>
            )}
            <Link
              to={searchSuggestion ? `/requests?prefill=${encodeURIComponent(searchSuggestion)}` : '/requests'}
              className="btn btn-secondary"
              style={{ gap: '0.4rem' }}
            >
              <RequestIcon size={16} />
              <span>Post a Course Request</span>
            </Link>
            {(search || category) && (
              <button
                type="button"
                onClick={() => {
                  setCategory('');
                  setSearch('');
                  setSearchSuggestion(null);
                  setSearchMessage(null);
                }}
                className="btn btn-outline"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
