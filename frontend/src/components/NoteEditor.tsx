import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { notesApi, attachmentsApi, Attachment } from '../services/api';
import { encrypt, decrypt, encryptFile } from '../services/encryption';
import { addNote, updateNote } from '../store/notes';
import { isAuthenticated } from '../store/auth';

interface NoteEditorProps {
  id?: string;
  path?: string;
}

const COLORS = [
  '#ffffff',
  '#f28b82',
  '#fbbc04',
  '#fff475',
  '#ccff90',
  '#a7ffeb',
  '#cbf0f8',
  '#aecbfa',
  '#d7aefb',
  '#fdcfe8',
];

export default function NoteEditor({ id }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [isPinned, setIsPinned] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated.value) {
      route('/login');
      return;
    }
    
    if (id) {
      loadNote();
    }
  }, [id]);

  const loadNote = async () => {
    if (!id) return;
    
    try {
      const note = await notesApi.getNote(parseInt(id));
      const encryptionKey = localStorage.getItem('encryptionKey');
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      setTitle(note.title);
      setContent(await decrypt(note.content, encryptionKey));
      setColor(note.color);
      setIsPinned(note.is_pinned);
      setAttachments(note.attachments || []);
    } catch (err) {
      setError('Failed to load note');
      console.error(err);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const encryptionKey = localStorage.getItem('encryptionKey');
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      const encryptedContent = await encrypt(content, encryptionKey);
      
      if (id) {
        const updatedNote = await notesApi.updateNote(parseInt(id), {
          title,
          content: encryptedContent,
          color,
          is_pinned: isPinned,
        });
        updateNote(updatedNote);
      } else {
        const newNote = await notesApi.createNote({
          title,
          content: encryptedContent,
          color,
          is_pinned: isPinned,
        });
        addNote(newNote);
      }
      route('/');
    } catch (err) {
      setError('Failed to save note');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const encryptionKey = localStorage.getItem('encryptionKey');
    if (!encryptionKey) {
      setError('Encryption key not found');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const { encryptedData, contentType } = await encryptFile(file, encryptionKey);
      const encryptedFile = new File([encryptedData], file.name, { type: contentType });
      const attachment = await attachmentsApi.uploadAttachment(parseInt(id!), encryptedFile);
      setAttachments(prev => [...prev, attachment]);
      target.value = ''; // Clear the file input
    } catch (err) {
      setError('Failed to upload file');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div class="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} class="space-y-4">
        {error && (
          <div class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Title"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <textarea
            value={content}
            onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
            placeholder="Take a note..."
            rows={8}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="flex items-center space-x-4">
          <input
            type="color"
            value={color}
            onInput={(e) => setColor((e.target as HTMLInputElement).value)}
            class="w-8 h-8 rounded-full"
          />

          <label class="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isPinned}
              onInput={(e) => setIsPinned((e.target as HTMLInputElement).checked)}
            />
            <span>Pin note</span>
          </label>

          {id && (
            <input
              type="file"
              onChange={handleFileUpload}
              class="hidden"
              id="file-upload"
              accept="image/*,application/pdf"
              disabled={isUploading}
            />
          )}
          {id && (
            <label
              htmlFor="file-upload"
              class={`cursor-pointer p-2 rounded-full text-gray-600 hover:bg-gray-100 ${isUploading ? 'opacity-50' : ''}`}
            >
              {isUploading ? (
                <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke=" -*+8o," stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg
                  class="w-5 h-5"
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
              )}
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </form>

      {attachments.length > 0 && (
        <div class="space-y-2">
          <h3 class="font-medium">Attachments</h3>
          <div class="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm flex items-center"
              >
                <span>{attachment.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 