/**
 * ============================================================================
 * Mentor Search Page (src/pages/MentorSearch.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Allows users to search for peer mentors by skill keywords (e.g. Python, React).
 * - Queries the backend skill search API endpoint.
 * - Renders a grid of matching mentors using the ProfileCard component.
 * - Handles loading, empty results, error states, and demo mock banners.
 *
 * BACKEND DSA CONNECTION:
 * - This page calls GET /api/skills/search?query=..., which uses the backend
 *   Hash Table Skill Index for instantaneous O(1) average lookup.
 */

import React, { useState, useEffect } from 'react';
import { searchMentorsBySkill } from '../api/skills.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, EmptyState, ErrorState, DemoBanner } from '../components/Feedback.jsx';

export function MentorSearch() {
  // State variables for search query, results list, loading status, errors, and demo flag
  const [searchQuery, setSearchQuery] = useState('');
  const [mentorList, setMentorList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  /**
   * Fetches mentors matching the provided search keyword.
   * If query is empty, fetches all available mentors.
   * 
   * @param {string} query - The search term
   */
  async function fetchMentors(query = '') {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await searchMentorsBySkill(query);

      // Extract mentors array and detect if demo mock data was served
      const results = response.mentors || [];
      setMentorList(results);
      setIsDemo(!!response.isMock);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to search mentors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Fetch initial mentor list on page load.
   */
  useEffect(() => {
    fetchMentors('');
  }, []);

  /**
   * Triggered when the user submits a search from the SearchBar component.
   */
  function handleSearch(term) {
    setSearchQuery(term);
    fetchMentors(term);
  }

  return (
    <div className="page">
      {/* Demo Banner: Displays if API fell back to local mock data */}
      <DemoBanner isDemo={isDemo} />

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">🔍 Search Peer Mentors</h1>
        <p className="page-subtitle">
          Find students, professionals, and volunteers ready to teach skills in your community.
        </p>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <SearchBar
          initialValue={searchQuery}
          onSearch={handleSearch}
          placeholder="Search by skill (e.g. Python, React, Machine Learning, Data Structures)..."
        />
      </div>

      {/* DSA Technical Context Note */}
      <div style={{
        backgroundColor: 'var(--color-primary-light)',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--border-radius-sm)',
        padding: '0.65rem 1rem',
        fontSize: '0.85rem',
        color: '#1e40af',
        marginBottom: '1.5rem'
      }}>
        💡 <strong>DSA in Action:</strong> Querying mentors uses a backend <strong>Hash Table Index</strong> mapping skill tokens to user profile sets for $O(1)$ average lookup time.
      </div>

      {/* State Render: Loading Spinner */}
      {isLoading && <Loader message="Searching mentor skill index..." />}

      {/* State Render: Error Message */}
      {errorMessage && !isLoading && (
        <ErrorState
          message={errorMessage}
          onRetry={() => fetchMentors(searchQuery)}
        />
      )}

      {/* State Render: Empty Results */}
      {!isLoading && !errorMessage && mentorList.length === 0 && (
        <EmptyState
          title={`No mentors found matching "${searchQuery}"`}
          description="Try searching for another skill or clearing your search to view all mentors."
          actionButton={
            <button onClick={() => handleSearch('')} className="btn btn-sm btn-outline">
              Clear Search & Show All
            </button>
          }
        />
      )}

      {/* State Render: Mentors Grid */}
      {!isLoading && !errorMessage && mentorList.length > 0 && (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Found <strong>{mentorList.length}</strong> available mentor{mentorList.length === 1 ? '' : 's'}:
          </p>

          <div className="grid grid-cols-2">
            {mentorList.map((item, index) => {
              // item can be either a user object or { user, skills, score }
              const userObj = item.user || item;
              return (
                <ProfileCard
                  key={userObj.id || index}
                  user={userObj}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
