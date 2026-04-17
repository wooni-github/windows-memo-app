import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { Store } from './store';
import { attachContextMenu } from './contextMenu';
import type { WindowState } from '@shared/types';

const NOTE_DEFAULT = { width: 520, height: 600 };
const LIST_DEFAULT = { width: 760, height: 560 };

function withinAnyDisplay(x: number, y: number, w: number, h: number): boolean {
  const displays = screen.getAllDisplays();
  return displays.some((d) => {
    const b = d.workArea;
    return x + w > b.x && y + h > b.y && x < b.x + b.width && y < b.y + b.height;
  });
}

export class WindowManager {
  private noteWindows = new Map<string, BrowserWindow>();
  private listWindow: BrowserWindow | null = null;
  private saveWindowState: (win: BrowserWindow, noteId: string) => void;

  constructor(private store: Store, private onBeforeClose: () => void) {
    this.saveWindowState = debounce((win: BrowserWindow, noteId: string) => {
      if (win.isDestroyed()) return;
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      this.store.upsertWindowState({
        noteId,
        x,
        y,
        width,
        height,
        alwaysOnTop: win.isAlwaysOnTop(),
        isOpen: true
      });
      void this.store.flushState();
    }, 200);
  }

  getNoteWindow(noteId: string): BrowserWindow | undefined {
    return this.noteWindows.get(noteId);
  }

  getListWindow(): BrowserWindow | null {
    return this.listWindow;
  }

  focusOrOpenNote(noteId: string): BrowserWindow {
    const existing = this.noteWindows.get(noteId);
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.show();
      existing.focus();
      return existing;
    }
    return this.createNoteWindow(noteId);
  }

  createNoteWindow(noteId: string): BrowserWindow {
    const saved = this.store.getWindowState(noteId);
    const bounds = this.resolveBounds(saved, NOTE_DEFAULT);

    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: 280,
      minHeight: 200,
      frame: false,
      resizable: true,
      show: false,
      backgroundColor: '#f5f7f9',
      alwaysOnTop: saved?.alwaysOnTop ?? false,
      title: 'Memo',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        additionalArguments: [`--memo-role=note`, `--memo-note-id=${noteId}`]
      }
    });

    this.loadRenderer(win, 'note', { noteId });
    attachContextMenu(win);

    win.once('ready-to-show', () => win.show());

    win.on('move', () => this.saveWindowState(win, noteId));
    win.on('resize', () => this.saveWindowState(win, noteId));
    win.on('always-on-top-changed', () => this.saveWindowState(win, noteId));

    win.on('close', () => {
      if (win.isDestroyed()) return;
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      this.store.upsertWindowState({
        noteId,
        x,
        y,
        width,
        height,
        alwaysOnTop: win.isAlwaysOnTop(),
        isOpen: false
      });
      void this.store.flushState();
    });

    win.on('closed', () => {
      this.noteWindows.delete(noteId);
    });

    this.noteWindows.set(noteId, win);
    return win;
  }

  openNotesList(): BrowserWindow {
    if (this.listWindow && !this.listWindow.isDestroyed()) {
      if (this.listWindow.isMinimized()) this.listWindow.restore();
      this.listWindow.show();
      this.listWindow.focus();
      return this.listWindow;
    }

    const saved = this.store.getNotesListWindow();
    const bounds = this.resolveBounds(
      saved && saved.x !== undefined && saved.y !== undefined
        ? { ...saved, noteId: '', alwaysOnTop: false, isOpen: true, x: saved.x!, y: saved.y! }
        : undefined,
      LIST_DEFAULT
    );

    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: 480,
      minHeight: 320,
      frame: false,
      resizable: true,
      show: false,
      backgroundColor: '#f5f7f9',
      title: 'Memo — Notes',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        additionalArguments: [`--memo-role=list`]
      }
    });

    this.loadRenderer(win, 'list', {});
    attachContextMenu(win);
    win.once('ready-to-show', () => win.show());

    const saveList = debounce(() => {
      if (win.isDestroyed()) return;
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      this.store.setNotesListWindow({ x, y, width, height, isOpen: true });
      void this.store.flushState();
    }, 200);

    win.on('move', saveList);
    win.on('resize', saveList);
    win.on('close', () => {
      if (win.isDestroyed()) return;
      const [x, y] = win.getPosition();
      const [width, height] = win.getSize();
      this.store.setNotesListWindow({ x, y, width, height, isOpen: false });
      void this.store.flushState();
    });
    win.on('closed', () => {
      this.listWindow = null;
    });

    this.listWindow = win;
    return win;
  }

  broadcast(channel: string, ...args: unknown[]): void {
    for (const win of this.noteWindows.values()) {
      if (!win.isDestroyed()) win.webContents.send(channel, ...args);
    }
    if (this.listWindow && !this.listWindow.isDestroyed()) {
      this.listWindow.webContents.send(channel, ...args);
    }
  }

  hideAll(): void {
    for (const win of this.noteWindows.values()) if (!win.isDestroyed()) win.hide();
    if (this.listWindow && !this.listWindow.isDestroyed()) this.listWindow.hide();
  }

  showAll(): void {
    for (const win of this.noteWindows.values()) if (!win.isDestroyed()) win.show();
    if (this.listWindow && !this.listWindow.isDestroyed()) this.listWindow.show();
  }

  hasVisibleWindows(): boolean {
    const anyNote = Array.from(this.noteWindows.values()).some(
      (w) => !w.isDestroyed() && w.isVisible()
    );
    const list = this.listWindow && !this.listWindow.isDestroyed() && this.listWindow.isVisible();
    return anyNote || !!list;
  }

  destroyAll(): void {
    this.onBeforeClose();
    for (const win of this.noteWindows.values()) if (!win.isDestroyed()) win.destroy();
    if (this.listWindow && !this.listWindow.isDestroyed()) this.listWindow.destroy();
  }

  private resolveBounds(
    saved: WindowState | undefined,
    fallback: { width: number; height: number }
  ): { x?: number; y?: number; width: number; height: number } {
    if (saved && withinAnyDisplay(saved.x, saved.y, saved.width, saved.height)) {
      return { x: saved.x, y: saved.y, width: saved.width, height: saved.height };
    }
    const primary = screen.getPrimaryDisplay().workArea;
    const width = saved?.width ?? fallback.width;
    const height = saved?.height ?? fallback.height;
    return {
      x: Math.round(primary.x + (primary.width - width) / 2),
      y: Math.round(primary.y + (primary.height - height) / 2),
      width,
      height
    };
  }

  private loadRenderer(
    win: BrowserWindow,
    page: 'note' | 'list',
    query: Record<string, string>
  ): void {
    const qs = new URLSearchParams(query).toString();
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl) {
      const url = `${devUrl}/${page}.html${qs ? `?${qs}` : ''}`;
      void win.loadURL(url);
    } else {
      const file = join(__dirname, `../renderer/${page}.html`);
      void win.loadFile(file, { search: qs });
    }
  }
}

function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number
): (...args: A) => void {
  let t: NodeJS.Timeout | null = null;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
