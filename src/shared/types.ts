export interface NoteMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
}

export interface NotesIndex {
  version: 1;
  notes: NoteMeta[];
}

export interface WindowState {
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alwaysOnTop: boolean;
  isOpen: boolean;
}

export interface NotesListWindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isOpen: boolean;
}

export interface AppState {
  version: 1;
  windows: WindowState[];
  notesListWindow?: NotesListWindowState;
}

export interface NoteContent {
  meta: NoteMeta;
  markdown: string;
}

export interface NoteSummary {
  meta: NoteMeta;
  preview: string;
}

export type WindowRole = 'note' | 'list';

export interface MemoAPI {
  getRole(): WindowRole;
  getNoteId(): string | null;

  // note CRUD
  listNotes(): Promise<NoteSummary[]>;
  loadNote(id: string): Promise<NoteContent | null>;
  saveNote(id: string, markdown: string, title: string): Promise<void>;
  createNote(): Promise<NoteMeta>;
  deleteNote(id: string): Promise<void>;

  // window control
  minimizeWindow(): void;
  closeWindow(): void;
  toggleAlwaysOnTop(): Promise<boolean>;
  isAlwaysOnTop(): Promise<boolean>;

  // actions
  openNote(id: string): void;
  openNotesList(): void;
  showToast(message: string): void;
  openExternal(url: string): void;

  // events (renderer subscribes)
  onPinStateChanged(cb: (pinned: boolean) => void): () => void;
  onFocusTitle(cb: () => void): () => void;
  onNotesChanged(cb: () => void): () => void;
}

declare global {
  interface Window {
    memo: MemoAPI;
  }
}
