import axios from 'axios';
import { generateEncryptionKey } from './encryption';
import { refreshToken, logout } from '../store/auth';

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

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry the original request with the new token
          const token = localStorage.getItem('token');
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        logout();
      }
    }

    return Promise.reject(error);
  }
);

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

  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/token/refresh', { refresh_token: refreshToken });
    return response.data;
  },
};

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

// Notes API
export const notesApi = {
  getNotes: async () => {
    console.log('Fetching all notes');
    const response = await api.get('/notes');
    console.log('Fetched notes:', response.data);
    return response.data;
  },

  getNote: async (id: number) => {
    console.log('Fetching note:', id);
    const response = await api.get(`/notes/${id}`);
    console.log('Fetched note:', response.data);
    return response.data;
  },

  createNote: async (note: { 
    title: string; 
    content?: string; 
    color?: string; 
    is_pinned?: boolean;
    status?: 'active' | 'archived' | 'trash';
  }) => {
    console.log('Creating note:', note);
    const response = await api.post('/notes', {
      ...note,
      status: note.status || 'active'
    });
    console.log('Created note:', response.data);
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
    console.log('Updating note:', id, note);
    const response = await api.put(`/notes/${id}`, note);
    console.log('Updated note:', response.data);
    return response.data;
  },

  deleteNote: async (id: number, permanent: boolean = false) => {
    console.log('Deleting note:', id, permanent ? '(permanent)' : '(to trash)');
    await api.delete(`/notes/${id}${permanent ? '?permanent=true' : ''}`);
    console.log('Note deleted:', id);
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