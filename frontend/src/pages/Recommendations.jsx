/**
 * ============================================================================
 * Recommendations Feed Page (src/pages/Recommendations.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Fetches personalized mentor recommendations for the currently logged-in user.
 * - Replaces any hardcoded placeholder with the real user.id from AuthContext.
 * - Displays ranked mentor recommendations along with match scores and reasoning.
 *
 * BACKEND DSA CONNECTION:
 * - Calls GET /api/recommendations/:userId, which queries the backend
 *   Max-Heap / Priority Queue to extract the top-k mentors sorted by a
 *   composite score (skill match + reputation rating + graph network proximity).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRecommendations } from '../api/recommendations.js';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, EmptyState, ErrorState, DemoBanner } from '../components/Feedback.jsx';

export function Recommendations() {
  // Access the real logged-in user from AuthContext
  const { user, isAuthenticated } = useAuth();

  // Component state
  const [recommendationList, setRecommendationList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  /**
   * Fetches personalized recommendations for the active user ID.
   * If the user is not logged in, uses a default demo ID or prompts login.
   */
  async function fetchRecommendations() {
    // Determine the user ID to pass to the recommendation engine
    const activeUserId = user ? user.id : 'usr_002';

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getRecommendations(activeUserId);

      const items = response.recommendations || [];
      setRecommendationList(items);
      setIsDemo(!!response.isMock);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load recommendations.');
    } finally {
      setIsLoading(false);
    }
  }

  // Load recommendations whenever the logged-in user changes or on component mount
  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  return (
    <div className="page">
      {/* Demo Banner: Displays if API fell back to mock data */}
      <DemoBanner isDemo={isDemo} />

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">🎯 Personalized Mentor Recommendations</h1>
        <p className="page-subtitle">
          Algorithmic mentor suggestions tailored to your learning goals and network proximity.
        </p>
      </div>

      {/* DSA Explanation Banner */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 'var(--border-radius-sm)',
        padding: '0.75rem 1rem',
        fontSize: '0.88rem',
        color: '#92400e',
        marginBottom: '1.5rem'
      }}>
        🏆 <strong>DSA in Action:</strong> This feed is powered by a backend <strong>Max-Heap (Priority Queue)</strong>. Candidate mentors are inserted into the heap with composite weights (skill overlap + reputation score + graph distance), allowing optimal $O(k \log n)$ extraction of the top-$k$ recommendations.
      </div>

      {/* Guest Notice if not logged in */}
      {!isAuthenticated && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <span>
            ℹ️ You are viewing recommendations as a guest. <Link to="/login" style={{ fontWeight: '600', textDecoration: 'underline' }}>Log in</Link> to receive suggestions tailored to your specific profile.
          </span>
        </div>
      )}

      {/* State Render: Loading Spinner */}
      {isLoading && <Loader message="Running Max-Heap recommendation scoring algorithm..." />}

      {/* State Render: Error Message */}
      {errorMessage && !isLoading && (
        <ErrorState
          message={errorMessage}
          onRetry={fetchRecommendations}
        />
      )}

      {/* State Render: Empty Results */}
      {!isLoading && !errorMessage && recommendationList.length === 0 && (
        <EmptyState
          icon="🎯"
          title="No recommendations found yet"
          description="Add more skills you want to learn on your Skill Profile page to help our engine find matches."
          actionButton={
            <Link to="/profile" className="btn btn-primary btn-sm">
              Update My Skill Profile
            </Link>
          }
        />
      )}

      {/* State Render: Recommendations Grid */}
      {!isLoading && !errorMessage && recommendationList.length > 0 && (
        <div className="grid grid-cols-2">
          {recommendationList.map((item, index) => {
            const mentorObj = item.mentor || item;
            return (
              <ProfileCard
                key={mentorObj.id || index}
                user={mentorObj}
                matchScore={item.score}
                matchReason={item.reason}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
