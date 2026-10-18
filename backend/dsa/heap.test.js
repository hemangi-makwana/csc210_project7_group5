/**
 * ============================================================================
 * UNIT TESTS: MAX-HEAP / PRIORITY QUEUE MODULE
 * ============================================================================
 *
 * Verifies that the custom MaxHeap class works accurately:
 * 1. Insertion and siftUp restoring max-heap property.
 * 2. extractMax and siftDown returning highest priority elements in order.
 * 3. peek and isEmpty methods.
 * 4. heapify building valid heap in O(n) time.
 * 5. extractTopK extracting top-k recommendations in descending order.
 * 6. computeRecommendationScore incorporating skill overlap, reputation, and graph proximity.
 */

const MaxHeap = require("./heap");

describe("MaxHeap / Priority Queue Data Structure Tests", () => {
  let heap;

  beforeEach(() => {
    heap = new MaxHeap();
  });

  test("should start empty and peek should return null", () => {
    expect(heap.isEmpty()).toBe(true);
    expect(heap.size()).toBe(0);
    expect(heap.peek()).toBe(null);
    expect(heap.extractMax()).toBe(null);
  });

  test("should insert elements and maintain max at root", () => {
    heap.insert({ name: "Low", score: 40 });
    heap.insert({ name: "High", score: 95 });
    heap.insert({ name: "Medium", score: 70 });

    expect(heap.size()).toBe(3);
    expect(heap.peek().name).toBe("High");
    expect(heap.peek().score).toBe(95);
  });

  test("should extract elements in descending priority order", () => {
    const scores = [15, 80, 45, 99, 30, 85, 60];
    scores.forEach((s) => heap.insert({ id: `item_${s}`, score: s }));

    const extractedScores = [];
    while (!heap.isEmpty()) {
      extractedScores.push(heap.extractMax().score);
    }

    expect(extractedScores).toEqual([99, 85, 80, 60, 45, 30, 15]);
  });

  test("heapify should build a valid max-heap in linear O(n) time", () => {
    const rawItems = [
      { id: "A", score: 20 },
      { id: "B", score: 88 },
      { id: "C", score: 55 },
      { id: "D", score: 92 },
      { id: "E", score: 40 },
    ];

    heap.heapify(rawItems);
    expect(heap.size()).toBe(5);
    expect(heap.peek().score).toBe(92);

    const first = heap.extractMax();
    const second = heap.extractMax();
    expect(first.score).toBe(92);
    expect(second.score).toBe(88);
  });

  test("extractTopK should extract only the top k elements in descending order", () => {
    const candidates = [
      { name: "M1", score: 50 },
      { name: "M2", score: 92 },
      { name: "M3", score: 75 },
      { name: "M4", score: 88 },
      { name: "M5", score: 60 },
      { name: "M6", score: 95 },
    ];

    heap.heapify(candidates);
    const top3 = heap.extractTopK(3);

    expect(top3.length).toBe(3);
    expect(top3.map((m) => m.name)).toEqual(["M6", "M2", "M4"]);
    expect(top3.map((m) => m.score)).toEqual([95, 92, 88]);
    expect(heap.size()).toBe(3); // remaining 3 elements stay in heap
  });

  test("computeRecommendationScore should incorporate skills, reputation, and network proximity", () => {
    const mentor = {
      id: "mentor_1",
      name: "Dr. Tech",
      skills: [
        { skill_name: "Python", level: "expert" },
        { skill_name: "Machine Learning", level: "expert" },
      ],
      reputation_score: 5.0,
    };

    // Case 1: High skill overlap + 5.0 rating + 1st degree proximity
    const resDirect = MaxHeap.computeRecommendationScore(mentor, ["Python"], 1);
    expect(resDirect.score).toBeGreaterThan(85);
    expect(resDirect.breakdown.proximityScore).toBe(20);
    expect(resDirect.reason).toContain("direct 1st-degree peer connection");

    // Case 2: Same mentor but 3rd degree / distant proximity
    const resDistant = MaxHeap.computeRecommendationScore(mentor, ["Python"], 3);
    expect(resDistant.breakdown.proximityScore).toBe(10);
    expect(resDirect.score).toBeGreaterThan(resDistant.score);

    // Case 3: Completely disconnected mentor
    const resDisconnected = MaxHeap.computeRecommendationScore(mentor, ["Python"], Infinity);
    expect(resDisconnected.breakdown.proximityScore).toBe(5);
  });
});
