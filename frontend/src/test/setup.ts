import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock API handlers
export const handlers = [
  http.post('http://localhost:8000/token', () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      token_type: 'bearer',
    });
  }),
  
  http.get('http://localhost:8000/notes', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Test Note',
        content: 'Test Content',
        color: '#ffffff',
        is_pinned: false,
        is_archived: false,
        created_at: '2024-03-19T12:00:00Z',
        updated_at: '2024-03-19T12:00:00Z',
        owner_id: 1,
        attachments: [],
      },
    ]);
  }),

  http.delete('http://localhost:8000/notes/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch('http://localhost:8000/notes/:id', () => {
    return HttpResponse.json({
      id: 1,
      title: 'Test Note',
      content: 'Test Content',
      color: '#ffffff',
      is_pinned: true,
      is_archived: false,
      created_at: '2024-03-19T12:00:00Z',
      updated_at: '2024-03-19T12:00:00Z',
      owner_id: 1,
      attachments: [],
    });
  }),

  http.post('http://localhost:8000/users', () => {
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      is_active: true,
      created_at: '2024-03-19T12:00:00Z',
    });
  }),

  http.options('*', () => {
    return new HttpResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }),
];

export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  localStorageMock.clear();
});

// Close server after all tests
afterAll(() => server.close()); 
