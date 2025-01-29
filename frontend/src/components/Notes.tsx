import { useEffect, useState } from 'preact/hooks';
import { notesApi } from '../services/api';
import { notes, setNotes, removeNote, updateNote } from '../store/notes';
import type { Note } from '../store/notes';

export default function Notes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await notesApi.getNotes();
      setNotes(fetchedNotes);
    } catch (err) {
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notesApi.deleteNote(id);
      removeNote(id);
    } catch (err) {
      setError('Failed to delete note');
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const updatedNote = await notesApi.updateNote(note.id, {
        is_pinned: !note.is_pinned,
      });
      updateNote(updatedNote);
    } catch (err) {
      setError('Failed to update note');
    }
  };

  const filteredNotes = notes.value
    .filter(note => 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by pinned status first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Then sort by updated date
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  if (isLoading) {
    return (
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">My Notes</h1>
        <div class="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            class="input"
          />
          <a href="/notes/new" class="btn btn-primary">
            New Note
          </a>
        </div>
      </div>

      {error && (
        <div class="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            class="note-card"
            style={{ backgroundColor: note.color }}
            data-testid="note-card"
          >
            <div class="flex justify-between items-start mb-2">
              <a
                href={`/notes/${note.id}`}
                class="text-lg font-medium hover:underline"
              >
                {note.title}
              </a>
              <div class="flex items-center space-x-2">
                <button
                  onClick={() => handleTogglePin(note)}
                  class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                >
                  <svg
                    class={`w-5 h-5 ${
                      note.is_pinned ? 'text-primary-500' : 'text-gray-500'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Delete note"
                >
                  <svg
                    class="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {note.content && (
              <p class="text-gray-600 dark:text-gray-400 line-clamp-3">
                {note.content}
              </p>
            )}
            {note.attachments && note.attachments.length > 0 && (
              <div class="mt-2 flex flex-wrap gap-1">
                {note.attachments.map(attachment => (
                  <span
                    key={attachment.id}
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-700"
                  >
                    {attachment.filename}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 