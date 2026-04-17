# Memo

A Windows memo app inspired by Sticky Notes and Notepad. Frameless sticky windows,
per-note "always on top", WYSIWYG markdown editing, and a tray icon with a notes list.

Implements the visual design in `theme.txt`.

## Features

- Sticky-note-style multi-window model — each note is its own draggable, resizable window
- WYSIWYG markdown editing (Tiptap): `#`, `**bold**`, `*italic*`, `__underline__`,
  lists, task lists, links, blockquote, code
- Text color + highlight pickers (12-swatch palettes). Highlight round-trips
  through markdown natively; text color is stored as inline HTML spans.
- `Ctrl+Click` on a link opens it in your default browser (http/https/mailto only).
- Simple tables with a visual size picker (up to 10×10 grid, or type custom
  sizes) and contextual row/column controls (round-trips as GFM markdown tables).
- Right-click context menu with Undo/Redo, Cut/Copy/Paste, paste-as-plain-text,
  Select all, "Open/copy link", and spelling suggestions when applicable.
- Find bar (Ctrl+F) stays pinned while scrolling; all matches highlighted, current
  match emphasized; Enter / Shift+Enter to jump between hits.
- Per-note "always on top" pushpin
- Auto-save (500 ms debounce) + `Ctrl+S` for force save with toast
- Notes list window with search, accessible from the system tray
- Global shortcut `Ctrl+Alt+N` to create a new note from anywhere
- Restores open windows + positions + pin state across restarts

## Shortcuts

| Shortcut          | Action                              |
| ----------------- | ----------------------------------- |
| `Ctrl+S`          | Save (with toast)                   |
| `Ctrl+N`          | New note                            |
| `Ctrl+W`          | Close current window                |
| `Ctrl+F`          | Find in current note                |
| `Ctrl+B/I/U`      | Bold / Italic / Underline           |
| `Ctrl+K`          | Insert / edit link                  |
| `Ctrl+Shift+7/8`  | Ordered / bullet list               |
| `Ctrl+Alt+N`      | New note (system-wide global)       |
| `F2`              | Focus title                         |
| `Esc`             | Close find bar                      |
| `Ctrl+X/C/V/A/Z/Y`| Standard edit                        |

## Install (end users)

### Option A — Installer (recommended; Start Menu integration)

1. Download `Memo-Setup-x.y.z.exe` from the [Releases page](../../releases).
2. Double-click. Windows SmartScreen may warn about "unknown publisher" —
   click *More info → Run anyway*.
3. Choose install location (default: `%LOCALAPPDATA%\Programs\Memo`).
4. Search **"Memo"** from the Start menu / Windows search to launch.

Uninstall via *Settings → Apps → Installed apps → Memo*.

### Option B — Portable ZIP (no install)

1. Download `Memo-Portable-x.y.z.zip` from the Releases page.
2. Extract anywhere (USB, Dropbox, etc.).
3. Double-click `Memo.exe`. Data still lives in `%APPDATA%\Memo\`.

### Option C — Install locally from source (no admin, no NSIS)

When building from a clone and you want Memo in Windows search /
Start Menu without dealing with NSIS / Developer Mode:

```bash
npm install
npm run install:local
```

This builds the unpacked app and then runs `scripts/install.ps1`,
which:

- Copies the build into `%LOCALAPPDATA%\Programs\Memo\`
- Creates Start Menu + Desktop shortcuts
- Registers an uninstall entry under
  `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Memo`
  so *Settings → Apps → Installed apps* lists Memo with an
  **Uninstall** button

After it finishes, press the Windows key and type **"memo"** — the
app appears in search. Re-run `npm run install:local` to upgrade in
place; user notes in `%APPDATA%\Memo\` are preserved.

To uninstall, use Windows' own *Apps & Features* UI, or run:

```bash
npm run uninstall:local
# or to also wipe notes: powershell -File scripts/uninstall.ps1 -PurgeUserData
```

No admin rights and no *Developer Mode* are required.

## Develop

```bash
npm install
npm run dev
```

Runs the app with live reload. Main/preload/renderer all rebuild on save.

### Type check & tests

```bash
npm run typecheck
npm test
```

### Build unpacked (for local testing)

```bash
npm run pack
```

Output: `release/win-unpacked/Memo.exe`. Run directly, or use the
`run.cmd` launcher at the repo root (double-click).

### Build portable ZIP (single shareable file)

```bash
npm run pack:zip
```

Output: `release/Memo-Portable-<version>.zip`. Send this to any Windows PC —
extract anywhere, run `Memo.exe` inside. No install, no admin, no NSIS toolchain
needed.

### Build installer

```bash
npm run dist
```

Output: `release/Memo-Setup-<version>.exe`.

> **Windows note**: electron-builder extracts a signing-tools archive that
> contains symlinks. Local builds need either **Windows Developer Mode**
> enabled (Settings → Privacy & Security → For developers) or a terminal
> running as Administrator, otherwise the NSIS step fails with
> "Cannot create symbolic link" errors. GitHub Actions `windows-latest` has
> this privilege by default, so CI builds always work.

## Release

Releases are published automatically by
[.github/workflows/release.yml](.github/workflows/release.yml) when a tag
matching `v*` is pushed.

```bash
npm version patch    # bumps version + creates git tag
git push --follow-tags
```

The workflow runs typecheck + tests, builds the NSIS installer, and uploads to
GitHub Releases along with `latest.yml` (used by `electron-updater`).

## Data Location

All data lives in `%APPDATA%\Memo\`:

```
%APPDATA%\Memo\
├── notes.json          # note metadata
├── notes\<id>.md       # per-note markdown (source of truth)
└── app-state.json      # window positions / pin state
```

Note bodies are plain `.md` files — safe to back up, edit with another tool, or
import/export manually.

## Smoke Test Checklist

After `npm run pack` and launching the built `Memo.exe`:

- [ ] First run shows the notes list window.
- [ ] "New" creates a note window; the note window has no native title bar.
- [ ] Typing `# Heading` renders inline; `**x**`, `*x*`, `__x__` render.
- [ ] `Ctrl+B / I / U` toggles bold / italic / underline.
- [ ] `Ctrl+S` shows a "Saved" toast.
- [ ] Drag title region to move; drag edges to resize.
- [ ] Pushpin toggles always-on-top; icon fill reflects state.
- [ ] Close (X) hides the window; reopen via tray → "Show notes list".
- [ ] Restart app — previously open notes reopen at saved positions & pins.
- [ ] `Ctrl+Alt+N` creates a new note from another app.
- [ ] Tray right-click → Quit exits the app.

## Code Signing

The installer is **not signed** in v1. Windows SmartScreen will warn users on
first run. To sign, set `CSC_LINK` and `CSC_KEY_PASSWORD` env vars in the
release workflow (see `electron-builder` docs).

## License

MIT
