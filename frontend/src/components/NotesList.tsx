import { useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { notes, isAuthenticated } from '../app';
import { notesApi, Note } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface NotesListProps {
  path?: string;
}

export default function NotesList({ path }: NotesListProps) {
  useEffect(() => {
    if (!isAuthenticated.value) {
      route('/login');
      return;
    }

    const fetchNotes = async () => {
      try {
        const fetchedNotes = await notesApi.getNotes();
        notes.value = fetchedNotes;
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    };

    fetchNotes();
  }, []);

  const handleCreateNote = () => {
    route('/note');
  };

  const handleNoteClick = (id: number) => {
    route(`/note/${id}`);
  };

  const pinnedNotes = notes.value.filter((note) => note.is_pinned);
  const unpinnedNotes = notes.value.filter((note) => !note.is_pinned);

  const renderNote = (note: Note) => (
    <div
      key={note.id}
      onClick={() => handleNoteClick(note.id)}
      class="group cursor-pointer p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200"
      style={{ backgroundColor: note.color }}
    >
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-medium text-gray-900 dark:text-gray-100">{note.title}</h3>
        {note.is_pinned && (
          <svg
            class="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.828.722a.5.5 0 01.354 0l7.071 7.071a.5.5 0 010 .707l-7.071 7.071a.5.5 0 01-.707 0L2.404 8.5a.5.5 0 010-.707L9.475.722z" />
          </svg>
        )}
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
        {note.content}
      </p>
      {note.attachments.length > 0 && (
        <div class="flex gap-2 mb-2">
          {note.attachments.map((attachment) => (
            <div
              key={attachment.id}
              class="text-xs text-gray-500 dark:text-gray-400 flex items-center"
            >
              <svg
                class="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              {attachment.filename}
            </div>
          ))}
        </div>
      )}
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
      </div>
    </div>
  );

  return (
    <div class="space-y-8">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold">My Notes</h1>
        <button
          onClick={handleCreateNote}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          Create Note
        </button>
      </div>

      {pinnedNotes.length > 0 && (
        <div class="space-y-4">
          <h2 class="text-lg font-medium">Pinned</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map(renderNote)}
          </div>
        </div>
      )}

      <div class="space-y-4">
        <h2 class="text-lg font-medium">Others</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpinnedNotes.map(renderNote)}
        </div>
      </div>
    </div>
  );
} 