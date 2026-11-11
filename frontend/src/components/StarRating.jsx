/**
 * ============================================================================
 * Star Rating Component (src/components/StarRating.jsx)
 * ============================================================================
 * Renders yellow star rating display for mentors and session reviews.
 * Displays "No reviews yet" when a mentor has no reviews, rather than inventing ratings.
 */

import React from 'react';

/**
 * StarRating component
 * @param {number} rating - Numerical rating score (e.g. 4.8).
 * @param {number|null} count - Total number of reviews (if 0 or null, displays "No reviews yet").
 * @param {boolean} isInteractive - If true, stars can be clicked to set rating.
 * @param {function} onRatingChange - Callback function when a star is clicked.
 * @param {boolean} showScore - If true, renders the decimal score next to the stars.
 */
export function StarRating({
  rating = 0,
  count = null,
  isInteractive = false,
  onRatingChange = null,
  showScore = true,
}) {
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
  const numRating = Number(rating) || 0;

  return (
    <div
      className="star-rating"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}
      aria-label={`Rating: ${numRating.toFixed(1)} out of 5 stars`}
    >
      {starValues.map((value) => {
        const isFilled = value <= Math.round(numRating);
        return (
          <span
            key={value}
            onClick={() => isInteractive && onRatingChange && onRatingChange(value)}
            style={{
              cursor: isInteractive ? 'pointer' : 'default',
              userSelect: 'none',
              color: isFilled ? '#eab308' : 'rgba(148, 163, 184, 0.35)',
              fontSize: '1rem',
              lineHeight: 1,
              transition: 'transform 0.1s ease',
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
          {numRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
