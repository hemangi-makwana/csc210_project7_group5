/**
 * ============================================================================
 * LOCAL SKILL EXCHANGE & COMMUNITY LEARNING PLATFORM - BACKEND SERVER
 * ============================================================================
 *
 * WHAT IS A SERVER? (PLAIN ENGLISH EXPLANATION FOR VIVA DEFENSE):
 * A server is simply a computer program that runs continuously in the
 * background, waiting for incoming messages (called "requests") from other
 * programs (like a web browser or mobile app, called the "frontend").
 *
 * When you open a website and type "Python" into a search box, your browser
 * sends an HTTP request across the internet to this file. This file receives
 * the request, does some work (like searching our Hash Table), and sends back
 * an answer (called a "response") containing the data formatted as JSON.
 *
 * WHAT DOES EXPRESS DO?
 * Node.js lets us run JavaScript outside a browser.
 * Express is a lightweight tool (framework) for Node.js that makes it easy to:
 * 1. Define "routes" or "endpoints" (URLs where the frontend can send requests).
 * 2. Read incoming data (like search keywords or booking form submissions).
 * 3. Send back formatted responses (JSON data and HTTP status codes like 200 OK).
 *
 * WHAT IS A PORT (PORT 5000)?
 * Think of a computer's IP address like an apartment building's street address.
 * The "port number" is like the specific apartment number inside that building.
 * Running on port 5000 means our backend program lives at apartment #5000.
 *
 * WHAT IS CORS (CROSS-ORIGIN RESOURCE SHARING)?
 * By default, web browsers block websites on one port (e.g. frontend on port 5173)
 * from talking to a backend on another port (e.g. backend on port 5000) for security.
 * Enabling CORS tells the browser: "It is safe to let our frontend talk to this backend!"
 * ============================================================================
 */

const express = require("express");
const cors = require("cors");
const HashTable = require("./dsa/hashTable");
const Queue = require("./dsa/queue");

// Create the Express application instance
const application = express();
const PORT = process.env.PORT || 5000;

// Middleware 1: Enable CORS so the React frontend can make requests to this backend
application.use(cors());

// Middleware 2: Automatically parse incoming JSON request bodies into JavaScript objects
application.use(express.json());

// ----------------------------------------------------------------------------
// DATA STRUCTURE INSTANCES (IN-MEMORY STORAGE)
// ----------------------------------------------------------------------------

// Hash Table for O(1) instant lookup of mentors by skill name
const skillHashTable = new HashTable(31);

// FIFO Queue for processing mentor session bookings in the order received
const bookingQueue = new Queue();

// ----------------------------------------------------------------------------
// SEED DATA POPULATION
// ----------------------------------------------------------------------------

// Complete list of mock users/mentors seeded into memory
const seedUsers = [
  {
    userId: "user_1",
    name: "Alice Chen",
    role: "professional",
    skills: ["Python", "Web Design"],
    reputationScore: 4.9,
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Web Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_2",
    name: "Bob Smith",
    role: "student",
    skills: ["Python", "Guitar"],
    reputationScore: 4.5,
    skillEntries: [
      { skillName: "Python", level: "intermediate" },
      { skillName: "Guitar", level: "beginner" },
    ],
  },
  {
    userId: "user_3",
    name: "Clara Garcia",
    role: "volunteer",
    skills: ["Python", "Public Speaking"],
    reputationScore: 4.7,
    skillEntries: [
      { skillName: "Python", level: "beginner" },
      { skillName: "Public Speaking", level: "expert" },
    ],
  },
  {
    userId: "user_4",
    name: "David Kim",
    role: "professional",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.8,
    skillEntries: [
      { skillName: "Guitar", level: "expert" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },
  {
    userId: "user_5",
    name: "Elena Rostova",
    role: "professional",
    skills: ["Python", "Web Design"],
    reputationScore: 5.0,
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Web Design", level: "expert" },
    ],
  },
  {
    userId: "user_6",
    name: "Farhan Ali",
    role: "student",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.3,
    skillEntries: [
      { skillName: "Guitar", level: "intermediate" },
      { skillName: "Public Speaking", level: "beginner" },
    ],
  },
  {
    userId: "user_7",
    name: "Grace Hopper",
    role: "volunteer",
    skills: ["Web Design", "Public Speaking"],
    reputationScore: 4.9,
    skillEntries: [
      { skillName: "Web Design", level: "intermediate" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },
];

/**
 * Inserts 7 diverse fake mentors into the Hash Table on server startup.
 *
 * WHAT IT DOES:
 * Populates our in-memory Hash Table with realistic mock mentors across multiple
 * skills (Python, Guitar, Public Speaking, Web Design) and varying proficiency levels
 * (beginner, intermediate, expert).
 *
 * WHY WE DO THIS:
 * Since we do not have a live database connected yet, seeding fake data into memory
 * allows the frontend to perform real searches and return varied, meaningful results.
 */
function seedDatabase() {
  // Insert each user into the hash table under each skill they teach
  for (let userIndex = 0; userIndex < seedUsers.length; userIndex++) {
    const user = seedUsers[userIndex];

    for (let skillIndex = 0; skillIndex < user.skillEntries.length; skillIndex++) {
      const skillEntry = user.skillEntries[skillIndex];

      const mentorRecord = {
        userId: user.userId,
        id: user.userId, // Included so frontend components can use either id or userId
        name: user.name,
        level: skillEntry.level,
        skills: user.skills,
        reputationScore: user.reputationScore,
      };

      skillHashTable.insert(skillEntry.skillName, mentorRecord);
    }
  }

  console.log("Database seeded successfully with fake mentors and skills!");
}

// Run the seed function to load data into memory
seedDatabase();

// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Sorts an array of mentors by their proficiency level:
 * Expert first, then Intermediate, then Beginner.
 *
 * WHY WE SORT HERE (VIVA DEFENSE POINT):
 * When a student searches for a mentor to teach them a skill, they typically
 * want the most experienced mentors shown first. This sorting step ensures
 * that mentors with the highest mastery ("expert") appear at the top of the
 * search results list, followed by "intermediate", and finally "beginner".
 *
 * @param {Array<object>} mentorsList - The raw list of mentors from the hash table.
 * @returns {Array<object>} A new sorted array with expert mentors first.
 */
function sortMentorsByLevel(mentorsList) {
  // Define numeric weights for each level so we can compare them mathematically
  const levelWeights = {
    expert: 3,
    intermediate: 2,
    beginner: 1,
  };

  // Create a copy of the list and sort in descending order of weight (highest first)
  const sortedMentors = [...mentorsList].sort((mentorA, mentorB) => {
    const weightA = levelWeights[mentorA.level] || 0;
    const weightB = levelWeights[mentorB.level] || 0;

    // Descending order: higher weight comes first
    return weightB - weightA;
  });

  return sortedMentors;
}

// ----------------------------------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * ENDPOINT 1: GET /api/skills/search?query=<skillName>
 *
 * WHAT IT DOES:
 * 1. Reads the user's search query parameter from the URL (e.g. ?query=Python).
 * 2. Uses our Hash Table's lookup() method to quickly find mentors in O(1) average time.
 * 3. Sorts the matching mentors by level (expert first).
 * 4. Returns the result as JSON: { mentors: [...] }.
 * 5. If no mentors match or query is empty, returns an empty list: { mentors: [] }.
 *
 * WHY WE DO THIS:
 * Provides a fast, real-time search endpoint for the frontend's mentor discovery page.
 */
application.get("/api/skills/search", (request, response) => {
  try {
    const searchSkillName = request.query.query;

    // If no search query was provided in the URL, return empty mentors list
    if (!searchSkillName || typeof searchSkillName !== "string" || searchSkillName.trim() === "") {
      return response.status(200).json({ mentors: [] });
    }

    // Step 1: Use Hash Table to find mentors who have this skill
    const matchingMentors = skillHashTable.lookup(searchSkillName);

    // Step 2: Sort mentors by expertise level (expert > intermediate > beginner)
    const sortedMentors = sortMentorsByLevel(matchingMentors);

    // Step 3: Send back the response with matching mentors
    return response.status(200).json({
      mentors: sortedMentors,
    });
  } catch (error) {
    console.error("Error during skill search:", error);
    return response.status(500).json({
      error: "An internal server error occurred while searching for skills.",
    });
  }
});

/**
 * ENDPOINT 2: POST /api/sessions/book
 *
 * WHAT IT DOES:
 * 1. Reads the booking details (mentorId, learnerId, scheduledAt) from the request body.
 * 2. Validates that all required fields were supplied.
 * 3. Enqueues the booking request into our FIFO Queue so it waits in line.
 * 4. Returns a success confirmation message back to the frontend.
 *
 * WHY WE DO THIS:
 * Prevents race conditions and double-booking when multiple students attempt
 * to book sessions simultaneously. The FIFO queue preserves arrival order.
 */
application.post("/api/sessions/book", (request, response) => {
  try {
    const { mentorId, learnerId, scheduledAt } = request.body;

    // Basic validation: ensure all three required fields are present
    if (!mentorId || !learnerId || !scheduledAt) {
      return response.status(400).json({
        error: "Missing required booking details. Please provide mentorId, learnerId, and scheduledAt.",
      });
    }

    // Construct a structured booking request object
    const bookingRequest = {
      bookingId: `booking_${Date.now()}`,
      mentorId: String(mentorId),
      learnerId: String(learnerId),
      scheduledAt: String(scheduledAt),
      status: "queued",
      createdAt: new Date().toISOString(),
    };

    // Add the booking to the back of our FIFO Queue
    bookingQueue.enqueue(bookingRequest);

    // Send back a success response confirming the request was queued
    return response.status(201).json({
      message: "Session booking request added to queue successfully.",
      booking: bookingRequest,
      queuePosition: bookingQueue.size(),
    });
  } catch (error) {
    console.error("Error during session booking:", error);
    return response.status(500).json({
      error: "An internal server error occurred while processing the booking request.",
    });
  }
});

/**
 * ENDPOINT 3: GET /api/users/all
 *
 * WHAT IT DOES:
 * Returns the entire catalog of all seeded mentors in the community, regardless of skill.
 *
 * WHY A SEPARATE "GET ALL" ENDPOINT? (VIVA DEFENSE POINT):
 * In RESTful API design, each endpoint should have a clear, single responsibility:
 * 1. GET /api/skills/search?query=<term> is designed specifically to FILTER mentors
 *    by a skill keyword using our Hash Table index in O(1) average time.
 *    An empty search query (?query=) should NOT silently return all records:
 *    empty search parameters are not valid skill names, and returning everything
 *    violates what "searching" means.
 * 2. GET /api/users/all is designed specifically to RETRIEVE THE FULL DIRECTORY.
 *    For UI elements like the "Select Mentor" dropdown in session booking, the user
 *    needs to see all available mentors in the community regardless of what skills
 *    they teach. Keeping this as a distinct endpoint provides clean separation of
 *    concerns and prevents unexpected side effects.
 */
application.get("/api/users/all", (request, response) => {
  try {
    const mentorList = seedUsers.map((user) => ({
      id: user.userId,
      userId: user.userId,
      name: user.name,
      role: user.role || "Peer Mentor",
      skills: user.skills,
      reputationScore: user.reputationScore,
    }));

    return response.status(200).json({
      mentors: mentorList,
      users: mentorList,
    });
  } catch (error) {
    console.error("Error retrieving all mentors:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving mentors.",
    });
  }
});

// Root endpoint for quick health check
application.get("/", (request, response) => {
  return response.json({
    status: "online",
    message: "Local Skill Exchange Backend API & DSA Engine is running!",
  });
});

// ----------------------------------------------------------------------------
// START THE SERVER LISTENER
// ----------------------------------------------------------------------------
if (require.main === module) {
  application.listen(PORT, () => {
    console.log(`Backend server is running and listening on http://localhost:${PORT}`);
  });
}

// Export modules for testing purposes
module.exports = {
  application,
  seedUsers,
  skillHashTable,
  bookingQueue,
  seedDatabase,
  sortMentorsByLevel,
};

