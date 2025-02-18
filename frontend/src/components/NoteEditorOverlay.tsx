import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { notesApi, attachmentsApi, type Note, type Attachment } from '../services/api';
import { notes } from '../app';
import { getThemeClasses, type ThemeClasses } from '../theme';

interface NoteEditorOverlayProps {
  note?: Note;
  onClose: (savedNote?: Note) => void;
}

// Color options for notes
const COLORS = [
  { id: 'default-light', hex: '#ffffff', name: 'Default Light' },
  { id: 'default-dark', hex: '#2d2e31', name: 'Default Dark' },
  { id: 'red', hex: '#f28c7f', name: 'Red' },
  { id: 'orange', hex: '#f7b73d', name: 'Orange' },
  { id: 'yellow', hex: '#fce473', name: 'Yellow' },
  { id: 'green', hex: '#b5e26a', name: 'Green' },
  { id: 'teal', hex: '#82e6ca', name: 'Teal' },
  { id: 'blue', hex: '#89b4f7', name: 'Blue' },
  { id: 'darkblue', hex: '#96a6c8', name: 'Dark blue' },
  { id: 'purple', hex: '#c297ef', name: 'Purple' },
  { id: 'brown', hex: '#d3a57f', name: 'Brown' },
  { id: 'gray', hex: '#d3d3d3', name: 'Gray' }
];

function AttachmentPreview({ attachment, tempBlobUrls, onDelete }: { attachment: Attachment; tempBlobUrls: Record<number, string>; onDelete?: (id: number) => void }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isImage = attachment.content_type.startsWith('image/');
  const isNightMode = localStorage.getItem('theme') === 'night';

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
        <div class={`flex items-center gap-1 text-xs ${isNightMode ? 'bg-gray-800 text-red-500' : 'bg-gray-100'} rounded-lg px-2 py-1`}>
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
            class={`absolute -top-2 -right-2 p-1 rounded-full ${isNightMode ? 'bg-red-500' : 'bg-red-500'} text-white opacity-0 group-hover:opacity-100 transition-opacity`}
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
      <div class={`w-20 h-20 ${isNightMode ? 'bg-gray-800 text-red-500' : 'bg-gray-100'} rounded-lg flex items-center justify-center`}>
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
          class={`absolute -top-2 -right-2 p-1 rounded-full ${isNightMode ? 'bg-red-500' : 'bg-red-500'} text-white opacity-0 group-hover:opacity-100 transition-opacity`}
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
              class={`absolute top-4 right-4 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 ${isNightMode ? 'text-red-500' : 'text-white'}`}
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

// Add utility functions at the top
// Utility function to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Get text color based on background color
function getTextColorForBackground(hexColor: string): string {
  return isLightColor(hexColor) ? 'text-gray-900' : 'text-white';
}

// Get border color based on background color
function getBorderColorForBackground(hexColor: string): string {
  // Use the same color as text but with reduced opacity
  return isLightColor(hexColor) ? 'border-gray-900 border-opacity-20' : 'border-white border-opacity-20';
}

export default function NoteEditorOverlay({ note, onClose }: NoteEditorOverlayProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const theme = getThemeClasses();
  const isNightMode = localStorage.getItem('theme') === 'night';
  const isDarkMode = localStorage.getItem('theme') === 'dark';
  
  // Get default color based on current theme
  const getDefaultColor = () => {
    if (isNightMode) return '#2d2e31';
    if (isDarkMode) return '#2d2e31';
    return '#ffffff';
  };
  
  const defaultColor = getDefaultColor();
  const [color, setColor] = useState(note?.color || defaultColor);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadQueue, setUploadQueue] = useState<{ file: File; retries: number; tempId?: number }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentNote, setCurrentNote] = useState<Note | undefined>(note || {
    id: -1, // Temporary ID for new notes
    title: '',
    content: '',
    is_pinned: false,
    status: 'active',
    color: defaultColor,
    attachments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  const [tempBlobUrls, setTempBlobUrls] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isNewNote, setIsNewNote] = useState(!note?.id);

  // Get the current text color based on background
  const currentBgColor = isNewNote ? defaultColor : (isNightMode ? '#1a1a1a' : color);
  const textColor = isNewNote ? theme.text : (isNightMode ? 'text-red-500' : getTextColorForBackground(currentBgColor));
  const textColorSecondary = isNewNote ? theme.textSecondary : (isNightMode ? 'text-red-500' : `${getTextColorForBackground(currentBgColor)} opacity-75`);
  const borderColor = isNewNote ? theme.border : (isNightMode ? 'border-red-500 border-opacity-20' : getBorderColorForBackground(currentBgColor));

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

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setIsColorPickerOpen(false);
    
    // If it's an existing note, update it immediately
    if (currentNote?.id && currentNote.id > 0) {
      notesApi.updateNote(currentNote.id, { color: newColor });
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedContent && !trimmedTitle) {
      onClose();
      return;
    }

    const noteData = {
      title: trimmedTitle,
      content: trimmedContent,
      color,
      is_pinned: isPinned,
      status: 'active' as const  // Type assertion to literal type
    };

    try {
      let savedNote;
      if (note?.id) {
        savedNote = await notesApi.updateNote(note.id, noteData);
      } else {
        savedNote = await notesApi.createNote(noteData);
      }
      onClose(savedNote);
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
    
    if (!window.confirm('Are you sure you want to delete this note and all its attachments?')) {
      return;
    }
    
    try {
      await notesApi.updateNote(currentNote.id, { status: 'trash' });
      console.log('Note moved to trash');
      notes.refresh();
      onClose();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleArchive = async () => {
    console.log('Archiving note:', currentNote);
    if (!currentNote?.id) return;
    
    try {
      await notesApi.updateNote(currentNote.id, { status: 'archived' });
      console.log('Note archived');
      notes.refresh();
      onClose();
    } catch (error) {
      console.error('Failed to archive note:', error);
    }
  };

  const handleUnarchive = async () => {
    console.log('Unarchiving note:', currentNote);
    if (!currentNote?.id) return;
    
    try { 
      await notesApi.updateNote(currentNote.id, { status: 'active' });
      console.log('Note unarchived');
      notes.refresh();
      onClose();
    } catch (error) {
      console.error('Failed to unarchive note:', error);
    }
  };  

  const handleDeletePermanently = async () => {
    console.log('Deleting note permanently:', currentNote);
    if (!currentNote?.id) return;
    
    if (!window.confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) {
      return;
    }
    
    try {
      await notesApi.deleteNote(currentNote.id, true);  // Set permanent flag to true
      console.log('Note deleted permanently');
      notes.refresh();
      onClose();
    } catch (error) {
      console.error('Failed to delete note permanently:', error);
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
  if(!currentNote) {
    setIsNewNote(true);
    setCurrentNote({
      id: -1,
      title: '',
      content: '',
      is_pinned: false,
      status: 'active',
      color: defaultColor,
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  return (
    <div ref={overlayRef} class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        class={`${theme.paper} rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden`}
        style={{ backgroundColor: currentBgColor }}
      >
        <div class={`flex justify-between items-center p-2 border-b ${borderColor}`}>
          <div class="flex items-center gap-2">
            {currentNote?.status === "active" && (
              <button
                onClick={() => setIsPinned(!isPinned)}
                class={`p-2 hover:bg-black hover:bg-opacity-5 rounded-full ${isPinned ? 'text-yellow-500' : textColor}`}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <svg class="w-5 h-5" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            )}

            {/* Color picker button - only show if not in night mode */}
            {!isNightMode && (
              <div class="relative">
                <button
                  onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                  class={`p-2 hover:bg-black hover:bg-opacity-5 rounded-full ${textColor}`}
                  title="Change color"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </button>

                {/* Color picker dropdown */}
                {isColorPickerOpen && (
                  <div class="absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg bg-white border border-gray-300 w-[280px] z-10">
                    <div class="grid grid-cols-4 gap-3">
                      {COLORS.map(({ hex, name }) => (
                        <button
                          key={hex}
                          onClick={() => handleColorChange(hex)}
                          class="w-12 h-12 rounded-full border border-gray-300 hover:border-gray-400 transition-colors relative group"
                          style={{ backgroundColor: hex }}
                          title={name}
                        >
                          {color === hex && (
                            <svg class="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-700" viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                              />
                            </svg>
                          )}
                          <span class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-700 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                            {name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            class={`p-2 hover:bg-black hover:bg-opacity-5 rounded-full ${textColor}`}
            title="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder="Title"
            class={`w-full bg-transparent border-none focus:outline-none text-lg font-medium mb-2 ${textColor} placeholder-${textColorSecondary}`}
            autoFocus={true}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            placeholder="Take a note..."
            class={`w-full bg-transparent border-none focus:outline-none resize-none min-h-[100px] ${textColor} placeholder-${textColorSecondary}`}
          />
          <div class="flex flex-wrap gap-2 mt-2">
            {currentNote?.attachments?.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                tempBlobUrls={tempBlobUrls}
                onDelete={handleAttachmentDelete}
              />
            ))}
          </div>
        </div>

        <div class={`flex items-center justify-between p-2 border-t ${borderColor}`}>
          <div class="flex items-center gap-2">
            {(currentNote?.status === "active" && !isNewNote) && (
              <button
                onClick={() => fileInputRef.current?.click()}
                class={`p-2 rounded-full hover:bg-black hover:bg-opacity-5 ${textColor}`}
                title="Add attachment"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
            )}

            {(currentNote?.id || isNewNote) && (
              <>
                {!isNewNote && currentNote?.status !== 'archived' && currentNote?.status !== 'trash' && (
                  <button
                    onClick={handleArchive}
                    class={`p-2 rounded-full hover:bg-black hover:bg-opacity-5 ${textColor}`}
                    title="Archive"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                )}

                {(!isNewNote && currentNote?.status !== 'trash') && (
                  <button
                    onClick={handleDelete}
                    class={`p-2 rounded-full hover:bg-black hover:bg-opacity-5 ${textColor}`}
                    title="Delete"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}

                {currentNote?.status === 'archived' && (
                  <button
                    onClick={handleUnarchive}
                    class={`p-2 rounded-full hover:bg-black hover:bg-opacity-5 ${textColor}`}
                    title="Unarchive"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </button>
                )}

                {currentNote?.status === 'trash' && (
                  <button
                    onClick={handleDeletePermanently}
                    class={`p-2 rounded-full hover:bg-red-500 hover:bg-opacity-10 ${textColor}`}
                    title="Delete Permanently"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6m4-6v6" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>

          {(title.trim() || content.trim() || isNewNote) && (
            <button
              onClick={handleSave}
              class={`px-4 py-2 rounded hover:bg-black hover:bg-opacity-5 border transition-colors ${textColor} ${borderColor}`}
              disabled={title.trim() === '' && content.trim() === ''}
            >
              {currentNote?.id ? 'Save' : (!isNewNote && (currentNote && currentNote?.status === "trash") ? 'Restore' : 'Create')}
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style="display: none"
          onChange={handleFileUpload}
          multiple
        />
      </div>
    </div>
  );
} 