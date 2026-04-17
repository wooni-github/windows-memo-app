import { BrowserWindow, ipcMain, shell } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { Store } from './store';
import type { WindowManager } from './windowManager';

function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function registerIpc(store: Store, wm: WindowManager): void {
  ipcMain.handle(IPC.listNotes, () => store.listNotes());

  ipcMain.handle(IPC.loadNote, (_evt, id: string) => store.loadNote(id));

  ipcMain.handle(
    IPC.saveNote,
    async (_evt, id: string, markdown: string, title: string) => {
      await store.saveNote(id, markdown, title);
      wm.broadcast(IPC.notesChanged);
    }
  );

  ipcMain.handle(IPC.createNote, async () => {
    const meta = await store.createNote();
    wm.focusOrOpenNote(meta.id);
    wm.broadcast(IPC.notesChanged);
    return meta;
  });

  ipcMain.handle(IPC.deleteNote, async (_evt, id: string) => {
    const win = wm.getNoteWindow(id);
    if (win && !win.isDestroyed()) win.destroy();
    await store.deleteNote(id);
    wm.broadcast(IPC.notesChanged);
  });

  ipcMain.on(IPC.openNote, (_evt, id: string) => {
    wm.focusOrOpenNote(id);
  });

  ipcMain.on(IPC.openNotesList, () => {
    wm.openNotesList();
  });

  ipcMain.on(IPC.minimizeWindow, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.on(IPC.closeWindow, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle(IPC.toggleAlwaysOnTop, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    if (!win || win.isDestroyed()) return false;
    const next = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(next);
    win.webContents.send(IPC.pinStateChanged, next);
    return next;
  });

  ipcMain.handle(IPC.isAlwaysOnTop, (evt) => {
    const win = BrowserWindow.fromWebContents(evt.sender);
    return win ? win.isAlwaysOnTop() : false;
  });

  ipcMain.on(IPC.showToast, (evt, message: string) => {
    evt.sender.send(IPC.showToast, message);
  });

  ipcMain.on(IPC.openExternal, (_evt, url: string) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });
}
