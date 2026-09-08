/**
 * ============================================================================
 * Star Rating Component (src/components/StarRating.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Renders a 5-star visual rating display for mentors and session reviews.
 * - Supports both read-only display mode and interactive selection mode.
 *
 * HOW IT WORKS:
 * - Maps through an array [1, 2, 3, 4, 5].
 * - Renders a filled gold star (★) if the star value <= rating score,
 *   otherwise renders a gray star (☆).
 */

import React from 'react';

/**
 * StarRating component
 * @param {number} rating - Current numerical rating score (e.g., 4.8 or 5).
 * @param {boolean} isInteractive - If true, stars can be clicked to set rating.
 * @param {function} onRatingChange - Callback function when a star is clicked.
 * @param {boolean} showScore - If true, renders the decimal score next to the stars.
 */
export function StarRating({ rating = 0, isInteractive = false, onRatingChange = null, showScore = true }) {
  const starValues = [1, 2, 3, 4, 5];

  /**
   * Handles clicking on a star when in interactive review mode.
   */
  function handleStarClick(value) {
    if (isInteractive && onRatingChange) {
      onRatingChange(value);
    }
  }

  return (
    <div className="star-rating" aria-label={`Rating: ${rating} out of 5 stars`}>
      {starValues.map(value => {
        // Star is filled if its index is less than or equal to the rounded rating
        const isFilled = value <= Math.round(rating);

        return (
          <span
            key={value}
            onClick={() => handleStarClick(value)}
            style={{
              cursor: isInteractive ? 'pointer' : 'default',
              userSelect: 'none',
              transition: 'transform 0.1s',
            }}
            className={`star-rating-icon ${isFilled ? '' : 'empty'}`}
          >
            {isFilled ? '★' : '☆'}
          </span>
        );
      })}

      {showScore && !isInteractive && (
        <span className="star-rating-score">
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}
