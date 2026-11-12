/**
 * ============================================================================
 * Mentor Search Page (src/pages/MentorSearch.jsx)
 * ============================================================================
 * Allows learners to search mentors live as they type by mentor name or skill
 * keyword (case-insensitively by substring), ranking exact name matches first,
 * then partial name matches, then skill matches.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchMentorsBySkill } from '../api/skills.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, ErrorState } from '../components/Feedback.jsx';
import { SearchIcon } from '../components/Icons.jsx';

const POPULAR_SKILLS = [
  'Python',
  'React',
  'Machine Learning',
  'Data Structures',
  'Photography',
  'Psychology',
  'Mathematics',
  'Football',
  'Web Design',
];

function rankMentorsForQuery(mentors, rawQuery) {
  const q = (rawQuery || '').trim().toLowerCase();
  if (!q || !Array.isArray(mentors)) return mentors || [];

  const getRank = (mentor) => {
    const name = (mentor.name || '').trim().toLowerCase();
    if (name === q) return 1; // Exact mentor name match
    if (name.startsWith(q)) return 2; // Mentor name prefix match
    if (name.includes(q)) return 3; // Mentor name substring match

    const skills = Array.isArray(mentor.skills) ? mentor.skills : [];
    const skillNames = skills.map((s) =>
      typeof s === 'string' ? s.trim().toLowerCase() : (s?.skill_name || s?.skillName || '').trim().toLowerCase()
    );
    if (skillNames.some((sn) => sn === q)) return 4; // Exact skill match
    if (skillNames.some((sn) => sn.includes(q))) return 5; // Partial skill match
    return 6;
  };

  return [...mentors].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    const repA = Number(a.reputationScore ?? a.reputation_score ?? 0);
    const repB = Number(b.reputationScore ?? b.reputation_score ?? 0);
    if (repB !== repA) return repB - repA;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function MentorSearch() {
  const [searchParams] = useSearchParams();
  const initialUrlQuery = searchParams.get('query') || '';
  const [searchQuery, setSearchQuery] = useState(initialUrlQuery);
  const [mentorList, setMentorList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchSuggestion, setSearchSuggestion] = useState(null);
  const [searchMessage, setSearchMessage] = useState(null);

  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchMentors = useCallback(async (query = '') => {
    const seq = ++requestSeqRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const trimmed = (query || '').trim();
      const response = await searchMentorsBySkill(trimmed, { signal: controller.signal });
      // Ignore stale responses if a newer query was issued
      if (seq !== requestSeqRef.current) return;

      const results = rankMentorsForQuery(response.mentors || [], trimmed);
      setMentorList(results);
      setSearchSuggestion(response.suggestion || null);
      setSearchMessage(response.message || null);
    } catch (error) {
      if (error.name === 'AbortError' || seq !== requestSeqRef.current) {
        return;
      }
      setErrorMessage(error.message || 'Failed to search mentors. Please try again.');
    } finally {
      if (seq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMentors(initialUrlQuery);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchMentors, initialUrlQuery]);

  // Live search as the user types (debounced to keep typing smooth while avoiding stale overwrites)
  function handleQueryChange(nextText) {
    setSearchQuery(nextText);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchMentors(nextText);
    }, 120);
  }

  // Immediate search on form submit or clear
  function handleSearch(term) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchQuery(term);
    fetchMentors(term);
  }

  function handleTagClick(skill) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchQuery(skill);
    fetchMentors(skill);
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Find Peer Mentors</h1>
        <p className="page-subtitle">
          Search by mentor name or skill keyword across technology, computer science, machine learning, mathematics, psychology, photography, sports, and arts.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SearchBar
          initialValue={searchQuery}
          onQueryChange={handleQueryChange}
          onSearch={handleSearch}
          placeholder="Search by mentor name or skill (e.g. Alice, Python, Photography, Football, Psychology)..."
        />
      </div>

      {/* Popular Skills Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
          Suggested Skills:
        </span>
        {POPULAR_SKILLS.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => handleTagClick(skill)}
            className={`chip ${searchQuery.trim().toLowerCase() === skill.toLowerCase() ? 'chip-active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            {skill}
          </button>
        ))}
      </div>

      {isLoading && <Loader message="Searching available mentors..." />}

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => fetchMentors(searchQuery)} />
      )}

      {!isLoading && !errorMessage && mentorList.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <SearchIcon size={36} style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            {searchSuggestion
              ? `Did you mean "${searchSuggestion}"?`
              : searchQuery.trim()
                ? `No mentors found matching "${searchQuery.trim()}"`
                : 'No mentors available'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.55, fontSize: '0.92rem' }}>
            {searchMessage || (searchQuery.trim()
              ? `No mentors currently match "${searchQuery.trim()}". You can request this skill in Course & Skill Requests so teachers know you want to learn it!`
              : 'Check back later or browse available subjects.')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {searchSuggestion && (
              <button
                type="button"
                onClick={() => handleSearch(searchSuggestion)}
                className="btn btn-primary btn-sm"
              >
                Search for &ldquo;{searchSuggestion}&rdquo;
              </button>
            )}
            {searchQuery.trim() && (
              <>
                <Link to="/requests" className="btn btn-primary btn-sm">
                  Request This Skill
                </Link>
                <button onClick={() => handleSearch('')} className="btn btn-secondary btn-sm">
                  View All Mentors
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && mentorList.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Showing {mentorList.length} {mentorList.length === 1 ? 'mentor' : 'mentors'}
              {searchQuery.trim() && ` matching "${searchQuery.trim()}"`}
            </span>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '3rem' }}>
            {mentorList.map((mentor) => (
              <ProfileCard key={mentor.id || mentor.userId} user={mentor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
