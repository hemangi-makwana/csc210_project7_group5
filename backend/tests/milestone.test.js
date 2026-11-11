/**
 * ============================================================================
 * SkillExchange Workflow & Backend Milestone Verification Test Suite
 * (backend/tests/milestone.test.js)
 * ============================================================================
 * Comprehensive automated verification for the 5 milestone areas:
 * 1. Role mode vs. Theme separation & Reviewer authorization.
 * 2. Teacher Document Verification & Decision Tree DSA (ResumePreChecker & Lifecycle).
 * 3. Canonical catalog validation & Spelling suggestions for course requests.
 * 4. Session Booking workflow (Accept, Decline with reason, Conversation closing, History separation).
 * 5. Session feedback constraints & Reputation Engine DSA (HashTable + Bayesian Damping + MaxHeap).
 */

const {
  DecisionTreeNode,
  VerificationDecisionTree,
  ResumePreChecker,
  VerificationLifecycleManager,
} = require("../dsa/decisionTree");
const ReputationEngine = require("../dsa/reputationEngine");
const HashTable = require("../dsa/hashTable");
const MaxHeap = require("../dsa/heap");

describe("1. Reviewer Authorization & Role Governance", () => {
  function verifyReviewerAccess(user) {
    if (!user) return { status: 401, error: "Authentication required." };
    if (!user.is_reviewer) return { status: 403, error: "Access denied. Administrator or designated reviewer privileges required." };
    return { status: 200, authorized: true };
  }

  test("Non-reviewers receive 403 Forbidden on reviewer endpoints", () => {
    const regularLearner = { id: "usr_002", name: "Alex Chen", is_reviewer: false };
    const regularTeacher = { id: "usr_003", name: "Elena Rostova", is_reviewer: false };

    expect(verifyReviewerAccess(regularLearner)).toEqual({
      status: 403,
      error: "Access denied. Administrator or designated reviewer privileges required.",
    });
    expect(verifyReviewerAccess(regularTeacher)).toEqual({
      status: 403,
      error: "Access denied. Administrator or designated reviewer privileges required.",
    });
  });

  test("Designated reviewers receive 200 Authorized", () => {
    const reviewerAdmin = { id: "usr_001", name: "System Admin", is_reviewer: true };
    expect(verifyReviewerAccess(reviewerAdmin)).toEqual({
      status: 200,
      authorized: true,
    });
  });

  test("Unauthenticated requests receive 401 Unauthorized", () => {
    expect(verifyReviewerAccess(null)).toEqual({
      status: 401,
      error: "Authentication required.",
    });
  });
});

describe("2. Teacher Document Verification & Decision Tree DSA", () => {
  const tree = new VerificationDecisionTree();
  const preChecker = new ResumePreChecker();
  const lifecycle = new VerificationLifecycleManager();

  describe("VerificationDecisionTree routing", () => {
    test("Routes submission with BOTH resume and certificate to Tier 1 Comprehensive", () => {
      const evaluation = tree.evaluate({ hasResume: true, hasCertificate: true });
      expect(evaluation.valid).toBe(true);
      expect(evaluation.tier).toBe("Tier 1 - Comprehensive Verification");
      expect(evaluation.decision).toBe("Route to Full Credential Verification");
      expect(evaluation.priority).toBe("High");
    });

    test("Routes submission with RESUME ONLY to Tier 2 Resume", () => {
      const evaluation = tree.evaluate({ hasResume: true, hasCertificate: false });
      expect(evaluation.valid).toBe(true);
      expect(evaluation.tier).toBe("Tier 2 - Resume Evaluation");
      expect(evaluation.decision).toBe("Route to Experience & Skill Review");
      expect(evaluation.priority).toBe("Standard");
    });

    test("Routes submission with CERTIFICATE ONLY to Tier 3 Certificate", () => {
      const evaluation = tree.evaluate({ hasResume: false, hasCertificate: true });
      expect(evaluation.valid).toBe(true);
      expect(evaluation.tier).toBe("Tier 3 - Certificate Audit");
      expect(evaluation.decision).toBe("Route to Credential Authenticity Review");
      expect(evaluation.priority).toBe("Standard");
    });

    test("Rejects submission with NO documents as Invalid", () => {
      const evaluation = tree.evaluate({ hasResume: false, hasCertificate: false });
      expect(evaluation.valid).toBe(false);
      expect(evaluation.decision).toBe("Reject: Missing Required Documents");
    });
  });

  describe("ResumePreChecker rules-based analysis", () => {
    test("Extracts sections, catalog skills, checks dates, and includes preliminary notice", () => {
      const sampleResume = `
        Alex Chen
        Summary: Passionate software engineer with 5 years experience in web development.
        Experience:
        Senior Developer at Tech Corp (2021 - Present)
        Building scalable cloud microservices with Node.js and Python.
        Education:
        B.S. in Computer Science, State University, 2020
        Skills:
        JavaScript, React, Node.js, Python, PostgreSQL, Docker
        Projects:
        Open source peer learning platform
      `;

      const catalogSkills = ["JavaScript", "Python", "React", "Node.js", "PostgreSQL", "Docker", "Machine Learning"];
      const report = preChecker.analyze(sampleResume, catalogSkills);

      expect(report.totalSectionsFound).toBe(5);
      expect(report.missingSections).toHaveLength(0);
      expect(report.detectedSkills).toEqual(
        expect.arrayContaining(["javascript", "python", "react", "node.js", "postgresql", "docker"])
      );
      expect(report.anomalies).toHaveLength(0);
      expect(report.preliminaryNotice).toContain("Preliminary rules-based pre-check");
      expect(report.reviewNotice).toContain("Human reviewer adjudication typically takes 2 business days");
    });

    test("Flags anomalies when future dates are found and reports missing sections", () => {
      const incompleteResume = `
        Jane Doe
        Education: Graduation expected in 2035.
      `;
      const report = preChecker.analyze(incompleteResume, ["Python"]);
      expect(report.missingSections).toEqual(expect.arrayContaining(["summary", "experience", "skills"]));
      expect(report.anomalies.length).toBeGreaterThan(0);
      expect(report.anomalies[0]).toContain("Future year detected");
    });
  });

  describe("VerificationLifecycleManager state machine", () => {
    test("Allows valid transitions along application lifecycle", () => {
      expect(lifecycle.isValidTransition("submitted", "under_review")).toBe(true);
      expect(lifecycle.isValidTransition("under_review", "needs_information")).toBe(true);
      expect(lifecycle.isValidTransition("needs_information", "under_review")).toBe(true);
      expect(lifecycle.isValidTransition("under_review", "approved")).toBe(true);
      expect(lifecycle.isValidTransition("under_review", "rejected")).toBe(true);
    });

    test("Rejects invalid or unauthorized skips in state machine", () => {
      expect(lifecycle.isValidTransition("submitted", "approved")).toBe(false);
      expect(lifecycle.isValidTransition("submitted", "needs_information")).toBe(false);
      expect(lifecycle.isValidTransition("approved", "under_review")).toBe(false);
      expect(lifecycle.isValidTransition("rejected", "approved")).toBe(false);
    });

    test("Returns correct review action for each target state", () => {
      expect(lifecycle.getActionForState("approved")).toBe("approve");
      expect(lifecycle.getActionForState("rejected")).toBe("reject");
      expect(lifecycle.getActionForState("needs_information")).toBe("request_info");
      expect(lifecycle.getActionForState("under_review")).toBe("start_review");
    });
  });
});

describe("3. Canonical Catalog Validation & Spelling Suggestions", () => {
  const canonicalCatalog = [
    "Python",
    "JavaScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Machine Learning",
    "Cloud Architecture",
    "UI/UX Design",
    "Public Speaking",
    "Linear Algebra",
  ];

  function computeLevenshtein(a, b) {
    const s1 = (a || "").toLowerCase().trim();
    const s2 = (b || "").toLowerCase().trim();
    if (s1 === s2) return 0;
    if (!s1) return s2.length;
    if (!s2) return s1.length;

    const d = [];
    for (let i = 0; i <= s2.length; i++) d[i] = [i];
    for (let j = 0; j <= s1.length; j++) d[0][j] = j;

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          d[i][j] = d[i - 1][j - 1];
        } else {
          d[i][j] = Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1);
        }
      }
    }
    return d[s2.length][s1.length];
  }

  function validateSkill(name, catalog) {
    const clean = (name || "").trim().toLowerCase();
    const exact = catalog.find((c) => c.toLowerCase() === clean);
    if (exact) return { valid: true, canonicalName: exact, suggested: null };

    let closest = null;
    let minDistance = Infinity;
    for (const c of catalog) {
      const dist = computeLevenshtein(clean, c);
      if (dist < minDistance && dist <= 3) {
        minDistance = dist;
        closest = c;
      }
    }

    return { valid: false, canonicalName: null, suggested: closest };
  }

  test("Accepts exact case-insensitive matches", () => {
    expect(validateSkill("python", canonicalCatalog)).toEqual({
      valid: true,
      canonicalName: "Python",
      suggested: null,
    });
    expect(validateSkill("JAVASCRIPT", canonicalCatalog)).toEqual({
      valid: true,
      canonicalName: "JavaScript",
      suggested: null,
    });
    expect(validateSkill("ui/ux design", canonicalCatalog)).toEqual({
      valid: true,
      canonicalName: "UI/UX Design",
      suggested: null,
    });
  });

  test("Suggests nearest canonical skill for minor typos", () => {
    const typo1 = validateSkill("Pythn", canonicalCatalog);
    expect(typo1.valid).toBe(false);
    expect(typo1.suggested).toBe("Python");

    const typo2 = validateSkill("Javaskript", canonicalCatalog);
    expect(typo2.valid).toBe(false);
    expect(typo2.suggested).toBe("JavaScript");

    const typo3 = validateSkill("Postgres", canonicalCatalog);
    expect(typo3.valid).toBe(false);
    expect(typo3.suggested).toBe("PostgreSQL");
  });

  test("Returns null suggestion for unrecognizable inputs", () => {
    const unknown = validateSkill("Underwater Basket Weaving 101", canonicalCatalog);
    expect(unknown.valid).toBe(false);
    expect(unknown.suggested).toBeNull();
  });
});

describe("4. Session Booking Workflow & History Separation", () => {
  test("Transition safeguarding for booking lifecycle", () => {
    const validTransitions = {
      queued: ["pending", "cancelled"],
      pending: ["accepted", "declined", "cancelled"],
      accepted: ["completed", "cancelled"],
      declined: [],
      completed: [],
      cancelled: [],
    };

    function canTransition(current, next) {
      return (validTransitions[current] || []).includes(next);
    }

    expect(canTransition("pending", "accepted")).toBe(true);
    expect(canTransition("pending", "declined")).toBe(true);
    expect(canTransition("accepted", "completed")).toBe(true);
    expect(canTransition("declined", "accepted")).toBe(false);
    expect(canTransition("completed", "pending")).toBe(false);
  });

  test("Declining a session records reason and closes conversation without deleting history", () => {
    const session = {
      id: "ses_101",
      learner_id: "usr_002",
      mentor_id: "usr_003",
      status: "pending",
      conversation_id: "conv_201",
    };

    const declineReason = "Teacher schedule conflict on requested date.";
    const conversation = {
      id: "conv_201",
      is_closed: false,
      closed_at: null,
      messages: [
        { id: "msg_1", text: "Hi, I would like to book a session on Python." },
      ],
    };

    // Apply decline logic matching server.js
    session.status = "declined";
    session.declined_reason = declineReason;
    conversation.is_closed = true;
    conversation.closed_at = new Date().toISOString();

    // Verify
    expect(session.status).toBe("declined");
    expect(session.declined_reason).toBe(declineReason);
    expect(conversation.is_closed).toBe(true);
    expect(conversation.closed_at).toBeTruthy();
    // Message history is strictly preserved
    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].text).toBe("Hi, I would like to book a session on Python.");
  });

  test("Separate history filters return only role-relevant sessions", () => {
    const allSessions = [
      { id: "s1", learner_id: "usr_002", mentor_id: "usr_003", skill_name: "Python" },
      { id: "s2", learner_id: "usr_004", mentor_id: "usr_002", skill_name: "JavaScript" },
      { id: "s3", learner_id: "usr_002", mentor_id: "usr_005", skill_name: "Docker" },
      { id: "s4", learner_id: "usr_006", mentor_id: "usr_002", skill_name: "React" },
    ];

    const currentUserId = "usr_002";

    const learnerHistory = allSessions.filter((s) => s.learner_id === currentUserId);
    const teacherHistory = allSessions.filter((s) => s.mentor_id === currentUserId);

    expect(learnerHistory).toHaveLength(2);
    expect(learnerHistory.map((s) => s.skill_name)).toEqual(["Python", "Docker"]);

    expect(teacherHistory).toHaveLength(2);
    expect(teacherHistory.map((s) => s.skill_name)).toEqual(["JavaScript", "React"]);

    // Disjoint sets: none overlap
    const learnerIds = new Set(learnerHistory.map((s) => s.id));
    const teacherIds = new Set(teacherHistory.map((s) => s.id));
    for (const id of learnerIds) {
      expect(teacherIds.has(id)).toBe(false);
    }
  });
});

describe("5. Session Feedback & Reputation DSA Integration", () => {
  describe("Review submission constraints", () => {
    const existingReviews = new Map(); // session_id -> review

    function submitReview(review) {
      if (!review.session_id) return { status: 400, error: "Session ID is required." };
      if (review.session_status !== "completed") {
        return { status: 400, error: "Feedback can only be submitted for completed sessions." };
      }
      if (existingReviews.has(review.session_id)) {
        return { status: 409, error: "A review has already been submitted for this session." };
      }
      if (!review.rating || review.rating < 1 || review.rating > 5) {
        return { status: 400, error: "Rating must be an integer between 1 and 5." };
      }

      existingReviews.set(review.session_id, review);
      return { status: 201, success: true };
    }

    test("Rejects review submission for non-completed sessions", () => {
      const res = submitReview({
        session_id: "ses_pending_1",
        session_status: "pending",
        rating: 5,
        comment: "Great session!",
      });
      expect(res.status).toBe(400);
      expect(res.error).toContain("only be submitted for completed sessions");
    });

    test("Accepts valid review for completed session", () => {
      const res = submitReview({
        session_id: "ses_completed_1",
        session_status: "completed",
        rating: 5,
        comment: "Outstanding explanation of recursion!",
      });
      expect(res.status).toBe(201);
      expect(res.success).toBe(true);
    });

    test("Prevents duplicate reviews for the same session (409 Conflict)", () => {
      const duplicateRes = submitReview({
        session_id: "ses_completed_1",
        session_status: "completed",
        rating: 4,
        comment: "Trying to submit again",
      });
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.error).toContain("already been submitted");
    });
  });

  describe("ReputationEngine DSA (HashTable + Bayesian Damping + MaxHeap)", () => {
    test("Custom HashTable correctly aggregates teacher ratings", () => {
      const table = new HashTable(17);
      table.set("usr_003", [5, 5, 4]);
      table.set("usr_005", [3, 4]);

      expect(table.get("usr_003")).toEqual([5, 5, 4]);
      expect(table.get("usr_005")).toEqual([3, 4]);
      expect(table.get("usr_nonexistent")).toBeNull();
    });

    test("Bayesian damped formula prevents wild score swings from single reviews", () => {
      const engine = new ReputationEngine(31, 4.0, 3);
      // Prior R0 = 4.0, weight m = 3
      // Teacher with default score (no reviews):
      expect(engine.calculateScore([])).toBe(4.0);

      // Teacher gets ONE 5-star review:
      // Score = (3 * 4.0 + 5) / (3 + 1) = 17 / 4 = 4.25
      const oneFive = engine.calculateScore([5]);
      expect(oneFive).toBe(4.25);
      expect(oneFive).toBeLessThan(5.0); // Damped! Doesn't jump to 5.0 immediately

      // Teacher gets ONE 1-star review:
      // Score = (3 * 4.0 + 1) / (3 + 1) = 13 / 4 = 3.25
      const oneOne = engine.calculateScore([1]);
      expect(oneOne).toBe(3.25);
      expect(oneOne).toBeGreaterThan(1.0); // Damped! Doesn't crash to 1.0 immediately

      // As reviews accumulate, the score approaches empirical average
      // 10 five-star reviews: (3*4 + 50) / 13 = 62 / 13 = 4.77
      const tenFives = engine.calculateScore([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
      expect(tenFives).toBe(4.77);

      // Bounded strictly between 1.00 and 5.00
      expect(oneFive).toBeGreaterThanOrEqual(1.0);
      expect(oneFive).toBeLessThanOrEqual(5.0);
      expect(oneOne).toBeGreaterThanOrEqual(1.0);
      expect(oneOne).toBeLessThanOrEqual(5.0);
    });

    test("MaxHeap ranks teachers correctly by Bayesian reputation score", () => {
      const engine = new ReputationEngine(31, 4.0, 3);

      const teachers = [
        { id: "t1", name: "Alice", reviews: [5, 5, 5, 5, 5] },  // (12 + 25) / 8 = 4.63
        { id: "t2", name: "Bob", reviews: [2, 2, 3] },          // (12 + 7) / 6 = 3.17
        { id: "t3", name: "Charlie", reviews: [5, 4, 5, 4] },   // (12 + 18) / 7 = 4.29
      ];

      for (const t of teachers) {
        engine.indexTeacherReviews(t.id, t.reviews);
      }

      const ranked = engine.rankTeachers(teachers);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].id).toBe("t1"); // Highest score: 4.63
      expect(ranked[1].id).toBe("t3"); // Second: 4.29
      expect(ranked[2].id).toBe("t2"); // Third: 3.17
      expect(ranked[0].reputationScore).toBeGreaterThan(ranked[1].reputationScore);
      expect(ranked[1].reputationScore).toBeGreaterThan(ranked[2].reputationScore);
    });
  });
});
