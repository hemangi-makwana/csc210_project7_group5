/**
 * ============================================================================
 * DATA STRUCTURE: DECISION TREE & VERIFICATION LIFECYCLE STATE MACHINE
 * (backend/dsa/decisionTree.js)
 * ============================================================================
 *
 * What is a Decision Tree?
 * A Decision Tree is a hierarchical, non-linear data structure where:
 * - Each internal node represents a "test" or "predicate" on an attribute
 *   (e.g., "Is a resume uploaded?", "Are skill keywords present?").
 * - Each branch represents the outcome of the test (True / False / Branch Choice).
 * - Each leaf node represents a final classification, decision tier, or
 *   action recommendation (e.g. "Expedited Review Tier", "Standard Review Tier",
 *   "Supplemental Information Advised").
 *
 * Real-World Analogy (Viva Defense Point):
 * Think of an expert review flow-chart used by human adjudicators:
 * Instead of hardcoding spaghetti if/else statements across various controllers,
 * the decision logic is formalized as an explicit tree. Traversal follows a
 * predictable top-down path from root to leaf in O(d) time, where d is the depth
 * of the tree.
 *
 * Why use a Decision Tree for Teacher Document Verification?
 * 1. Document Choice Routing: Teachers may provide a resume, a certificate, or both.
 *    Each choice path imposes different validation requirements.
 * 2. Multi-Criteria Preliminary Pre-Check:
 *    - Keyword relevance to the claimed skill.
 *    - Presence of standard professional sections (Experience, Education, Skills, Projects).
 *    - Temporal sanity checks (no future graduation dates beyond current year + 1, no end year < start year).
 * 3. Separation of Concerns & Ethical AI / Automation Principle:
 *    As required by system specifications, the decision tree provides PRELIMINARY
 *    FEEDBACK ONLY. It assists applicants and human reviewers by flagging potential
 *    omissions, but CANNOT automatically approve or reject an applicant.
 *
 * Time Complexity (Viva Defense Point):
 * - Tree Construction: O(n) where n is the number of decision nodes.
 * - Evaluation (Root-to-Leaf Traversal): O(d) where d is tree depth (typically <= 6).
 *   Because d << n, evaluation takes constant O(1) bounded time!
 * - Text Pre-Check Token Scanning: O(m) where m is the length of the document text.
 *
 * Space Complexity:
 * - O(n) to store the tree nodes and branch pointers in memory.
 * ============================================================================
 */

/**
 * Node in the Decision Tree.
 */
class DecisionTreeNode {
  /**
   * @param {string} id - Unique identifier for the node.
   * @param {string} description - Human-readable explanation of this decision point.
   * @param {function} [predicate] - Predicate function (context) => string|boolean.
   * @param {object} [children] - Map of branch keys to child DecisionTreeNodes.
   * @param {object} [leafResult] - Output payload if this node is a leaf.
   */
  constructor(id, description, predicate = null, children = {}, leafResult = null) {
    this.id = id;
    this.description = description;
    this.predicate = predicate;
    this.children = children;
    this.leafResult = leafResult;
  }

  isLeaf() {
    return this.predicate === null || Object.keys(this.children).length === 0;
  }
}

/**
 * Decision Tree Engine for Document Verification
 */
class VerificationDecisionTree {
  constructor() {
    this.root = this.buildTree();
  }

  /**
   * Constructs the canonical verification evaluation tree.
   */
  buildTree() {
    // Leaf Nodes
    const leafBothComprehensive = new DecisionTreeNode(
      'LEAF_BOTH_COMPREHENSIVE',
      'Comprehensive submission: both resume and certificate provided with strong keyword and section alignment.',
      null,
      {},
      {
        valid: true,
        tier: 'Tier 1 - Comprehensive Verification',
        decision: 'Route to Full Credential Verification',
        priority: 'High',
        recommendation: 'Priority Review Queue',
        confidenceScore: 95,
        summary: 'Both resume and certificate detected. Document sections and skill terms align well.',
      }
    );

    const leafBothStandard = new DecisionTreeNode(
      'LEAF_BOTH_STANDARD',
      'Dual submission provided. Basic resume sections detected alongside certificate credential.',
      null,
      {},
      {
        valid: true,
        tier: 'Tier 1 - Comprehensive Verification',
        decision: 'Route to Full Credential Verification',
        priority: 'High',
        recommendation: 'Standard Review Queue',
        confidenceScore: 85,
        summary: 'Resume and certificate provided. Document meets structural requirements.',
      }
    );

    const leafResumeOnlyStrong = new DecisionTreeNode(
      'LEAF_RESUME_STRONG',
      'Resume-only submission with extensive relevant work experience and explicit skill keywords.',
      null,
      {},
      {
        valid: true,
        tier: 'Tier 2 - Resume Evaluation',
        decision: 'Route to Experience & Skill Review',
        priority: 'Standard',
        recommendation: 'Standard Review Queue',
        confidenceScore: 80,
        summary: 'Resume presents relevant work history and technical keywords matching the skill.',
      }
    );

    const leafResumeOnlyBasic = new DecisionTreeNode(
      'LEAF_RESUME_BASIC',
      'Resume-only submission with standard structure. May benefit from supplemental credentials.',
      null,
      {},
      {
        valid: true,
        tier: 'Tier 2 - Resume Evaluation',
        decision: 'Route to Experience & Skill Review',
        priority: 'Standard',
        recommendation: 'Standard Review Queue',
        confidenceScore: 70,
        summary: 'Resume meets submission requirements. An optional certificate can strengthen verification.',
      }
    );

    const leafCertOnly = new DecisionTreeNode(
      'LEAF_CERT_ONLY',
      'Certificate-only credential submission.',
      null,
      {},
      {
        valid: true,
        tier: 'Tier 3 - Certificate Audit',
        decision: 'Route to Credential Authenticity Review',
        priority: 'Standard',
        recommendation: 'Credential Verification Queue',
        confidenceScore: 75,
        summary: 'Certificate submitted. Reviewer will inspect issuer accreditation and credential validity.',
      }
    );

    const leafNoDocs = new DecisionTreeNode(
      'LEAF_NO_DOCS',
      'No documents provided in submission.',
      null,
      {},
      {
        valid: false,
        tier: 'Invalid',
        decision: 'Reject: Missing Required Documents',
        priority: 'None',
        recommendation: 'Reject: Missing Required Documents',
        confidenceScore: 0,
        summary: 'At least one document (resume or certificate) is required.',
      }
    );

    // Decision Node 3: Resume Depth Analysis (Keywords + Sections)
    const nodeResumeQualityBoth = new DecisionTreeNode(
      'NODE_RESUME_QUALITY_BOTH',
      'Evaluates resume depth for dual submissions',
      (ctx) => (
        (ctx.precheck?.sectionCount || 0) >= 3 &&
        (ctx.precheck?.keywordMatches?.length || 0) >= 1 ? 'high' : 'standard'
      ),
      {
        high: leafBothComprehensive,
        standard: leafBothStandard,
      }
    );

    const nodeResumeQualitySingle = new DecisionTreeNode(
      'NODE_RESUME_QUALITY_SINGLE',
      'Evaluates resume depth for resume-only submissions',
      (ctx) => (
        (ctx.precheck?.sectionCount || 0) >= 3 &&
        (ctx.precheck?.keywordMatches?.length || 0) >= 2 ? 'high' : 'standard'
      ),
      {
        high: leafResumeOnlyStrong,
        standard: leafResumeOnlyBasic,
      }
    );

    // Decision Node 1: Root - Document Submission Choice
    const rootNode = new DecisionTreeNode(
      'NODE_ROOT_DOC_TYPE',
      'Routes evaluation based on document composition (resume, certificate, or both)',
      (ctx) => {
        const hasResume = Boolean(ctx.hasResume);
        const hasCert = Boolean(ctx.hasCertificate);
        if (hasResume && hasCert) return 'both';
        if (hasResume) return 'resume_only';
        if (hasCert) return 'certificate_only';
        return 'none';
      },
      {
        both: nodeResumeQualityBoth,
        resume_only: nodeResumeQualitySingle,
        certificate_only: leafCertOnly,
        none: leafNoDocs,
      }
    );

    return rootNode;
  }

  /**
   * Traverses the Decision Tree using applicant and document context.
   *
   * @param {object} context
   * @param {boolean} context.hasResume
   * @param {boolean} context.hasCertificate
   * @param {object} context.precheck
   * @returns {object} Decision path trace and leaf recommendation payload
   */
  evaluate(context) {
    const trace = [];
    let current = this.root;

    while (current && !current.isLeaf()) {
      trace.push({
        nodeId: current.id,
        description: current.description,
      });

      const branch = current.predicate(context);
      const next = current.children[branch];

      if (!next) {
        break;
      }
      current = next;
    }

    if (current && current.isLeaf()) {
      trace.push({
        nodeId: current.id,
        description: current.description,
      });

      return {
        ...current.leafResult,
        decision: current.leafResult?.decision || current.leafResult?.recommendation || 'Evaluated',
        leafResult: current.leafResult,
        trace,
      };
    }

    return {
      valid: true,
      tier: 'standard',
      decision: 'Route to Review Queue',
      recommendation: 'Standard Review Queue',
      confidenceScore: 60,
      summary: 'Submission received for human reviewer assessment.',
      trace,
    };
  }
}

/**
 * Rules-Based Resume Pre-Checker
 * Performs rule-based keyword search, section parsing, and date sanity audits.
 */
class ResumePreChecker {
  /**
   * Domain keyword dictionary mapping common skills to relevant technical terms.
   */
  static DOMAIN_KEYWORDS = {
    python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'scipy', 'pytorch', 'scripting', 'backend'],
    javascript: ['javascript', 'js', 'es6', 'typescript', 'node', 'react', 'vue', 'next', 'express', 'frontend'],
    react: ['react', 'jsx', 'redux', 'hooks', 'router', 'tailwind', 'frontend', 'web', 'javascript'],
    'data science': ['data science', 'machine learning', 'analytics', 'statistics', 'pandas', 'numpy', 'sql', 'models', 'visualization'],
    'web design': ['ui', 'ux', 'figma', 'css', 'html', 'responsive', 'wireframe', 'prototype', 'typography'],
    sql: ['sql', 'database', 'postgresql', 'postgres', 'queries', 'schema', 'relational', 'indexing', 'tables'],
    'machine learning': ['machine learning', 'deep learning', 'neural', 'tensorflow', 'pytorch', 'training', 'supervised', 'regression'],
    guitar: ['guitar', 'music', 'chords', 'scales', 'acoustic', 'electric', 'strumming', 'fingerpicking', 'performance'],
    'public speaking': ['public speaking', 'presentation', 'speech', 'communication', 'toastmasters', 'keynote', 'workshop', 'coaching'],
    leadership: ['leadership', 'management', 'team', 'agile', 'scrum', 'coaching', 'strategy', 'mentoring'],
  };

  /**
   * Expected canonical sections in professional resumes.
   */
  static EXPECTED_SECTIONS = [
    { name: 'Summary', pattern: /\b(summary|profile|about\s+me|objective|professional\s+summary)\b/i },
    { name: 'Experience', pattern: /\b(experience|employment|work\s+history|professional\s+background)\b/i },
    { name: 'Education', pattern: /\b(education|academic|degree|university|college|bachelor|master|phd|gpa)\b/i },
    { name: 'Skills', pattern: /\b(skills|technical\s+skills|competencies|proficiencies|technologies)\b/i },
    { name: 'Projects', pattern: /\b(projects|portfolio|personal\s+projects|open\s+source|work\s+samples)\b/i },
  ];

  /**
   * Instance method wrapper for analyze.
   */
  analyze(text, skillOrSkills) {
    return ResumePreChecker.analyze(text, skillOrSkills);
  }

  /**
   * Executes rule-based precheck on raw resume text or buffer string.
   *
   * @param {string} text - Extracted resume text.
   * @param {string|string[]} skillOrSkills - Claimed skill name or array of skills.
   * @returns {object} Precheck diagnostic report.
   */
  static analyze(text, skillOrSkills) {
    const raw = (text || '').toLowerCase();
    const skillsList = Array.isArray(skillOrSkills)
      ? skillOrSkills
      : [skillOrSkills].filter(Boolean);

    // 1. Skill keyword matches across given skill list
    const matchedKeywords = [];
    for (const s of skillsList) {
      const cleanSkill = (s || '').toLowerCase().trim();
      const domainTerms = ResumePreChecker.DOMAIN_KEYWORDS[cleanSkill] || [cleanSkill];
      for (const term of domainTerms) {
        if (raw.includes(term.toLowerCase()) && !matchedKeywords.includes(term.toLowerCase())) {
          matchedKeywords.push(term.toLowerCase());
        }
      }
    }

    // Direct mentions
    let directMentionCount = 0;
    for (const s of skillsList) {
      const cleanSkill = (s || '').toLowerCase().trim();
      const occurrences = (raw.match(new RegExp(`\\b${cleanSkill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi')) || []).length;
      directMentionCount += occurrences;
    }

    // 2. Section detection
    const detectedSections = [];
    const missingSections = [];
    for (const sec of ResumePreChecker.EXPECTED_SECTIONS) {
      if (sec.pattern.test(raw)) {
        detectedSections.push(sec.name.toLowerCase());
      } else {
        missingSections.push(sec.name.toLowerCase());
      }
    }

    // 3. Date sanity check
    const currentYear = new Date().getFullYear();
    const dateAnomalies = [];

    // Find all 4-digit years between 1970 and 2099
    const yearMatches = raw.match(/\b(19\d{2}|20\d{2})\b/g) || [];
    for (const yStr of yearMatches) {
      const year = parseInt(yStr, 10);
      if (year > currentYear + 1) {
        dateAnomalies.push(`Future year detected: ${year} (current year: ${currentYear})`);
      }
    }

    // Check chronological order (e.g. "2024 - 2021" or "2023 to 2019")
    const rangeRegex = /\b(19\d{2}|20\d{2})\s*(?:-|–|to|until)\s*(19\d{2}|20\d{2})\b/gi;
    let rangeMatch;
    while ((rangeMatch = rangeRegex.exec(raw)) !== null) {
      const startYear = parseInt(rangeMatch[1], 10);
      const endYear = parseInt(rangeMatch[2], 10);
      if (endYear < startYear) {
        dateAnomalies.push(`Inverted date interval detected: ${startYear} to ${endYear}`);
      }
    }

    // 4. Feedback synthesis (strictly preliminary guidance)
    const feedbackTips = [];
    if (matchedKeywords.length === 0) {
      feedbackTips.push(`Your resume does not explicitly mention keywords related to the requested skills. Consider highlighting relevant experience.`);
    } else {
      feedbackTips.push(`Found ${matchedKeywords.length} relevant skill keyword(s): ${matchedKeywords.slice(0, 5).join(', ')}.`);
    }

    if (detectedSections.length < 2) {
      feedbackTips.push(`Could not clearly identify standard resume sections. Consider organizing with headings like "Experience", "Education", and "Skills".`);
    } else {
      feedbackTips.push(`Detected standard resume sections: ${detectedSections.join(', ')}.`);
    }

    if (dateAnomalies.length > 0) {
      feedbackTips.push(`Date check: ${dateAnomalies[0]}`);
    } else {
      feedbackTips.push(`Chronological date consistency verified.`);
    }

    return {
      skillName: Array.isArray(skillOrSkills) ? skillOrSkills.join(', ') : (skillOrSkills || ''),
      directMentions: directMentionCount,
      keywordMatches: matchedKeywords,
      detectedSkills: matchedKeywords,
      detectedSections,
      missingSections,
      sectionCount: detectedSections.length,
      totalSectionsFound: detectedSections.length,
      dateAnomalies,
      anomalies: dateAnomalies,
      feedbackTips,
      preliminaryNotice:
        'Preliminary rules-based pre-check report provides non-binding guidance. Final review is human-adjudicated.',
      reviewNotice: 'Human reviewer adjudication typically takes 2 business days.',
    };
  }
}

/**
 * Explicit Application Lifecycle State Machine
 * Formulates and verifies legal transitions between verification application statuses.
 */
class VerificationLifecycleManager {
  static STATES = {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    NEEDS_INFORMATION: 'needs_information',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  };

  /**
   * Directed transition graph: fromState -> Set of valid toStates.
   */
  static ALLOWED_TRANSITIONS = {
    submitted: new Set(['under_review']),
    under_review: new Set(['approved', 'rejected', 'needs_information', 'under_review']),
    needs_information: new Set(['submitted', 'under_review', 'rejected']),
    approved: new Set([]), // Terminal state for this cycle
    rejected: new Set(['submitted']), // May re-apply by initiating new submission
  };

  /**
   * Instance method wrapper for isValidTransition.
   */
  isValidTransition(fromState, toState) {
    return VerificationLifecycleManager.validateTransition(fromState, toState).allowed;
  }

  /**
   * Maps review target state to its action verb.
   */
  getActionForState(targetState) {
    const actionMap = {
      under_review: 'start_review',
      needs_information: 'request_info',
      approved: 'approve',
      rejected: 'reject',
    };
    return actionMap[targetState] || targetState;
  }

  /**
   * Validates whether a state transition is permitted.
   *
   * @param {string} fromState
   * @param {string} toState
   * @returns {{ allowed: boolean, reason?: string }}
   */
  static validateTransition(fromState, toState) {
    const validCurrent = Object.values(VerificationLifecycleManager.STATES).includes(fromState);
    const validTarget = Object.values(VerificationLifecycleManager.STATES).includes(toState);

    if (!validCurrent) {
      return { allowed: false, reason: `Invalid current state: "${fromState}"` };
    }
    if (!validTarget) {
      return { allowed: false, reason: `Invalid target state: "${toState}"` };
    }

    const allowedTargets = VerificationLifecycleManager.ALLOWED_TRANSITIONS[fromState];
    if (!allowedTargets || !allowedTargets.has(toState)) {
      return {
        allowed: false,
        reason: `Illegal transition from "${fromState}" to "${toState}". Only permitted transitions: [${Array.from(allowedTargets || []).join(', ')}]`,
      };
    }

    return { allowed: true };
  }
}

module.exports = {
  DecisionTreeNode,
  VerificationDecisionTree,
  ResumePreChecker,
  VerificationLifecycleManager,
};
