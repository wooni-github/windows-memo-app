import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { v4 as uuid } from 'uuid';
import type {
  AppState,
  NoteContent,
  NoteMeta,
  NoteSummary,
  NotesIndex,
  WindowState
} from '@shared/types';

const INDEX_FILE = 'notes.json';
const STATE_FILE = 'app-state.json';
const NOTES_DIR = 'notes';

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(path, { recursive: true });
}

async function atomicWrite(path: string, data: string): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp`;
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, path);
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

export class Store {
  private root: string;
  private indexPath: string;
  private statePath: string;
  private notesDir: string;
  private index: NotesIndex = { version: 1, notes: [] };
  private state: AppState = { version: 1, windows: [] };
  private loaded = false;

  constructor(root: string) {
    this.root = root;
    this.indexPath = join(this.root, INDEX_FILE);
    this.statePath = join(this.root, STATE_FILE);
    this.notesDir = join(this.root, NOTES_DIR);
  }

  async load(): Promise<void> {
    await ensureDir(this.notesDir);
    this.index = await readJson<NotesIndex>(this.indexPath, { version: 1, notes: [] });
    this.state = await readJson<AppState>(this.statePath, { version: 1, windows: [] });
    this.loaded = true;
  }

  private assertLoaded(): void {
    if (!this.loaded) throw new Error('Store.load() must be called first');
  }

  // ---- notes ----
  async listNotes(): Promise<NoteSummary[]> {
    this.assertLoaded();
    const summaries: NoteSummary[] = [];
    for (const meta of this.index.notes) {
      let preview = '';
      try {
        const md = await fs.readFile(this.notePath(meta.id), 'utf8');
        preview = md.replace(/[#>*_`-]/g, '').trim().slice(0, 160);
      } catch {
        preview = '';
      }
      summaries.push({ meta, preview });
    }
    summaries.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
    return summaries;
  }

  async loadNote(id: string): Promise<NoteContent | null> {
    this.assertLoaded();
    const meta = this.index.notes.find((n) => n.id === id);
    if (!meta) return null;
    let markdown = '';
    try {
      markdown = await fs.readFile(this.notePath(id), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    return { meta, markdown };
  }

  async createNote(): Promise<NoteMeta> {
    this.assertLoaded();
    const now = new Date().toISOString();
    const meta: NoteMeta = {
      id: uuid(),
      title: '',
      createdAt: now,
      updatedAt: now
    };
    this.index.notes.push(meta);
    await this.flushIndex();
    await atomicWrite(this.notePath(meta.id), '');
    return meta;
  }

  async saveNote(id: string, markdown: string, title: string): Promise<void> {
    this.assertLoaded();
    const meta = this.index.notes.find((n) => n.id === id);
    if (!meta) throw new Error(`Note ${id} not found`);
    const now = new Date().toISOString();
    meta.title = title;
    meta.updatedAt = now;
    await atomicWrite(this.notePath(id), markdown);
    await this.flushIndex();
  }

  async deleteNote(id: string): Promise<void> {
    this.assertLoaded();
    this.index.notes = this.index.notes.filter((n) => n.id !== id);
    this.state.windows = this.state.windows.filter((w) => w.noteId !== id);
    await this.flushIndex();
    await this.flushState();
    try {
      await fs.unlink(this.notePath(id));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  hasNote(id: string): boolean {
    return this.index.notes.some((n) => n.id === id);
  }

  // ---- window state ----
  getWindowStates(): WindowState[] {
    return this.state.windows;
  }

  getWindowState(noteId: string): WindowState | undefined {
    return this.state.windows.find((w) => w.noteId === noteId);
  }

  upsertWindowState(next: WindowState): void {
    const idx = this.state.windows.findIndex((w) => w.noteId === next.noteId);
    if (idx >= 0) this.state.windows[idx] = next;
    else this.state.windows.push(next);
  }

  removeWindowState(noteId: string): void {
    this.state.windows = this.state.windows.filter((w) => w.noteId !== noteId);
  }

  getNotesListWindow(): AppState['notesListWindow'] {
    return this.state.notesListWindow;
  }

  setNotesListWindow(next: AppState['notesListWindow']): void {
    this.state.notesListWindow = next;
  }

  async flushState(): Promise<void> {
    await atomicWrite(this.statePath, JSON.stringify(this.state, null, 2));
  }

  async flushIndex(): Promise<void> {
    await atomicWrite(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  private notePath(id: string): string {
    return join(this.notesDir, `${id}.md`);
  }
}

// Utility — extract title from markdown (first heading or first line).
export function deriveTitle(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.+)$/);
    if (h) return h[1].trim().slice(0, 80);
    return line.replace(/[#*_`>]/g, '').slice(0, 80);
  }
  return '';
}
