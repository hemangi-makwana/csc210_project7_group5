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

  async function fetchMentors(query = '') {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await searchMentorsBySkill(query);
      const results = response.mentors || [];
      setMentorList(results);
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
            className="chip"
            style={{
              cursor: 'pointer',
              backgroundColor: searchQuery.toLowerCase() === skill.toLowerCase() ? 'rgba(79, 70, 229, 0.25)' : 'var(--color-surface)',
              borderColor: searchQuery.toLowerCase() === skill.toLowerCase() ? 'var(--color-primary)' : 'var(--color-border)',
              color: searchQuery.toLowerCase() === skill.toLowerCase() ? '#ffffff' : 'var(--color-text-secondary)',
            }}
          >
            {skill}
          </button>
        ))}
      </div>

      {/* Technical Note */}
      <div style={{
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        border: '1px solid rgba(79, 70, 229, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1.25rem',
        fontSize: '0.85rem',
        color: '#a5b4fc',
        marginBottom: '2rem',
      }}>
        <strong>Search Index:</strong> Queries are executed through an indexed skill directory for fast, accurate keyword matching.
      </div>

      {isLoading && <Loader message="Searching available mentors..." />}

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={() => fetchMentors(searchQuery)} />
      )}

      {!isLoading && !errorMessage && mentorList.length === 0 && (
        <EmptyState
          icon={<SearchIcon size={36} />}
          title={`No mentors found matching "${searchQuery}"`}
          description="Try searching for another skill, or submit a Course Request so mentors can see what you want to learn."
          actionButton={
            <button onClick={() => handleSearch('')} className="btn btn-secondary btn-sm">
              View All Mentors
            </button>
          }
        />
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
