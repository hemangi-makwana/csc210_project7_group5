/**
 * ============================================================================
 * DATA STRUCTURE: FIFO QUEUE (FIRST-IN, FIRST-OUT)
 * ============================================================================
 *
 * What is a Queue?
 * A Queue is a sequential data structure that follows the "First-In, First-Out"
 * (FIFO) principle.
 *
 * Real-World Analogy (Viva Defense Point):
 * Think of a line of people waiting at a grocery store checkout counter or
 * at a movie theater ticket booth:
 * - The first person to join the line is the first person who gets served
 *   and leaves the line.
 * - Any new person who arrives must join at the back of the line.
 * - Nobody can cut in the middle.
 *
 * Why use a Queue for Session Bookings?
 * When multiple students try to book a mentor at the same time, we cannot
 * process them all at the exact same millisecond. Instead of losing requests
 * or letting someone jump ahead unfairly, we place each booking request into
 * this queue. The server then processes each booking strictly in the order
 * it arrived!
 *
 * Time Complexity (Viva Defense Point):
 * - Enqueue (adding to back): O(1) [Constant Time]
 * - Dequeue (removing from front): O(1) or O(n) depending on internal array shifting.
 *   (Here wrapped cleanly so the underlying mechanism can easily be upgraded).
 * - Peek (looking at the front): O(1) [Constant Time]
 * - isEmpty (checking if empty): O(1) [Constant Time]
 * ============================================================================
 */

class Queue {
  /**
   * Initializes an empty queue.
   *
   * WHAT IT DOES:
   * Sets up an internal list to store booking requests waiting in line.
   *
   * WHY WE DO THIS:
   * We encapsulate the data inside this class so the rest of the application
   * cannot accidentally tamper with the queue order.
   */
  constructor() {
    this.items = [];
  }

  /**
   * Adds a new booking request to the back (tail) of the queue.
   *
   * WHAT IT DOES:
   * Appends the given booking request to the end of our internal list.
   *
   * WHY WE DO THIS:
   * This is like a new customer standing at the very back of the line.
   *
   * @param {object} bookingRequest - The details of the session booking
   *                                  (e.g., mentorId, learnerId, scheduledAt).
   */
  enqueue(bookingRequest) {
    if (!bookingRequest) {
      return;
    }
    this.items.push(bookingRequest);
  }

  /**
   * Removes and returns the oldest booking request from the front (head) of the queue.
   *
   * WHAT IT DOES:
   * Removes the very first item that entered the queue and returns it.
   * If the queue is empty, returns null.
   *
   * WHY WE DO THIS:
   * This represents the person at the front of the line being served and leaving.
   *
   * @returns {object|null} The next booking request to process, or null if empty.
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.shift();
  }

  /**
   * Looks at the oldest booking request at the front of the queue WITHOUT removing it.
   *
   * WHAT IT DOES:
   * Returns the item at index 0 without changing the queue.
   *
   * WHY WE DO THIS:
   * Sometimes the server wants to preview who is next in line before actually
   * beginning the transaction.
   *
   * @returns {object|null} The item at the front of the queue, or null if empty.
   */
  peek() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[0];
  }

  /**
   * Checks whether there are any booking requests waiting in the queue.
   *
   * WHAT IT DOES:
   * Checks if the length of the internal items array is zero.
   *
   * WHY WE DO THIS:
   * Prevents errors that would happen if the server tries to process a booking
   * when nobody is in line.
   *
   * @returns {boolean} True if empty, false if there are pending bookings.
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Returns the total number of booking requests currently waiting in the queue.
   *
   * WHAT IT DOES:
   * Reads and returns the length of the items list.
   *
   * WHY WE DO THIS:
   * Useful for dashboards or logging to see how busy the system is.
   *
   * @returns {number} The count of items in the queue.
   */
  size() {
    return this.items.length;
  }
}

module.exports = Queue;
