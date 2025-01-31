import axios from 'axios';
import { generateEncryptionKey } from './encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  status: 'active' | 'archived' | 'trash';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  created_at: string;
  note_id: number;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.set('username', email);  // Backend expects 'username' field
    formData.set('password', password);
    
    const response = await api.post('/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
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

  updateNote: async (id: number, note: { 
    title?: string; 
    content?: string; 
    color?: string; 
    is_pinned?: boolean;
    status?: 'active' | 'archived' | 'trash';
    deleted_at?: string;
  }) => {
    const response = await api.put(`/notes/${id}`, note);
    return response.data;
  },

  deleteNote: async (id: number) => {
    await api.delete(`/notes/${id}`);
  },
};

// Attachments API
export const attachmentsApi = {
  uploadAttachment: async (noteId: number, file: File, onProgress?: (progress: number) => void) => {
    console.log('Starting attachment upload:', { noteId, fileName: file.name });
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post(`/notes/${noteId}/attachments`, formData, {
        headers: {
          // Remove content-type to let browser set it with boundary
          'Content-Type': undefined,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload progress:', percentCompleted);
            onProgress(percentCompleted);
          }
        },
      });
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload request failed:', error);
      throw error;
    }
  },

  getAttachments: async (noteId: number) => {
    const response = await api.get(`/notes/${noteId}/attachments`);
    return response.data;
  },

  deleteAttachment: async (noteId: number, attachmentId: number) => {
    await api.delete(`/notes/${noteId}/attachments/${attachmentId}`);
  },

  getAttachmentContent: async (noteId: number, attachmentId: number) => {
    const response = await api.get(`/notes/${noteId}/attachments/${attachmentId}/content`, {
      responseType: 'blob',
      headers: {
        'Accept': '*/*'  // Accept any content type
      }
    });
    return URL.createObjectURL(response.data);
  },
}; 