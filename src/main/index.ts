import { app, globalShortcut, BrowserWindow } from 'electron';
import { Store } from './store';
import { WindowManager } from './windowManager';
import { registerIpc } from './ipc';
import { createTray } from './tray';
import { IPC } from '@shared/ipc-channels';

let wm: WindowManager | null = null;
let quitting = false;

// Ensure single instance.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (wm) wm.openNotesList();
  });
}

app.whenReady().then(async () => {
  const store = new Store(app.getPath('userData'));
  await store.load();

  wm = new WindowManager(store, () => {
    quitting = true;
  });

  registerIpc(store, wm);

  // Restore windows from last session.
  const states = store.getWindowStates();
  const openStates = states.filter((s) => s.isOpen && store.hasNote(s.noteId));
  if (openStates.length === 0) {
    // First run or no open notes — show notes list.
    wm.openNotesList();
  } else {
    for (const s of openStates) wm.createNoteWindow(s.noteId);
  }

  // Tray — keep after windows created so clicks don't lose focus prematurely.
  createTray(wm, store);

  // Global shortcut: Ctrl+Alt+N — new note from anywhere.
  try {
    globalShortcut.register('CommandOrControl+Alt+N', async () => {
      const meta = await store.createNote();
      wm?.focusOrOpenNote(meta.id);
      wm?.broadcast(IPC.notesChanged);
    });
  } catch {
    // Ignore registration errors (another app may own the hotkey).
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) wm?.openNotesList();
  });
});

app.on('window-all-closed', () => {
  // Subscribing (even with a no-op) keeps the app alive so the tray controls quitting.
  if (quitting) app.quit();
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
