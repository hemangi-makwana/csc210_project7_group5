/**
 * ============================================================================
 * REPUTATION & TEACHER RANKING ENGINE (backend/dsa/reputationEngine.js)
 * ============================================================================
 *
 * WHAT THIS MODULE DOES:
 * 1. Uses the project's custom Hash Table (with separate chaining) to aggregate
 *    peer reviews, structured 5-dimension session feedback, and teacher
 *    reputations in O(1) average time.
 * 2. Preserves the learner's exact 1-5 integer star rating on every review while
 *    computing a consistent, bounded per-session score from the overall rating
 *    (60% weight) and the five structured teaching questions (40% weight).
 * 3. Employs a Bayesian damped bounded reputation formula so that a single new
 *    review cannot create an unbounded or volatile score swing.
 * 4. Computes per-dimension averages and actionable teacher improvement areas
 *    without exposing which learner submitted which feedback.
 * 5. Uses the project's custom Max-Heap (Priority Queue) to rank eligible teachers
 *    efficiently in O(k log n) time when querying top mentors or recommendations.
 * 6. Keeps local PostgreSQL as the absolute source of truth: the data structures
 *    are populated and updated directly from database records.
 *
 * FORMULA (VIVA DEFENSE POINT):
 * - Per-Review Composite Score S_i in [1.00, 5.00]:
 *     If structured 1-5 answers (Clarity, Interaction, Preparation, Materials,
 *     Engagement) are present with mean Q_avg:
 *       S_i = 0.60 * Rating_i + 0.40 * Q_avg
 *     Otherwise (overall rating only):
 *       S_i = Rating_i
 * - Bayesian Damped Mean with prior R0 = 4.0 and confidence weight m = 3:
 *     BoundedScore = (m * R0 + Sum(S_i)) / (m + N)
 *   Clamped strictly to [1.00, 5.00] and rounded to 2 decimal places.
 * ============================================================================
 */

const HashTable = require('./hashTable');
const MaxHeap = require('./heap');

const FEEDBACK_DIMENSIONS = [
  {
    key: 'clarity',
    column: 'clarity_rating',
    label: 'Teaching Clarity',
    question: "How clear and easy to follow were the teacher's explanations?",
    improvementTip: 'Break down complex concepts with step-by-step examples and check for understanding regularly.',
  },
  {
    key: 'interaction',
    column: 'interaction_rating',
    label: 'Interaction & Q&A',
    question: 'How well did the teacher encourage questions and two-way interaction?',
    improvementTip: 'Pause periodically to invite learner questions and encourage hands-on dialogue.',
  },
  {
    key: 'preparation',
    column: 'preparation_rating',
    label: 'Session Preparation',
    question: 'How well-prepared and organized was the teacher for this session?',
    improvementTip: 'Set a clear session agenda at the start and prepare structured walkthroughs ahead of time.',
  },
  {
    key: 'materials',
    column: 'materials_rating',
    label: 'Usefulness of Materials',
    question: 'How useful and relevant were the examples, exercises, or materials shared?',
    improvementTip: 'Provide practical examples, concise notes, or follow-up exercises tailored to the learner’s goal.',
  },
  {
    key: 'engagement',
    column: 'engagement_rating',
    label: 'Respectful & Engaged',
    question: 'Was the teacher respectful, patient, and actively engaged throughout?',
    improvementTip: 'Maintain patient, supportive pacing and active engagement throughout the entire session.',
  },
];

class ReputationEngine {
  constructor(bucketCount = 31, priorRating = 4.0, priorWeight = 3) {
    this.bucketCount = bucketCount;
    this.priorRating = priorRating;
    this.priorWeight = priorWeight;

    // Hash table mapping teacherId -> Aggregated Review & Feedback Data
    this.teacherTable = new HashTable(bucketCount);
  }

  /**
   * Returns the canonical 5 structured feedback question definitions.
   */
  static getFeedbackDimensions() {
    return FEEDBACK_DIMENSIONS;
  }

  /**
   * Extracts validated 1-5 integer answers for the 5 structured feedback dimensions
   * from a review row or request payload.
   */
  static extractStructuredQuestions(rev = {}) {
    if (!rev || typeof rev !== 'object') return {};
    const nested =
      rev.questions && typeof rev.questions === 'object'
        ? rev.questions
        : rev.feedback_answers && typeof rev.feedback_answers === 'object'
        ? rev.feedback_answers
        : {};

    const result = {};
    for (const dim of FEEDBACK_DIMENSIONS) {
      const rawVal =
        rev[dim.column] !== undefined && rev[dim.column] !== null
          ? rev[dim.column]
          : rev[dim.key] !== undefined && rev[dim.key] !== null
          ? rev[dim.key]
          : nested[dim.key] !== undefined && nested[dim.key] !== null
          ? nested[dim.key]
          : nested[dim.column];

      const numVal = Number(rawVal);
      if (Number.isFinite(numVal) && numVal >= 1 && numVal <= 5) {
        result[dim.key] = Math.round(numVal);
      }
    }
    return result;
  }

  /**
   * Computes a single review's composite session score in [1.00, 5.00] from the
   * exact 1-5 star rating (60% weight) and the 5 structured question answers (40% weight).
   * Note: This does NOT alter the review's exact integer star rating (`rating`).
   */
  static calculateReviewCompositeScore(rating, structuredQuestions = {}) {
    const exactStar = Math.max(1, Math.min(5, Math.round(Number(rating) || 0)));
    const qValues = Object.values(structuredQuestions || {})
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);

    if (qValues.length === 0) {
      return exactStar;
    }

    const qAvg = qValues.reduce((acc, v) => acc + v, 0) / qValues.length;
    const blended = 0.6 * exactStar + 0.4 * qAvg;
    const clamped = Math.max(1.0, Math.min(5.0, blended));
    return Math.round(clamped * 100) / 100;
  }

  calculateReviewCompositeScore(rating, structuredQuestions = {}) {
    return ReputationEngine.calculateReviewCompositeScore(rating, structuredQuestions);
  }

  /**
   * Static helper for bounded Bayesian reputation score.
   */
  static calculateBoundedScore(ratingsOrReviews, priorRating = 4.0, priorWeight = 3) {
    if (!Array.isArray(ratingsOrReviews) || ratingsOrReviews.length === 0) {
      return priorRating;
    }

    const validScores = [];
    for (const item of ratingsOrReviews) {
      if (item && typeof item === 'object') {
        const star = Number(item.rating);
        if (Number.isFinite(star) && star >= 1 && star <= 5) {
          const explicitSessionScore = Number(item.session_score ?? item.sessionScore);
          if (Number.isFinite(explicitSessionScore) && explicitSessionScore >= 1 && explicitSessionScore <= 5) {
            validScores.push(explicitSessionScore);
          } else {
            const qs = ReputationEngine.extractStructuredQuestions(item);
            validScores.push(ReputationEngine.calculateReviewCompositeScore(star, qs));
          }
        }
      } else {
        const num = Number(item);
        if (Number.isFinite(num) && num >= 1 && num <= 5) {
          validScores.push(num);
        }
      }
    }

    if (validScores.length === 0) {
      return priorRating;
    }

    const count = validScores.length;
    const sum = validScores.reduce((acc, s) => acc + s, 0);
    const rawBounded = (priorWeight * priorRating + sum) / (priorWeight + count);
    const clamped = Math.max(1.0, Math.min(5.0, rawBounded));
    return Math.round(clamped * 100) / 100;
  }

  /**
   * Calculates bounded reputation for a given list of numerical ratings or review objects (1-5).
   *
   * @param {Array<number|object>} ratings
   * @returns {number} Bounded score rounded to 2 decimal places [1.00 - 5.00].
   */
  calculateBoundedScore(ratings) {
    return ReputationEngine.calculateBoundedScore(ratings, this.priorRating, this.priorWeight);
  }

  /**
   * Aggregates per-dimension averages, strengths, and improvement areas from a teacher's reviews.
   */
  static summarizeStructuredFeedback(reviews = []) {
    const totals = {};
    const counts = {};
    for (const dim of FEEDBACK_DIMENSIONS) {
      totals[dim.key] = 0;
      counts[dim.key] = 0;
    }

    for (const rev of reviews || []) {
      const qs =
        rev && rev.questions && Object.keys(rev.questions).length > 0
          ? rev.questions
          : ReputationEngine.extractStructuredQuestions(rev);
      for (const dim of FEEDBACK_DIMENSIONS) {
        const val = Number(qs[dim.key]);
        if (Number.isFinite(val) && val >= 1 && val <= 5) {
          totals[dim.key] += val;
          counts[dim.key] += 1;
        }
      }
    }

    const categoryAverages = {};
    const dimensionBreakdown = [];
    for (const dim of FEEDBACK_DIMENSIONS) {
      const count = counts[dim.key];
      const avg = count > 0 ? Math.round((totals[dim.key] / count) * 100) / 100 : null;
      categoryAverages[dim.key] = avg;
      if (avg !== null) {
        dimensionBreakdown.push({
          key: dim.key,
          label: dim.label,
          question: dim.question,
          average: avg,
          responsesCount: count,
          improvementTip: dim.improvementTip,
        });
      }
    }

    // Improvement areas: dimensions with average < 4.0 (or lowest dimension if < 4.3), sorted lowest first
    const sortedAsc = [...dimensionBreakdown].sort((a, b) => a.average - b.average);
    const improvementAreas = sortedAsc
      .filter((d) => d.average < 4.0)
      .map((d) => ({
        key: d.key,
        label: d.label,
        average: d.average,
        suggestion: d.improvementTip,
      }));

    // If all dimensions are >= 4.0 but at least one is < 4.5, surface the lowest one as a growth area
    if (improvementAreas.length === 0 && sortedAsc.length > 0 && sortedAsc[0].average < 4.5) {
      improvementAreas.push({
        key: sortedAsc[0].key,
        label: sortedAsc[0].label,
        average: sortedAsc[0].average,
        suggestion: sortedAsc[0].improvementTip,
      });
    }

    const strengths = [...dimensionBreakdown]
      .filter((d) => d.average >= 4.0)
      .sort((a, b) => b.average - a.average)
      .map((d) => ({
        key: d.key,
        label: d.label,
        average: d.average,
      }));

    return {
      categoryAverages,
      dimensionBreakdown,
      improvementAreas,
      strengths,
    };
  }

  /**
   * Formats a review row for teacher/profile display while keeping the learner's identity private
   * and preserving the exact integer star rating selected (1..5).
   */
  static sanitizeReviewForTeacher(rev) {
    const exactRating = Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 0)));
    const questions = ReputationEngine.extractStructuredQuestions(rev);
    const sessionScore =
      rev.session_score !== undefined && rev.session_score !== null
        ? Number(rev.session_score)
        : ReputationEngine.calculateReviewCompositeScore(exactRating, questions);

    return {
      id: rev.id || null,
      mentor_id: rev.mentor_id ? String(rev.mentor_id) : null,
      reviewer_name: 'Anonymous Learner',
      rating: exactRating,
      comment: rev.comment || '',
      topic: rev.topic || null,
      questions,
      clarity_rating: questions.clarity ?? null,
      interaction_rating: questions.interaction ?? null,
      preparation_rating: questions.preparation ?? null,
      materials_rating: questions.materials ?? null,
      engagement_rating: questions.engagement ?? null,
      session_score: sessionScore,
      created_at: rev.created_at || null,
    };
  }

  /**
   * Rebuilds the Hash Table aggregation from a fresh list of PostgreSQL review rows.
   * Ensures PostgreSQL remains the persistent source of truth.
   *
   * @param {Array<object>} reviewRows
   */
  rebuildFromReviews(reviewRows) {
    this.teacherTable = new HashTable(this.bucketCount);

    if (!Array.isArray(reviewRows) || reviewRows.length === 0) {
      return;
    }

    const tempMap = new Map();

    for (const rev of reviewRows) {
      const mentorId = rev && (rev.mentor_id || rev.mentorId);
      if (!mentorId) continue;
      const tId = String(mentorId);
      const exactRating = Math.round(Number(rev.rating));

      if (!tempMap.has(tId)) {
        tempMap.set(tId, { ratings: [], reviews: [] });
      }
      if (Number.isInteger(exactRating) && exactRating >= 1 && exactRating <= 5) {
        const entry = tempMap.get(tId);
        const sanitized = ReputationEngine.sanitizeReviewForTeacher({
          ...rev,
          rating: exactRating,
        });
        entry.ratings.push(exactRating);
        entry.reviews.push(sanitized);
      }
    }

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
    if (!teacherId) {
      return {
        reviewCount: 0,
        boundedReputation: this.priorRating,
        reputationScore: this.priorRating,
        categoryAverages: {},
        dimensionBreakdown: [],
        improvementAreas: [],
        strengths: [],
        reviews: [],
      };
    }
    const res = this.teacherTable.get
      ? this.teacherTable.get(String(teacherId))
      : this.teacherTable.lookup(String(teacherId));
    const record = Array.isArray(res) ? res[res.length - 1] : res;
    if (record) {
      return {
        ...record,
        reputationScore: record.boundedReputation ?? record.reputationScore ?? this.priorRating,
      };
    }
    return {
      teacherId: String(teacherId),
      reviewCount: 0,
      ratings: [],
      reviews: [],
      rawAverage: this.priorRating,
      boundedReputation: this.priorRating,
      reputationScore: this.priorRating,
      categoryAverages: {},
      dimensionBreakdown: [],
      improvementAreas: [],
      strengths: [],
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

    const heap = new MaxHeap((a, b) => {
      const repA = a.boundedReputation ?? a.reputation_score ?? a.reputationScore ?? 0;
      const repB = b.boundedReputation ?? b.reputation_score ?? b.reputationScore ?? 0;
      if (repA !== repB) return repA - repB;
      return (a.reviewCount ?? 0) - (b.reviewCount ?? 0);
    });

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
      .map((r) => Math.round(Number(r)))
      .filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);

    const sanitizedReviews = Array.isArray(reviews)
      ? reviews.map((rev) => ReputationEngine.sanitizeReviewForTeacher(rev))
      : [];

    // Use review objects (with structured questions) when available, otherwise plain star ratings
    const scoringInputs = sanitizedReviews.length === validRatings.length && sanitizedReviews.length > 0
      ? sanitizedReviews
      : validRatings;

    const boundedScore = this.calculateBoundedScore(scoringInputs);
    const rawAvg =
      validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : this.priorRating;

    const structuredSummary = ReputationEngine.summarizeStructuredFeedback(sanitizedReviews);

    const record = {
      teacherId: String(teacherId),
      reviewCount: validRatings.length,
      ratings: validRatings,
      reviews: sanitizedReviews,
      rawAverage: Math.round(rawAvg * 100) / 100,
      boundedReputation: boundedScore,
      reputationScore: boundedScore,
      categoryAverages: structuredSummary.categoryAverages,
      dimensionBreakdown: structuredSummary.dimensionBreakdown,
      improvementAreas: structuredSummary.improvementAreas,
      strengths: structuredSummary.strengths,
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
   * calculating bounded Bayesian score from overall star ratings and structured answers,
   * updating PostgreSQL users.reputation_score, and updating the internal Hash Table.
   */
  async updateTeacherReputationFromDatabase(teacherId, queryFn) {
    if (!teacherId || !queryFn) return this.priorRating;
    const revRes = await queryFn(
      `SELECT r.id, r.session_id, r.reviewer_id, r.mentor_id, r.rating, r.comment,
              r.clarity_rating, r.interaction_rating, r.preparation_rating,
              r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
              r.created_at, sb.topic AS topic
       FROM reviews r
       LEFT JOIN session_bookings sb ON r.session_id = sb.id
       WHERE r.mentor_id = $1
       ORDER BY r.created_at DESC`,
      [String(teacherId)]
    );
    const rows = revRes.rows || [];
    const ratings = rows
      .map((r) => Math.round(Number(r.rating)))
      .filter((r) => Number.isInteger(r) && r >= 1 && r <= 5);
    const boundedScore = this.calculateBoundedScore(rows);

    await queryFn(
      'UPDATE users SET reputation_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
