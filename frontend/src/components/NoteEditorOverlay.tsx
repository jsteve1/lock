import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { notesApi, attachmentsApi, type Note, type Attachment } from '../services/api';
import { notes } from '../app';
import { getThemeClasses } from '../theme';

interface NoteEditorOverlayProps {
  note?: Note;
  onClose: () => void;
}

function AttachmentPreview({ attachment, tempBlobUrls, onDelete }: { attachment: Attachment; tempBlobUrls: Record<number, string>; onDelete?: (id: number) => void }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isImage = attachment.content_type.startsWith('image/');

  useEffect(() => {
    if (!isImage) return;
    
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    // If we have a temporary blob URL, use it
    if (attachment.id < 0 && tempBlobUrls[attachment.id]) {
      setImageUrl(tempBlobUrls[attachment.id]);
      setIsLoading(false);
      return;
    }
    
    // Otherwise fetch from server
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
  }, [attachment.id, attachment.note_id, isImage]);

  if (!isImage) {
    return (
      <div class="relative group">
        <div class="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="truncate max-w-[100px]">{attachment.filename}</span>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attachment.id);
            }}
            class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
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
      <div onClick={() => setIsPreviewOpen(true)}>
        <img
          src={imageUrl}
          alt={attachment.filename}
          class="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
        />
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
      </div>
      
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(attachment.id);
          }}
          class="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {isPreviewOpen && (
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75" onClick={() => setIsPreviewOpen(false)}>
          <div class="relative max-w-4xl max-h-[90vh] mx-4">
            <img
              src={imageUrl}
              alt={attachment.filename}
              class="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPreviewOpen(false);
              }}
              class="absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 text-white"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NoteEditorOverlay({ note, onClose }: NoteEditorOverlayProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadQueue, setUploadQueue] = useState<{ file: File; retries: number; tempId?: number }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentNote, setCurrentNote] = useState<Note | undefined>(note);
  const [tempBlobUrls, setTempBlobUrls] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const theme = getThemeClasses();

  useEffect(() => {
    const loadFullNote = async () => {
      if (note?.id) {
        try {
          const fullNote = await notesApi.getNote(note.id);
          setCurrentNote(fullNote);
        } catch (error) {
          console.error('Failed to load full note:', error);
        }
      } else {
        setCurrentNote(note);
      }
    };
    loadFullNote();
  }, [note]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, content, isPinned]);

  // Process upload queue
  useEffect(() => {
    const processQueue = async () => {
      console.log('Processing upload queue:', uploadQueue);
      console.log('Is uploading:', isUploading);
      console.log('Current note:', currentNote);
      
      if (uploadQueue.length === 0 || isUploading || !currentNote?.id) {
        console.log('Skipping queue processing:', { 
          queueEmpty: uploadQueue.length === 0, 
          isUploading, 
          hasNoteId: Boolean(currentNote?.id) 
        });
        return;
      }
      
      const { file, retries, tempId } = uploadQueue[0];
      console.log('Processing file:', file.name, 'Attempt:', retries + 1);
      setIsUploading(true);
      setUploadError('');
      setUploadProgress(0);
      
      try {
        console.log('Starting file upload to note:', currentNote.id);
        const attachment = await attachmentsApi.uploadAttachment(currentNote.id, file, (progress) => {
          console.log('Upload progress:', progress);
          setUploadProgress(progress);
        });
        console.log('Upload successful:', attachment);
        
        // Replace temporary attachment with real one
        if (currentNote) {
          setCurrentNote(prev => {
            if (!prev) return prev;
            const updatedAttachments = (prev.attachments || [])
              .filter(a => a.id >= 0 || (a.id < 0 && a.id !== tempId))
              .concat([attachment]);
            
            return {
              ...prev,
              attachments: updatedAttachments
            };
          });
          
          // Clean up temporary blob URL using the stored tempId
          if (file.type.startsWith('image/') && tempId) {
            const tempUrl = tempBlobUrls[tempId];
            if (tempUrl) {
              URL.revokeObjectURL(tempUrl);
              setTempBlobUrls(prev => {
                const { [tempId]: _, ...rest } = prev;
                return rest;
              });
            }
          }
        }
        
        // Remove successful upload from queue
        setUploadQueue(prev => prev.slice(1));
      } catch (error) {
        console.error('Upload failed:', error);
        if (retries < 3) {
          // Move to end of queue with incremented retry count
          setUploadQueue(prev => [...prev.slice(1), { file, retries: retries + 1, tempId }]);
          setUploadError(`Upload failed. Retrying... (Attempt ${retries + 1}/3)`);
        } else {
          setUploadQueue(prev => prev.slice(1));
          setUploadError(`Failed to upload ${file.name}. Max retries reached.`);
        }
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    processQueue();
  }, [uploadQueue, isUploading, currentNote]);

  const handleSave = async () => {
    try {
      if (currentNote?.id) {
        const updatedNote = await notesApi.updateNote(currentNote.id, {
          title,
          content,
          is_pinned: isPinned
        });
        if (updatedNote) {
          // Fetch the full note data to get attachments
          const fullNote = await notesApi.getNote(updatedNote.id);
          setCurrentNote(fullNote);
          const noteIndex = notes.value.findIndex(n => n.id === currentNote.id);
          if (noteIndex !== -1) {
            notes.value = [
              ...notes.value.slice(0, noteIndex),
              fullNote,
              ...notes.value.slice(noteIndex + 1)
            ];
          }
        }
      } else if (title || content) {
        const newNote = await notesApi.createNote({
          title,
          content,
          is_pinned: isPinned
        });
        if (newNote) {
          // Fetch the full note data to get attachments
          const fullNote = await notesApi.getNote(newNote.id);
          setCurrentNote(fullNote);
          notes.value = [fullNote, ...notes.value];
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    console.log('File input change event triggered');
    console.log('Files:', target.files);
    console.log('Current note:', currentNote);
    
    if (!target.files?.length || !currentNote?.id) {
      console.log('No files selected or no current note ID');
      return;
    }

    const file = target.files[0];
    const tempId = -Date.now(); // Generate temp ID first
    console.log('Adding file to upload queue:', file.name, 'tempId:', tempId);
    
    // Create blob URL immediately if it's an image
    if (file.type.startsWith('image/')) {
      const blobUrl = URL.createObjectURL(file);
      
      // Add to note's attachments immediately with temporary URL
      const tempAttachment: Attachment = {
        id: tempId,
        filename: file.name,
        content_type: file.type,
        created_at: new Date().toISOString(),
        note_id: currentNote.id
      };
      
      setCurrentNote(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: [...(prev.attachments || []), tempAttachment]
        };
      });
      
      // Store the blob URL for the AttachmentPreview component
      setTempBlobUrls(prev => ({...prev, [tempId]: blobUrl}));
    }
    
    setUploadQueue(prev => [...prev, { file, retries: 0, tempId }]);
  };

  // Clean up blob URLs when the component unmounts
  useEffect(() => {
    return () => {
      Object.values(tempBlobUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [tempBlobUrls]);

  const handleDelete = async () => {
    if (!currentNote?.id) return;
    
    try {
      if (currentNote.status === 'trash') {
        // Show confirmation dialog for permanent deletion
        if (!confirm('This note will be permanently deleted along with all its attachments. This action cannot be undone. Are you sure?')) {
          return;
        }
        await notesApi.deleteNote(currentNote.id);
        notes.value = notes.value.filter(n => n.id !== currentNote.id);
      } else {
        // Move to trash
        const updatedNote = await notesApi.updateNote(currentNote.id, {
          ...currentNote,
          status: 'trash',
          deleted_at: new Date().toISOString()
        });
        if (updatedNote) {
          const noteIndex = notes.value.findIndex(n => n.id === currentNote.id);
          if (noteIndex !== -1) {
            notes.value = [
              ...notes.value.slice(0, noteIndex),
              updatedNote,
              ...notes.value.slice(noteIndex + 1)
            ];
          }
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleArchive = async () => {
    if (!currentNote?.id) return;
    
    try {
      const updatedNote = await notesApi.updateNote(currentNote.id, {
        ...currentNote,
        status: currentNote.status === 'archived' ? 'active' : 'archived'
      });
      if (updatedNote) {
        const noteIndex = notes.value.findIndex(n => n.id === currentNote.id);
        if (noteIndex !== -1) {
          notes.value = [
            ...notes.value.slice(0, noteIndex),
            updatedNote,
            ...notes.value.slice(noteIndex + 1)
          ];
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to archive note:', error);
    }
  };

  const handleAttachmentDelete = async (attachmentId: number) => {
    if (!currentNote?.id) return;
    
    try {
      await attachmentsApi.deleteAttachment(currentNote.id, attachmentId);
      setCurrentNote(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          attachments: prev.attachments?.filter(a => a.id !== attachmentId) || []
        };
      });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={overlayRef}
        class={`w-full max-w-2xl ${theme.paper} rounded-lg shadow-xl mx-4`}
      >
        <div class="p-4">
          <div class="flex items-center justify-between mb-4">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              class={`text-xl font-medium bg-transparent border-none outline-none ${theme.text}`}
            />
            <div class="flex items-center space-x-2">
              <button
                onClick={handleArchive}
                class={`p-2 rounded-full hover:bg-gray-700 ${theme.text} transition-colors duration-200`}
                title={currentNote?.status === 'archived' ? "Unarchive note" : "Archive note"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                class={`p-2 rounded-full hover:bg-red-500 hover:text-white ${theme.text} transition-colors duration-200`}
                title={currentNote?.status === 'trash' ? "Delete permanently" : "Move to trash"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={onClose}
                class={`p-2 rounded-full hover:bg-gray-700 ${theme.text}`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <textarea
            placeholder="Take a note..."
            value={content}
            onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
            class={`w-full min-h-[200px] bg-transparent border-none outline-none resize-none ${theme.text}`}
          />
          
          {/* Show attachments grid if there are any */}
          {(currentNote?.attachments?.length || 0) > 0 && currentNote?.attachments && (
            <div class="mt-4 mb-4">
              <div class="flex gap-2 overflow-x-auto pb-2 max-w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {currentNote.attachments.map((attachment) => (
                  <div key={attachment.id} class="flex-none w-20">
                    <AttachmentPreview 
                      key={attachment.id} 
                      attachment={attachment} 
                      tempBlobUrls={tempBlobUrls}
                      onDelete={handleAttachmentDelete}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div class={`flex items-center justify-between mt-4 pt-2 border-t ${theme.border}`}>
            <div class="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                class="hidden"
                accept="image/*,application/pdf"
                disabled={!currentNote?.id || isUploading || (currentNote?.attachments?.length || 0) >= 8}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!currentNote?.id || isUploading || (currentNote?.attachments?.length || 0) >= 8}
                class={`p-2 rounded-full hover:bg-gray-700 ${theme.text} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={currentNote?.attachments?.length >= 8 ? "Maximum attachments reached (8)" : "Add attachment"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleSave}
              class={`px-6 py-2 rounded-md ${theme.text} hover:bg-gray-700`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 