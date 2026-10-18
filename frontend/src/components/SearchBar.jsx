/**
 * ============================================================================
 * SearchBar Component (src/components/SearchBar.jsx)
 * ============================================================================
 * Search input field with submit and clear buttons without decorative emojis.
 */

import React, { useState } from 'react';
import { SearchIcon, CloseIcon } from './Icons.jsx';

export function SearchBar({ initialValue = '', onSearch, placeholder = 'Search by skill (e.g. Python, React, Data Structures)...' }) {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  function handleSubmit(event) {
    event.preventDefault();
    if (onSearch) {
      onSearch(searchTerm.trim());
    }
  }

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
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear search"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      <button type="submit" className="btn btn-primary" style={{ gap: '0.5rem' }}>
        <SearchIcon size={18} />
        <span>Search</span>
      </button>
    </form>
  );
}
