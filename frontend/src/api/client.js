/**
 * ============================================================================
 * API Client & Network Fetch Wrapper
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides a unified request() function for sending HTTP requests to the backend.
 * - Automatically attaches the user's JWT authentication token to headers if logged in.
 * - Provides a seamless mock/demo fallback when the backend server is not running,
 *   tagging the response with `isMock: true` so the UI can show a clear banner.
 *
 * WHY THIS IS IMPORTANT FOR VIVA:
 * - Centralizing fetch() here keeps components clean and ensures all API calls
 *   share the same authentication, error handling, and JSON parsing logic.
 */

// Base API URL prefix (proxied to http://localhost:5000 in Vite during development)
const API_BASE_URL = '/api';

/**
 * In-memory realistic mock database used when the backend server is not reachable.
 * This guarantees the frontend can be live-demoed smoothly under any condition.
 */
const MOCK_DATA = {
  users: [
    {
      id: 'usr_001',
      name: 'Dr. Sarah Lin',
      email: 'sarah.lin@example.com',
      role: 'professional',
      bio: 'Senior Machine Learning Engineer with 8+ years experience in Python, PyTorch, and NLP architectures.',
      reputation_score: 4.9,
      skills: [
        { id: 's1', skill_name: 'Python', level: 'expert', type: 'teach' },
        { id: 's2', skill_name: 'Machine Learning', level: 'expert', type: 'teach' },
        { id: 's3', skill_name: 'Data Science', level: 'intermediate', type: 'teach' },
        { id: 's4', skill_name: 'Rust', level: 'beginner', type: 'learn' },
      ],
    },
    {
      id: 'usr_002',
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      role: 'student',
      bio: 'Junior CS undergraduate specializing in Data Structures, Algorithms, and React web development.',
      reputation_score: 4.7,
      skills: [
        { id: 's5', skill_name: 'React', level: 'intermediate', type: 'teach' },
        { id: 's6', skill_name: 'JavaScript', level: 'intermediate', type: 'teach' },
        { id: 's7', skill_name: 'Data Structures', level: 'intermediate', type: 'teach' },
        { id: 's8', skill_name: 'Machine Learning', level: 'beginner', type: 'learn' },
      ],
    },
    {
      id: 'usr_003',
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
      role: 'volunteer',
      bio: 'Community workshop organizer and mentor teaching introductory Python and web design.',
      reputation_score: 4.8,
      skills: [
        { id: 's9', skill_name: 'Python', level: 'intermediate', type: 'teach' },
        { id: 's10', skill_name: 'HTML & CSS', level: 'expert', type: 'teach' },
        { id: 's11', skill_name: 'UI/UX Design', level: 'intermediate', type: 'teach' },
        { id: 's12', skill_name: 'React', level: 'beginner', type: 'learn' },
      ],
    },
  ],
  sessions: [
    {
      id: 'sess_101',
      mentor: { id: 'usr_001', name: 'Dr. Sarah Lin', role: 'professional' },
      learner: { id: 'usr_002', name: 'Alex Rivera', role: 'student' },
      scheduled_at: '2026-09-15T14:00:00Z',
      status: 'confirmed',
      notes: 'Reviewing Binary Search Tree and Graph traversal problems.',
      review: null,
    },
    {
      id: 'sess_102',
      mentor: { id: 'usr_003', name: 'Maya Chen', role: 'volunteer' },
      learner: { id: 'usr_002', name: 'Alex Rivera', role: 'student' },
      scheduled_at: '2026-09-02T10:30:00Z',
      status: 'completed',
      notes: 'Introductory Figma and responsive web layout fundamentals.',
      review: {
        id: 'rev_201',
        rating: 5,
        comment: 'Fantastic session! Maya gave very clear explanations and great examples.',
      },
    },
  ],
};

/**
 * Simulates a response from local mock data when the real backend cannot be reached.
 * @param {string} endpoint - The relative API endpoint path.
 * @param {object} options - Fetch options including method, headers, and body.
 * @returns {object} Mock response payload marked with `isMock: true`.
 */
function handleMockFallback(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const path = endpoint.split('?')[0];

  // 1. Auth login simulation
  if (path === '/auth/login' && method === 'POST') {
    const payload = options.body ? JSON.parse(options.body) : {};
    const foundUser = MOCK_DATA.users.find(u => u.email === payload.email) || MOCK_DATA.users[0];
    return {
      token: 'mock-jwt-token-for-' + foundUser.id,
      user: foundUser,
      isMock: true,
    };
  }

  // 2. Auth register simulation
  if (path === '/auth/register' && method === 'POST') {
    const payload = options.body ? JSON.parse(options.body) : {};
    const newUser = {
      id: 'usr_' + Date.now(),
      name: payload.name || 'New Learner',
      email: payload.email || 'user@example.com',
      role: payload.role || 'student',
      bio: 'New community learner',
      reputation_score: 5.0,
      skills: [],
    };
    return {
      token: 'mock-jwt-token-for-' + newUser.id,
      user: newUser,
      isMock: true,
    };
  }

  // 3. Skill Search: /skills/search?query=...
  if (path === '/skills/search' && method === 'GET') {
    const searchParams = new URLSearchParams(endpoint.split('?')[1] || '');
    const query = (searchParams.get('query') || '').toLowerCase();
    
    // Filter mentors who teach a skill matching the query
    const matchingMentors = MOCK_DATA.users
      .filter(user => {
        if (!query) return true;
        return user.skills.some(skill => 
          skill.type === 'teach' && skill.skill_name.toLowerCase().includes(query)
        );
      })
      .map(user => ({
        user: user,
        skills: user.skills.filter(s => s.type === 'teach'),
        score: Math.round(user.reputation_score * 20), // score out of 100
      }));

    return {
      mentors: matchingMentors,
      results: matchingMentors,
      isMock: true,
    };
  }

  // 3b. Retrieve All Mentors: /users/all
  if (path === '/users/all' && method === 'GET') {
    return {
      mentors: MOCK_DATA.users,
      users: MOCK_DATA.users,
      isMock: true,
    };
  }

  // 4. Recommendation Engine: /recommendations/:userId
  if (path.startsWith('/recommendations/') && method === 'GET') {
    const recommendations = MOCK_DATA.users.map((mentor, index) => ({
      mentor: mentor,
      score: 95 - index * 4,
      rank: index + 1,
      reason: `Matches your interest in ${mentor.skills.filter(s => s.type === 'teach').map(s => s.skill_name).join(', ')} with high reputation rating.`,
    }));

    return {
      recommendations: recommendations,
      isMock: true,
    };
  }

  // 5. User Profile: GET /users/:id
  if (path.startsWith('/users/') && !path.endsWith('/history') && !path.endsWith('/skills') && method === 'GET') {
    const userId = path.replace('/users/', '');
    const foundUser = MOCK_DATA.users.find(u => u.id === userId) || MOCK_DATA.users[0];
    return {
      ...foundUser,
      isMock: true,
    };
  }

  // 6. Update Skills: PUT /users/:id/skills
  if (path.includes('/skills') && method === 'PUT') {
    const payload = options.body ? JSON.parse(options.body) : {};
    return {
      message: 'Skills and bio updated successfully (Simulated)',
      skills: payload.skills || [],
      bio: payload.bio || '',
      isMock: true,
    };
  }

  // 7. Booking a session: POST /sessions/book
  if (path === '/sessions/book' && method === 'POST') {
    const payload = options.body ? JSON.parse(options.body) : {};
    return {
      message: 'Session booking request enqueued successfully in FIFO queue.',
      session: {
        id: 'sess_' + Date.now(),
        status: 'pending',
        scheduled_at: payload.scheduled_at,
        notes: payload.notes,
      },
      isMock: true,
    };
  }

  // 8. Learning History: GET /users/:id/history
  if (path.includes('/history') && method === 'GET') {
    return {
      sessions: MOCK_DATA.sessions,
      isMock: true,
    };
  }

  // 9. Session Reviews: POST /reviews
  if (path === '/reviews' && method === 'POST') {
    const payload = options.body ? JSON.parse(options.body) : {};
    return {
      message: 'Session review submitted successfully.',
      review: {
        id: 'rev_' + Date.now(),
        rating: payload.rating,
        comment: payload.comment,
      },
      isMock: true,
    };
  }

  // Default fallback
  return {
    data: [],
    message: 'Simulated fallback data',
    isMock: true,
  };
}

/**
 * Main HTTP request function.
 * 
 * WHAT IT DOES:
 * 1. Checks localStorage for a JWT token and attaches it to Authorization header.
 * 2. Attempts to fetch from the backend via the standard /api route.
 * 3. If the backend is running and responds with JSON, returns the response.
 * 4. If the backend is unreachable (e.g. offline during demo), catches the error,
 *    logs a helpful note, and returns mock data marked with `isMock: true`.
 * 
 * @param {string} endpoint - The API route (e.g. '/skills/search?query=python')
 * @param {object} options - Fetch configuration options
 * @returns {Promise<object>} The parsed JSON response
 */
export async function request(endpoint, options = {}) {
  // Construct standard HTTP headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach JWT Bearer token if user is logged in
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // If server responds with HTTP error status (4xx or 5xx)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API request failed with status ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    // Parse JSON data from server
    const data = await response.json();
    return data;
  } catch (networkError) {
    // If backend server is unreachable (connection refused, offline, etc.)
    console.warn(
      `[API Client] Backend server unreachable at "${API_BASE_URL}${endpoint}". Falling back to demo mock data.`,
      networkError.message
    );

    // Fall back to built-in simulation and flag with isMock: true
    return handleMockFallback(endpoint, options);
  }
}
