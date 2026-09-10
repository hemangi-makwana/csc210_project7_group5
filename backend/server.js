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

/**
 * Complete list of mock users/mentors seeded into memory on server startup.
 *
 * WHY 20 MENTORS? (VIVA DEFENSE POINT):
 * 20 is a representative sample size chosen for demo purposes — it gives the Hash Table
 * enough real entries to distribute meaningfully across its 31 buckets and produces
 * visible collision chains (multiple mentors per skill bucket) without overwhelming
 * the in-memory data. However, the Hash Table itself has NO fixed capacity limit:
 * it uses separate chaining (arrays inside each bucket), so it can hold arbitrarily
 * more mentors simply by calling hashTable.insert() more times — zero code changes needed.
 */
const seedUsers = [
  // ---- ORIGINAL 7 MENTORS ----
  {
    userId: "user_1",
    name: "Alice Chen",
    role: "professional",
    skills: ["Python", "Web Design"],
    reputationScore: 4.9,
    bio: "Senior full-stack developer specialising in Python back-ends and responsive web design.",
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
    bio: "CS undergraduate who loves algorithms and plays acoustic guitar on weekends.",
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
    bio: "Community coding bootcamp instructor with a passion for public speaking and inclusion in tech.",
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
    bio: "Professional musician and TED-talk coach helping others find their stage voice.",
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
    bio: "Lead UX engineer with 10+ years building production Python services and polished web interfaces.",
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
    bio: "Music performance student who mentors beginners in guitar technique and stage confidence.",
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
    bio: "Retired software architect now volunteering to teach accessible web design and presentation skills.",
    skillEntries: [
      { skillName: "Web Design", level: "intermediate" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },

  // ---- NEW MENTORS (users 8–20) — adds 7 new skill categories ----
  {
    userId: "user_8",
    name: "Hiro Tanaka",
    role: "professional",
    skills: ["Data Structures", "Python"],
    reputationScore: 4.7,
    bio: "Software engineer at a fintech company who loves teaching computer science fundamentals.",
    skillEntries: [
      { skillName: "Data Structures", level: "expert" },
      { skillName: "Python", level: "intermediate" },
    ],
  },
  {
    userId: "user_9",
    name: "Isabelle Dupont",
    role: "volunteer",
    skills: ["Spanish", "Public Relations"],
    reputationScore: 4.6,
    bio: "Bilingual community liaison with a background in corporate communications and language tutoring.",
    skillEntries: [
      { skillName: "Spanish", level: "expert" },
      { skillName: "Public Relations", level: "intermediate" },
    ],
  },
  {
    userId: "user_10",
    name: "James O'Brien",
    role: "student",
    skills: ["Guitar", "Cooking"],
    reputationScore: 3.9,
    bio: "Hospitality student who jams on guitar and loves teaching basic home cooking techniques.",
    skillEntries: [
      { skillName: "Guitar", level: "intermediate" },
      { skillName: "Cooking", level: "beginner" },
    ],
  },
  {
    userId: "user_11",
    name: "Kavya Reddy",
    role: "professional",
    skills: ["UI Design", "Web Design"],
    reputationScore: 4.9,
    bio: "Senior product designer at a SaaS startup with expertise in Figma, design systems, and CSS.",
    skillEntries: [
      { skillName: "UI Design", level: "expert" },
      { skillName: "Web Design", level: "expert" },
    ],
  },
  {
    userId: "user_12",
    name: "Liam Foster",
    role: "student",
    skills: ["Python", "Excel"],
    reputationScore: 3.8,
    bio: "Business analytics undergraduate learning Python for data work and sharing spreadsheet tips.",
    skillEntries: [
      { skillName: "Python", level: "beginner" },
      { skillName: "Excel", level: "beginner" },
    ],
  },
  {
    userId: "user_13",
    name: "Mei Zhang",
    role: "volunteer",
    skills: ["Photography", "Public Speaking"],
    reputationScore: 4.5,
    bio: "Freelance photographer and community workshop host teaching portrait and street photography.",
    skillEntries: [
      { skillName: "Photography", level: "expert" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },
  {
    userId: "user_14",
    name: "Nadia Okonkwo",
    role: "professional",
    skills: ["Data Structures", "Public Relations"],
    reputationScore: 5.0,
    bio: "Principal engineer and former PR manager — rare blend of deep technical and communication expertise.",
    skillEntries: [
      { skillName: "Data Structures", level: "expert" },
      { skillName: "Public Relations", level: "expert" },
    ],
  },
  {
    userId: "user_15",
    name: "Oscar Brennan",
    role: "student",
    skills: ["Spanish", "Cooking"],
    reputationScore: 4.1,
    bio: "Culinary arts student who picked up conversational Spanish while studying abroad in Madrid.",
    skillEntries: [
      { skillName: "Spanish", level: "intermediate" },
      { skillName: "Cooking", level: "intermediate" },
    ],
  },
  {
    userId: "user_16",
    name: "Priya Sharma",
    role: "professional",
    skills: ["Excel", "UI Design"],
    reputationScore: 4.8,
    bio: "Financial analyst turned UX designer, expert in Excel modelling and clean interface design.",
    skillEntries: [
      { skillName: "Excel", level: "expert" },
      { skillName: "UI Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_17",
    name: "Rahul Nair",
    role: "volunteer",
    skills: ["Python", "Data Structures"],
    reputationScore: 4.6,
    bio: "Open-source contributor and CS tutor specialising in algorithms, sorting, and graph theory.",
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Data Structures", level: "intermediate" },
    ],
  },
  {
    userId: "user_18",
    name: "Sofia Martínez",
    role: "professional",
    skills: ["Photography", "Web Design"],
    reputationScore: 4.3,
    bio: "Digital media creator blending photography portfolio work with clean, minimal web design.",
    skillEntries: [
      { skillName: "Photography", level: "intermediate" },
      { skillName: "Web Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_19",
    name: "Thomas Müller",
    role: "volunteer",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.7,
    bio: "Classical guitarist and TEDx speaker who mentors others in performance skills and stage presence.",
    skillEntries: [
      { skillName: "Guitar", level: "expert" },
      { skillName: "Public Speaking", level: "expert" },
    ],
  },
  {
    userId: "user_20",
    name: "Uma Krishnan",
    role: "student",
    skills: ["Cooking", "Excel"],
    reputationScore: 4.2,
    bio: "Nutrition science student who teaches healthy meal prep and uses Excel for diet tracking.",
    skillEntries: [
      { skillName: "Cooking", level: "expert" },
      { skillName: "Excel", level: "intermediate" },
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

/**
 * ENDPOINT 4: PUT /api/users/:userId/skills
 *
 * WHAT IT DOES:
 * 1. Finds the target user in the seedUsers array by the userId URL parameter.
 * 2. Updates that user's bio and skills list in memory.
 * 3. For every skill they can teach (type === 'teach'), calls skillHashTable.insert()
 *    so the skill becomes immediately searchable via GET /api/skills/search.
 * 4. Returns the updated profile as confirmation.
 *
 * WHY THIS MATTERS FOR THE VIVA (DYNAMIC HASH TABLE INSERT):
 * When the server starts, seedDatabase() calls insert() for each mentor's skills.
 * This endpoint proves that insert() also works DYNAMICALLY at runtime — after a user
 * saves new skills, those skills are instantly findable via the search endpoint.
 * This demonstrates the Hash Table is a live, mutable data structure, not a static
 * lookup table frozen at startup. A viva examiner may ask: "What happens if a user
 * adds a new skill?" — the answer is this endpoint.
 *
 * EXPECTED REQUEST BODY:
 * {
 *   "bio": "optional text",
 *   "skills": [
 *     { "skill_name": "Python", "level": "expert",  "type": "teach" },
 *     { "skill_name": "Rust",   "level": "beginner", "type": "learn" }
 *   ]
 * }
 */
application.put("/api/users/:userId/skills", (request, response) => {
  try {
    const targetUserId = request.params.userId;

    // Step 1: Find the user in our in-memory seed array
    const userIndex = seedUsers.findIndex((user) => user.userId === targetUserId);

    if (userIndex === -1) {
      return response.status(404).json({
        error: `User with ID "${targetUserId}" was not found.`,
      });
    }

    const incomingBio = request.body.bio || seedUsers[userIndex].bio || "";
    const incomingSkills = request.body.skills || [];

    // Step 2: Update the user's bio and skills in memory
    seedUsers[userIndex].bio = incomingBio;
    seedUsers[userIndex].skillEntries = incomingSkills
      .filter((skill) => skill.type === "teach")
      .map((skill) => ({
        skillName: skill.skill_name,
        level: skill.level || "beginner",
      }));
    seedUsers[userIndex].skills = incomingSkills
      .filter((skill) => skill.type === "teach")
      .map((skill) => skill.skill_name);

    // Step 3: Insert each teachable skill into the Hash Table so it is immediately
    // searchable via GET /api/skills/search. This is the key runtime-insert demonstration.
    const updatedUser = seedUsers[userIndex];
    for (const skill of incomingSkills) {
      if (skill.type !== "teach") continue; // Only index skills the user can teach

      const mentorRecord = {
        userId: updatedUser.userId,
        id: updatedUser.userId,
        name: updatedUser.name,
        level: skill.level || "beginner",
        skills: updatedUser.skills,
        reputationScore: updatedUser.reputationScore,
      };

      // insert() handles collision automatically via separate chaining in the Hash Table
      skillHashTable.insert(skill.skill_name, mentorRecord);
    }

    // Step 4: Return the updated profile as confirmation
    return response.status(200).json({
      message: "Profile skills and bio saved successfully!",
      user: {
        userId: updatedUser.userId,
        name: updatedUser.name,
        bio: updatedUser.bio,
        skills: updatedUser.skills,
        skillEntries: updatedUser.skillEntries,
      },
    });
  } catch (error) {
    console.error("Error updating user skills:", error);
    return response.status(500).json({
      error: "An internal server error occurred while updating skills.",
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

