/**
 * ============================================================================
 * Star Rating Component (src/components/StarRating.jsx)
 * ============================================================================
 * Renders yellow star rating display for mentors and session reviews.
 * Displays "No reviews yet" when a mentor has no reviews, rather than inventing ratings.
 */

import React, { useState } from 'react';

const RATING_LABELS = {
  1: '1 — Poor',
  2: '2 — Fair',
  3: '3 — Good',
  4: '4 — Very Good',
  5: '5 — Excellent',
};

/**
 * StarRating component
 * @param {number} rating - Numerical rating score (e.g. 4.8).
 * @param {number|null} count - Total number of reviews (if 0, displays "No reviews yet").
 * @param {boolean} isInteractive - If true, stars can be clicked to set rating.
 * @param {function} onRatingChange - Callback function when a star is clicked.
 * @param {boolean} showScore - If true, renders the decimal score next to the stars.
 * @param {boolean} showLabel - If true on interactive mode, shows text label for the selected rating.
 */
export function StarRating({
  rating = 0,
  count = null,
  isInteractive = false,
  onRatingChange = null,
  showScore = true,
  showLabel = false,
}) {
  const [hoverValue, setHoverValue] = useState(0);

  // If not interactive and there are no reviews or rating is 0, show "No reviews yet"
  if (!isInteractive && (count === 0 || rating === 0 || rating === null || rating === undefined)) {
    return (
      <div className="star-rating" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <span
          className="star-rating-no-reviews"
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            fontWeight: '500',
          }}
        >
          No reviews yet
        </span>
      </div>
    );
  }

  const starValues = [1, 2, 3, 4, 5];
  const numRating = Math.min(5, Math.max(0, Number(rating) || 0));
  const activeRating = isInteractive && hoverValue > 0 ? hoverValue : Math.round(numRating);

  return (
    <div
      className="star-rating"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
      aria-label={`Rating: ${numRating.toFixed(1)} out of 5 stars`}
      onMouseLeave={() => isInteractive && setHoverValue(0)}
    >
      {starValues.map((value) => {
        const isFilled = value <= activeRating;
        return (
          <span
            key={value}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={isInteractive ? `Rate ${value} out of 5 stars` : undefined}
            onClick={() => isInteractive && onRatingChange && onRatingChange(value)}
            onMouseEnter={() => isInteractive && setHoverValue(value)}
            onKeyDown={(e) => {
              if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRatingChange && onRatingChange(value);
              }
            }}
            style={{
              cursor: isInteractive ? 'pointer' : 'default',
              userSelect: 'none',
              color: isFilled ? '#eab308' : 'rgba(148, 163, 184, 0.35)',
              fontSize: isInteractive ? '1.35rem' : '1rem',
              lineHeight: 1,
              transition: 'transform 0.1s ease, color 0.1s ease',
            }}
            className={`star-rating-icon ${isFilled ? 'filled' : 'empty'}`}
          >
            {isFilled ? '★' : '☆'}
          </span>
        );
      })}

      {showScore && !isInteractive && (
        <span
          className="star-rating-score"
          style={{
            fontSize: '0.82rem',
            fontWeight: '700',
            marginLeft: '0.35rem',
            color: 'var(--color-text-primary)',
          }}
        >
          {numRating.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1')}
          {typeof count === 'number' && count > 0 ? (
            <span style={{ fontWeight: '500', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
              ({count} {count === 1 ? 'review' : 'reviews'})
            </span>
          ) : null}
        </span>
      )}

      {isInteractive && showLabel && activeRating >= 1 && activeRating <= 5 && (
        <span
          style={{
            marginLeft: '0.5rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
          }}
        >
          {RATING_LABELS[activeRating]}
        </span>
      )}
    </div>
  );
}
