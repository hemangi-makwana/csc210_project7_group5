/**
 * ============================================================================
 * DATA STRUCTURE: HASH TABLE (WITH SEPARATE CHAINING)
 * ============================================================================
 *
 * What is a Hash Table?
 * Imagine a large filing cabinet with 31 numbered drawers (called "buckets").
 * When you want to store someone's information under a skill like "Python", you
 * run the word "Python" through a formula called a "hash function".
 *
 * The hash function does some quick math on the letters and spits out a drawer
 * number (for example, drawer #14). You go directly to drawer #14 and place the
 * file inside.
 *
 * Why is this fast?
 * When someone searches for "Python" later, you don't have to look through
 * every drawer in the cabinet. You just run "Python" through the formula again,
 * get #14, open that exact drawer, and find the data immediately!
 *
 * Time Complexity (Viva Defense Point):
 * - Average Case Lookup: O(1) [Constant Time].
 *   Why? Because the hash function jumps directly to the correct bucket index
 *   in one calculation, without looping through the rest of the database.
 * - Worst Case Lookup: O(n) [Linear Time].
 *   Why? If the hash function were poor and placed every single skill into
 *   the exact same bucket, you would have to check each item one by one.
 *
 * Collision Handling (Chaining):
 * A "collision" happens when two different skill names (e.g., "Guitar" and
 * "Drawing") happen to produce the same drawer/bucket number.
 * We handle this using "chaining": each bucket contains a small list (array).
 * If two skills land in the same bucket, they both live peacefully inside that
 * bucket's list as separate entries without overwriting each other.
 * ============================================================================
 */

class HashTable {
  /**
   * Initializes the Hash Table with a fixed number of buckets.
   *
   * WHY 31 BUCKETS? (VIVA DEFENSE POINT):
   * We choose 31 because it is a prime number. In modular arithmetic
   * (index = hashValue % bucketCount), prime numbers help spread keys
   * uniformly across all buckets and prevent common numerical patterns
   * in text from bunching up (clustering) into the same bucket.
   *
   * @param {number} bucketCount - The number of buckets (drawers) to create.
   */
  constructor(bucketCount = 31) {
    this.bucketCount = bucketCount;

    // Create an array with 31 empty buckets.
    // Each bucket is initialized as an empty array: []
    this.buckets = new Array(bucketCount);
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      this.buckets[bucketIndex] = [];
    }
  }

  /**
   * Converts a skill name string into a bucket index number (0 to bucketCount - 1).
   *
   * WHAT IT DOES:
   * It takes each character in the skill name, finds its ASCII/Unicode number,
   * multiplies and adds them together, and then uses the modulo operator (%)
   * to ensure the final number fits within our bucket array.
   *
   * WHY WE DO THIS:
   * Computers only understand numbers for array indexes. This mathematical
   * function gives us a deterministic number for any given word.
   *
   * @param {string} skillName - The skill name to hash (e.g., "Python").
   * @returns {number} A valid bucket index between 0 and bucketCount - 1.
   */
  hash(skillName) {
    // Standardize the string to lowercase so "Python" and "python" give the same index
    const normalizedSkillName = skillName.trim().toLowerCase();

    let totalHashValue = 0;
    // 31 is also a prime multiplier commonly used in string hashing (like Java's String.hashCode)
    const primeMultiplier = 31;

    for (let characterIndex = 0; characterIndex < normalizedSkillName.length; characterIndex++) {
      const characterCode = normalizedSkillName.charCodeAt(characterIndex);
      totalHashValue = (totalHashValue * primeMultiplier + characterCode) % this.bucketCount;
    }

    return totalHashValue;
  }

  /**
   * Inserts a user entry under a specific skill name.
   *
   * WHAT IT DOES:
   * 1. Finds the right bucket for the skill using hash().
   * 2. Checks if the skill already exists in that bucket.
   * 3. If it exists, adds the new user to that skill's mentor list.
   * 4. If it's a brand-new skill, creates a new entry with the user in it.
   *
   * WHY WE DO THIS:
   * Multiple mentors can teach the same skill (e.g., both Alice and Bob teach "Python").
   * Storing a list of mentors under each skill key allows instant lookup of everyone
   * who can teach that skill.
   *
   * @param {string} skillName - The skill being offered (e.g., "Python").
   * @param {object} userEntry - The mentor's details: { userId, name, level, skills, reputationScore }
   */
  insert(skillName, userEntry) {
    if (!skillName || typeof skillName !== "string") {
      return;
    }

    const normalizedSkillName = skillName.trim().toLowerCase();
    const targetBucketIndex = this.hash(normalizedSkillName);
    const bucket = this.buckets[targetBucketIndex];

    // Check if this skill already has an entry inside this bucket (chaining search)
    for (let entryIndex = 0; entryIndex < bucket.length; entryIndex++) {
      const existingEntry = bucket[entryIndex];
      if (existingEntry.skillName === normalizedSkillName) {
        // Prevent duplicate user entries for the same user ID
        const alreadyExists = existingEntry.users.some(
          (existingUser) => existingUser.userId === userEntry.userId
        );
        if (!alreadyExists) {
          existingEntry.users.push(userEntry);
        }
        return;
      }
    }

    // If the skill is not in the bucket yet, add a new key-value entry
    bucket.push({
      skillName: normalizedSkillName,
      displayName: skillName.trim(),
      users: [userEntry],
    });
  }

  /**
   * Looks up and returns all mentors who teach a specific skill.
   *
   * WHAT IT DOES:
   * 1. Hashes the search term to jump directly to the target bucket in O(1) time.
   * 2. Scans the small list in that bucket to find the matching skill.
   * 3. Returns the list of mentor objects, or an empty list if not found.
   *
   * WHY WE DO THIS:
   * This powers our mentor search API. It retrieves matching mentors without
   * having to scan through the entire user base.
   *
   * @param {string} skillName - The skill being searched for (e.g., "Python").
   * @returns {Array<object>} An array of mentor objects, or [] if no match.
   */
  lookup(skillName) {
    if (!skillName || typeof skillName !== "string") {
      return [];
    }

    const normalizedSkillName = skillName.trim().toLowerCase();
    const targetBucketIndex = this.hash(normalizedSkillName);
    const bucket = this.buckets[targetBucketIndex];

    // Scan through the small list inside this specific bucket
    for (let entryIndex = 0; entryIndex < bucket.length; entryIndex++) {
      const entry = bucket[entryIndex];
      if (entry.skillName === normalizedSkillName) {
        // Return a copy of the list so external code doesn't mutate our internal data
        return [...entry.users];
      }
    }

    // If we searched the bucket and didn't find the skill, return an empty array
    return [];
  }
}

module.exports = HashTable;
