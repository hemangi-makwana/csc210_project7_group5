const ReputationEngine = require("./reputationEngine");

describe("ReputationEngine structured feedback and privacy", () => {
  test("extractStructuredQuestions reads numeric 1-5 answers and ignores invalid values", () => {
    const extracted = ReputationEngine.extractStructuredQuestions({
      clarity: 5,
      interaction: 4,
      preparation: 3,
      materials: 2,
      engagement: 4,
    });
    expect(extracted).toEqual({
      clarity: 5,
      interaction: 4,
      preparation: 3,
      materials: 2,
      engagement: 4,
    });
  });

  test("calculateReviewCompositeScore blends 60% overall rating and 40% structured mean while preserving exact integer rating", () => {
    const engine = new ReputationEngine();
    const composite = engine.calculateReviewCompositeScore(3, {
      clarity: 5,
      interaction: 5,
      preparation: 5,
      materials: 5,
      engagement: 5,
    });
    // 0.6 * 3 + 0.4 * 5 = 1.8 + 2.0 = 3.8
    expect(composite).toBe(3.8);
  });

  test("calculateBoundedScore is bounded in [1, 5] and resists single-review swings", () => {
    const engine = new ReputationEngine();
    const singleOneStar = engine.calculateBoundedScore([1]);
    expect(singleOneStar).toBeGreaterThan(3.0);
    expect(singleOneStar).toBeLessThan(4.5);
    expect(engine.calculateBoundedScore([5, 5, 5, 5, 5])).toBeLessThanOrEqual(5);
    expect(engine.calculateBoundedScore([1, 1, 1, 1, 1])).toBeGreaterThanOrEqual(1);
  });

  test("summarizeStructuredFeedback identifies improvement areas (< 4.0) and strengths (>= 4.0)", () => {
    const summary = ReputationEngine.summarizeStructuredFeedback([
      {
        rating: 3,
        clarity_rating: 5,
        interaction_rating: 4,
        preparation_rating: 2,
        materials_rating: 3,
        engagement_rating: 5,
      },
      {
        rating: 4,
        clarity_rating: 4,
        interaction_rating: 4,
        preparation_rating: 3,
        materials_rating: 3,
        engagement_rating: 4,
      },
    ]);

    expect(summary.categoryAverages).toEqual({
      clarity: 4.5,
      interaction: 4,
      preparation: 2.5,
      materials: 3,
      engagement: 4.5,
    });
    expect(summary.improvementAreas.map((d) => d.key)).toEqual(["preparation", "materials"]);
    expect(summary.strengths.map((d) => d.key)).toEqual(["clarity", "engagement", "interaction"]);
  });

  test("sanitizeReviewForTeacher strips learner identity and keeps exact integer rating", () => {
    const sanitized = ReputationEngine.sanitizeReviewForTeacher({
      id: "rev_1",
      session_id: "sess_1",
      reviewer_id: "user_learner_99",
      reviewer_name: "Alice Learner",
      reviewer_avatar: "/avatars/alice.png",
      mentor_id: "user_teacher_1",
      rating: 3,
      clarity_rating: 4,
      interaction_rating: 3,
      preparation_rating: 3,
      materials_rating: 2,
      engagement_rating: 4,
      comment: "Good session overall.",
      created_at: "2026-11-12T00:00:00Z",
    });

    expect(sanitized.reviewer_name).toBe("Anonymous Learner");
    expect(sanitized.reviewer_id).toBeUndefined();
    expect(sanitized.reviewer_avatar).toBeUndefined();
    expect(sanitized.session_id).toBeUndefined();
    expect(sanitized.rating).toBe(3);
    expect(sanitized.questions).toEqual({
      clarity: 4,
      interaction: 3,
      preparation: 3,
      materials: 2,
      engagement: 4,
    });
  });
});
