/**
 * ============================================================================
 * UNIT TESTS: HASH TABLE MODULE
 * ============================================================================
 *
 * These tests verify that our custom HashTable class works accurately:
 * 1. Inserting and looking up skills.
 * 2. Handling non-existent skills gracefully.
 * 3. Handling collisions when two different skills map to the same bucket.
 * 4. Handling case-insensitive queries (e.g. "python" vs "Python").
 * 5. Storing multiple mentors under the same skill.
 */

const HashTable = require("./hashTable");

describe("HashTable Data Structure Tests", () => {
  let hashTable;

  beforeEach(() => {
    // Create a fresh hash table with standard 31 buckets before each test
    hashTable = new HashTable(31);
  });

  test("should return an empty list when searching for a skill nobody has", () => {
    const searchResult = hashTable.lookup("UnderwaterBasketWeaving");
    expect(searchResult).toEqual([]);
    expect(searchResult.length).toBe(0);
  });

  test("should successfully insert and retrieve a mentor for a given skill", () => {
    const fakeMentor = {
      userId: "user_101",
      name: "Sarah Connor",
      level: "expert",
      skills: ["Cybersecurity"],
      reputationScore: 4.9,
    };

    hashTable.insert("Cybersecurity", fakeMentor);

    const mentors = hashTable.lookup("Cybersecurity");
    expect(mentors.length).toBe(1);
    expect(mentors[0].name).toBe("Sarah Connor");
    expect(mentors[0].userId).toBe("user_101");
  });

  test("should allow multiple mentors to teach the exact same skill", () => {
    const mentorOne = {
      userId: "user_1",
      name: "Alice",
      level: "expert",
      skills: ["Python"],
      reputationScore: 5.0,
    };
    const mentorTwo = {
      userId: "user_2",
      name: "Bob",
      level: "intermediate",
      skills: ["Python"],
      reputationScore: 4.2,
    };

    hashTable.insert("Python", mentorOne);
    hashTable.insert("Python", mentorTwo);

    const mentors = hashTable.lookup("Python");
    expect(mentors.length).toBe(2);
    expect(mentors.map((mentor) => mentor.name)).toEqual(["Alice", "Bob"]);
  });

  test("should be case-insensitive and trim extra whitespace when looking up", () => {
    const mentor = {
      userId: "user_3",
      name: "Carlos",
      level: "expert",
      skills: ["Web Design"],
      reputationScore: 4.8,
    };

    hashTable.insert("Web Design", mentor);

    // Searching with different casing and whitespace
    expect(hashTable.lookup("web design").length).toBe(1);
    expect(hashTable.lookup("WEB DESIGN").length).toBe(1);
    expect(hashTable.lookup("  Web Design  ").length).toBe(1);
  });

  test("should handle collisions so two different skills in the same bucket coexist without overwriting", () => {
    // We force a tiny hash table of only 2 buckets so collisions are guaranteed
    const tinyHashTable = new HashTable(2);

    const mentorPython = {
      userId: "user_p",
      name: "Python Guru",
      level: "expert",
      skills: ["Python"],
      reputationScore: 4.9,
    };
    const mentorGuitar = {
      userId: "user_g",
      name: "Guitar Maestro",
      level: "expert",
      skills: ["Guitar"],
      reputationScore: 4.7,
    };

    // Both skills are inserted into tiny table where they will share or collide
    tinyHashTable.insert("Python", mentorPython);
    tinyHashTable.insert("Guitar", mentorGuitar);

    const pythonResult = tinyHashTable.lookup("Python");
    const guitarResult = tinyHashTable.lookup("Guitar");

    // Both must be retrievable and neither must overwrite the other
    expect(pythonResult.length).toBe(1);
    expect(pythonResult[0].name).toBe("Python Guru");

    expect(guitarResult.length).toBe(1);
    expect(guitarResult[0].name).toBe("Guitar Maestro");
  });

  test("should return an empty list if invalid input or empty string is looked up", () => {
    expect(hashTable.lookup("")).toEqual([]);
    expect(hashTable.lookup(null)).toEqual([]);
    expect(hashTable.lookup(undefined)).toEqual([]);
  });
});
