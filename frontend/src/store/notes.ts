import { signal } from '@preact/signals';

export interface Note {
  id: number;
  title: string;
  content?: string;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  owner_id: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  created_at: string;
  note_id: number;
  data?: string;
}

export const notes = signal<Note[]>([]);
export const selectedNote = signal<Note | null>(null);

export const setNotes = (newNotes: Note[]) => {
  notes.value = newNotes;
};

export const addNote = (note: Note) => {
  notes.value = [...notes.value, note];
};

export const updateNote = (updatedNote: Note) => {
  notes.value = notes.value.map(note => 
    note.id === updatedNote.id ? updatedNote : note
  );
};

export const removeNote = (id: number) => {
  notes.value = notes.value.filter(note => note.id !== id);
};

export const selectNote = (note: Note | null) => {
  selectedNote.value = note;
}; 