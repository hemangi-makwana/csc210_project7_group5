/**
 * ============================================================================
 * SearchBar Component (src/components/SearchBar.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides a search input field with submit and clear buttons.
 * - Used in MentorSearch to query mentors by skill keyword.
 *
 * PROPS:
 * - initialValue: String to pre-populate in the input.
 * - onSearch: Function called with the query string when user submits search.
 * - placeholder: Placeholder text for the input box.
 */

import React, { useState } from 'react';

export function SearchBar({ initialValue = '', onSearch, placeholder = 'Search by skill (e.g. Python, React, Machine Learning)...' }) {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  /**
   * Handles form submission when user clicks Search or presses Enter.
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (onSearch) {
      onSearch(searchTerm.trim());
    }
  }

  /**
   * Clears search input and notifies parent component.
   */
  function handleClear() {
    setSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          type="text"
          className="form-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: searchTerm ? '2.5rem' : '1rem' }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.1rem',
            }}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <button type="submit" className="btn btn-primary">
        🔍 Search
      </button>
    </form>
  );
}
