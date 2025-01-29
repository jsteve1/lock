import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Login from '../components/Login';
import Register from '../components/Register';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

describe('Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Login Component', () => {
    it('should render login form', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should handle successful login', async () => {
      server.use(
        http.post('http://localhost:8000/token', () => {
          return HttpResponse.json({
            access_token: 'mock-token',
            token_type: 'bearer'
          });
        })
      );

      render(<Login />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const form = screen.getByRole('form');

      fireEvent.input(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.input(passwordInput, {
        target: { value: 'password123' },
      });
      
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent(/signing in/i);
      });

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('mock-token');
      }, { timeout: 2000 });
    });

    it('should handle login error', async () => {
      server.use(
        http.post('http://localhost:8000/token', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      render(<Login />);
      
      fireEvent.input(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' },
      });
      fireEvent.input(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' },
      });
      
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Register Component', () => {
    it('should render register form', () => {
      render(<Register />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should validate matching passwords', async () => {
      render(<Register />);
      
      fireEvent.input(screen.getByLabelText(/^password$/i), {
        target: { value: 'password123' },
      });
      fireEvent.input(screen.getByLabelText(/confirm password/i), {
        target: { value: 'password124' },
      });
      
      fireEvent.submit(screen.getByRole('form'));
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should handle successful registration', async () => {
      server.use(
        http.post('http://localhost:8000/users', () => {
          return HttpResponse.json({
            id: 1,
            email: 'test@example.com',
            is_active: true,
            created_at: '2024-03-19T12:00:00Z',
          });
        }),
        http.post('http://localhost:8000/token', () => {
          return HttpResponse.json({
            access_token: 'mock-token',
            token_type: 'bearer'
          });
        })
      );

      render(<Register />);
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const form = screen.getByRole('form');

      fireEvent.input(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.input(passwordInput, {
        target: { value: 'password123' },
      });
      fireEvent.input(confirmPasswordInput, {
        target: { value: 'password123' },
      });
      
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent(/creating account/i);
      });

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('mock-token');
      }, { timeout: 2000 });
    });
  });
}); 