import { signal } from '@preact/signals';
import { notesApi, type Note } from './services/api';

interface NotesStore {
  value: Note[];
  refresh: () => Promise<void>;
}

const notesSignal = signal<Note[]>([]);

export const notes: NotesStore = {
  get value() {
    return notesSignal.value;
  },
  set value(newValue: Note[]) {
    notesSignal.value = newValue;
  },
  refresh: async () => {
    try {
      const fetchedNotes = await notesApi.getNotes();
      notesSignal.value = fetchedNotes;
      console.log('notesSignal.value', notesSignal.value);
    } catch (error) {
      console.error('Failed to refresh notes:', error);
    }
  }
}; 