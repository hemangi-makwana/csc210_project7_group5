import React, { useState, useRef, useEffect } from 'react';

/**
 * Accessible custom dropdown select component with full keyboard navigation support:
 * - Enter / Space: Open menu or select highlighted option
 * - ArrowUp / ArrowDown: Move highlight through options
 * - Escape: Close menu
 * - Tab: Close menu and move focus
 * High contrast in both Learner mode (light) and Teacher mode (dark).
 */
export function CustomSelect({
  id,
  options = [],
  value,
  onChange,
  placeholder = '-- Select an option --',
  required = false,
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxRef = useRef(null);

  // Normalize options to { value, label, subtext }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value,
      label: opt.label || opt.name || opt.value,
      subtext: opt.subtext || opt.description || '',
    };
  });

  const selectedIndex = normalizedOptions.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : null;

  // Sync highlightedIndex when menu opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const items = listboxRef.current.querySelectorAll('[role="option"]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleTriggerClick() {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }

  function handleSelect(opt) {
    if (onChange) {
      onChange(opt.value);
    }
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
          handleSelect(normalizedOptions[highlightedIndex]);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < normalizedOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : normalizedOptions.length - 1
          );
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'Tab':
        setIsOpen(false);
        break;

      default:
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Hidden input for HTML form validation if required */}
      <input
        type="text"
        id={id}
        name={id}
        value={value || ''}
        required={required}
        readOnly
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          bottom: 0,
          left: '50%',
        }}
        tabIndex={-1}
      />

      {/* Trigger Button */}
      <button
        type="button"
        className="form-select custom-select-trigger"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id ? `${id}-label` : undefined}
        disabled={disabled}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: selectedOption ? 'inherit' : 'var(--color-text-muted)',
            fontWeight: selectedOption ? '500' : 'normal',
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            marginLeft: '0.5rem',
            opacity: 0.7,
          }}
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <ul
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
          className="custom-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            maxHeight: '260px',
            overflowY: 'auto',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '0.35rem 0',
            margin: 0,
            listStyle: 'none',
          }}
        >
          {normalizedOptions.length === 0 ? (
            <li
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              No options available
            </li>
          ) : (
            normalizedOptions.map((opt, index) => {
              const isSelected = opt.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={opt.value || index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`custom-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  style={{
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                    backgroundColor: isHighlighted
                      ? 'var(--color-bg-secondary)'
                      : isSelected
                      ? 'rgba(99, 102, 241, 0.12)'
                      : 'transparent',
                    color: isSelected
                      ? 'var(--color-primary)'
                      : 'var(--color-text-primary)',
                    fontWeight: isSelected ? '600' : 'normal',
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{opt.label}</span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  {opt.subtext && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {opt.subtext}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
