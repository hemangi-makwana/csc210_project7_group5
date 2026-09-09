/**
 * ============================================================================
 * UNIT TESTS: FIFO QUEUE MODULE
 * ============================================================================
 *
 * These tests verify that our custom Queue class works accurately:
 * 1. Starts empty.
 * 2. Enqueues items and reports correct size.
 * 3. Dequeues items in strict First-In, First-Out (FIFO) arrival order.
 * 4. Peeks at the front item without removing it.
 * 5. Safely handles dequeuing from an empty queue.
 */

const Queue = require("./queue");

describe("FIFO Queue Data Structure Tests", () => {
  let queue;

  beforeEach(() => {
    // Create a fresh queue before each test
    queue = new Queue();
  });

  test("should start as completely empty", () => {
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBeNull();
  });

  test("should enqueue booking requests and report not empty", () => {
    const booking = {
      mentorId: "user_1",
      learnerId: "user_2",
      scheduledAt: "2026-09-15T10:00:00Z",
    };

    queue.enqueue(booking);

    expect(queue.isEmpty()).toBe(false);
    expect(queue.size()).toBe(1);
    expect(queue.peek()).toEqual(booking);
  });

  test("should dequeue items in the exact FIFO order they were added", () => {
    const firstBooking = { id: 1, student: "Alice" };
    const secondBooking = { id: 2, student: "Bob" };
    const thirdBooking = { id: 3, student: "Charlie" };

    // Enqueue 3 requests in order
    queue.enqueue(firstBooking);
    queue.enqueue(secondBooking);
    queue.enqueue(thirdBooking);

    expect(queue.size()).toBe(3);

    // The first one in must be the first one out
    const servedFirst = queue.dequeue();
    expect(servedFirst).toEqual(firstBooking);
    expect(queue.size()).toBe(2);

    // The second one in must be the second one out
    const servedSecond = queue.dequeue();
    expect(servedSecond).toEqual(secondBooking);
    expect(queue.size()).toBe(1);

    // The third one in must be the last one out
    const servedThird = queue.dequeue();
    expect(servedThird).toEqual(thirdBooking);
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  test("should peek at the next booking in line without removing it from the queue", () => {
    const nextInLine = { id: 10, student: "Dana" };
    queue.enqueue(nextInLine);

    // Peeking once
    expect(queue.peek()).toEqual(nextInLine);
    // Size should still be 1 because peek does not remove the item
    expect(queue.size()).toBe(1);

    // Peeking again should return the exact same item
    expect(queue.peek()).toEqual(nextInLine);
    expect(queue.size()).toBe(1);
  });

  test("should safely return null when dequeuing from an empty queue", () => {
    expect(queue.isEmpty()).toBe(true);
    const dequeuedItem = queue.dequeue();
    expect(dequeuedItem).toBeNull();
  });

  test("should ignore undefined or null items gracefully", () => {
    queue.enqueue(null);
    queue.enqueue(undefined);
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });
});
