/**
 * ============================================================================
 * Skill Verification Quiz API Client (src/api/quizzes.js)
 * ============================================================================
 *
 * Provides API functions for skill-specific teacher verification quizzes:
 * - startVerificationQuiz: Initiates a 10-question randomized multiple-choice quiz
 * - submitVerificationQuiz: Submits user answers for server-side grading and qualification
 * - getMyQuizAttempts: Retrieves past quiz attempts and verified badges
 * - getSupportedQuizSkills: Fetches skills with active question banks
 */

import { request } from './client.js';

/**
 * Starts a 10-question teacher verification quiz for the given skill.
 * If the skill does not have a question bank, the server returns 404 with an explanation.
 *
 * @param {string} skillName
 * @returns {Promise<{quizId: string, skillName: string, totalQuestions: number, questions: Array}>}
 */
export async function startVerificationQuiz(skillName) {
  return await request('/quizzes/start', {
    method: 'POST',
    body: JSON.stringify({ skillName }),
  });
}

/**
 * Submits the answers for server-side grading.
 * The server grades each question, calculates score/percentage, records the attempt
 * in PostgreSQL, and awards the verified teacher badge if score >= 5/10.
 *
 * @param {string} quizId
 * @param {string} skillName
 * @param {object|Array} answers - Map of { [questionId]: chosenAnswer } or array of { questionId, answer }
 * @returns {Promise<{score: number, total: number, percentage: number, passed: boolean, message: string, results: Array}>}
 */
export async function submitVerificationQuiz(quizId, skillName, answers) {
  return await request('/quizzes/submit', {
    method: 'POST',
    body: JSON.stringify({
      quizId,
      skillName,
      answers,
    }),
  });
}

/**
 * Retrieves the authenticated user's past quiz attempts and verified skills.
 *
 * @returns {Promise<{attempts: Array, verifiedSkills: Array}>}
 */
export async function getMyQuizAttempts() {
  return await request('/quizzes/attempts/my', {
    method: 'GET',
  });
}

/**
 * Retrieves the catalog of skills that offer a verified teacher qualification quiz.
 *
 * @returns {Promise<{supportedSkills: Array<string>, count: number}>}
 */
export async function getSupportedQuizSkills() {
  return await request('/quizzes/supported-skills', {
    method: 'GET',
  });
}
