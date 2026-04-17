export const IPC = {
  listNotes: 'notes:list',
  loadNote: 'notes:load',
  saveNote: 'notes:save',
  createNote: 'notes:create',
  deleteNote: 'notes:delete',
  openNote: 'notes:open',
  openNotesList: 'notes:openList',
  minimizeWindow: 'window:minimize',
  closeWindow: 'window:close',
  toggleAlwaysOnTop: 'window:togglePin',
  isAlwaysOnTop: 'window:isPinned',
  showToast: 'ui:toast',
  openExternal: 'shell:openExternal',
  // events (main → renderer)
  pinStateChanged: 'window:pinChanged',
  focusTitle: 'ui:focusTitle',
  notesChanged: 'notes:changed'
} as const;
