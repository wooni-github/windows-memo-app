# Memo - Design Spec

**Date**: 2026-04-17
**Status**: Approved

## Overview

A Windows desktop memo application inspired by Sticky Notes + Notepad, implementing
the visual design defined in `theme.txt`. Built with Electron + React + Tiptap, with
WYSIWYG markdown editing, per-note always-on-top, frameless draggable/resizable
windows, and distribution via GitHub Releases as an NSIS installer.

## Architecture

- **Main process** (`src/main/`): window lifecycle, persistence, tray, IPC, global
  shortcuts.
- **Preload** (`src/preload/`): `contextBridge` exposes a typed API; `contextIsolation`
  on, `nodeIntegration` off.
- **Renderer** (`src/renderer/`): React + Tailwind UI. Two entry HTML files
  (`note.html`, `list.html`) share the same React bundle; `?noteId=...` query routes
  note windows.
- **Build**: `electron-vite` (main/preload/renderer configs), `electron-builder`
  produces NSIS installer.

### Dependencies

- Runtime: `electron`, `electron-store`, `uuid`, `react`, `react-dom`,
  `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
  `@tiptap/extension-underline`, `@tiptap/extension-task-list`,
  `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`, `tiptap-markdown`.
- Dev: `typescript`, `electron-vite`, `electron-builder`, `tailwindcss`,
  `@vitejs/plugin-react`, `vitest`.

## Data Model

Storage root: `app.getPath('userData')` → `%APPDATA%\Memo\`.

```
%APPDATA%\Memo\
├── notes.json          # index (metadata only)
├── notes\<noteId>.md   # source of truth for body
└── app-state.json      # window positions / pinned / open flags
```

`notes.json`:
```ts
interface NoteMeta { id: string; title: string; createdAt: string; updatedAt: string; color?: string; }
interface NotesIndex { version: 1; notes: NoteMeta[]; }
```

`app-state.json`:
```ts
interface WindowState { noteId: string; x: number; y: number; width: number; height: number; alwaysOnTop: boolean; isOpen: boolean; }
interface AppState { version: 1; windows: WindowState[]; notesListWindow?: { x; y; width; height; isOpen }; }
```

Writes: debounced 500 ms on body, 200 ms on window state; atomic (`.tmp` + rename).
Main process owns all file I/O; renderers talk to it via IPC.

## Editor

Tiptap (ProseMirror) with `tiptap-markdown` for serialization. Source of truth is
markdown text; external tools can edit the `.md` files directly.

Supported syntax: H1–H3, bold, italic, underline, inline code, code block, bullet/
ordered lists, task lists, links, blockquote, horizontal rule.

Input rules render markdown in-place as users type (Typora-style). Placeholder
"Start writing..." on empty documents.

Out of scope for v1: images, tables, KaTeX, drag-and-drop.

## Window Behavior

`BrowserWindow`: `frame: false`, `resizable: true`, `minWidth: 280`,
`minHeight: 200`, `backgroundColor: '#f5f7f9'`, preload with contextIsolation.

- **Move**: title bar region gets `-webkit-app-region: drag`; interactive elements
  override with `no-drag`.
- **Resize**: native edge resize via `resizable: true`. Window itself is rectangular;
  rounded corners are drawn by inner `.app-window` div to avoid transparent-corner
  hit-test issues. 8 px padding around content reserves resize handle area.
- **Custom controls**: minimize + close icons near the Save button. Close hides the
  window but preserves data (`isOpen = false`).
- **Always-on-top**: per-note pushpin toggle (`setAlwaysOnTop`). Icon FILL reflects
  state; persisted in `app-state.json`.
- **Multi-monitor**: if a saved position is off-screen on next boot, fall back to
  primary display center.

## Notes List Window

Grid of note cards (title + preview + updated date). Search bar filters by title/
body. Buttons: new note, open selected, delete (with confirmation). Opened via
tray icon or when no note windows are open at startup.

## Tray Icon

Runs in the system tray. Left-click opens notes list; right-click menu: "New
note", "Show all notes", "Hide all notes", "Quit". Closing all windows does NOT
quit the app; only the tray "Quit" action does.

## Shortcuts

**Standard editing** (Electron/OS defaults): Ctrl+X/C/V/A/Z/Y.

**Formatting** (Tiptap chain commands): Ctrl+B (bold), Ctrl+I (italic),
Ctrl+U (underline), Ctrl+K (link), Ctrl+Shift+7/8 (ordered/bullet list).

**App**: Ctrl+S (force save + toast), Ctrl+N (new note), Ctrl+W (close current
window), Ctrl+F (find in note), F2 (focus title), Esc (close modals/search).

**Global**: Ctrl+Alt+N (new note from anywhere), registered via
`globalShortcut`. Silent failure if taken by another app.

## Persistence Flows

- **Edit**: Tiptap change → debounce 500 ms → IPC `note:save` with markdown →
  main writes `.md` atomically → updates `notes.json` (`updatedAt`).
- **Title change**: IPC `note:rename` → main updates `notes.json`.
- **Window move/resize**: 200 ms debounce → IPC `window:state` → `app-state.json`.
- **Pin toggle**: IPC → `setAlwaysOnTop` + state write.
- **Startup**: load `app-state.json`; for each window where `isOpen === true`,
  spawn a `BrowserWindow`; if none, open notes list window.

## Distribution

**GitHub**: public repo; `.github/workflows/release.yml` runs on `v*` tag push,
builds on windows-latest, publishes NSIS installer + `latest.yml` to GitHub
Releases.

**Installer**: electron-builder NSIS target produces `Memo-Setup-<version>.exe`.
- Install to `%LOCALAPPDATA%\Programs\Memo\` (no admin).
- Start Menu shortcut (`Memo`) → discoverable via Windows search.
- Optional desktop shortcut.
- Per-user install; uninstall via Apps & Features.

**Auto-update**: `electron-updater` with GitHub provider. Check on startup;
prompt user before downloading.

**Code signing**: deferred. Unsigned installer triggers SmartScreen warning;
acceptable for v1, note in README.

## Testing

- **Unit**: vitest on store serialization, markdown round-trip (content ↔ md).
- **Smoke**: manual checklist in README — new note, type, restart, verify
  restore; pin toggle survives restart; Ctrl+B/I/U formats; Ctrl+S shows toast;
  tray quit works.

## Out of Scope (v1)

- Images, tables, KaTeX, drag-and-drop file import.
- Custom keymap configuration.
- Dark mode toggle (CSS classes present, but no UI toggle).
- Color picker implementation (field reserved in schema).
- Sync / cloud backup.
