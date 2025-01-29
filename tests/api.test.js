const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_URL = process.env.API_URL || 'https://localhost';
let authToken = null;
let testNoteId = null;
let testAttachmentId = null;

// Configure fetch to accept self-signed certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

// Helper function to make authenticated requests
async function authenticatedFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  options.headers = headers;
  options.agent = agent;  // Add agent to all requests
  const response = await fetch(`${API_URL}${endpoint}`, options);
  return response;
}

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Keep Clone API Tests', () => {
  // Wait for services to be fully ready
  beforeAll(async () => {
    await wait(2000);
  }, 5000);

  // Root endpoint test
  test('GET / - Root endpoint should return welcome message', async () => {
    const response = await fetch(`${API_URL}/`, { agent });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('message', 'Welcome to Keep Clone API');
    expect(data).toHaveProperty('status', 'active');
  });

  // Rate limiting tests
  describe('Rate Limiting', () => {
    test('Should handle rate limiting on root endpoint', async () => {
      const requests = Array(6).fill().map(() => fetch(`${API_URL}/`, { agent }));
      const responses = await Promise.all(requests);
      
      // At least one request should be rate limited (429)
      const hasRateLimit = responses.some(response => response.status === 429);
      expect(hasRateLimit).toBe(true);
    });
  });

  // Wait for rate limit to reset (60 seconds / 5 requests = 12 seconds per request)
  beforeAll(async () => {
    await wait(13000);
  }, 15000);  // Set timeout to 15 seconds

  // Authentication tests
  describe('Authentication Endpoints', () => {
    test('POST /users - Register new user', async () => {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER),
        agent
      });
      
      // If user already exists, this might fail with 400
      if (response.status === 201) {
        const data = await response.json();
        expect(data).toHaveProperty('email', TEST_USER.email);
        expect(data).toHaveProperty('id');
      }
    });

    test('POST /token - Login user', async () => {
      const formData = new URLSearchParams();
      formData.append('username', TEST_USER.email);
      formData.append('password', TEST_USER.password);

      const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        agent
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('token_type', 'bearer');
      
      authToken = data.access_token;
    });
  });

  // Notes endpoints tests
  describe('Notes Endpoints', () => {
    test('POST /notes - Create new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
        color: '#ffffff',
        is_pinned: false,
        is_archived: false
      };

      const response = await authenticatedFetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.title).toBe(noteData.title);
      expect(data.content).toBe(noteData.content);
      
      testNoteId = data.id;
    });

    test('GET /notes - Get all notes', async () => {
      const response = await authenticatedFetch('/notes');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('GET /notes/{id} - Get specific note', async () => {
      const response = await authenticatedFetch(`/notes/${testNoteId}`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('id', testNoteId);
    });

    test('PATCH /notes/{id} - Update note', async () => {
      const updateData = {
        title: 'Updated Test Note',
        is_pinned: true
      };

      const response = await authenticatedFetch(`/notes/${testNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe(updateData.title);
      expect(data.is_pinned).toBe(updateData.is_pinned);
    });

    test('POST /notes/{id}/attachments - Upload attachment', async () => {
      // Create a temporary test file
      const testFilePath = path.join(__dirname, 'test-attachment.txt');
      fs.writeFileSync(testFilePath, 'Test attachment content');

      const form = new FormData();
      form.append('file', fs.createReadStream(testFilePath));

      const response = await authenticatedFetch(`/notes/${testNoteId}/attachments`, {
        method: 'POST',
        headers: form.getHeaders(),  // Use FormData headers
        body: form,
        agent
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('filename');
      expect(data).toHaveProperty('content_type');
      
      testAttachmentId = data.id;

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    test('GET /notes/{id}/attachments - Get note attachments', async () => {
      const response = await authenticatedFetch(`/notes/${testNoteId}/attachments`);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('DELETE /notes/{id}/attachments/{attachmentId} - Delete attachment', async () => {
      const response = await authenticatedFetch(
        `/notes/${testNoteId}/attachments/${testAttachmentId}`,
        { method: 'DELETE' }
      );
      
      expect(response.status).toBe(204);
    });

    test('DELETE /notes/{id} - Delete note', async () => {
      const response = await authenticatedFetch(`/notes/${testNoteId}`, {
        method: 'DELETE'
      });
      
      expect(response.status).toBe(204);
    });
  });
}); 