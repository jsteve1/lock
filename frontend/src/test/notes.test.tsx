import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Notes from '../components/Notes';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

const mockNotes = [
  {
    id: 1,
    title: 'Test Note 1',
    content: 'Test Content 1',
    color: '#ffffff',
    is_pinned: false,
    is_archived: false,
    created_at: '2024-03-19T12:00:00Z',
    updated_at: '2024-03-19T12:00:00Z',
    owner_id: 1,
    attachments: [],
  },
  {
    id: 2,
    title: 'Test Note 2',
    content: 'Test Content 2',
    color: '#f0f0f0',
    is_pinned: true,
    is_archived: false,
    created_at: '2024-03-19T12:00:00Z',
    updated_at: '2024-03-19T12:00:00Z',
    owner_id: 1,
    attachments: [],
  },
];

describe('Notes Component', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:8000/notes', () => {
        return HttpResponse.json(mockNotes);
      })
    );
  });

  it('should render notes list', async () => {
    render(<Notes />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
      expect(screen.getByText('Test Note 2')).toBeInTheDocument();
    });
  });

  it('should display pinned notes at the top', async () => {
    render(<Notes />);
    
    await waitFor(() => {
      const notes = screen.getAllByTestId('note-card');
      expect(notes[0].textContent).toContain('Test Note 2'); // Pinned note
      expect(notes[1].textContent).toContain('Test Note 1'); // Unpinned note
    });
  });

  it('should filter notes by search', async () => {
    render(<Notes />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
      expect(screen.getByText('Test Note 2')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.input(searchInput, { target: { value: 'Note 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Note 2')).not.toBeInTheDocument();
    });
  });

  it('should handle note deletion', async () => {
    server.use(
      http.delete('http://localhost:8000/notes/1', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(<Notes />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByLabelText(/delete note/i)[1]; // Second delete button (for Note 1)
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('Test Note 1')).not.toBeInTheDocument();
    });
  });

  it('should handle note pinning/unpinning', async () => {
    server.use(
      http.patch('http://localhost:8000/notes/1', () => {
        return HttpResponse.json({
          ...mockNotes[0],
          is_pinned: true,
        });
      })
    );

    render(<Notes />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    });

    const pinButton = screen.getAllByLabelText(/pin note/i)[1]; // Second pin button (for Note 1)
    fireEvent.click(pinButton);

    await waitFor(() => {
      const notes = screen.getAllByTestId('note-card');
      expect(notes[0].textContent).toContain('Test Note 1');
    });
  });
}); 
