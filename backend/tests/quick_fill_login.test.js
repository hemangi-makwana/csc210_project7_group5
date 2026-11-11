/**
 * Focused test suite verifying all Quick Fill Demo Account buttons
 * and login error handling against the backend authentication API.
 */
const http = require('http');
const { application } = require('../server');
const { pool } = require('../db/index');

let testServer;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    testServer = http.createServer(application);
    testServer.listen(0, '127.0.0.1', () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }
  await pool.end();
});

describe('Quick Fill Demo Accounts Authentication Flow', () => {
  test('Teacher (Alice Chen) quick fill can sign in and obtain JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_user_1@skillexchange.demo',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe('demo_user_1');
    expect(data.user.name).toBe('Alice Chen');
    expect(data.user.email).toBe('demo_user_1@skillexchange.demo');
    expect(data.user.password_hash).toBeUndefined();
  });

  test('Learner (Bob Smith) quick fill can sign in and obtain JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_user_2@skillexchange.demo',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe('demo_user_2');
    expect(data.user.name).toBe('Bob Smith');
    expect(data.user.email).toBe('demo_user_2@skillexchange.demo');
    expect(data.user.password_hash).toBeUndefined();
  });

  test('Psychology (Dr. Reed) quick fill can sign in and obtain JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_user_11@skillexchange.demo',
        password: 'password123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.user).toBeDefined();
    expect(data.user.id).toBe('demo_user_11');
    expect(data.user.name).toMatch(/Dr\.\s*Reed|Reed/i);
    expect(data.user.email).toBe('demo_user_11@skillexchange.demo');
    expect(data.user.password_hash).toBeUndefined();
  });

  test('Failed login with incorrect password returns 401 with helpful error message', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo_user_1@skillexchange.demo',
        password: 'WrongPassword999!',
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid email or password. Please check your credentials and try again.');
    expect(data.token).toBeUndefined();
  });

  test('Failed login with non-existent email returns 401 without user enumeration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_account@example.com',
        password: 'anyPassword123',
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid email or password. Please check your credentials and try again.');
  });
});
