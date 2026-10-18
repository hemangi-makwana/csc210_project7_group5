/**
 * ============================================================================
 * DATA STRUCTURE: MAX-HEAP / PRIORITY QUEUE
 * ============================================================================
 *
 * What is a Max-Heap?
 * A Max-Heap is a complete binary tree where every parent node has a value
 * greater than or equal to its children:
 *                     [ Root: Highest Priority / Top Score ]
 *                                /              \
 *                     [ Child <= Root ]   [ Child <= Root ]
 *
 * In array representation:
 * For any element at index i:
 * - Parent index: Math.floor((i - 1) / 2)
 * - Left child index: 2 * i + 1
 * - Right child index: 2 * i + 2
 *
 * Real-World Analogy (Viva Defense Point):
 * Think of an emergency room triage queue or a leaderboard:
 * - The most urgent or highest-scoring patient/player is always sitting at the
 *   very front (root).
 * - When a new candidate enters, they bubble up to their rightful ranking.
 * - When the top candidate is taken, the last candidate moves to the root and
 *   bubbles down, swiftly re-establishing the proper priority order in O(log n) time.
 *
 * Why use a Max-Heap for Mentor Recommendations?
 * When recommending mentors out of a community of hundreds of candidates:
 * - We do NOT need to sort the entire database (which would cost O(n log n)).
 * - We only need the top-k mentors (e.g. top 6 recommendations).
 * - A Max-Heap allows extracting the top-k recommendations in O(k log n) time!
 * - Heapify (building the heap from an unsorted list) takes only O(n) time.
 *
 * Time Complexity (Viva Defense Point):
 * - Insert (Push): O(log n) [Bubbles up at most tree height]
 * - Extract Max (Pop): O(log n) [Bubbles down at most tree height]
 * - Peek (Get Maximum): O(1) [Root is always at index 0]
 * - Heapify (Build from array): O(n) [Linear time bottom-up sift-down]
 * - Extract Top-K: O(k log n)
 *
 * Space Complexity:
 * - O(n) to store candidate records in contiguous array memory.
 * ============================================================================
 */

class MaxHeap {
  /**
   * Initializes an empty Max-Heap.
   *
   * @param {function} [comparator] - Optional custom comparison function (a, b) => number.
   *                                  Defaults to comparing .score or .priority.
   */
  constructor(comparator = null) {
    this.heap = [];
    this.comparator =
      comparator ||
      ((a, b) => {
        const scoreA = a !== null && typeof a === "object" ? (a.score ?? a.priority ?? 0) : Number(a);
        const scoreB = b !== null && typeof b === "object" ? (b.score ?? b.priority ?? 0) : Number(b);
        return scoreA - scoreB;
      });
  }

  /**
   * Returns parent index for node at index i.
   */
  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  /**
   * Returns left child index for node at index i.
   */
  getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  /**
   * Returns right child index for node at index i.
   */
  getRightChildIndex(i) {
    return 2 * i + 2;
  }

  /**
   * Swaps elements at index i and index j in the heap array.
   */
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Inserts an item into the heap and restores max-heap invariant via sift-up (bubble-up).
   *
   * TIME COMPLEXITY: O(log n)
   *
   * @param {object|number} item - Candidate record or item
   * @param {number} [priority] - Optional explicit priority/score
   */
  insert(item, priority = null) {
    const node =
      priority !== null && typeof item === "object" && item !== null
        ? { ...item, score: Number(priority) }
        : item;

    this.heap.push(node);
    this.siftUp(this.heap.length - 1);
  }

  /**
   * Moves element at index i up until the max-heap property is satisfied.
   *
   * @param {number} index
   */
  siftUp(index) {
    let current = index;
    while (current > 0) {
      const parent = this.getParentIndex(current);
      // If child > parent, swap and continue upward
      if (this.comparator(this.heap[current], this.heap[parent]) > 0) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  /**
   * Removes and returns the maximum (highest-priority) element from the root of the heap.
   *
   * TIME COMPLEXITY: O(log n)
   *
   * @returns {object|null} The maximum element, or null if the heap is empty
   */
  extractMax() {
    if (this.isEmpty()) {
      return null;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const max = this.heap[0];
    // Move last element to root and sift down
    this.heap[0] = this.heap.pop();
    this.siftDown(0);
    return max;
  }

  /**
   * Moves element at index i down until the max-heap property is satisfied.
   *
   * @param {number} index
   */
  siftDown(index) {
    let current = index;
    const length = this.heap.length;

    while (this.getLeftChildIndex(current) < length) {
      let largest = current;
      const left = this.getLeftChildIndex(current);
      const right = this.getRightChildIndex(current);

      if (left < length && this.comparator(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }

      if (right < length && this.comparator(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }

      if (largest !== current) {
        this.swap(current, largest);
        current = largest;
      } else {
        break;
      }
    }
  }

  /**
   * Returns the maximum element without removing it.
   *
   * TIME COMPLEXITY: O(1)
   *
   * @returns {object|null}
   */
  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  /**
   * Returns the current number of elements in the heap.
   *
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * Checks whether the heap is empty.
   *
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Builds the max-heap in linear O(n) time from an array of items.
   *
   * WHY O(n)? (VIVA DEFENSE POINT):
   * Bottom-up heap construction runs sift-down on internal nodes starting
   * at index Math.floor(n / 2) - 1. Because most nodes live near the bottom
   * of the tree and only sift down 1 or 2 levels, the mathematical summation
   * converges to O(n), which is faster than n individual inserts O(n log n).
   *
   * @param {Array} items
   */
  heapify(items) {
    if (!Array.isArray(items)) return;
    this.heap = [...items];
    const startIndex = Math.floor(this.heap.length / 2) - 1;
    for (let i = startIndex; i >= 0; i--) {
      this.siftDown(i);
    }
  }

  /**
   * Extracts the top-k highest scoring elements in descending order.
   *
   * TIME COMPLEXITY: O(k log n)
   *
   * @param {number} k - Number of top elements to extract
   * @returns {Array} Array of top-k elements
   */
  extractTopK(k) {
    const count = Math.min(Math.max(0, parseInt(k, 10) || 0), this.size());
    const result = [];
    for (let i = 0; i < count; i++) {
      const top = this.extractMax();
      if (top !== null) {
        result.push(top);
      }
    }
    return result;
  }

  /**
   * Clears the heap.
   */
  clear() {
    this.heap = [];
  }

  /**
   * Static helper: Computes composite affinity score between a candidate mentor
   * and a learner, factoring in:
   * 1. Skill Overlap & Expertise Weight (40%)
   * 2. Reputation Rating (40%)
   * 3. Graph Network Proximity (20%)
   *
   * @param {object} mentor - Mentor user record { id, name, skills, reputation_score }
   * @param {Array<object|string>} learnerDesiredSkills - Skills the learner wants to learn
   * @param {number} networkDistance - Degrees of separation from graph (1=direct, 2=mutual, Infinity=none)
   * @returns {{ score: number, breakdown: object, reason: string }}
   */
  static computeRecommendationScore(mentor, learnerDesiredSkills = [], networkDistance = Infinity) {
    const desiredNames = learnerDesiredSkills.map((s) =>
      (typeof s === "string" ? s : s.skill_name || s.skillName || "").trim().toLowerCase()
    ).filter(Boolean);

    // 1. Skill Overlap Score (0 - 40 points)
    const mentorSkills = (Array.isArray(mentor.skills) ? mentor.skills : []).map((s) => {
      if (typeof s === "string") return { name: s.trim().toLowerCase(), level: "intermediate" };
      return {
        name: (s.skill_name || s.skillName || "").trim().toLowerCase(),
        level: (s.level || "intermediate").toLowerCase(),
      };
    });

    let matchedSkillCount = 0;
    let skillExpertiseMultiplier = 1.0;
    const matchingSkills = [];

    for (const dSkill of desiredNames) {
      const found = mentorSkills.find((ms) => ms.name === dSkill);
      if (found) {
        matchedSkillCount++;
        matchingSkills.push(found.name);
        if (found.level === "expert") skillExpertiseMultiplier = Math.max(skillExpertiseMultiplier, 1.2);
        else if (found.level === "intermediate") skillExpertiseMultiplier = Math.max(skillExpertiseMultiplier, 1.0);
        else skillExpertiseMultiplier = Math.max(skillExpertiseMultiplier, 0.8);
      }
    }

    let skillScore = 0;
    if (desiredNames.length > 0) {
      const matchRatio = matchedSkillCount / desiredNames.length;
      skillScore = Math.min(40, matchRatio * 35 * skillExpertiseMultiplier);
    } else {
      // Default baseline when user has not specified desired learning skills yet
      skillScore = 20;
    }

    // 2. Reputation Score (0 - 40 points)
    const rep = parseFloat(mentor.reputation_score || mentor.reputationScore) || 4.5;
    const reputationScore = Math.min(40, (rep / 5.0) * 40);

    // 3. Network Proximity Score (0 - 20 points)
    let proximityScore = 5; // Base disconnected score
    let proximityLabel = "community recommendation";

    if (networkDistance === 1) {
      proximityScore = 20;
      proximityLabel = "direct 1st-degree peer connection";
    } else if (networkDistance === 2) {
      proximityScore = 15;
      proximityLabel = "2nd-degree mutual peer network";
    } else if (networkDistance === 3) {
      proximityScore = 10;
      proximityLabel = "3rd-degree extended community circle";
    }

    const totalRaw = skillScore + reputationScore + proximityScore;
    const finalScore = Math.min(99, Math.max(30, Math.round(totalRaw)));

    let reason;
    if (matchingSkills.length > 0) {
      reason = `Matches your desired learning in ${matchingSkills.slice(0, 2).join(", ")} (${rep}★ rating, ${proximityLabel}).`;
    } else {
      reason = `Top-rated community mentor (${rep}★ rating, ${proximityLabel}).`;
    }

    return {
      score: finalScore,
      breakdown: {
        skillScore: Math.round(skillScore),
        reputationScore: Math.round(reputationScore),
        proximityScore,
        networkDistance,
      },
      reason,
    };
  }
}

module.exports = MaxHeap;
