/**
 * ============================================================================
 * SearchBar Component (src/components/SearchBar.jsx)
 * ============================================================================
 * Substantial, comfortable search composer inspired by modern composer proportions
 * (~58px height, rounded pill shape, inner vertically-centered icon, generous padding).
 * Aligns on a single clean row with the action button on desktop, wraps responsively.
 * Full contrast support for both Light Mode and Dark Mode.
 */

import React, { useState, useEffect } from 'react';
import { SearchIcon, CloseIcon } from './Icons.jsx';

export function SearchBar({
  initialValue = '',
  onSearch,
  onQueryChange,
  liveSearch = true,
  placeholder = 'Search by mentor name or skill (e.g. Alice, Python, Photography, Football)...',
}) {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  function handleChange(event) {
    const nextValue = event.target.value;
    setSearchTerm(nextValue);
    if (onQueryChange) {
      onQueryChange(nextValue);
    } else if (liveSearch && onSearch) {
      onSearch(nextValue);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (onSearch) {
      onSearch(searchTerm.trim());
    }
  }

  function handleClear() {
    setSearchTerm('');
    if (onQueryChange) {
      onQueryChange('');
    }
    if (onSearch) {
      onSearch('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="search-composer-form">
      <div className="search-composer-wrapper">
        {/* Left Search Icon inside field, centered vertically with typed text */}
        <span className="search-composer-icon">
          <SearchIcon size={20} />
        </span>

        {/* Substantial, comfortable composer input */}
        <input
          type="text"
          value={searchTerm}
          onChange={handleChange}
          placeholder={placeholder}
          className="search-composer-input"
          aria-label="Search mentors by name or skill"
        />

        {/* Clear Button */}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="search-composer-clear"
            title="Clear search input"
            aria-label="Clear search input"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-primary search-composer-btn"
      >
        <SearchIcon size={19} />
        <span>Find Mentors</span>
      </button>
    </form>
  );
}

export default SearchBar;
