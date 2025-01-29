import axios from 'axios';
import { generateEncryptionKey } from './encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  created_at: string;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/token', new URLSearchParams({
      username: email,
      password,
    }));
    return response.data;
  },

  register: async (email: string, password: string) => {
    // Generate encryption key for the user
    const encryptionKey = await generateEncryptionKey();
    
    // Store the encryption key securely
    localStorage.setItem('encryptionKey', encryptionKey);
    
    const response = await api.post('/users', { 
      email, 
      password,
      encryption_key: encryptionKey // Store encrypted key on server for backup
    });
    return response.data;
  },
};

// Notes API
export const notesApi = {
  getNotes: async () => {
    const response = await api.get('/notes');
    return response.data;
  },

  getNote: async (id: number) => {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },

  createNote: async (note: { title: string; content?: string; color?: string; is_pinned?: boolean }) => {
    const response = await api.post('/notes', note);
    return response.data;
  },

  updateNote: async (id: number, note: { title?: string; content?: string; color?: string; is_pinned?: boolean }) => {
    const response = await api.patch(`/notes/${id}`, note);
    return response.data;
  },

  deleteNote: async (id: number) => {
    await api.delete(`/notes/${id}`);
  },
};

// Attachments API
export const attachmentsApi = {
  uploadAttachment: async (noteId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/notes/${noteId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAttachments: async (noteId: number) => {
    const response = await api.get(`/notes/${noteId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (noteId: number, attachmentId: number) => {
    await api.delete(`/notes/${noteId}/attachments/${attachmentId}`);
  },
}; 