import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type EditorHandle } from './editor/Editor';
import { ToastView, useToast } from './components/Toast';
import { FindBar } from './components/FindBar';
import {
  ColorPickerButton,
  TEXT_COLORS,
  HIGHLIGHT_COLORS
} from './components/ColorPicker';
import { TableSizePicker } from './components/TableSizePicker';

function deriveTitle(md: string): string {
  const lines = md.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.+)$/);
    if (h) return h[1].trim().slice(0, 80);
    return line.replace(/[#*_`>[\]()]/g, '').slice(0, 80);
  }
  return '';
}

export function NoteApp(): JSX.Element {
  const noteId = window.memo.getNoteId();
  const editorRef = useRef<EditorHandle>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState<string>('');
  const [markdown, setMarkdown] = useState<string>('');
  const [pinned, setPinned] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [showFind, setShowFind] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [matchInfo, setMatchInfo] = useState<{ count: number; index: number }>({ count: 0, index: 0 });
  const { toast, show } = useToast();

  const dirty = useRef<{ md: string; title: string } | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Load note on mount.
  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    void (async () => {
      const content = await window.memo.loadNote(noteId);
      if (cancelled || !content) return;
      setTitle(content.meta.title);
      setMarkdown(content.markdown);
      setLoaded(true);
      const pin = await window.memo.isAlwaysOnTop();
      setPinned(pin);
    })();
    const offPin = window.memo.onPinStateChanged(setPinned);
    return () => {
      cancelled = true;
      offPin();
    };
  }, [noteId]);

  const saveNow = useCallback(
    async (opts: { showToast?: boolean } = {}) => {
      if (!noteId || !dirty.current) return;
      const { md, title } = dirty.current;
      const effectiveTitle = title.trim() || deriveTitle(md);
      await window.memo.saveNote(noteId, md, effectiveTitle);
      dirty.current = null;
      if (opts.showToast) show('Saved');
    },
    [noteId, show]
  );

  const scheduleSave = useCallback(
    (md: string, title: string) => {
      dirty.current = { md, title };
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void saveNow();
      }, 500);
    },
    [saveNow]
  );

  const handleEditorChange = useCallback(
    (md: string) => {
      setMarkdown(md);
      scheduleSave(md, title);
    },
    [scheduleSave, title]
  );

  const handleTitleChange = useCallback(
    (v: string) => {
      setTitle(v);
      scheduleSave(markdown, v);
    },
    [scheduleSave, markdown]
  );

  // Save on blur / before unload.
  useEffect(() => {
    const onBeforeUnload = (): void => {
      if (saveTimer.current != null) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void saveNow();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveNow]);

  const syncMatchInfo = useCallback(() => {
    const info = editorRef.current?.getSearchInfo?.() ?? { count: 0, index: 0 };
    setMatchInfo(info);
  }, []);

  const setQuery = useCallback(
    (query: string) => {
      setFindQuery(query);
      editorRef.current?.setSearchQuery(query);
      // getSearchInfo reflects state after dispatch.
      requestAnimationFrame(syncMatchInfo);
    },
    [syncMatchInfo]
  );

  const advanceMatch = useCallback(
    (direction: 1 | -1) => {
      editorRef.current?.advanceSearch(direction);
      requestAnimationFrame(syncMatchInfo);
    },
    [syncMatchInfo]
  );

  const closeFind = useCallback(() => {
    setShowFind(false);
    setFindQuery('');
    editorRef.current?.setSearchQuery('');
    setMatchInfo({ count: 0, index: 0 });
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) {
        if (e.key === 'F2') {
          e.preventDefault();
          titleRef.current?.focus();
          titleRef.current?.select();
        } else if (e.key === 'Escape' && showFind) {
          e.preventDefault();
          closeFind();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        if (saveTimer.current != null) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        dirty.current = { md: markdown, title };
        void saveNow({ showToast: true });
      } else if (k === 'n') {
        e.preventDefault();
        void window.memo.createNote();
      } else if (k === 'w') {
        e.preventDefault();
        window.memo.closeWindow();
      } else if (k === 'f') {
        e.preventDefault();
        setShowFind(true);
        if (findQuery) requestAnimationFrame(syncMatchInfo);
      } else if (k === 'k') {
        e.preventDefault();
        const editor = editorRef.current?.getEditor();
        if (!editor) return;
        const existingHref = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Enter URL', existingHref ?? 'https://');
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().unsetLink().run();
        } else {
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url })
            .run();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [markdown, title, saveNow, showFind, closeFind, findQuery, syncMatchInfo]);

  const togglePin = useCallback(async () => {
    const next = await window.memo.toggleAlwaysOnTop();
    setPinned(next);
  }, []);

  const openList = useCallback(() => window.memo.openNotesList(), []);

  const effectiveTitle = useMemo(
    () => title || deriveTitle(markdown) || '',
    [title, markdown]
  );

  if (!noteId) {
    return (
      <div className="flex h-full items-center justify-center text-on-surface-variant">
        No note selected.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-surface-bright">
      <div className="app-window relative m-2 flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/40 bg-white ring-1 ring-black/[0.05]">
        {/* Title section — draggable */}
        <div className="app-drag px-6 pt-6 pb-4 md:px-10 md:pt-8 md:pb-5">
          <div className="mx-auto flex max-w-prose items-center justify-between gap-3">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="app-no-drag w-full border-none bg-transparent p-0 font-headline text-3xl font-extrabold tracking-tight text-primary placeholder:text-primary/20 focus:outline-none focus:ring-0 md:text-4xl"
              placeholder="Note Title"
              aria-label="Note title"
            />
            <div className="app-no-drag flex shrink-0 items-center gap-2">
              <button
                onClick={openList}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-surface-container-low hover:text-primary"
                title="Notes list"
              >
                <span className="material-symbols-outlined text-[22px]">list</span>
              </button>
              <button
                onClick={togglePin}
                className={`rounded-full p-2 transition-all active:scale-95 ${
                  pinned
                    ? 'bg-secondary-container text-primary'
                    : 'text-slate-500 hover:bg-surface-container-low hover:text-primary'
                }`}
                title={pinned ? 'Pinned (always on top)' : 'Pin on top'}
              >
                <span
                  className={`material-symbols-outlined text-[22px] ${pinned ? 'fill' : ''}`}
                >
                  push_pin
                </span>
              </button>
              <button
                onClick={() => {
                  if (saveTimer.current != null) {
                    window.clearTimeout(saveTimer.current);
                    saveTimer.current = null;
                  }
                  dirty.current = { md: markdown, title };
                  void saveNow({ showToast: true });
                }}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-dim hover:shadow active:scale-95"
                title="Save (Ctrl+S)"
              >
                Save
              </button>
              <div className="mx-1 h-6 w-px bg-outline-variant/30" />
              <button
                onClick={() => window.memo.minimizeWindow()}
                className="rounded-full p-2 text-slate-500 hover:bg-surface-container-low"
                title="Minimize"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <button
                onClick={() => window.memo.closeWindow()}
                className="rounded-full p-2 text-slate-500 hover:bg-error/10 hover:text-error"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <Toolbar editorRef={editorRef} />

        {/* Editor */}
        <main className="relative flex-1 overflow-auto px-6 pb-10 pt-6 md:px-10">
          <div className="mx-auto max-w-prose">
            {loaded && (
              <Editor
                ref={editorRef}
                initialMarkdown={markdown}
                onChange={handleEditorChange}
              />
            )}
          </div>
        </main>

        {/* FindBar sits in app-window chrome, not inside the scroll container, so it stays visible. */}
        <FindBar
          open={showFind}
          onClose={closeFind}
          onQueryChange={setQuery}
          onNext={() => advanceMatch(1)}
          onPrev={() => advanceMatch(-1)}
          matchCount={matchInfo.count}
          currentIndex={matchInfo.index}
        />

        <ToastView toast={toast} />
      </div>
    </div>
  );
}

interface ToolbarProps {
  editorRef: React.RefObject<EditorHandle>;
}

function Toolbar({ editorRef }: ToolbarProps): JSX.Element {
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  const editor = editorRef.current?.getEditor() ?? null;

  // Re-render when editor selection/state changes so swatch dots reflect current color.
  useEffect(() => {
    if (!editor) return;
    const h = (): void => forceRender();
    editor.on('selectionUpdate', h);
    editor.on('transaction', h);
    return () => {
      editor.off('selectionUpdate', h);
      editor.off('transaction', h);
    };
  }, [editor]);

  const run = (fn: (e: NonNullable<ReturnType<EditorHandle['getEditor']>>) => void): void => {
    const e = editorRef.current?.getEditor();
    if (e) fn(e);
  };

  const currentColor = (editor?.getAttributes('textStyle').color as string | undefined) ?? null;
  const currentHighlight =
    (editor?.getAttributes('highlight').color as string | undefined) ?? null;

  return (
    <header className="app-no-drag sticky top-0 z-10 flex items-center justify-between border-y border-surface-container/30 bg-white/70 px-6 py-2 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-prose items-center justify-between">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-0.5 rounded-xl bg-surface-container-low/60 p-1">
            <ToolbarButton
              title="Bold (Ctrl+B)"
              onClick={() => run((e) => e.chain().focus().toggleBold().run())}
              icon="format_bold"
            />
            <ToolbarButton
              title="Italic (Ctrl+I)"
              onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
              icon="format_italic"
            />
            <ToolbarButton
              title="Underline (Ctrl+U)"
              onClick={() => run((e) => e.chain().focus().toggleUnderline().run())}
              icon="format_underlined"
            />
          </div>

          <div className="flex items-center gap-0.5 rounded-xl bg-surface-container-low/60 p-1">
            <ColorPickerButton
              title="Text color"
              icon="format_color_text"
              activeColor={currentColor}
              palette={TEXT_COLORS}
              onPick={(color) => {
                if (color) {
                  run((e) => e.chain().focus().setColor(color).run());
                } else {
                  run((e) => e.chain().focus().unsetColor().run());
                }
              }}
            />
            <ColorPickerButton
              title="Highlight"
              icon="ink_highlighter"
              activeColor={currentHighlight}
              palette={HIGHLIGHT_COLORS}
              onPick={(color) => {
                if (color) {
                  run((e) => e.chain().focus().toggleHighlight({ color }).run());
                } else {
                  run((e) => e.chain().focus().unsetHighlight().run());
                }
              }}
            />
          </div>

          <div className="mx-1 hidden h-6 w-px bg-outline-variant/30 sm:block" />
          <div className="hidden items-center gap-0.5 md:flex">
            <ToolbarButton
              title="Heading 1"
              onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 1 }).run())}
              icon="format_h1"
            />
            <ToolbarButton
              title="Heading 2"
              onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}
              icon="format_h2"
            />
            <ToolbarButton
              title="Bullet list"
              onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
              icon="format_list_bulleted"
            />
            <ToolbarButton
              title="Numbered list"
              onClick={() => run((e) => e.chain().focus().toggleOrderedList().run())}
              icon="format_list_numbered"
            />
            <ToolbarButton
              title="Task list"
              onClick={() => run((e) => e.chain().focus().toggleTaskList().run())}
              icon="checklist"
            />
            <ToolbarButton
              title="Quote"
              onClick={() => run((e) => e.chain().focus().toggleBlockquote().run())}
              icon="format_quote"
            />
            <ToolbarButton
              title="Code"
              onClick={() => run((e) => e.chain().focus().toggleCode().run())}
              icon="code"
            />
            <TableSizePicker
              onInsert={(rows, cols) =>
                run((e) =>
                  e.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
                )
              }
            />
          </div>

          {editor?.isActive('table') && <TableControls editorRef={editorRef} />}
        </div>
      </div>
    </header>
  );
}

function TableControls({ editorRef }: { editorRef: React.RefObject<EditorHandle> }): JSX.Element {
  const run = (fn: (e: NonNullable<ReturnType<EditorHandle['getEditor']>>) => void): void => {
    const e = editorRef.current?.getEditor();
    if (e) fn(e);
  };
  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-secondary-container/40 p-1">
      <ToolbarButton
        title="Add column before"
        onClick={() => run((e) => e.chain().focus().addColumnBefore().run())}
        icon="keyboard_tab_rtl"
      />
      <ToolbarButton
        title="Add column after"
        onClick={() => run((e) => e.chain().focus().addColumnAfter().run())}
        icon="keyboard_tab"
      />
      <ToolbarButton
        title="Delete column"
        onClick={() => run((e) => e.chain().focus().deleteColumn().run())}
        icon="variable_remove"
      />
      <ToolbarButton
        title="Add row above"
        onClick={() => run((e) => e.chain().focus().addRowBefore().run())}
        icon="vertical_align_top"
      />
      <ToolbarButton
        title="Add row below"
        onClick={() => run((e) => e.chain().focus().addRowAfter().run())}
        icon="vertical_align_bottom"
      />
      <ToolbarButton
        title="Delete row"
        onClick={() => run((e) => e.chain().focus().deleteRow().run())}
        icon="delete_sweep"
      />
      <ToolbarButton
        title="Delete table"
        onClick={() => run((e) => e.chain().focus().deleteTable().run())}
        icon="delete"
      />
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  icon
}: {
  title: string;
  onClick: () => void;
  icon: string;
}): JSX.Element {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-700 transition-all hover:bg-white hover:shadow-sm"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
