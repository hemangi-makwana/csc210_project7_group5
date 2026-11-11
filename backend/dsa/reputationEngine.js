/**
 * ============================================================================
 * REPUTATION & TEACHER RANKING ENGINE (backend/dsa/reputationEngine.js)
 * ============================================================================
 *
 * WHAT THIS MODULE DOES:
 * 1. Uses the project's custom Hash Table (with separate chaining) to aggregate
 *    peer reviews and calculate teacher reputations in O(1) average time.
 * 2. Employs a Bayesian damped bounded reputation formula so that a single new
 *    review cannot create an unbounded or volatile score swing.
 * 3. Uses the project's custom Max-Heap (Priority Queue) to rank eligible teachers
 *    efficiently in O(k log n) time when querying top mentors or recommendations.
 * 4. Keeps local PostgreSQL as the absolute source of truth: the data structures
 *    are populated and updated directly from database records.
 *
 * FORMULA (VIVA DEFENSE POINT):
 * Bayesian Damped Mean with prior R0 = 4.0 and confidence weight m = 3:
 *   BoundedScore = (m * R0 + Sum(Ratings)) / (m + N)
 *
 * Why Bayesian Damping?
 * If a new teacher receives a single 5-star review, a naive average would jump
 * to 5.00, placing them above experienced teachers with dozens of 4.9-star reviews.
 * Under Bayesian damping:
 * - 0 reviews: baseline 4.00
 * - 1 review of 5.0: (3 * 4.0 + 5) / (3 + 1) = 17 / 4 = 4.25 (bounded!)
 * - 1 review of 1.0: (3 * 4.0 + 1) / (3 + 1) = 13 / 4 = 3.25 (bounded!)
 * - 10 reviews of 5.0: (3 * 4.0 + 50) / (3 + 10) = 62 / 13 = 4.77
 * - 30 reviews of 5.0: (3 * 4.0 + 150) / (3 + 30) = 162 / 33 = 4.91
 * The score is mathematically bounded between 1.00 and 5.00 at all times.
 * ============================================================================
 */

const HashTable = require('./hashTable');
const MaxHeap = require('./heap');

class ReputationEngine {
  constructor(bucketCount = 31, priorRating = 4.0, priorWeight = 3) {
    this.bucketCount = bucketCount;
    this.priorRating = priorRating;
    this.priorWeight = priorWeight;

    // Hash table mapping teacherId -> Aggregated Review Data
    this.teacherTable = new HashTable(bucketCount);
  }

  /**
   * Calculates bounded reputation for a given list of numerical ratings (1-5).
   *
   * @param {number[]} ratings
   * @returns {number} Bounded score rounded to 2 decimal places [1.00 - 5.00].
   */
  calculateBoundedScore(ratings) {
    if (!ratings || ratings.length === 0) {
      return this.priorRating;
    }

    const count = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + Number(r), 0);

    const rawBounded = (this.priorWeight * this.priorRating + sum) / (this.priorWeight + count);
    const clamped = Math.max(1.0, Math.min(5.0, rawBounded));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Rebuilds the Hash Table aggregation from a fresh list of PostgreSQL review rows.
   * Ensures PostgreSQL remains the persistent source of truth.
   *
   * @param {Array<{ mentor_id: string, rating: number, comment?: string }>} reviewRows
   */
  rebuildFromReviews(reviewRows) {
    // Re-initialize fresh Hash Table
    this.teacherTable = new HashTable(this.bucketCount);

    if (!Array.isArray(reviewRows) || reviewRows.length === 0) {
      return;
    }

    // Temporary map to collect reviews by mentor
    const tempMap = new Map();

    for (const rev of reviewRows) {
      const mentorId = rev && (rev.mentor_id || rev.mentorId);
      if (!mentorId) continue;
      const tId = String(mentorId);
      const rating = Number(rev.rating);

      if (!tempMap.has(tId)) {
        tempMap.set(tId, { ratings: [], reviews: [] });
      }
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        const entry = tempMap.get(tId);
        entry.ratings.push(rating);
        entry.reviews.push({
          id: rev.id || null,
          session_id: rev.session_id || rev.sessionId || null,
          reviewer_id: rev.reviewer_id || rev.reviewerId || null,
          reviewer_name: rev.reviewer_name || null,
          mentor_id: tId,
          rating,
          comment: rev.comment || "",
          topic: rev.topic || null,
          created_at: rev.created_at || null,
        });
      }
    }

    // Insert aggregated objects into Hash Table
    for (const [teacherId, data] of tempMap.entries()) {
      this.indexTeacherReviews(teacherId, data.ratings, data.reviews);
    }
  }

  /**
   * Retrieves aggregated review metadata for a specific teacher in O(1) average time.
   *
   * @param {string} teacherId
   * @returns {object} Aggregated teacher reputation record
   */
  getTeacherReputation(teacherId) {
    if (!teacherId) return { reviewCount: 0, boundedReputation: this.priorRating, reputationScore: this.priorRating };
    const res = this.teacherTable.get ? this.teacherTable.get(String(teacherId)) : this.teacherTable.lookup(String(teacherId));
    const record = Array.isArray(res) ? res[res.length - 1] : res;
    if (record) {
      return {
        ...record,
        reputationScore: record.boundedReputation ?? record.reputationScore ?? this.priorRating,
      };
    }
    return {
      teacherId,
      reviewCount: 0,
      ratings: [],
      rawAverage: this.priorRating,
      boundedReputation: this.priorRating,
      reputationScore: this.priorRating,
    };
  }

  /**
   * Ranks an array of candidate teachers using the Max-Heap.
   *
   * @param {Array<object>} teachers - Array of teacher objects with id/userId
   * @param {number} [topK=10] - Number of top candidates to extract
   * @returns {Array<object>} Top-ranked teachers in descending order of bounded reputation
   */
  rankTeachersWithHeap(teachers, topK = 10) {
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return [];
    }

    // Max-Heap comparator: highest boundedReputation has maximum priority
    const heap = new MaxHeap((a, b) => {
      const repA = a.boundedReputation ?? a.reputation_score ?? a.reputationScore ?? 0;
      const repB = b.boundedReputation ?? b.reputation_score ?? b.reputationScore ?? 0;
      if (repA !== repB) return repA - repB;
      // Secondary tie-breaker: review count
      return (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
    });

    // Decorate candidate teachers with their latest Hash Table review metrics
    for (const t of teachers) {
      const tId = String(t.id || t.userId);
      const repData = this.getTeacherReputation(tId);
      const score = repData.boundedReputation ?? repData.reputationScore ?? this.priorRating;
      const enriched = {
        ...t,
        boundedReputation: score,
        reputationScore: score,
        reviewCount: repData.reviewCount ?? 0,
        score,
      };
      heap.insert(enriched);
    }

    // Extract top-k in O(k log n) time
    const ranked = [];
    const countToExtract = Math.min(topK, teachers.length);
    for (let i = 0; i < countToExtract; i++) {
      if (heap.size() > 0) {
        ranked.push(heap.extractMax());
      }
    }

    return ranked;
  }

  /**
   * Alias for calculateBoundedScore.
   */
  calculateScore(ratings) {
    return this.calculateBoundedScore(ratings);
  }

  /**
   * Indexes a teacher's reviews directly into the Hash Table.
   */
  indexTeacherReviews(teacherId, ratings, reviews = []) {
    const validRatings = (Array.isArray(ratings) ? ratings : [])
      .map((r) => Number(r))
      .filter((r) => !isNaN(r) && r >= 1 && r <= 5);
    const boundedScore = this.calculateBoundedScore(validRatings);
    const rawAvg =
      validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : this.priorRating;
    const record = {
      teacherId: String(teacherId),
      reviewCount: validRatings.length,
      ratings: validRatings,
      reviews: Array.isArray(reviews) ? reviews : [],
      rawAverage: Math.round(rawAvg * 100) / 100,
      boundedReputation: boundedScore,
      reputationScore: boundedScore,
    };
    if (this.teacherTable.set) {
      this.teacherTable.set(String(teacherId), record);
    } else {
      this.teacherTable.insert(String(teacherId), record);
    }
    return record;
  }

  /**
   * Updates teacher reputation by querying latest reviews from PostgreSQL,
   * calculating bounded Bayesian score, updating PostgreSQL users.reputation_score,
   * and updating the internal Hash Table.
   */
  async updateTeacherReputationFromDatabase(teacherId, queryFn) {
    if (!teacherId || !queryFn) return this.priorRating;
    const revRes = await queryFn(
      `SELECT r.id, r.session_id, r.reviewer_id, r.mentor_id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name, sb.topic AS topic
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN session_bookings sb ON r.session_id = sb.id
       WHERE r.mentor_id = $1
       ORDER BY r.created_at DESC`,
      [String(teacherId)]
    );
    const rows = revRes.rows || [];
    const ratings = rows.map((r) => Number(r.rating)).filter((r) => !isNaN(r) && r >= 1 && r <= 5);
    const boundedScore = this.calculateBoundedScore(ratings);

    await queryFn(
      "UPDATE users SET reputation_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [boundedScore, String(teacherId)]
    );

    this.indexTeacherReviews(String(teacherId), ratings, rows);
    return boundedScore;
  }

  /**
   * Alias for rankTeachersWithHeap.
   */
  rankTeachers(teachers, topK = 10) {
    const ranked = this.rankTeachersWithHeap(teachers, topK);
    return ranked.map((t) => ({
      ...t,
      reputationScore: t.boundedReputation ?? t.score,
    }));
  }
}

module.exports = ReputationEngine;
