import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { MemoAPI, WindowRole } from '@shared/types';

function argFromCli(prefix: string): string | null {
  for (const a of process.argv) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return null;
}

const role = (argFromCli('--memo-role=') as WindowRole) ?? 'note';
const noteId = argFromCli('--memo-note-id=');

const api: MemoAPI = {
  getRole: () => role,
  getNoteId: () => noteId,

  listNotes: () => ipcRenderer.invoke(IPC.listNotes),
  loadNote: (id) => ipcRenderer.invoke(IPC.loadNote, id),
  saveNote: (id, md, title) => ipcRenderer.invoke(IPC.saveNote, id, md, title),
  createNote: () => ipcRenderer.invoke(IPC.createNote),
  deleteNote: (id) => ipcRenderer.invoke(IPC.deleteNote, id),

  minimizeWindow: () => ipcRenderer.send(IPC.minimizeWindow),
  closeWindow: () => ipcRenderer.send(IPC.closeWindow),
  toggleAlwaysOnTop: () => ipcRenderer.invoke(IPC.toggleAlwaysOnTop),
  isAlwaysOnTop: () => ipcRenderer.invoke(IPC.isAlwaysOnTop),

  openNote: (id) => ipcRenderer.send(IPC.openNote, id),
  openNotesList: () => ipcRenderer.send(IPC.openNotesList),
  showToast: (m) => ipcRenderer.send(IPC.showToast, m),
  openExternal: (url) => ipcRenderer.send(IPC.openExternal, url),

  onPinStateChanged: (cb) => {
    const h = (_e: unknown, v: boolean): void => cb(v);
    ipcRenderer.on(IPC.pinStateChanged, h);
    return () => ipcRenderer.off(IPC.pinStateChanged, h);
  },
  onFocusTitle: (cb) => {
    const h = (): void => cb();
    ipcRenderer.on(IPC.focusTitle, h);
    return () => ipcRenderer.off(IPC.focusTitle, h);
  },
  onNotesChanged: (cb) => {
    const h = (): void => cb();
    ipcRenderer.on(IPC.notesChanged, h);
    return () => ipcRenderer.off(IPC.notesChanged, h);
  }
};

contextBridge.exposeInMainWorld('memo', api);
