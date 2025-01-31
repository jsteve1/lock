import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { notes } from '../app';
import { isAuthenticated } from '../store/auth';
import { notesApi, attachmentsApi, type Note, type Attachment } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { getThemeClasses } from '../theme';
import NoteEditorOverlay from './NoteEditorOverlay';

interface NotesListProps {
  path?: string;
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isImage = attachment.content_type.startsWith('image/');

  useEffect(() => {
    if (!isImage) return;
    
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    attachmentsApi.getAttachmentContent(attachment.note_id, attachment.id)
      .then(url => {
        if (isMounted) {
          setImageUrl(url);
          setIsLoading(false);
        }
      })
      .catch(error => {
        console.error('Failed to load image:', error);
        if (isMounted) {
          setError('Failed to load image');
          setIsLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [attachment.id, attachment.note_id]);

  if (!isImage) {
    return (
      <div class="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="truncate max-w-[100px]">{attachment.filename}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !imageUrl) return null;

  return (
    <div class="relative group">
      <img
        src={imageUrl}
        alt={attachment.filename}
        class="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
      />
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
    </div>
  );
}

function NoteAttachments({ note }: { note: Note }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const attachments = note.attachments || [];
  const hasMoreThanFour = attachments.length > 4;
  
  if (attachments.length === 0) return null;

  return (
    <>
      <div class={`border-t ${getThemeClasses().divider}`} />
      <div class="px-4 py-2 space-y-2">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {attachments.slice(0, 4).map((attachment) => (
            <AttachmentPreview key={attachment.id} attachment={attachment} />
          ))}
        </div>
        
        {hasMoreThanFour && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors duration-200"
            >
              <span>{isExpanded ? 'Show less' : `Show ${attachments.length - 4} more`}</span>
              <svg
                class={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div
              class={`grid grid-cols-2 sm:grid-cols-4 gap-2 transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {attachments.slice(4).map((attachment) => (
                <AttachmentPreview key={attachment.id} attachment={attachment} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function NotesList({ path }: NotesListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const theme = getThemeClasses();

  useEffect(() => {
    if (!isAuthenticated.value) {
      route('/login');
      return;
    }

    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const fetchedNotes = await notesApi.getNotes();
        notes.value = fetchedNotes || [];
      } catch (error) {
        console.error('Failed to fetch notes:', error);
        setError('Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleCreateNote = () => {
    setSelectedNote(undefined);
    setIsEditorOpen(true);
  };

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsEditorOpen(true);
  };

  const handleEditorClose = () => {
    setSelectedNote(undefined);
    setIsEditorOpen(false);
  };

  const renderNote = (note: Note) => (
    <div
      key={note.id}
      onClick={() => handleNoteClick(note)}
      class={`group cursor-pointer rounded-lg ${theme.paper} border ${theme.border} ${theme.borderHover} transition-all duration-200 hover:shadow-md min-w-[200px] max-w-[400px] w-full`}
    >
      <div class="p-4">
        <div class="flex items-start justify-between">
          {note.title && (
            <h3 class={`font-medium ${theme.text} mb-2`}>{note.title}</h3>
          )}
          {note.is_pinned && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class={`h-4 w-4 ${theme.textSecondary}`}
              fill="currentColor"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          )}
        </div>
        <p class={`text-sm ${theme.textSecondary} whitespace-pre-wrap break-words`}>
          {note.content}
        </p>
      </div>

      {/* Attachments section */}
      <NoteAttachments note={note} />
    </div>
  );

  if (isLoading) {
    return (
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div class="flex justify-center items-center h-64">
        <div class="text-red-500">{error}</div>
      </div>
    );
  }

  const pinnedNotes = notes.value?.filter((note) => note.is_pinned) || [];
  const unpinnedNotes = notes.value?.filter((note) => !note.is_pinned) || [];

  return (
    <>
      <div class="max-w-[1600px] mx-auto px-4 space-y-8">
        {/* Take a note input */}
        <div class="mt-8 max-w-[600px] mx-auto">
          <div 
            onClick={handleCreateNote}
            class={`${theme.paper} rounded-lg border ${theme.border} ${theme.borderHover} p-3 cursor-pointer transition-colors shadow-sm hover:shadow-md`}
          >
            <div class={theme.textSecondary}>Take a note...</div>
          </div>
        </div>

        {/* Pinned notes */}
        {pinnedNotes.length > 0 && (
          <div class="space-y-3">
            <span class={`text-xs font-medium ${theme.textSecondary} uppercase tracking-wide px-1 select-none`}>
              Pinned
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max justify-items-center">
              {pinnedNotes.map(renderNote)}
            </div>
          </div>
        )}

        {/* Other notes */}
        <div class="space-y-3">
          {pinnedNotes.length > 0 && (
            <span class={`text-xs font-medium ${theme.textSecondary} uppercase tracking-wide px-1 select-none`}>
              Others
            </span>
          )}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max justify-items-center">
            {unpinnedNotes.map(renderNote)}
          </div>
        </div>
      </div>

      {/* Note Editor Overlay */}
      {isEditorOpen && (
        <NoteEditorOverlay
          note={selectedNote}
          onClose={handleEditorClose}
        />
      )}
    </>
  );
} 