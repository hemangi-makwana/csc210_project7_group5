/**
 * ============================================================================
 * Mentor Search Page (src/pages/MentorSearch.jsx)
 * ============================================================================
 * Allows learners to search mentors by skill keyword with instant results,
 * category filter tags, and verified teacher badges. Free of emojis.
 */

import React, { useState, useEffect } from 'react';
import { searchMentorsBySkill } from '../api/skills.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, EmptyState, ErrorState } from '../components/Feedback.jsx';
import { SearchIcon, SkillsIcon } from '../components/Icons.jsx';

const POPULAR_SKILLS = ['Python', 'React', 'JavaScript', 'Machine Learning', 'Data Structures', 'Web Design'];

export function MentorSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mentorList, setMentorList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchSuggestion, setSearchSuggestion] = useState(null);
  const [searchMessage, setSearchMessage] = useState(null);

  async function fetchMentors(query = '') {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await searchMentorsBySkill(query);
      const results = response.mentors || [];
      setMentorList(results);
      setSearchSuggestion(response.suggestion || null);
      setSearchMessage(response.message || null);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to search mentors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchMentors('');
  }, []);

  function handleSearch(term) {
    setSearchQuery(term);
    fetchMentors(term);
  }

  function handleTagClick(skill) {
    setSearchQuery(skill);
    fetchMentors(skill);
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Find Peer Mentors</h1>
        <p className="page-subtitle">
          Search for students, professionals, and volunteers offering skills across technical and academic domains.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SearchBar
          initialValue={searchQuery}
          onSearch={handleSearch}
          placeholder="Search by skill name (e.g. Python, React, Data Structures)..."
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
            className={`chip ${searchQuery.toLowerCase() === skill.toLowerCase() ? 'chip-active' : ''}`}
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
              : searchQuery
                ? `No mentors found matching "${searchQuery}"`
                : 'No mentors available'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.55, fontSize: '0.92rem' }}>
            {searchMessage || (searchQuery
              ? `No mentors currently offer "${searchQuery}". Misspelled or unlisted course names are not automatically added to the catalog.`
              : 'Check back later or browse available subjects.')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {searchSuggestion && (
              <button
                type="button"
                onClick={() => handleSearch(searchSuggestion)}
                className="btn btn-primary btn-sm"
              >
                Search for "{searchSuggestion}"
              </button>
            )}
            {searchQuery && (
              <button onClick={() => handleSearch('')} className="btn btn-secondary btn-sm">
                View All Mentors
              </button>
            )}
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && mentorList.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Showing {mentorList.length} {mentorList.length === 1 ? 'mentor' : 'mentors'}
              {searchQuery && ` for "${searchQuery}"`}
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
